import type { PageServerLoad } from './$types';
import { canonSlug, canonEntry } from '$lib/faith/bibleCanon';
import { errorWithVerse } from '$lib/server/errorQuote';
import { bookIntro, fatherFor, type Entry } from '$lib/server/commentary';

/** One commentator's preface to a whole book (the Catena Aurea's, Haydock's), the page behind the discs on the book's page. */
export const load: PageServerLoad = async ({ params, parent, fetch, url }) => {
	const slug = canonSlug(params.book);
	const author = params.author;
	if (!slug || !/^[a-z0-9-]{1,48}$/.test(author)) await errorWithVerse(fetch, url.pathname, 404, 'Not found');
	const { lang } = await parent();
	const commentaryLang = lang === 'en' ? 'en' : lang === 'la' ? 'la' : 'de';
	const [father, intro] = await Promise.all([fatherFor(author), bookIntro(slug!, author, commentaryLang)]);
	if (!father || intro.length === 0) await errorWithVerse(fetch, url.pathname, 404, 'Not found');
	return {
		bibleLang: params.bible,
		slug: slug!,
		chapter: 0,
		bookName: canonEntry(slug!)?.[lang === 'la' ? 'la' : lang === 'en' ? 'en' : 'de'] ?? slug!,
		father: { id: father!.id, name: father!.name, saint: !!father!.saint, died: father!.died, group: father!.group, portrait: father!.portrait ? { artist: father!.portrait.artist, title: father!.portrait.title, year: father!.portrait.year } : null },
		entries: [] as Entry[],
		intro,
		prev: null,
		next: null
	};
};
