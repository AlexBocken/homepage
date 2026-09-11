import type { PageServerLoad } from './$types';
import { errorWithVerse } from '$lib/server/errorQuote';
import { glossary, glossaryTerm, paragraphs, sectionTitle } from '$lib/server/ccc';
import { addressed } from '$lib/faith/cccText';
import type { CccLang } from '$lib/faith/cccTypes';

export const load: PageServerLoad = async ({ params, url, fetch, parent }) => {
	const { lang } = await parent();
	const term = glossaryTerm(lang as CccLang, params.term);
	if (!term) await errorWithVerse(fetch, url.pathname, 404, 'Not found');

	// The entry has no words of its own: what a reader gets is the Catechism's.
	const explained = await Promise.all(
		term!.defines.map(async (n) => {
			const found = await paragraphs(lang as CccLang, n);
			const paragraph = found?.paragraphs[0];
			return paragraph ? { n, html: addressed(lang as CccLang, paragraph.html), where: sectionTitle(lang as CccLang, found!.section), section: found!.section } : null;
		})
	);

	return {
		catechism: params.catechism,
		term: term!,
		explained: explained.filter((p): p is NonNullable<typeof p> => p !== null),
		siblings: glossary(lang as CccLang).map((t) => ({ slug: t.slug, label: t.label }))
	};
};
