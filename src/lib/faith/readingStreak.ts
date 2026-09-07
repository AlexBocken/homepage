/**
 * Reading streaks with one grace day a week.
 *
 * A streak is a run of calendar days with reading. A single missing day
 * inside a run is bridged when no other bridged day lies within six days of
 * it, so one slip a week is forgiven; two are not. Bridged days do not count
 * toward the length. Today counts as pending, not missed, until it is over:
 * the streak is alive when the last reading day is today or yesterday, or the
 * day before yesterday with yesterday bridgeable.
 */
import { DONE_SHARE, addDays, chapterWords, dayDiff, inPlan, parseChapterKey, planLanes, wordsPerDay, type PlanId, type ReaderLang } from './readingPlan';

export type StreakInfo = {
	current: number;
	longest: number;
	/** Days forgiven inside the current streak, for the dots. */
	bridged: string[];
	lastDay: string | null;
	/** Yesterday was skipped and forgiven; the streak holds. */
	heldByGrace: boolean;
};

type Run = { days: string[]; bridged: string[] };

function canBridge(run: Run, gapDay: string): boolean {
	return run.bridged.every((b) => Math.abs(dayDiff(b, gapDay)) > 6);
}

export function streaks(readDays: Iterable<string>, today: string): StreakInfo {
	const days = [...new Set(readDays)].filter((d) => d <= today).sort();
	if (days.length === 0) return { current: 0, longest: 0, bridged: [], lastDay: null, heldByGrace: false };
	const runs: Run[] = [];
	let run: Run = { days: [days[0]], bridged: [] };
	for (let i = 1; i < days.length; i++) {
		const prev = days[i - 1];
		const cur = days[i];
		const gap = dayDiff(prev, cur);
		if (gap === 1) run.days.push(cur);
		else if (gap === 2 && canBridge(run, addDays(prev, 1))) {
			run.bridged.push(addDays(prev, 1));
			run.days.push(cur);
		} else {
			runs.push(run);
			run = { days: [cur], bridged: [] };
		}
	}
	runs.push(run);
	const longest = Math.max(...runs.map((r) => r.days.length));
	const last = runs[runs.length - 1];
	const lastDay = last.days[last.days.length - 1];
	const since = dayDiff(lastDay, today);
	let alive = since <= 1;
	let heldByGrace = false;
	if (!alive && since === 2 && canBridge(last, addDays(lastDay, 1))) {
		alive = true;
		heldByGrace = true;
	}
	return {
		current: alive ? last.days.length : 0,
		longest,
		bridged: alive ? [...last.bridged, ...(heldByGrace ? [addDays(lastDay, 1)] : [])] : [],
		lastDay,
		heldByGrace
	};
}

/** What the streak needs of a plan: its range, pace and start. */
export type StreakPlan = { plan: PlanId; lang: ReaderLang; minutesPerDay: number; startDate: string };

/**
 * The days that count toward the streak. With a plan running, a day counts
 * once the plan's daily target (the same nine tenths that finish "today")
 * was read *within the plan's books* on that day: a chapter of Genesis does
 * nothing for a New Testament plan, a chapter of Luke does. Days before the
 * plan began, and every reading day when no plan runs, count as they are.
 */
export function qualifyingDays(byDay: Map<string, Iterable<string>>, plan: StreakPlan | null): string[] {
	const days = [...byDay.keys()].sort();
	if (!plan) return days;
	const lanes = planLanes(plan.plan);
	const target = DONE_SHARE * wordsPerDay(plan.minutesPerDay, plan.lang);
	return days.filter((day) => {
		if (day < plan.startDate) return true;
		let words = 0;
		for (const key of byDay.get(day) ?? []) {
			const ref = parseChapterKey(key);
			if (ref && inPlan(lanes, ref)) words += chapterWords(ref.slug, ref.ch, plan.lang);
		}
		return words >= target;
	});
}
