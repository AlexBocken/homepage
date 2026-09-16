import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { errorWithVerse } from '$lib/server/errorQuote';
import { document } from '$lib/server/magisterium';
import { parseRange } from '$lib/faith/councilTypes';
import type { MagisteriumLang } from '$lib/faith/magisteriumTypes';

export const load: PageServerLoad = async ({ params, url, fetch, parent }) => {
	const { lang } = await parent();

	const found = await document(lang as MagisteriumLang, params.slug);
	if (!found) await errorWithVerse(fetch, url.pathname, 404, 'Not found');

	// "Centesimus annus, 24" is an address, not a page of its own: it redirects
	// into the document, anchored at the article, exactly as a council citation
	// does. One renderer, and every citation on the site can be written as the
	// document numbers itself.
	if (params.article) {
		const range = parseRange(params.article, found!.document.articles.length);
		if (!range) await errorWithVerse(fetch, url.pathname, 404, 'Not found');
		const span = range!.to !== range!.from ? `?r=${range!.from}-${range!.to}` : '';
		redirect(308, `/${params.faithLang}/${params.magisterium}/${params.slug}${span}#a${range!.from}`);
	}

	return {
		magisterium: params.magisterium,
		document: found!.document,
		/** The language it is really in, which is not always the one being read. */
		shown: found!.lang,
		highlight: parseRange(url.searchParams.get('r') ?? '', found!.document.articles.length)
	};
};
