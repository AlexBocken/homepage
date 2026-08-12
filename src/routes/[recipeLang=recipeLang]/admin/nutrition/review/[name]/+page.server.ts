import type { Actions, PageServerLoad } from './$types';
import { redirect, fail } from '@sveltejs/kit';
import { Recipe } from '$models/Recipe';
import { dbConnect } from '$utils/db';
import { errorWithVerse } from '$lib/server/errorQuote';
import { loadReviewQueue, type ReviewQueue } from '$lib/server/nutritionReviewQueue';
import { syncGlobalOverwrites } from '$lib/server/nutritionOverwriteSync';

/**
 * Where this recipe sits in the walk, and where "next" goes.
 *
 * Next is the following recipe that still needs work, wrapping past the end to
 * pick up anything left behind earlier — a review session is done when nothing
 * pending remains, not when the alphabet runs out. The recipe being reviewed is
 * never its own next, even while it is still flagged: leaving it is the user's
 * decision, and sending them back to the page they just left would read as a
 * save that did not take.
 */
function neighbours(queue: ReviewQueue, shortName: string) {
	const at = queue.entries.findIndex((e) => e.shortName === shortName);
	const elsewhere = queue.pending.filter((s) => s !== shortName);

	const after = queue.entries.slice(at + 1).find((e) => !e.clean && e.shortName !== shortName);
	const before = [...queue.entries.slice(0, Math.max(at, 0))]
		.reverse()
		.find((e) => !e.clean && e.shortName !== shortName);

	return {
		next: after?.shortName ?? elsewhere[0] ?? null,
		previous: before?.shortName ?? null,
		/** 1-based position among the recipes that need work, 0 when this one does not. */
		position: queue.pending.indexOf(shortName) + 1,
	};
}

export const load: PageServerLoad = async ({ fetch, locals, url, params }) => {
	// The hook only guards `/rezepte/edit` and `/rezepte/add`, and the
	// `[recipeLang]` matcher serves an English alias of every route under it, so
	// the check lives here — in the action below as well as in this load. It runs
	// before the language redirect so both slugs answer a stranger identically.
	const session = locals.session ?? (await locals.auth());
	if (!session?.user?.nickname) {
		throw redirect(302, `/login?callbackUrl=${encodeURIComponent(url.pathname)}`);
	}
	if (!session.user.groups?.includes('rezepte_users')) {
		await errorWithVerse(fetch, url.pathname, 403,
			'Zugriff verweigert. Du hast keine Berechtigung für diesen Bereich.');
	}

	if (params.recipeLang === 'recipes') {
		throw redirect(301, `/rezepte/admin/nutrition/review/${params.name}`);
	}

	// The same endpoint the editor loads: it resolves each mapping's per-100 g for
	// the cards and the referenced recipes for the base-recipe rows, neither of
	// which the mapper can work out on its own.
	const res = await fetch(`/api/rezepte/items/${encodeURIComponent(params.name)}`);
	if (!res.ok) {
		await errorWithVerse(fetch, url.pathname, res.status === 404 ? 404 : 500,
			res.status === 404 ? 'Rezept nicht gefunden.' : 'Rezept konnte nicht geladen werden.');
	}
	const recipe = await res.json();

	const queue = await loadReviewQueue();
	const entry = queue.entries.find((e) => e.shortName === recipe.short_name);

	return {
		recipe,
		summary: entry ?? null,
		queue: { total: queue.total, green: queue.green, greenPercent: queue.greenPercent, pending: queue.pending.length },
		...neighbours(queue, recipe.short_name),
		recipeLang: params.recipeLang,
	};
};

export const actions = {
	default: async ({ request, locals, params }) => {
		const session = locals.session ?? (await locals.auth());
		if (!session?.user?.nickname) return fail(401, { error: 'Nicht angemeldet.' });
		if (!session.user.groups?.includes('rezepte_users')) {
			return fail(403, { error: 'Keine Berechtigung für diesen Bereich.' });
		}

		const formData = await request.formData();
		const mappingsJson = formData.get('nutritionMappings_json')?.toString();
		if (!mappingsJson) return fail(400, { error: 'Keine Zuordnungen übermittelt.' });

		let mappings: unknown;
		let finalWeight: unknown;
		try {
			mappings = JSON.parse(mappingsJson);
			finalWeight = JSON.parse(formData.get('finalWeight_json')?.toString() || '{"mode":"auto"}');
		} catch (e) {
			return fail(400, { error: `Ungültige Daten: ${e instanceof Error ? e.message : String(e)}` });
		}
		if (!Array.isArray(mappings)) return fail(400, { error: 'Zuordnungen haben das falsche Format.' });

		await dbConnect();
		try {
			// The cached per-100 g figures were summed from the mappings being
			// replaced, so they are now a claim about a recipe that no longer exists.
			// Unsetting marks them "never calculated" and the listing endpoint refills
			// them; nothing recomputes a cache that is merely stale.
			const result = await Recipe.findOneAndUpdate(
				{ short_name: params.name },
				{ $set: { nutritionMappings: mappings, finalWeight }, $unset: { cachedPer100g: '', cachedTotalGrams: '' } },
				{ runValidators: true, returnDocument: 'after' },
			);
			if (!result) return fail(404, { error: `Rezept "${params.name}" nicht gefunden.` });
		} catch (e) {
			// A mapping that fails the schema — an unknown `source`, a NaN `fdcId` —
			// takes the whole array down with it, and swallowing that would show a
			// successful save while the review work was gone.
			return fail(500, { error: `Zuordnungen nicht gespeichert: ${e instanceof Error ? e.message : String(e)}` });
		}

		await syncGlobalOverwrites(formData);

		// Where to go is decided *after* the save, against the recipe as it now
		// stands: a recipe just finished drops out of the queue and the walk moves
		// on, while one still flagged stays in it and is simply not offered again.
		const target = formData.get('go')?.toString();
		if (target === 'stay') return { saved: true };

		const queue = await loadReviewQueue();
		const { next } = neighbours(queue, params.name);
		throw redirect(303, next
			? `/${params.recipeLang}/admin/nutrition/review/${next}`
			: `/${params.recipeLang}/admin/nutrition/review`);
	},
} satisfies Actions;
