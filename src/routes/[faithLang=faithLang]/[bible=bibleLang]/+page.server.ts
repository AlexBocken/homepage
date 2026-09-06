import type { PageServerLoad } from './$types';
import { availableBooks, bookSummary } from '$lib/server/bibleBooks';
import { activePlan, perBook, readingLog } from '$lib/server/bibleReading';

export const load: PageServerLoad = async ({ params, parent }) => {
	const { session } = await parent();
	const nickname = session?.user?.nickname;
	// Signed in: how far each book is read, and whether a plan is running.
	let progress: Record<string, number> | null = null;
	let hasPlan = false;
	if (nickname) {
		const [log, plan] = await Promise.all([readingLog(nickname), activePlan(nickname)]);
		progress = perBook(log);
		hasPlan = !!plan;
	}
	return {
		bibleLang: params.bible,
		books: availableBooks()
			.map((slug) => bookSummary(slug))
			.filter((b): b is NonNullable<typeof b> => b !== null),
		progress,
		hasPlan
	};
};
