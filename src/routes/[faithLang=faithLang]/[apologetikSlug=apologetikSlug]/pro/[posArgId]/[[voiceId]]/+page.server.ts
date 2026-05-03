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
import { generateProArgArticleJsonLd } from '$lib/js/apologetikJsonLd';
import { generateBreadcrumbJsonLd } from '$lib/js/breadcrumbJsonLd';
import { m as faithM, faithSlugFromLang, apologetikSlug, type FaithLang } from '$lib/js/faithI18n';

export const load: PageServerLoad = async ({ params, parent }) => {
	const parentData = await parent();
	const lang = parentData.lang as FaithLang;
	const [arg, voices, layers, args] = await Promise.all([
		findPositiveArgumentLang(params.posArgId, lang),
		getPosVoices(lang),
		getPosLayers(lang),
		getPosArguments(lang)
	]);
	if (!arg) {
		error(404, 'Argument not found');
	}

	const voiceIds = Object.keys(arg.voices);
	if (params.voiceId && !voiceIds.includes(params.voiceId)) {
		error(404, 'Voice not found');
	}
	const initialVoiceId = params.voiceId ?? null;

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

	const articleJsonLd = generateProArgArticleJsonLd(argument, voices, lang);
	const tFaith = faithM[lang];
	const faithSeg = faithSlugFromLang(lang);
	const apolSeg = apologetikSlug(lang === 'la' ? 'en' : lang);
	const breadcrumbJsonLd = generateBreadcrumbJsonLd([
		{ name: 'Bocken', path: '/' },
		{ name: tFaith.title, path: `/${faithSeg}` },
		{ name: tFaith.apologetics, path: `/${faithSeg}/${apolSeg}` },
		{ name: tFaith.evidences, path: `/${faithSeg}/${apolSeg}/pro` },
		{ name: argument.title, path: `/${faithSeg}/${apolSeg}/pro/${argument.id}` }
	]);

	return { argument, voices, layers, args: argsWithScripture, initialVoiceId, articleJsonLd, breadcrumbJsonLd };
};
