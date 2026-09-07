import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { availableBooks, loadBookPage, loadChapter } from '$lib/server/bibleBooks';
import { errorWithVerse } from '$lib/server/errorQuote';
import { PREFS_COOKIE, defaultPrefs, parsePrefs } from '$lib/faith/biblePrefs';
import { canonSlug } from '$lib/faith/bibleCanon';
import { readerToday, readingStateFor } from '$lib/server/bibleReading';
import { bookCoverage, chapterSummary } from '$lib/server/commentary';

export const load: PageServerLoad = async ({ params, fetch, url, cookies, parent }) => {
	// "Roem" and "ROEM" are welcome, but the address is the German abbreviation.
	const slug = canonSlug(params.book) ?? params.book.toLowerCase();
	if (slug !== params.book) {
		// Headers are ASCII: the umlaut goes percent-encoded, the browser shows it
		// plain. The fragment never reaches the server; browsers carry it over.
		redirect(301, `/${params.faithLang}/${params.bible}/${encodeURIComponent(slug)}${params.chapter ? `/${params.chapter}` : ''}${url.search}`);
	}
	if (!params.chapter) {
		// The book itself: its introduction and the commentaries on the whole book.
		const page = await loadBookPage(slug);
		if (!page) await errorWithVerse(fetch, url.pathname, 404, 'Not found');
		const { lang } = await parent();
		const prefs = parsePrefs(cookies.get(PREFS_COOKIE), defaultPrefs(lang, page!.has));
		const [summary, coverage] = await Promise.all([chapterSummary(slug, 0), bookCoverage(slug)]);
		return { kind: 'book' as const, page: page!, bookAuthors: summary.book, coverage, availableBooks: availableBooks(), bibleLang: params.bible, prefs };
	}
	const chapterNo = Number(params.chapter);
	if (!Number.isInteger(chapterNo) || chapterNo < 1) {
		await errorWithVerse(fetch, url.pathname, 404, 'Not found');
	}
	const chapter = await loadChapter(slug, chapterNo);
	if (!chapter) {
		await errorWithVerse(fetch, url.pathname, 404, 'Not found');
	}
	// The reader's saved display preferences, so SSR already matches them.
	const { lang, session } = await parent();
	const prefs = parsePrefs(cookies.get(PREFS_COOKIE), defaultPrefs(lang, chapter!.has));
	// Signed in: whether this chapter is read, the streak, and the plan's view
	// of today. The reader's calendar day comes from the UTC offset it keeps in a cookie.
	const nickname = session?.user?.nickname;
	const today = readerToday(cookies);
	const [reading, commentary] = await Promise.all([
		nickname ? readingStateFor(nickname, { slug, ch: chapterNo }, today) : Promise.resolve(null),
		chapterSummary(slug, chapterNo)
	]);
	return { kind: 'chapter' as const, chapter: chapter!, availableBooks: availableBooks(), bibleLang: params.bible, prefs, reading, today, commentary };
};
