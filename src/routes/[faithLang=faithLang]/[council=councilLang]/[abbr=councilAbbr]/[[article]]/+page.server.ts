import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { errorWithVerse } from '$lib/server/errorQuote';
import { document } from '$lib/server/council';
import { parseRange, type CouncilLang } from '$lib/faith/councilTypes';

export const load: PageServerLoad = async ({ params, url, fetch, parent }) => {
	const { lang } = await parent();

	// "LG 11" is an address, not a page of its own: it redirects into the
	// document, anchored at the article. One renderer, and every citation on the
	// site can be written as the council numbers it.
	if (params.article) {
		const range = parseRange(params.article, 999);
		if (!range) await errorWithVerse(fetch, url.pathname, 404, 'Not found');
		const span = range!.to !== range!.from ? `?r=${range!.from}-${range!.to}` : '';
		redirect(308, `/${params.faithLang}/${params.council}/${params.abbr}${span}#a${range!.from}`);
	}

	const doc = await document(lang as CouncilLang, params.abbr);
	if (!doc) await errorWithVerse(fetch, url.pathname, 404, 'Not found');

	return {
		council: params.council,
		document: doc!,
		highlight: parseRange(url.searchParams.get('r') ?? '', doc!.articles.length)
	};
};
