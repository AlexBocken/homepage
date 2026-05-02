import type { PageServerLoad } from './$types';
import {
	getPosArguments,
	getPosLayers,
	getPosVoices,
	POS_ARGUMENTS as EN_POS_ARGUMENTS
} from '$lib/data/apologetik';
import { resolveScriptureForLang } from '$lib/server/scriptureLookup';

export const load: PageServerLoad = async ({ parent, setHeaders }) => {
	setHeaders({ 'Cache-Control': 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400' });
	const { lang } = await parent();
	const [voices, layers, args] = await Promise.all([
		getPosVoices(lang),
		getPosLayers(lang),
		getPosArguments(lang)
	]);

	const lng: 'en' | 'de' = lang === 'de' ? 'de' : 'en';
	const argsWithScripture = args.map((a) => {
		const en = EN_POS_ARGUMENTS.find((x) => x.id === a.id);
		if (!en) return a;
		const resolved = resolveScriptureForLang(en.scripture.ref, lng);
		return {
			...a,
			scripture: resolved.text ? resolved : a.scripture
		};
	});

	return { voices, layers, args: argsWithScripture };
};
