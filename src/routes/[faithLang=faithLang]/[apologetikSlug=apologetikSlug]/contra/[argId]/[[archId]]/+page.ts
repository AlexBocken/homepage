import { error } from '@sveltejs/kit';
import { ALEX_PICKS, findArgumentLang, getArchetypes, getArguments } from '$lib/data/apologetik';
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
	const archIds = Object.keys(arg.counters);
	if (params.archId && !archIds.includes(params.archId)) {
		error(404, 'Voice not found');
	}
	const initialArchId = params.archId ?? null;
	return {
		argument: arg,
		archetypes,
		args,
		alexPicks: ALEX_PICKS[params.argId] ?? [],
		initialArchId
	};
};
