import { error } from '@sveltejs/kit';
import { ALEX_PICKS, findArgumentLang, getArchetypes, getArguments } from '$lib/data/apologetik';
import { generateContraQaJsonLd } from '$lib/js/apologetikJsonLd';
import { generateBreadcrumbJsonLd } from '$lib/js/breadcrumbJsonLd';
import { m as faithM, faithSlugFromLang, apologetikSlug, type FaithLang } from '$lib/js/faithI18n';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params, parent, setHeaders }) => {
	setHeaders({ 'Cache-Control': 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400' });
	const parentData = await parent();
	const lang = parentData.lang as FaithLang;
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
	const qaJsonLd = generateContraQaJsonLd(arg, archetypes, lang);
	const tFaith = faithM[lang];
	const faithSeg = faithSlugFromLang(lang);
	const apolSeg = apologetikSlug(lang === 'la' ? 'en' : lang);
	const breadcrumbJsonLd = generateBreadcrumbJsonLd([
		{ name: 'Bocken', path: '/' },
		{ name: tFaith.title, path: `/${faithSeg}` },
		{ name: tFaith.apologetics, path: `/${faithSeg}/${apolSeg}` },
		{ name: tFaith.objections, path: `/${faithSeg}/${apolSeg}/contra` },
		{ name: arg.title, path: `/${faithSeg}/${apolSeg}/contra/${arg.id}` }
	]);
	return {
		argument: arg,
		archetypes,
		args,
		alexPicks: ALEX_PICKS[params.argId] ?? [],
		initialArchId,
		qaJsonLd,
		breadcrumbJsonLd
	};
};
