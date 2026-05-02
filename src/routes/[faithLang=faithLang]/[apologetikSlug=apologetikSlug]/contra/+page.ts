import { getArchetypes, getArguments } from '$lib/data/apologetik';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent, setHeaders }) => {
	setHeaders({ 'Cache-Control': 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400' });
	const { lang } = await parent();
	const [archetypes, args] = await Promise.all([getArchetypes(lang), getArguments(lang)]);
	return { archetypes, args };
};
