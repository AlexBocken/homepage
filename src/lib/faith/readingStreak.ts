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
import { addDays, dayDiff } from './readingPlan';

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
