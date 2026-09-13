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

/** A pace as it stood from `from` on; several may share a day (see `paceOn`). */
export type PacePoint = { from: string; minutesPerDay: number };

/**
 * One stretch of days a plan was the reader's active one, with the pace as
 * it changed inside it. `to` is null while the stretch is still open.
 */
export type PlanPeriod = { plan: PlanId; lang: ReaderLang; from: string; to: string | null; paces: PacePoint[] };

/**
 * The goal that stood on a day. When a day carries several points — the pace
 * was changed that very day — the *gentlest* of them wins, so re-aiming
 * upward at noon never takes back a morning that already counted.
 */
export function paceOn(paces: PacePoint[], day: string): number {
	let carried = paces[0]?.minutesPerDay ?? 0;
	let sameDay: number | null = null;
	for (const p of paces) {
		if (p.from > day) break;
		if (p.from === day) sameDay = sameDay === null ? p.minutesPerDay : Math.min(sameDay, p.minutesPerDay);
		else carried = p.minutesPerDay;
	}
	return sameDay ?? carried;
}

/** Whether a day met one plan period's goal, read inside that plan's books. */
function metOn(period: PlanPeriod, keys: Iterable<string>, day: string): boolean {
	const lanes = planLanes(period.plan);
	const target = DONE_SHARE * wordsPerDay(paceOn(period.paces, day), period.lang);
	let words = 0;
	for (const key of keys) {
		const ref = parseChapterKey(key);
		if (ref && inPlan(lanes, ref)) words += chapterWords(ref.slug, ref.ch, period.lang);
	}
	return words >= target;
}

/**
 * The days that count toward the streak. A day is read under the plan that
 * ran *on that day*, at the pace that stood *on that day*: it counts once
 * that plan's daily target — the same one that finishes "today" — was read
 * within that plan's books. Days no plan covers — before the first plan,
 * between two of them — count as they are. Nothing later can unmake a day:
 * changing pace, switching plans and ending one all leave the past judged as
 * it was judged then, and where two periods overlap (the day of a switch)
 * meeting either one is enough.
 */
export function qualifyingDays(byDay: Map<string, Iterable<string>>, periods: PlanPeriod[]): string[] {
	const days = [...byDay.keys()].sort();
	if (periods.length === 0) return days;
	return days.filter((day) => {
		const covering = periods.filter((p) => p.from <= day && (p.to === null || day <= p.to));
		if (covering.length === 0) return true;
		return covering.some((p) => metOn(p, byDay.get(day) ?? [], day));
	});
}
