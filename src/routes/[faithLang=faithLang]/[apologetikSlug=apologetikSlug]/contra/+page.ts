import { getArchetypes, getArguments } from '$lib/data/apologetik';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent }) => {
	const { lang } = await parent();
	const [archetypes, args] = await Promise.all([getArchetypes(lang), getArguments(lang)]);
	return { archetypes, args };
};
