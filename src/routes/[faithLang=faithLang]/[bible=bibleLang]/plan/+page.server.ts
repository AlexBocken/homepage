import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { PLAN_IDS, addDays } from '$lib/faith/readingPlan';
import { CANON_BY_TESTAMENT } from '$lib/faith/bibleCanon';
import { activePlan, alreadyReadOf, keysReadOn, perBook, planState, readerToday, readingLog, streakDays, streakFor } from '$lib/server/bibleReading';

/** One reader's plan page. The hooks already bounce anonymous visitors to login. */
export const load: PageServerLoad = async ({ parent, cookies, params, url }) => {
	const { session } = await parent();
	const nickname = session?.user?.nickname;
	if (!nickname) redirect(303, `/login?callbackUrl=${encodeURIComponent(url.pathname)}`);
	const today = readerToday(cookies);
	const [plan, log] = await Promise.all([activePlan(nickname), readingLog(nickname)]);
	const state = plan ? planState(plan, log, today, await keysReadOn(nickname, today)) : null;
	const alreadyRead = plan ? null : Object.fromEntries(PLAN_IDS.map((id) => [id, alreadyReadOf(id, log)]));
	const counts = perBook(log);
	const sum = (slugs: string[]) => slugs.reduce((n, s) => n + (counts[s] ?? 0), 0);
	const gridStart = addDays(today, -83);
	return {
		bibleLang: params.bible,
		today,
		state,
		alreadyRead,
		streak: streakFor(log, plan, today),
		days: streakDays(log, plan).filter((d) => d >= gridStart),
		gridStart,
		record: { total: log.chapters.size, ot: sum(CANON_BY_TESTAMENT.ot), nt: sum(CANON_BY_TESTAMENT.nt) },
		readerName: session.user?.name ?? nickname
	};
};
