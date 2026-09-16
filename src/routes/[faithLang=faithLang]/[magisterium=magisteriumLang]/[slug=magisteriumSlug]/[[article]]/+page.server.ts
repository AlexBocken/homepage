import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { errorWithVerse } from '$lib/server/errorQuote';
import { document } from '$lib/server/magisterium';
import { entryOf } from '$lib/faith/magisterium';
import { parseRange } from '$lib/faith/councilTypes';
import type { MagisteriumLang } from '$lib/faith/magisteriumTypes';

export const load: PageServerLoad = async ({ params, url, fetch, parent }) => {
	const { lang } = await parent();

	const asked = url.searchParams.get('r');
	const found = await document(lang as MagisteriumLang, params.slug, !!params.article || !!asked);
	if (!found) await errorWithVerse(fetch, url.pathname, 404, 'Not found');

	// "Centesimus annus, 24" is an address, not a page of its own: it redirects
	// into the document, anchored at the article, exactly as a council citation
	// does. One renderer, and every citation on the site can be written as the
	// document numbers itself.
	if (params.article) {
		const range = parseRange(params.article, found!.document.articles.length);
		if (!range) await errorWithVerse(fetch, url.pathname, 404, 'Not found');
		// The range is always carried, even for a single article, because it is
		// what tells the page after the redirect that an article was asked for —
		// and an article has to be answered out of an edition that numbers them.
		redirect(308, `/${params.faithLang}/${params.magisterium}/${params.slug}?r=${range!.from}-${range!.to}#a${range!.from}`);
	}

	return {
		magisterium: params.magisterium,
		document: found!.document,
		/** The language it is really in, which is not always the one being read. */
		shown: found!.lang,
		/**
		 * Whether this language has the text at all. It may have it and still
		 * not be shown — an edition with no article numbers in it cannot answer
		 * a citation of one — and the two are not the same thing to say.
		 */
		published: entryOf(params.slug)?.langs.includes(lang as MagisteriumLang) ?? false,
		highlight: parseRange(asked ?? '', found!.document.articles.length)
	};
};
