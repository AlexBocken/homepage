import { error } from '@sveltejs/kit';
import { findArgumentLang, getArchetypes, getArguments } from '$lib/data/apologetik';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params, parent }) => {
	const { lang } = await parent();
	const [arg, archetypes, args] = await Promise.all([
		findArgumentLang(params.argId, lang),
		getArchetypes(lang),
		getArguments(lang)
	]);
	if (!arg) {
		error(404, 'Argument not found');
	}
	return { argument: arg, archetypes, args };
};
