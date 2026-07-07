import type { LayoutServerLoad } from './$types';
import { clientSession } from '$lib/server/session';
import type { FinanceMeta } from '$lib/utils/finance';

export const load: LayoutServerLoad = async ({ locals, fetch }) => {
	// Ledger date bounds for the shared range picker (best-effort — the picker is
	// hidden if the service is down).
	let dateRange: { from: string; to: string } | null = null;
	try {
		const res = await fetch('/api/finances/meta');
		if (res.ok) dateRange = ((await res.json()) as FinanceMeta).date_range;
	} catch {
		dateRange = null;
	}

	return {
		session: clientSession(locals.session ?? (await locals.auth())),
		dateRange
	};
};
