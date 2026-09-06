import type { PageServerLoad } from './$types';
import { availableBooks, bookSummary } from '$lib/server/bibleBooks';
import { activePlan, keysReadOn, perBook, planState, readingLog, validDay } from '$lib/server/bibleReading';
import { addDays } from '$lib/faith/readingPlan';
import { streaks } from '$lib/faith/readingStreak';
import { localDateStr } from '$lib/js/localDate';

export const load: PageServerLoad = async ({ params, parent, cookies }) => {
	const { session } = await parent();
	const nickname = session?.user?.nickname;
	// Signed in: how far each book is read. With a plan running: the streak
	// for the top of the page and the next chapter to read for the bottom.
	let progress: Record<string, number> | null = null;
	let planView: { streak: ReturnType<typeof streaks>; days: string[]; today: string; next: { slug: string; ch: number } | null; done: boolean } | null = null;
	if (nickname) {
		const [log, plan] = await Promise.all([readingLog(nickname), activePlan(nickname)]);
		progress = perBook(log);
		if (plan) {
			const dayCookie = cookies.get('bible_day');
			const today = validDay(dayCookie) ? dayCookie : localDateStr();
			const state = planState(plan, log, today, await keysReadOn(nickname, today));
			const first = state.today.items.find((i) => !i.read) ?? null;
			const gridStart = addDays(today, -13);
			planView = {
				streak: streaks(log.days, today),
				days: log.days.filter((d) => d >= gridStart),
				today,
				next: first ? { slug: first.slug, ch: first.ch } : null,
				done: state.today.done || state.finished
			};
		}
	}
	return {
		bibleLang: params.bible,
		books: availableBooks()
			.map((slug) => bookSummary(slug))
			.filter((b): b is NonNullable<typeof b> => b !== null),
		progress,
		hasPlan: planView !== null,
		planView
	};
};
