// How much weight / body fat came off between a reference point and the latest
// reading — the numbers behind the change tiles beside the dashboard's weight
// and body-fat charts. Pure so the maths is unit-testable and identical whether
// it runs during SSR or after a client-side reference-date change.

export interface DeltaSeries {
	dates?: string[];
	data?: (number | null)[];
	sma?: (number | null)[];
	/** Body-fat series only: `data`/`sma` are Δ percentage points from this. */
	baseline?: number | null;
}

export interface Sample {
	value: number;
	date: string;
}

export interface Delta {
	/** Signed change, negative meaning "lost". */
	delta: number;
	/** ISO dates of the two readings actually compared. */
	from: string;
	to: string;
}

const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** Trend values when the series carries them, raw readings otherwise. A delta
 *  read off the EMA trend is the honest one: it's the line the eye follows on
 *  the chart, and it doesn't swing on a single post-meal weigh-in. */
function valuesOf(s: DeltaSeries): (number | null | undefined)[] {
	const sma = s.sma ?? [];
	return sma.some(finite) ? sma : (s.data ?? []);
}

/** The reading at `targetMs`, else the closest one before it. Falls back to the
 *  very first reading when the target predates the series — a reference date
 *  older than the data can't invent history, so callers surface the date that
 *  was actually used rather than the one that was asked for. */
export function sampleAt(s: DeltaSeries, targetMs: number): Sample | null {
	const dates = s.dates ?? [];
	const values = valuesOf(s);
	let best: Sample | null = null;
	let first: Sample | null = null;
	for (let i = 0; i < dates.length; i++) {
		const v = values[i];
		if (!finite(v)) continue;
		const ms = new Date(dates[i]).getTime();
		if (!Number.isFinite(ms)) continue;
		if (!first) first = { value: v, date: dates[i] };
		if (ms <= targetMs) best = { value: v, date: dates[i] };
	}
	return best ?? first;
}

/** The most recent reading in the series. */
export function latestSample(s: DeltaSeries): Sample | null {
	return sampleAt(s, Infinity);
}

/** Weight change (kg) since `fromMs`. Null when there aren't two distinct
 *  readings to compare — one weigh-in is a value, not a trend. */
export function weightDelta(weight: DeltaSeries, fromMs: number): Delta | null {
	const from = sampleAt(weight, fromMs);
	const to = latestSample(weight);
	if (!from || !to || from.date === to.date) return null;
	return { delta: to.value - from.value, from: from.date, to: to.date };
}

/** Body-fat change since `fromMs`, either in percentage points or as kilos of
 *  fat mass (bodyweight × body-fat fraction at each end). The kg reading is the
 *  one that answers "did I lose fat or just weight", so it needs a weight
 *  reading near each body-fat reading and is null without one. */
export function bodyFatDelta(
	bf: DeltaSeries,
	weight: DeltaSeries,
	fromMs: number,
	unit: 'kg' | 'pp'
): Delta | null {
	const from = sampleAt(bf, fromMs);
	const to = latestSample(bf);
	if (!from || !to || from.date === to.date) return null;
	if (unit === 'pp') return { delta: to.value - from.value, from: from.date, to: to.date };

	// `data`/`sma` are Δ from `baseline`; fat mass needs the absolute percentage.
	const baseline = bf.baseline ?? 0;
	const wFrom = sampleAt(weight, new Date(from.date).getTime());
	const wTo = sampleAt(weight, new Date(to.date).getTime());
	if (!wFrom || !wTo) return null;
	const fatKg = (deltaPp: number, kg: number) => (kg * (baseline + deltaPp)) / 100;
	return {
		delta: fatKg(to.value, wTo.value) - fatKg(from.value, wFrom.value),
		from: from.date,
		to: to.date
	};
}
