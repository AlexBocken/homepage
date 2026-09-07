import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { availableBooks, loadChapter } from '$lib/server/bibleBooks';
import { errorWithVerse } from '$lib/server/errorQuote';
import { PREFS_COOKIE, defaultPrefs, parsePrefs } from '$lib/faith/biblePrefs';
import { canonSlug } from '$lib/faith/bibleCanon';
import { readingStateFor, validDay } from '$lib/server/bibleReading';
import { localDateStr } from '$lib/js/localDate';
import { chapterSummary } from '$lib/server/commentary';

export const load: PageServerLoad = async ({ params, fetch, url, cookies, parent }) => {
	// "Roem" and "ROEM" are welcome, but the address is the German abbreviation.
	const slug = canonSlug(params.book) ?? params.book.toLowerCase();
	if (!params.chapter) {
		redirect(307, `${url.pathname.replace(/\/$/, '')}/1`);
	}
	if (slug !== params.book) {
		// Headers are ASCII: the umlaut goes percent-encoded, the browser shows it
		// plain. The fragment never reaches the server; browsers carry it over.
		redirect(301, `/${params.faithLang}/${params.bible}/${encodeURIComponent(slug)}/${params.chapter}${url.search}`);
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
	// of today. The reader's calendar day comes from a cookie it keeps.
	const nickname = session?.user?.nickname;
	const dayCookie = cookies.get('bible_day');
	const today = validDay(dayCookie) ? dayCookie : localDateStr();
	const [reading, commentary] = await Promise.all([
		nickname ? readingStateFor(nickname, { slug, ch: chapterNo }, today) : Promise.resolve(null),
		chapterSummary(slug, chapterNo)
	]);
	return { chapter: chapter!, availableBooks: availableBooks(), bibleLang: params.bible, prefs, reading, today, commentary };
};
