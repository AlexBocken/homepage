import { error, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { availableBooks, loadBookPage, loadChapter } from '$lib/server/bibleBooks';
import { errorWithVerse } from '$lib/server/errorQuote';
import { PREFS_COOKIE, defaultPrefs, parsePrefs } from '$lib/faith/biblePrefs';
import { canonSlug } from '$lib/faith/bibleCanon';
import { activePlan, firstUnreadChapter, markRead, readerToday, readingLog, readingStateFor, unmarkRead, validKey } from '$lib/server/bibleReading';
import { chapterKey } from '$lib/faith/readingPlan';
import { bookCoverage, bookIntro, chapterSummary, fatherFor } from '$lib/server/commentary';
import { citingChapter } from '$lib/server/ccc';

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
		const { lang, session } = await parent();
		const prefs = parsePrefs(cookies.get(PREFS_COOKIE), defaultPrefs(lang, page!.has));
		// Signed in: the book's first unread chapter, offered beside "read chapter 1".
		const nickname = session?.user?.nickname;
		const firstUnread = nickname ? firstUnreadChapter(await readingLog(nickname), slug) : null;
		const commentaryLang = lang === 'en' ? 'en' : lang === 'la' ? 'la' : 'de';
		const [summary, coverage] = await Promise.all([chapterSummary(slug, 0, commentaryLang, prefs.langs), bookCoverage(slug)]);
		// The prefaces to the whole book, read in full: they are few and short enough to sit on the page.
		const prefaces = (
			await Promise.all(
				summary.book.map(async (a) => {
					const [father, entries] = await Promise.all([fatherFor(a.id), bookIntro(slug, a.id, commentaryLang, prefs.langs)]);
					return father && entries.length ? { author: { id: father.id, name: father.name, saint: !!father.saint, hasPortrait: !!father.portrait, died: father.died, group: father.group }, work: a.work, entries } : null;
				})
			)
		).filter((p): p is NonNullable<typeof p> => p !== null);
		return { kind: 'book' as const, page: page!, prefaces, coverage, availableBooks: availableBooks(), bibleLang: params.bible, prefs, firstUnread };
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
	// The commentators in the page's language where they have it (see pickLang).
	const commentaryLang = lang === 'en' ? 'en' : lang === 'la' ? 'la' : 'de';
	const [reading, commentary] = await Promise.all([
		nickname ? readingStateFor(nickname, { slug, ch: chapterNo }, today) : Promise.resolve(null),
		chapterSummary(slug, chapterNo, commentaryLang, prefs.langs)
	]);
	// Which paragraphs of the Catechism cite each verse — nothing for most chapters.
	return { kind: 'chapter' as const, chapter: chapter!, availableBooks: availableBooks(), bibleLang: params.bible, prefs, reading, today, commentary, ccc: citingChapter(slug, chapterNo) };
};

/**
 * "Chapter read" without script: the reader's buttons are forms that post
 * here, and the page comes back at its own address with the state re-read
 * (see readingStateFor). With script the reader talks to the API instead and
 * never submits. The day is the one the load uses, from the reader's cookie.
 */
async function setRead(event: Parameters<NonNullable<Actions[string]>>[0], on: boolean) {
	const { params, cookies, locals, url } = event;
	const session = locals.session ?? (await locals.auth());
	const username = session?.user?.nickname;
	if (!username) throw error(401, 'Authentication required');
	const slug = canonSlug(params.book);
	const key = slug && params.chapter ? chapterKey({ slug, ch: Number(params.chapter) }) : '';
	if (!validKey(key)) throw error(400, 'Not a chapter of the canon');
	const day = readerToday(cookies);
	if (on) await markRead(username, key, day, (await activePlan(username))?._id ?? null);
	else await unmarkRead(username, key, day);
	redirect(303, url.pathname);
}

export const actions: Actions = {
	read: (event) => setRead(event, true),
	unread: (event) => setRead(event, false)
};
