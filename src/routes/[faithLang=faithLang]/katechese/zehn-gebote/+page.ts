import type { PageLoad } from './$types';

export const load: PageLoad = async ({ setHeaders }) => {
	setHeaders({ 'Cache-Control': 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400' });
	return {};
};
