import type { PageServerLoad } from './$types';
import { documents } from '$lib/server/council';
import type { CouncilLang } from '$lib/faith/councilTypes';

export const load: PageServerLoad = async ({ params, parent }) => {
	const { lang } = await parent();
	const all = await documents(lang as CouncilLang);
	return {
		council: params.council,
		documents: all.map((d) => ({ abbr: d.abbr, title: d.title, subtitle: d.subtitle, kind: d.kind, date: d.date, articles: d.articles.length }))
	};
};
