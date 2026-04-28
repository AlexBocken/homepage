import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import {
	findPositiveArgumentLang,
	getPosArguments,
	getPosLayers,
	getPosVoices,
	POS_ARGUMENTS as EN_POS_ARGUMENTS
} from '$lib/data/apologetik';
import { resolveScriptureForLang } from '$lib/server/scriptureLookup';

export const load: PageServerLoad = async ({ params, parent }) => {
	const { lang } = await parent();
	const [arg, voices, layers, args] = await Promise.all([
		findPositiveArgumentLang(params.posArgId, lang),
		getPosVoices(lang),
		getPosLayers(lang),
		getPosArguments(lang)
	]);
	if (!arg) {
		error(404, 'Argument not found');
	}

	const lng: 'en' | 'de' = lang === 'de' ? 'de' : 'en';
	const enArg = EN_POS_ARGUMENTS.find((x) => x.id === arg.id);
	const argument = enArg
		? (() => {
				const resolved = resolveScriptureForLang(enArg.scripture.ref, lng);
				return {
					...arg,
					scripture: resolved.text ? resolved : arg.scripture
				};
			})()
		: arg;

	const argsWithScripture = args.map((a) => {
		const en = EN_POS_ARGUMENTS.find((x) => x.id === a.id);
		if (!en) return a;
		const resolved = resolveScriptureForLang(en.scripture.ref, lng);
		return { ...a, scripture: resolved.text ? resolved : a.scripture };
	});

	return { argument, voices, layers, args: argsWithScripture };
};
