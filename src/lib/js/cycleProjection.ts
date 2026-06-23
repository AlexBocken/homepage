// Clue-style cycle projection, extracted from PeriodTracker.svelte so both the
// component and the server-side calendar feed compute identical predictions.
//
// Pure function of the logged periods. Day-snapping uses the injected `midnight`
// helper: the component passes a LOCAL midnight (browser tz = the user's days);
// the feed defaults to a UTC midnight (all-day ICS dates carry no timezone).

export interface PeriodInput {
	startDate: string | Date;
	endDate?: string | Date | null;
}

export interface CycleWindow {
	fertileStart: Date;
	fertileEnd: Date;
	peakStart: Date;
	peakEnd: Date;
	ovulation: Date;
	lutealStart: Date;
	lutealEnd: Date;
}

export interface FutureCycle extends CycleWindow {
	start: Date;
	end: Date;
}

export interface Projection {
	avgCycle: number;
	avgPeriod: number;
	cycleSd: number;
	periodSd: number;
	lastCycleLength: number | null;
	lastPeriodLength: number | null;
	predictedEndOfOngoing: Date | null;
	futureCycles: FutureCycle[];
	pastFertileWindows: CycleWindow[];
}

/** Midnight (ms) in UTC — default day-snapping for the timezone-free feed. */
export const utcMidnight = (d: Date): number => Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());

export function projectCycles(periods: PeriodInput[], midnight: (d: Date) => number = utcMidnight): Projection {
	// newest first
	const sorted = [...periods].sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
	const ongoing = sorted.find((p) => !p.endDate);
	// completed (have endDate), oldest first for the running averages
	const completed = sorted
		.filter((p) => p.endDate)
		.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

	const MEAN_WINDOW = 6; // average the last 6 cycles for the point estimate
	const VAR_WINDOW = 12; // ...over a 12-cycle history for variability
	const PRIOR_CYCLE = 29;
	const PRIOR_PERIOD = 5;
	const lutealLength = 14;

	const cycleLengths: number[] = [];
	const periodLengths: number[] = [];

	for (let i = 0; i < completed.length; i++) {
		const p = completed[i];
		const start = new Date(p.startDate);
		const end = new Date(p.endDate as string | Date);
		const dur = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
		periodLengths.push(dur);

		if (i > 0) {
			const prevStart = new Date(completed[i - 1].startDate);
			const cycle = Math.round((start.getTime() - prevStart.getTime()) / 86400000);
			if (cycle > 0 && cycle < 60) cycleLengths.push(cycle);
		}
	}

	/** Mean of the last `n` values, or `fallback` if there are none. */
	function recentMean(arr: number[], n: number, fallback: number) {
		if (arr.length === 0) return fallback;
		const w = arr.slice(-n);
		return w.reduce((a, b) => a + b, 0) / w.length;
	}
	/** Sample standard deviation of the last `n` values (0 if fewer than 2). */
	function recentSd(arr: number[], n: number) {
		const w = arr.slice(-n);
		if (w.length < 2) return 0;
		const m = w.reduce((a, b) => a + b, 0) / w.length;
		const variance = w.reduce((s, v) => s + (v - m) ** 2, 0) / (w.length - 1);
		return Math.sqrt(variance);
	}
	const meanCycle = recentMean(cycleLengths, MEAN_WINDOW, PRIOR_CYCLE);
	const meanPeriod = recentMean(periodLengths, MEAN_WINDOW, PRIOR_PERIOD);
	const cycleSd = Math.round(recentSd(cycleLengths, MEAN_WINDOW) * 10) / 10;
	const periodSd = Math.round(recentSd(periodLengths, MEAN_WINDOW) * 10) / 10;

	let predictedEndOfOngoing: Date | null = null;
	if (ongoing) {
		const ongoingStart = new Date(ongoing.startDate);
		predictedEndOfOngoing = new Date(ongoingStart.getTime() + (Math.round(meanPeriod) - 1) * 86400000);
	}

	// Generate future predicted cycles (12 cycles ≈ ~1 year)
	const meanCycleDays = Math.round(meanCycle);
	const cycleMs = meanCycleDays * 86400000;
	const periodMs = (Math.round(meanPeriod) - 1) * 86400000;
	const lastStart = sorted[0] ? new Date(sorted[0].startDate) : null;

	// Ovulation-timing uncertainty for widening future fertile windows.
	const delta = Math.round(Math.min(recentSd(cycleLengths, VAR_WINDOW), 5));

	function buildWindow(
		cycleStartMs: number,
		priorPeriodEndMs: number | null,
		nextPeriodStartMs: number,
		widen: boolean
	): CycleWindow {
		const ovMs = nextPeriodStartMs - lutealLength * 86400000;
		const d = widen ? delta : 0;
		const earliestOvMs = ovMs - d * 86400000;
		let latestOvMs = ovMs + d * 86400000;
		if (latestOvMs > nextPeriodStartMs - 86400000) latestOvMs = nextPeriodStartMs - 86400000;

		const floorMs = priorPeriodEndMs !== null ? priorPeriodEndMs + 86400000 : cycleStartMs;

		let fertileStartMs = Math.max(earliestOvMs - 5 * 86400000, floorMs, cycleStartMs);
		let peakStartMs = Math.max(ovMs - 2 * 86400000, floorMs, cycleStartMs);
		const peakEndMs = ovMs;
		const fertileEndMs = Math.max(latestOvMs, ovMs);

		if (peakStartMs > peakEndMs) peakStartMs = peakEndMs + 86400000;
		if (fertileStartMs > peakStartMs && peakStartMs <= peakEndMs) fertileStartMs = peakStartMs;

		return {
			fertileStart: new Date(fertileStartMs),
			fertileEnd: new Date(fertileEndMs),
			peakStart: new Date(peakStartMs),
			peakEnd: new Date(peakEndMs),
			ovulation: new Date(ovMs),
			lutealStart: new Date(latestOvMs + 86400000),
			lutealEnd: new Date(nextPeriodStartMs - 86400000)
		};
	}

	const futureCycles: FutureCycle[] = [];
	if (lastStart) {
		let base = lastStart.getTime();
		let priorPeriodEndMs: number;
		if (sorted[0]?.endDate) {
			priorPeriodEndMs = midnight(new Date(sorted[0].endDate as string | Date));
		} else if (predictedEndOfOngoing) {
			priorPeriodEndMs = midnight(predictedEndOfOngoing);
		} else {
			priorPeriodEndMs = base;
		}

		for (let i = 0; i < 12; i++) {
			const nextPeriodStartMs = base + cycleMs;
			const periodEndMs = nextPeriodStartMs + periodMs;
			const w = buildWindow(base, priorPeriodEndMs, nextPeriodStartMs, /* widen */ true);
			futureCycles.push({ start: new Date(nextPeriodStartMs), end: new Date(periodEndMs), ...w });
			base = nextPeriodStartMs;
			priorPeriodEndMs = periodEndMs;
		}
	}

	// Past fertility/luteal windows (from completed cycles)
	const pastFertileWindows: CycleWindow[] = [];
	for (let i = 1; i < completed.length; i++) {
		const cycleStartMs = midnight(new Date(completed[i - 1].startDate));
		const priorPeriodEndMs = completed[i - 1].endDate ? midnight(new Date(completed[i - 1].endDate as string | Date)) : null;
		const nextPeriodStartMs = midnight(new Date(completed[i].startDate));
		pastFertileWindows.push(buildWindow(cycleStartMs, priorPeriodEndMs, nextPeriodStartMs, /* widen */ false));
	}

	if (ongoing && completed.length > 0) {
		const last = completed[completed.length - 1];
		const cycleStartMs = midnight(new Date(last.startDate));
		const priorPeriodEndMs = last.endDate ? midnight(new Date(last.endDate as string | Date)) : null;
		const nextPeriodStartMs = midnight(new Date(ongoing.startDate));
		if (nextPeriodStartMs > cycleStartMs) {
			pastFertileWindows.push(buildWindow(cycleStartMs, priorPeriodEndMs, nextPeriodStartMs, /* widen */ false));
		}
	}

	let lastCycleLength: number | null = null;
	if (sorted.length >= 2) {
		const c = Math.round((midnight(new Date(sorted[0].startDate)) - midnight(new Date(sorted[1].startDate))) / 86400000);
		if (c > 0 && c < 60) lastCycleLength = c;
	}

	const lastPeriodLength = periodLengths.length > 0 ? periodLengths[periodLengths.length - 1] : null;

	return {
		avgCycle: Math.round(meanCycle * 10) / 10,
		avgPeriod: Math.round(meanPeriod * 10) / 10,
		cycleSd,
		periodSd,
		lastCycleLength,
		lastPeriodLength,
		predictedEndOfOngoing,
		futureCycles,
		pastFertileWindows
	};
}
