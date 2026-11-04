/**
 * Answer parsing, number formatting and grading for the case-math drills.
 *
 * Answers are typed the way you'd say them in a case: `3.2M`, `450k`, `1.2bn`,
 * `12.5%`, `1/8`, `3,200`, `2.5e6`. Percent answers are stored in percent units
 * (12.5, not 0.125), so a trailing `%` is simply dropped.
 */

const SUFFIX: Record<string, number> = {
	k: 1e3,
	m: 1e6,
	mm: 1e6,
	mn: 1e6,
	mio: 1e6,
	b: 1e9,
	bn: 1e9,
	t: 1e12,
	tn: 1e12
};

/** Turn what was typed into a number, or `null` when it isn't one. */
export function parseAnswer(raw: string): number | null {
	let s = raw.trim().toLowerCase().replace(/[\s'’$€£]/g, '').replace(/−/g, '-');
	if (!s) return null;
	s = s.replace(/%$/, '');

	const frac = s.match(/^(-?\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)$/);
	if (frac) {
		const d = Number(frac[2]);
		return d === 0 ? null : Number(frac[1]) / d;
	}

	const m = s.match(/^(-?[\d.,]+(?:e[+-]?\d+)?)([a-z]*)$/);
	if (!m) return null;
	let num = m[1];
	const suffix = m[2];
	if (suffix && !(suffix in SUFFIX)) return null;

	// "3,200" / "1,250,000.5" are thousands separators; a lone "3,2" is a decimal comma.
	if (/^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(num)) num = num.replace(/,/g, '');
	else if (/^-?\d+,\d+$/.test(num)) num = num.replace(',', '.');
	if (!/^-?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/.test(num)) return null;

	const value = Number(num) * (suffix ? SUFFIX[suffix] : 1);
	return Number.isFinite(value) ? value : null;
}

/** Round away float noise (0.1 + 0.2) without losing meaningful digits. */
export function clean(n: number): number {
	return Number(n.toPrecision(12));
}

/** Plain number with thousands separators: 12500 → "12,500", 0.125 → "0.125". */
export function fmtPlain(n: number, maxDecimals = 3): string {
	return clean(n).toLocaleString('en-US', { maximumFractionDigits: maxDecimals });
}

/**
 * Compact case-style number: 3200000 → "3.2M", 450000 → "450k", 1.25e9 → "1.25B".
 * Values under 10k are written out (7,500), as you'd say them.
 */
export function fmt(n: number, maxDecimals = 2): string {
	const abs = Math.abs(n);
	const units: [number, string][] = [
		[1e12, 'T'],
		[1e9, 'B'],
		[1e6, 'M'],
		[1e3, 'k']
	];
	for (const [size, label] of units) {
		if (abs >= size && (size > 1e3 || abs >= 1e4)) {
			return `${fmtPlain(n / size, maxDecimals)}${label}`;
		}
	}
	return fmtPlain(n, maxDecimals);
}

export type Grade = { correct: boolean; relErr: number | null };

/**
 * Grade a typed answer. `tolerance` is relative (0.05 = within 5%); 0 means the
 * exact value, give or take float noise.
 */
export function grade(answer: number, given: number | null, tolerance: number): Grade {
	if (given === null || !Number.isFinite(given)) return { correct: false, relErr: null };
	const diff = Math.abs(given - answer);
	const relErr = answer === 0 ? diff : diff / Math.abs(answer);
	const allowed = Math.max(tolerance, 1e-9);
	return { correct: relErr <= allowed, relErr };
}

/** The magnitudes `fmt` writes into questions. */
const QUESTION_UNITS: Record<string, number> = { k: 1e3, M: 1e6, B: 1e9, T: 1e12 };

/** The k/M/B/T magnitudes a question's text is written in ("$820k", "16M ÷ 8,000"). */
export function questionUnits(text: string): string[] {
	const found = new Set<string>();
	for (const m of text.matchAll(/\d(k|M|B|T)(?![A-Za-z])/g)) found.add(m[1]);
	return [...found];
}

/** A plain number with no magnitude, percent, fraction or exponent: "246", "3,840", "1.5". */
function isBare(raw: string): boolean {
	const s = raw.trim().replace(/[\s'’$€£]/g, '').replace(/−/g, '-');
	return /^-?[\d.,]+$/.test(s) && /\d/.test(s);
}

export type UnitGrade = Grade & {
	/** The question's unit a bare answer was read in ("k" when "246" counted as 246k). */
	readAs?: string;
};

/**
 * Grade what was typed against a question. Besides the literal reading, a bare
 * number counts in any magnitude the question itself is written in, so "246"
 * for "Revenue $820k, costs $574k. Profit?" is 246k, as you'd say it in a case.
 * Only the question's own units qualify, and only where the answer is at least
 * one of them (no reading "0.05" as 50 because a k appeared in the question).
 */
export function gradeAnswer(
	q: { prompt: string; facts?: string[]; answer: number; tolerance: number; unit?: string },
	raw: string
): UnitGrade {
	const given = parseAnswer(raw);
	const literal = grade(q.answer, given, q.tolerance);
	if (literal.correct || given === null || q.unit === '%' || !isBare(raw)) return literal;

	for (const u of questionUnits([q.prompt, ...(q.facts ?? [])].join(' '))) {
		const scale = QUESTION_UNITS[u];
		if (Math.abs(q.answer) < scale) continue;
		const g = grade(q.answer, clean(given * scale), q.tolerance);
		if (g.correct) return { ...g, readAs: u };
	}
	return literal;
}
