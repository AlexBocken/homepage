import type { PageServerLoad } from './$types';
import { canonSlug, canonEntry } from '$lib/faith/bibleCanon';
import { chapterCount } from '$lib/faith/readingPlan';
import { errorWithVerse } from '$lib/server/errorQuote';
import { authorChapters, chapterChain, chapterText, fatherFor, bookIntro } from '$lib/server/commentary';
import { fatherById } from '$lib/faith/fathers';

/**
 * One commentator's text on one chapter: a homily or exposition (NPNF),
 * Haydock's chapter notes, or the Catena Aurea's chain for `aquinas`, in
 * which the Fathers speak in Aquinas's order.
 */
export const load: PageServerLoad = async ({ params, parent, fetch, url }) => {
	const slug = canonSlug(params.book);
	const chapter = Number(params.chapter);
	const author = params.author;
	if (!slug || !Number.isInteger(chapter) || chapter < 1 || chapter > chapterCount(slug) + 6 || !/^[a-z0-9-]{1,48}$/.test(author)) {
		await errorWithVerse(fetch, url.pathname, 404, 'Not found');
	}
	const { lang } = await parent();
	const commentaryLang = lang === 'en' ? 'en' : lang === 'la' ? 'la' : 'de';
	const [father, entries, chain, chapters, intro] = await Promise.all([
		fatherFor(author),
		chapterText(slug!, chapter, author, commentaryLang),
		author === 'aquinas' ? chapterChain(slug!, chapter, commentaryLang) : Promise.resolve([]),
		authorChapters(slug!, author),
		chapter === 1 ? bookIntro(slug!, author, commentaryLang) : Promise.resolve([])
	]);
	if (!father || (entries.length === 0 && chain.length === 0 && intro.length === 0)) {
		await errorWithVerse(fetch, url.pathname, 404, 'Not found');
	}
	// Names of the Fathers quoted in the chain, for the run-in labels.
	const chainAuthors: Record<string, { name: { en: string; de: string }; saint: boolean; hasPortrait: boolean }> = {};
	for (const e of chain) {
		if (chainAuthors[e.author]) continue;
		const fa = fatherById(e.author) ?? (await fatherFor(e.author));
		chainAuthors[e.author] = { name: fa?.name ?? { en: e.author, de: e.author }, saint: !!fa?.saint, hasPortrait: !!fa?.portrait };
	}
	const i = chapters.indexOf(chapter);
	return {
		bibleLang: params.bible,
		slug: slug!,
		chapter,
		bookName: canonEntry(slug!)?.[lang === 'la' ? 'la' : lang === 'en' ? 'en' : 'de'] ?? slug!,
		father: { id: father!.id, name: father!.name, saint: !!father!.saint, died: father!.died, group: father!.group, portrait: father!.portrait ? { artist: father!.portrait.artist, title: father!.portrait.title, year: father!.portrait.year } : null },
		entries: author === 'aquinas' ? [] : entries,
		chain,
		chainAuthors,
		intro,
		prev: i > 0 ? chapters[i - 1] : null,
		next: i >= 0 && i < chapters.length - 1 ? chapters[i + 1] : null
	};
};
