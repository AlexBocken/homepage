import type { PageServerLoad } from './$types';
import type { FinanceMeta } from '$lib/utils/finance';

interface SavedQuery {
	id: string;
	name: string;
	query: string;
}

export const load: PageServerLoad = async ({ fetch }) => {
	const [savedRes, metaRes] = await Promise.all([
		fetch('/api/finances/saved-queries'),
		fetch('/api/finances/meta')
	]);
	const saved: SavedQuery[] = savedRes.ok ? await savedRes.json() : [];
	const meta: FinanceMeta | null = metaRes.ok ? await metaRes.json() : null;
	return { saved, accounts: meta?.accounts ?? [] };
};
