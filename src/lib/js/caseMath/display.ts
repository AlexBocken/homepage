/** How answers and timings are shown in the case-math UI. */

import { fmt, fmtPlain } from './parse';

/** An answer with its unit, as it should be said: "$4.5M", "12.5%", "3.5 years". */
export function showAnswer(answer: number, unit?: string): string {
	if (unit === '%') return `${fmtPlain(answer, 2)}%`;
	if (unit === '$') return `${answer < 0 ? '−' : ''}$${fmt(Math.abs(answer), 3)}`;
	if (unit) return `${fmt(answer, 2)} ${unit}`;
	const short = fmt(answer, 3);
	const long = fmtPlain(answer, 3);
	return short === long ? long : `${short} (${long})`;
}

/** Seconds with one decimal: 6.4s. */
export function secs(ms: number): string {
	return `${(ms / 1000).toFixed(1)}s`;
}

export function percent(fraction: number | null): string {
	return fraction === null ? '—' : `${Math.round(fraction * 100)}%`;
}
