import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch }) => {
	const [latestRes, listRes, goalRes, periodRes, shareRes, sharedRes] = await Promise.all([
		fetch('/api/fitness/measurements/latest'),
		fetch('/api/fitness/measurements?limit=10'),
		fetch('/api/fitness/goal'),
		fetch('/api/fitness/period').catch(() => null),
		fetch('/api/fitness/period/share').catch(() => null),
		fetch('/api/fitness/period/shared').catch(() => null)
	]);

	return {
		latest: await latestRes.json(),
		measurements: await listRes.json(),
		profile: goalRes.ok ? await goalRes.json() : {},
		periods: periodRes?.ok ? (await periodRes.json()).entries : [],
		periodSharedWith: shareRes?.ok ? (await shareRes.json()).sharedWith : [],
		periodShared: sharedRes?.ok ? (await sharedRes.json()).shared : []
	};
};

/** A decimal field as typed: blank means "not measured", not zero. */
function decimal(value: FormDataEntryValue | null): number | null {
	const raw = String(value ?? '').trim().replace(',', '.');
	if (!raw) return null;
	const n = Number(raw);
	return Number.isFinite(n) ? n : null;
}

export const actions: Actions = {
	/**
	 * Record a check-in from a plain form post.
	 *
	 * The page normally saves through `fetch`, which lets it ask about an overwrite in
	 * a dialog and stay where it is. With no script there is no dialog and no fetch,
	 * so the same POST comes here instead and the conflict comes back as form data —
	 * the page then shows what would be overwritten and offers a second submit that
	 * says so explicitly. Same endpoint, same rules, one round trip more.
	 */
	save: async ({ request, fetch }) => {
		const form = await request.formData();
		const date = String(form.get('date') ?? '');
		if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return fail(400, { error: 'date' });

		const weight = decimal(form.get('weight'));
		const bodyFatPercent = decimal(form.get('bodyFatPercent'));
		if (weight == null && bodyFatPercent == null) return fail(400, { error: 'empty' });

		const overwrite = form.get('overwrite') === '1';
		const res = await fetch(`/api/fitness/measurements${overwrite ? '?overwrite=1' : ''}`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ date, weight, bodyFatPercent, measurements: null })
		});

		if (res.status === 409) {
			const { conflicts } = await res.json();
			// Handed back with the values, so the confirming submit carries the same
			// numbers rather than asking for them again.
			return fail(409, { conflicts, date, weight, bodyFatPercent });
		}
		if (!res.ok) return fail(res.status, { error: 'save' });
		return { saved: true, date };
	}
};
