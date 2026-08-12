import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { errorWithVerse } from '$lib/server/errorQuote';
import { loadReviewQueue } from '$lib/server/nutritionReviewQueue';

/**
 * The review queue's overview: how far the nutrition mappings are, and what is
 * left. German-only, like the editor it hands off to — the mappings are keyed on
 * the German ingredient names.
 */
export const load: PageServerLoad = async ({ fetch, locals, url, params }) => {
	// Authorization first, language second: both slugs must answer a stranger the
	// same way, and redirecting before the check would tell an anonymous visitor
	// where the German page lives instead of sending them to log in.
	const session = locals.session ?? (await locals.auth());
	if (!session?.user?.nickname) {
		throw redirect(302, `/login?callbackUrl=${encodeURIComponent(url.pathname)}`);
	}
	if (!session.user.groups?.includes('rezepte_users')) {
		await errorWithVerse(fetch, url.pathname, 403,
			'Zugriff verweigert. Du hast keine Berechtigung für diesen Bereich.');
	}

	if (params.recipeLang === 'recipes') throw redirect(301, '/rezepte/admin/nutrition/review');

	return { queue: await loadReviewQueue(), recipeLang: params.recipeLang };
};
