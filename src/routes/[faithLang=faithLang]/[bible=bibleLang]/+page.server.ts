import type { PageServerLoad } from './$types';
import { availableBooks, bookSummary } from '$lib/server/bibleBooks';
import { activePlan, keysReadOn, perBook, planPeriods, planState, readerToday, readingLog, streakDays, streakFor } from '$lib/server/bibleReading';
import { addDays } from '$lib/faith/readingPlan';
import type { StreakInfo } from '$lib/faith/readingStreak';

export const load: PageServerLoad = async ({ params, parent, cookies }) => {
	const { session } = await parent();
	const nickname = session?.user?.nickname;
	// Signed in: how far each book is read. With a plan running: the streak
	// for the top of the page and the next chapter to read for the bottom.
	let progress: Record<string, number> | null = null;
	let planView: { streak: StreakInfo; days: string[]; today: string; next: { slug: string; ch: number } | null; done: boolean } | null = null;
	if (nickname) {
		const [log, plan, periods] = await Promise.all([readingLog(nickname), activePlan(nickname), planPeriods(nickname)]);
		progress = perBook(log);
		if (plan) {
			const today = readerToday(cookies);
			const state = planState(plan, log, today, await keysReadOn(nickname, today));
			const first = state.today.items.find((i) => !i.read) ?? null;
			const gridStart = addDays(today, -13);
			planView = {
				streak: streakFor(log, periods, today),
				days: streakDays(log, periods).filter((d) => d >= gridStart),
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
