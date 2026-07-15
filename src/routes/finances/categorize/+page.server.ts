import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import type { CategorizeData, OverrideRow } from '$lib/utils/finance';

// The categorizer queue: the still-Uncategorized transactions from the ledger
// sidecar plus the accounts to assign them to, and the already-saved overrides
// so the UI can show progress. Owner-gated by hooks.server.ts, like the rest of
// /finances.
export const load: PageServerLoad = async ({ fetch }) => {
	const [catRes, ovRes] = await Promise.all([
		fetch('/api/finances/categorize'),
		fetch('/api/finances/overrides')
	]);

	if (!catRes.ok) {
		throw error(
			catRes.status === 503 ? 503 : 502,
			'Could not load the ledger. Is finance-service running?'
		);
	}

	const data: CategorizeData = await catRes.json();
	const overrides: OverrideRow[] = ovRes.ok ? (await ovRes.json()).overrides : [];

	return { categorize: data, overrides };
};
