/**
 * The case-math skill catalog. Each skill turns (level, rng) into one question,
 * deterministically, so a (skill, level, seed) triple names a question on both
 * client and server. Levels run 1–5: bigger numbers, more steps, decimals and
 * k/M/B magnitudes, and (for estimates) tighter tolerances.
 *
 * Every question carries its worked solution in `steps`, written the way you'd
 * do it in your head, so a miss doubles as a lesson.
 */

import { type Rng, int, intNotRound, mulberry32, pick } from './rng';
import { clean, fmt, fmtPlain } from './parse';

export type Category = 'core' | 'case' | 'estimate';

export type Question = {
	/** The question itself. For word problems, just the ask ("Annual market?"). */
	prompt: string;
	/** The givens of a word problem, one per line, shown above the ask. */
	facts?: string[];
	answer: number;
	/** Relative tolerance: 0 = exact, 0.05 = within 5%. */
	tolerance: number;
	/** Shown beside the answer box ("%", "years", "$"). */
	unit?: string;
	steps: string[];
};

export type Skill = {
	id: string;
	category: Category;
	title: string;
	blurb: string;
	/** What a fluent answer takes at a level, in ms. Drives promotion. */
	targetMs: (level: number) => number;
	generate: (level: number, rng: Rng) => Question;
};

export const MAX_LEVEL = 5;

export const CATEGORIES: { id: Category; title: string; blurb: string }[] = [
	{ id: 'core', title: 'Core arithmetic', blurb: 'Fast, exact mental math with big numbers.' },
	{ id: 'case', title: 'Case math', blurb: 'The formulas that come up in every case.' },
	{ id: 'estimate', title: 'Estimation', blurb: 'Good-enough answers, fast. Graded within a tolerance.' }
];

const SEC = 1000;
const timing = (...secs: number[]) => (level: number) => secs[Math.min(level, secs.length) - 1] * SEC;
const CORE_TIME = timing(6, 8, 12, 15, 20);
const CASE_TIME = timing(12, 18, 25, 30, 40);
const EST_TIME = timing(10, 12, 15, 20, 25);

const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹';
const sup = (n: number) => String(n).replace(/\d/g, (d) => SUP[Number(d)]);
const money = (n: number) => `$${fmt(n)}`;
const pct = (n: number) => `${fmtPlain(n, 2)}%`;
const signed = (n: number) => (n > 0 ? `+${fmtPlain(n, 2)}` : n < 0 ? `−${fmtPlain(-n, 2)}` : '0');

/** m × 10^e, exact for the integer mantissas used here. */
const num = (m: number, e: number) => clean(m * 10 ** e);

type Factor = { m: number; e: number; v: number };

/** A `digits`-digit mantissa that doesn't end in 0, times 10^e. */
function factor(rng: Rng, digits: number, eMin: number, eMax: number): Factor {
	const m = digits === 1 ? int(rng, 2, 9) : intNotRound(rng, 10 ** (digits - 1), 10 ** digits - 1);
	const e = int(rng, eMin, eMax);
	return { m, e, v: num(m, e) };
}

const decompose = (f: Factor) => (f.e === 0 ? `${f.m}` : `${fmt(f.v)} = ${f.m} × 10${sup(f.e)}`);

/** A number with `sig` significant digits (not round) at roughly 10^e, for estimates. */
function ugly(rng: Rng, sig: number, eMin: number, eMax: number): number {
	const m = intNotRound(rng, 10 ** (sig - 1) + 1, 10 ** sig - 1);
	return num(m, int(rng, eMin, eMax));
}

/** Round to one or two significant figures, the way you would to estimate. */
function roundSig(n: number, sig: number): number {
	if (n === 0) return 0;
	const e = Math.floor(Math.log10(Math.abs(n))) - sig + 1;
	return clean(Math.round(n / 10 ** e) * 10 ** e);
}

/** One significant figure, unless that's off by more than ~12% (144 → 140, not 100). */
function roundFriendly(n: number): number {
	const one = roundSig(n, 1);
	return Math.abs(one / n - 1) > 0.12 ? roundSig(n, 2) : one;
}

function gcd(a: number, b: number): number {
	return b === 0 ? a : gcd(b, a % b);
}

// ─── Core ────────────────────────────────────────────────────────────────

const mulZeros: Skill = {
	id: 'mul-zeros',
	category: 'core',
	title: 'Multiply with zeros',
	blurb: 'Strip the zeros, multiply the digits, add the zeros back.',
	targetMs: CORE_TIME,
	generate(level, rng) {
		const specs: [number, number, number][][] = [
			[[1, 1, 2], [1, 1, 2]],
			[[2, 1, 3], [1, 1, 3]],
			[[2, 3, 6], [2, 0, 2]],
			[[2, 3, 6], [2, 1, 3]],
			[[2, 3, 4], [1, 0, 2], [2, 0, 1]]
		];
		const fs = specs[level - 1].map(([d, lo, hi]) => factor(rng, d, lo, hi));
		const answer = clean(fs.reduce((p, f) => p * f.v, 1));
		const mProd = fs.reduce((p, f) => p * f.m, 1);
		const eSum = fs.reduce((s, f) => s + f.e, 0);
		const show = level >= 3 ? fmt : fmtPlain;
		return {
			prompt: fs.map((f) => show(f.v)).join(' × '),
			answer,
			tolerance: 0,
			steps: [
				...fs.filter((f) => f.e > 0).map(decompose),
				`Strip the zeros: ${fs.map((f) => f.m).join(' × ')} = ${fmtPlain(mProd)}`,
				`Add back 10${sup(eSum)}: ${fmtPlain(mProd)} × 10${sup(eSum)} = ${fmt(answer, 4)} (${fmtPlain(answer)})`
			]
		};
	}
};

const divZeros: Skill = {
	id: 'div-zeros',
	category: 'core',
	title: 'Divide with zeros',
	blurb: 'Divide the digits, then subtract the zeros.',
	targetMs: CORE_TIME,
	generate(level, rng) {
		const specs: [number, number, number, number, number, number][] = [
			[1, 1, 2, 1, 0, 1],
			[2, 1, 2, 1, 1, 2],
			[1, 2, 5, 1, 1, 3],
			[2, 2, 4, 1, 2, 3],
			[2, 2, 4, 2, 1, 3]
		];
		const [qd, qlo, qhi, dd, dlo, dhi] = specs[level - 1];
		const q = factor(rng, qd, qlo, qhi);
		const d = factor(rng, dd, dlo, dhi);
		const dividend: Factor = { m: q.m * d.m, e: q.e + d.e, v: clean(q.v * d.v) };
		const show = level >= 3 ? fmt : fmtPlain;
		return {
			prompt: `${show(dividend.v)} ÷ ${show(d.v)}`,
			answer: q.v,
			tolerance: 0,
			steps: [
				`Digits: ${fmtPlain(dividend.m)} ÷ ${d.m} = ${q.m}`,
				`Zeros: 10${sup(dividend.e)} ÷ 10${sup(d.e)} = 10${sup(q.e)}`,
				`${q.m} × 10${sup(q.e)} = ${fmt(q.v)} (${fmtPlain(q.v)})`
			]
		};
	}
};

type Trick = 'x5' | 'x9' | 'x11' | 'x15' | 'x25' | 'x75' | 'x99' | 'x125';
const TRICK_FACTOR: Record<Trick, number> = { x5: 5, x9: 9, x11: 11, x15: 15, x25: 25, x75: 75, x99: 99, x125: 125 };

function trickSteps(t: Trick, n: number): string[] {
	const a = fmtPlain;
	switch (t) {
		case 'x5':
			return [`×5 = ×10 ÷ 2`, `${a(n)} × 10 = ${a(n * 10)}, ÷ 2 = ${a(n * 5)}`];
		case 'x9':
			return [`×9 = ×10 − ×1`, `${a(n * 10)} − ${a(n)} = ${a(n * 9)}`];
		case 'x11': {
			if (n < 100) {
				const [d1, d2] = [Math.floor(n / 10), n % 10];
				return [
					`×11 on two digits: put their sum in the middle`,
					`${d1}_${d2} with ${d1} + ${d2} = ${d1 + d2}${d1 + d2 > 9 ? ' (carry the 1)' : ''} → ${a(n * 11)}`
				];
			}
			return [`×11 = ×10 + ×1`, `${a(n * 10)} + ${a(n)} = ${a(n * 11)}`];
		}
		case 'x15':
			return [`×15 = ×10 plus half of that`, `${a(n * 10)} + ${a(n * 5)} = ${a(n * 15)}`];
		case 'x25':
			return [`×25 = ×100 ÷ 4`, `${a(n * 100)} ÷ 4 = ${a(n * 25)}`];
		case 'x75':
			return [`×75 = ×100 × ¾`, `${a(n * 100)} ÷ 4 = ${a(n * 25)}, × 3 = ${a(n * 75)}`];
		case 'x99':
			return [`×99 = ×100 − ×1`, `${a(n * 100)} − ${a(n)} = ${a(n * 99)}`];
		case 'x125':
			return [`×125 = ×1000 ÷ 8`, `${a(n * 1000)} ÷ 8 = ${a(n * 125)}`];
	}
}

const mulTricks: Skill = {
	id: 'mul-tricks',
	category: 'core',
	title: 'Multiplication shortcuts',
	blurb: '×5, ×9, ×11, ×15, ×25, ×75, ×99, ×125 without long multiplication.',
	targetMs: timing(5, 6, 8, 10, 12),
	generate(level, rng) {
		const pools: Trick[][] = [
			['x5', 'x9'],
			['x5', 'x9', 'x11', 'x25'],
			['x11', 'x25', 'x99', 'x15'],
			['x25', 'x125', 'x99', 'x15', 'x75'],
			['x125', 'x75', 'x15', 'x99', 'x25']
		];
		const t = pick(rng, pools[level - 1]);
		const ranges: [number, number][] = [[12, 98], [12, 98], [12, 240], [102, 680], [104, 2480]];
		// ×11's digit trick is a two-digit trick; keep it there below level 4.
		const [lo, hi] = t === 'x11' && level < 4 ? [12, 98] : ranges[level - 1];
		const n = intNotRound(rng, lo, hi);
		return {
			prompt: `${fmtPlain(n)} × ${TRICK_FACTOR[t]}`,
			answer: n * TRICK_FACTOR[t],
			tolerance: 0,
			steps: trickSteps(t, n)
		};
	}
};

const nearRound: Skill = {
	id: 'near-round',
	category: 'core',
	title: 'Near-round numbers',
	blurb: '49 × 38 = 50 × 38 − 38. Round, multiply, correct.',
	targetMs: CORE_TIME,
	generate(level, rng) {
		const a = fmtPlain;
		if (level <= 3) {
			const x = level === 1 ? int(rng, 3, 9) : intNotRound(rng, 12, 89);
			const round = level === 3 ? int(rng, 1, 9) * 100 : int(rng, 2, 9) * 10;
			const d = (level === 3 ? int(rng, 1, 3) : 1) * pick(rng, [-1, 1]);
			const y = round + d;
			const answer = x * y;
			return {
				prompt: `${a(x)} × ${a(y)}`,
				answer,
				tolerance: 0,
				steps: [
					`${a(y)} = ${a(round)} ${d < 0 ? '−' : '+'} ${Math.abs(d)}`,
					`${a(x)} × ${a(round)} = ${a(x * round)}`,
					`${d < 0 ? '−' : '+'} ${a(x)} × ${Math.abs(d)} = ${a(Math.abs(x * d))} → ${a(answer)}`
				]
			};
		}
		if (level === 4) {
			const da = int(rng, 1, 9) * pick(rng, [-1, 1]);
			const db = int(rng, 1, 9) * pick(rng, [-1, 1]);
			const [x, y] = [100 + da, 100 + db];
			const answer = x * y;
			return {
				prompt: `${x} × ${y}`,
				answer,
				tolerance: 0,
				steps: [
					`Both near 100: (100 ${da < 0 ? '−' : '+'} ${Math.abs(da)})(100 ${db < 0 ? '−' : '+'} ${Math.abs(db)})`,
					`Hundreds: 100 ${da + db < 0 ? '−' : '+'} ${Math.abs(da + db)} = ${100 + da + db} → ${a((100 + da + db) * 100)}`,
					`Plus the product of the offsets: ${signed(da * db)} → ${a(answer)}`
				]
			};
		}
		const mid = int(rng, 2, 9) * 10;
		const d = int(rng, 1, 9);
		const answer = (mid - d) * (mid + d);
		return {
			prompt: `${mid - d} × ${mid + d}`,
			answer,
			tolerance: 0,
			steps: [
				`Symmetric around ${mid}: (${mid} − ${d})(${mid} + ${d}) = ${mid}² − ${d}²`,
				`${a(mid * mid)} − ${d * d} = ${a(answer)}`
			]
		};
	}
};

const squares: Skill = {
	id: 'squares',
	category: 'core',
	title: 'Squares',
	blurb: 'Squares ending in 5, near 50, near 100, and any two-digit number.',
	targetMs: timing(4, 5, 7, 8, 12),
	generate(level, rng) {
		const a = fmtPlain;
		let n: number;
		let steps: string[];
		switch (level) {
			case 1:
				n = int(rng, 11, 25);
				steps = [`Learn 11²–25² by heart; ${n}² = ${a(n * n)}`];
				break;
			case 2: {
				const t = int(rng, 1, 9);
				n = t * 10 + 5;
				steps = [`Ends in 5: ${t} × ${t + 1} = ${t * (t + 1)}, then append 25`, `→ ${a(n * n)}`];
				break;
			}
			case 3: {
				const d = int(rng, 1, 9) * pick(rng, [-1, 1]);
				n = 50 + d;
				steps = [
					`Near 50: hundreds = 25 ${d < 0 ? '−' : '+'} ${Math.abs(d)} = ${25 + d}`,
					`Append ${d}² = ${String(d * d).padStart(2, '0')} → ${a(n * n)}`
				];
				break;
			}
			case 4: {
				const d = int(rng, 1, 12) * pick(rng, [-1, 1]);
				n = 100 + d;
				steps = [
					`Near 100: ${n} ${d < 0 ? '−' : '+'} ${Math.abs(d)} = ${n + d} hundreds`,
					`Append ${d}² = ${String(d * d).padStart(2, '0')} → ${a(n * n)}`
				];
				break;
			}
			default: {
				n = intNotRound(rng, 21, 99);
				const d = Math.min(n % 10, 10 - (n % 10));
				const [lo, hi] = [n - d, n + d];
				steps = [
					`Go to the nearest ten: ${n}² = ${lo} × ${hi} + ${d}²`,
					`${lo} × ${hi} = ${a(lo * hi)}, + ${d * d} = ${a(n * n)}`
				];
			}
		}
		return { prompt: `${n}²`, answer: n * n, tolerance: 0, steps };
	}
};

const percentOf: Skill = {
	id: 'percent-of',
	category: 'core',
	title: 'Percent of',
	blurb: 'Build from 10% and 1%; flip it when that’s easier (8% of 25 = 25% of 8).',
	targetMs: CORE_TIME,
	generate(level, rng) {
		const a = fmtPlain;
		let p: number;
		let base: number;
		let steps: string[];
		switch (level) {
			case 1:
				p = pick(rng, [5, 10, 20, 25, 50]);
				base = int(rng, 2, 40) * 20;
				steps = [
					p === 25 || p === 50
						? `${p}% = ${p === 25 ? '¼' : '½'}`
						: `10% of ${a(base)} = ${a(base / 10)}${p === 5 ? ', halve it' : p === 20 ? ', double it' : ''}`
				];
				break;
			case 2:
				p = int(rng, 3, 19) * 5;
				base = int(rng, 2, 40) * 20;
				steps = [
					`10% = ${a(base / 10)}, 5% = ${a(base / 20)}`,
					`${p}% = ${Math.floor(p / 10)} × 10%${p % 10 ? ' + 5%' : ''}`
				];
				break;
			case 3:
				base = pick(rng, [20, 25, 50, 75, 40]);
				p = int(rng, 2, 24) * ({ 20: 5, 25: 4, 40: 5, 50: 2, 75: 4 } as Record<number, number>)[base];
				steps = [`Flip it: ${p}% of ${base} = ${base}% of ${p}`, `${base}% of ${p} is easy`];
				break;
			case 4:
				p = pick(rng, [2.5, 7.5, 12.5, 17.5, 37.5, 62.5, 87.5]);
				base = int(rng, 2, 30) * 80;
				steps = [
					p % 12.5 === 0
						? `${p}% = ${p / 12.5}/8, and 1/8 of ${a(base)} = ${a(base / 8)}`
						: `Build it: 10% = ${a(base / 10)}, 2.5% = ${a(base / 40)}`,
					`Then scale up to ${p}%`
				];
				break;
			default: {
				p = intNotRound(rng, 12, 88);
				const f = factor(rng, 2, 4, 7);
				base = f.v;
				steps = [
					`10% of ${fmt(base)} = ${fmt(base / 10)}, 1% = ${fmt(base / 100)}`,
					`${p}% = ${Math.floor(p / 10)} × 10% + ${p % 10} × 1%`
				];
			}
		}
		const answer = clean((p * base) / 100);
		steps.push(`= ${level === 5 ? fmt(answer) : a(answer)}`);
		return { prompt: `${a(p)}% of ${level === 5 ? fmt(base) : a(base)}`, answer, tolerance: 0, steps };
	}
};

const fractionPct: Record<number, string> = {
	2: '50%',
	3: '33.3%',
	4: '25%',
	5: '20%',
	6: '16.7%',
	7: '14.3%',
	8: '12.5%',
	9: '11.1%',
	10: '10%',
	11: '9.1%',
	12: '8.3%',
	16: '6.25%',
	20: '5%',
	25: '4%'
};

const fractions: Skill = {
	id: 'fractions',
	category: 'core',
	title: 'Fractions ↔ percent',
	blurb: 'Know 1/2 through 1/12 cold; everything else is a multiple.',
	targetMs: timing(4, 5, 6, 8, 10),
	generate(level, rng) {
		const pools = [[2, 4, 5, 10], [4, 5, 8, 20, 25], [3, 6, 9, 12], [6, 7, 9, 11, 12, 16]];
		if (level === 5 && rng() < 0.5) {
			const den = pick(rng, [6, 7, 8, 9, 11, 12, 16]);
			return {
				prompt: `${fractionPct[den]} ≈ 1/x. What is x?`,
				answer: den,
				tolerance: 0,
				steps: [`From the fraction table: 1/${den} = ${fractionPct[den]}`]
			};
		}
		const den = pick(rng, pools[Math.min(level, 4) - 1]);
		let numr = int(rng, 1, den - 1);
		if (level === 5) numr = int(rng, 2, den - 1);
		while (gcd(numr, den) !== 1) numr = int(rng, 1, den - 1);
		const answer = clean((numr / den) * 100);
		return {
			prompt: `${numr}/${den} as a %`,
			answer,
			tolerance: 0.01,
			unit: '%',
			steps: [
				`1/${den} = ${fractionPct[den]}`,
				numr === 1 ? `→ ${pct(answer)}` : `${numr} × ${fractionPct[den]} ≈ ${pct(Math.round(answer * 10) / 10)}`
			]
		};
	}
};

const pctChange: Skill = {
	id: 'pct-change',
	category: 'core',
	title: 'Percent change',
	blurb: 'Change ÷ start. Watch the asymmetry: −20% needs +25% to recover.',
	targetMs: CORE_TIME,
	generate(level, rng) {
		const a = fmtPlain;
		if (level <= 3) {
			const old = level === 1 ? pick(rng, [100, 200, 400, 500]) : level === 2 ? int(rng, 2, 30) * 20 : int(rng, 2, 20) * 80;
			const p =
				level === 1
					? int(rng, 1, 9) * 10 * pick(rng, [-1, 1])
					: level === 2
						? int(rng, 1, 15) * 5 * pick(rng, [-1, 1])
						: pick(rng, [2.5, 7.5, 12.5, 17.5, 37.5, 62.5]) * pick(rng, [-1, 1]);
			const now = clean(old * (1 + p / 100));
			return {
				prompt: `${a(old)} → ${a(now)}. % change?`,
				answer: p,
				tolerance: 0.01,
				unit: '%',
				steps: [`Change: ${signed(clean(now - old))}`, `${signed(clean(now - old))} ÷ ${a(old)} = ${signed(p)}%`]
			};
		}
		if (level === 4) {
			const up = int(rng, 1, 5) * 10;
			const down = int(rng, 1, 5) * 10;
			const net = clean(((1 + up / 100) * (1 - down / 100) - 1) * 100);
			return {
				prompt: `+${up}%, then −${down}%. Net % change?`,
				answer: net,
				tolerance: 0.01,
				unit: '%',
				steps: [
					`Don't add them: multiply the factors`,
					`${1 + up / 100} × ${clean(1 - down / 100)} = ${clean(1 + net / 100)} → ${signed(net)}%`,
					`Shortcut: a + b + ab/100 = ${up} − ${down} − ${(up * down) / 100} = ${signed(net)}`
				]
			};
		}
		const p = pick(rng, [10, 20, 25, 40, 50, 60, 75, 80]);
		if (rng() < 0.5) {
			const answer = clean((p / (100 - p)) * 100);
			return {
				prompt: `A price falls ${p}%. What % rise brings it back?`,
				answer,
				tolerance: 0.01,
				unit: '%',
				steps: [`From 100 you're at ${100 - p}; you need ${p} back`, `${p} ÷ ${100 - p} = ${pct(Math.round(answer * 10) / 10)}`]
			};
		}
		const answer = clean((p / (100 + p)) * 100);
		return {
			prompt: `Sales rose ${p}%. What % fall cancels that?`,
			answer,
			tolerance: 0.01,
			unit: '%',
			steps: [`From 100 you're at ${100 + p}; you need to lose ${p}`, `${p} ÷ ${100 + p} = ${pct(Math.round(answer * 10) / 10)}`]
		};
	}
};

const sums: Skill = {
	id: 'sums',
	category: 'core',
	title: 'Add & subtract',
	blurb: 'Line up the magnitudes: 1.25M + 870k = 2.12M.',
	targetMs: timing(4, 6, 10, 10, 15),
	generate(level, rng) {
		const a = fmtPlain;
		if (level <= 2 || level === 4) {
			const [lo, hi] = level === 1 ? [12, 98] : level === 2 ? [102, 998] : [1002, 9998];
			let x = int(rng, lo, hi);
			let y = int(rng, lo, hi);
			const minus = level === 4 || rng() < 0.5;
			if (minus && y > x) [x, y] = [y, x];
			const answer = minus ? x - y : x + y;
			const steps = minus
				? [`Count up from ${a(y)} to ${a(x)}: ${a(answer)}`, `or subtract from a round number and correct`]
				: [`Add the big parts first, then the rest`, `${a(x)} + ${a(y)} = ${a(answer)}`];
			return { prompt: `${a(x)} ${minus ? '−' : '+'} ${a(y)}`, answer, tolerance: 0, steps };
		}
		const count = level === 3 ? 3 : 4;
		const terms = Array.from({ length: count }, () => int(rng, 5, 480) * 10_000);
		const signs = terms.map((_, i) => (level === 5 && i > 0 && rng() < 0.5 ? -1 : 1));
		let answer = terms.reduce((s, t, i) => s + signs[i] * t, 0);
		if (answer <= 0) {
			signs.fill(1);
			answer = terms.reduce((s, t) => s + t, 0);
		}
		const prompt = terms.map((t, i) => (i === 0 ? fmt(t) : `${signs[i] < 0 ? '−' : '+'} ${fmt(t)}`)).join(' ');
		return {
			prompt,
			answer,
			tolerance: 0,
			steps: [
				`Put everything in k: ${terms.map((t, i) => `${i && signs[i] < 0 ? '−' : i ? '+' : ''}${a(t / 1000)}k`).join(' ')}`,
				`= ${a(answer / 1000)}k = ${fmt(answer)}`
			]
		};
	}
};

// ─── Case math ───────────────────────────────────────────────────────────

const margin: Skill = {
	id: 'margin',
	category: 'case',
	title: 'Profit & margin',
	blurb: 'Profit = revenue − cost; margin = profit ÷ revenue.',
	targetMs: CASE_TIME,
	generate(level, rng) {
		const m = int(rng, 2, 12) * 5;
		const rev = factor(rng, 2, 4, 7).v;
		const cost = clean((rev * (100 - m)) / 100);
		const profit = clean(rev - cost);
		switch (level) {
			case 1:
				return {
					prompt: `Revenue ${money(rev)}, costs ${money(cost)}. Profit?`,
					answer: profit,
					tolerance: 0,
					unit: '$',
					steps: [`${fmt(rev)} − ${fmt(cost)} = ${fmt(profit)}`]
				};
			case 2:
				return {
					prompt: `Revenue ${money(rev)}, costs ${money(cost)}. Profit margin?`,
					answer: m,
					tolerance: 0.01,
					unit: '%',
					steps: [`Profit: ${fmt(rev)} − ${fmt(cost)} = ${fmt(profit)}`, `${fmt(profit)} ÷ ${fmt(rev)} = ${m}%`]
				};
			case 3:
				return rng() < 0.5
					? {
							prompt: `Revenue ${money(rev)} at a ${m}% margin. Profit?`,
							answer: profit,
							tolerance: 0,
							unit: '$',
							steps: [`${m}% of ${fmt(rev)} = ${fmt(profit)}`]
						}
					: {
							prompt: `Profit ${money(profit)} at a ${m}% margin. Revenue?`,
							answer: rev,
							tolerance: 0,
							unit: '$',
							steps: [`Revenue = profit ÷ margin`, `${fmt(profit)} ÷ ${m}% = ${fmt(rev)}`]
						};
			case 4: {
				const vc = int(rng, 2, 40);
				const price = vc + int(rng, 1, 12) * 5;
				const units = factor(rng, 1, 3, 5).v;
				const fixed = roundSig((price - vc) * units * (0.2 + rng() * 0.6), 2);
				const answer = clean((price - vc) * units - fixed);
				return {
					prompt: `Price $${price}, variable cost $${vc}/unit, ${fmt(units)} units, fixed costs ${money(fixed)}. Profit?`,
					answer,
					tolerance: 0,
					unit: '$',
					steps: [
						`Contribution per unit: ${price} − ${vc} = $${price - vc}`,
						`× ${fmt(units)} = ${fmt((price - vc) * units)}`,
						`− fixed ${fmt(fixed)} = ${fmt(answer)}`
					]
				};
			}
			default: {
				const up = pick(rng, [5, 10, 20, 25]);
				const answer = clean((1 - (1 - m / 100) / (1 + up / 100)) * 100);
				return {
					prompt: `Margin is ${m}%. Prices rise ${up}%, unit costs don't. New margin?`,
					answer,
					tolerance: 0.01,
					unit: '%',
					steps: [
						`Per $100 of old revenue: cost $${100 - m}, new revenue $${100 + up}`,
						`Profit ${100 + up} − ${100 - m} = ${up + m}; ÷ ${100 + up} = ${pct(Math.round(answer * 10) / 10)}`
					]
				};
			}
		}
	}
};

const breakeven: Skill = {
	id: 'breakeven',
	category: 'case',
	title: 'Break-even',
	blurb: 'Fixed costs ÷ contribution per unit (or ÷ contribution margin %).',
	targetMs: CASE_TIME,
	generate(level, rng) {
		if (level === 5) {
			const cm = pick(rng, [20, 25, 40, 50, 60, 75, 80]);
			const rev = factor(rng, 2, 5, 7).v;
			const fixed = clean((rev * cm) / 100);
			return {
				prompt: `Fixed costs ${money(fixed)}, contribution margin ${cm}%. Break-even revenue?`,
				answer: rev,
				tolerance: 0,
				unit: '$',
				steps: [`Revenue × ${cm}% must cover ${fmt(fixed)}`, `${fmt(fixed)} ÷ ${cm}% = ${fmt(rev)}`]
			};
		}
		const c = level === 1 ? pick(rng, [2, 4, 5, 8, 10, 20, 25, 50]) : pick(rng, [3, 4, 5, 6, 8, 12, 15, 25, 40]);
		const q = factor(rng, level >= 3 ? 2 : 1, 2, level >= 3 ? 5 : 4).v;
		const target = level === 4 ? factor(rng, 1, 4, 5).v * c : 0;
		const fixed = clean(c * q);
		const units = clean((fixed + target) / c);
		const vc = int(rng, 3, 60);
		const price = vc + c;
		const unitText = level === 1 ? `each unit contributes $${c}` : `price $${price}, variable cost $${vc}/unit`;
		return {
			prompt:
				level === 4
					? `Fixed costs ${money(fixed)}, ${unitText}. Units for ${money(target)} profit?`
					: `Fixed costs ${money(fixed)}, ${unitText}. Break-even units?`,
			answer: units,
			tolerance: 0,
			unit: 'units',
			steps: [
				...(level === 1 ? [] : [`Contribution: ${price} − ${vc} = $${c}/unit`]),
				level === 4 ? `(${fmt(fixed)} + ${fmt(target)}) ÷ ${c} = ${fmt(units)}` : `${fmt(fixed)} ÷ ${c} = ${fmt(units)}`
			]
		};
	}
};

const rule72: Skill = {
	id: 'rule-72',
	category: 'case',
	title: 'Rule of 72',
	blurb: 'Doubling time ≈ 72 ÷ rate. Works both ways.',
	targetMs: timing(5, 6, 10, 15, 10),
	generate(level, rng) {
		const nice = [2, 3, 4, 6, 8, 9, 12, 18, 24];
		switch (level) {
			case 1: {
				const r = pick(rng, nice);
				return {
					prompt: `Growing ${r}% a year, roughly how many years to double?`,
					answer: 72 / r,
					tolerance: 0.02,
					unit: 'years',
					steps: [`72 ÷ ${r} = ${72 / r}`]
				};
			}
			case 2: {
				const n = pick(rng, nice);
				return {
					prompt: `To double in ${n} years, what annual growth rate?`,
					answer: 72 / n,
					tolerance: 0.02,
					unit: '%',
					steps: [`72 ÷ ${n} = ${72 / n}%`]
				};
			}
			case 3: {
				const r = pick(rng, [3, 4, 6, 8, 9, 12]);
				const k = pick(rng, [4, 8]);
				const doublings = Math.log2(k);
				return {
					prompt: `Growing ${r}% a year, roughly how many years to grow ${k}×?`,
					answer: (72 / r) * doublings,
					tolerance: 0.02,
					unit: 'years',
					steps: [`${k}× = ${doublings} doublings`, `Each takes 72 ÷ ${r} = ${72 / r} years → ${(72 / r) * doublings}`]
				};
			}
			case 4: {
				const k = pick(rng, [4, 8]);
				const doublings = Math.log2(k);
				const perDoubling = pick(rng, [3, 4, 6, 8, 9, 12]);
				const n = perDoubling * doublings;
				return {
					prompt: `A market grows ${k}× in ${n} years. Roughly what annual rate?`,
					answer: 72 / perDoubling,
					tolerance: 0.02,
					unit: '%',
					steps: [`${k}× = ${doublings} doublings in ${n} years → one every ${perDoubling}`, `72 ÷ ${perDoubling} = ${72 / perDoubling}%`]
				};
			}
			default: {
				const r = pick(rng, [5, 7, 11, 14, 15, 16, 20]);
				const exact = Math.log(2) / Math.log(1 + r / 100);
				return {
					prompt: `Growing ${r}% a year, roughly how many years to double?`,
					answer: clean(exact),
					tolerance: 0.07,
					unit: 'years',
					steps: [`72 ÷ ${r} ≈ ${fmtPlain(72 / r, 1)}`, `(Exact: ${fmtPlain(exact, 2)})`]
				};
			}
		}
	}
};

const compound: Skill = {
	id: 'compound',
	category: 'case',
	title: 'Compounding',
	blurb: '(1 + r)ⁿ: expand for small n, count doublings for big n.',
	targetMs: CASE_TIME,
	generate(level, rng) {
		const specs: [number[], number[], number][] = [
			[[10], [2], 0.001],
			[[5, 10, 20], [2, 3], 0.01],
			[[3, 4, 6, 8, 12, 15], [2], 0.01],
			[[5, 6, 7, 8, 9, 10, 12], [3, 4, 5], 0.03],
			[[6, 8, 9, 10, 12, 15], [6, 8, 10, 12], 0.06]
		];
		const [rates, years, tolerance] = specs[level - 1];
		const r = pick(rng, rates);
		const n = pick(rng, years);
		const start = factor(rng, 1, 3, 6).v;
		const growth = (1 + r / 100) ** n;
		const answer = clean(start * growth);
		const g = r / 100;
		const steps =
			n === 2
				? [`(1 + ${g})² = 1 + ${clean(2 * g)} + ${clean(g * g)} = ${clean(growth)}`, `${fmt(start)} × ${clean(growth)} = ${fmt(answer)}`]
				: n <= 5
					? [
							`Simple ${r}% × ${n} = ${r * n}%, plus compounding on top`,
							`(1 + ${g})${sup(n)} ≈ ${fmtPlain(growth, 3)} → ${fmt(answer)}`
						]
					: [
							`Doubles every 72 ÷ ${r} ≈ ${fmtPlain(72 / r, 1)} years → ${fmtPlain((n * r) / 72, 2)} doublings`,
							`2^${fmtPlain((n * r) / 72, 2)} ≈ ${fmtPlain(2 ** ((n * r) / 72), 2)} (exact ${fmtPlain(growth, 2)}) → ≈ ${fmt(answer)}`
						];
		return {
			prompt: `${money(start)} growing ${r}% a year for ${n} years. Value?`,
			answer,
			tolerance,
			unit: '$',
			steps
		};
	}
};

const perpetuity: Skill = {
	id: 'perpetuity',
	category: 'case',
	title: 'Perpetuities & NPV',
	blurb: 'Value = cash flow ÷ (r − g). Divide by a % = multiply by its inverse.',
	targetMs: CASE_TIME,
	generate(level, rng) {
		const cf = factor(rng, 2, 3, 6).v;
		const steps: string[] = [];
		let r: number;
		let g = 0;
		if (level === 1) r = pick(rng, [5, 10, 20, 25]);
		else if (level === 2 || level === 4) r = pick(rng, [4, 5, 8, 10, 12.5, 20, 25]);
		else {
			const spread = pick(rng, [4, 5, 8, 10]);
			g = pick(rng, [1, 2, 3, 4, 5]);
			r = spread + g;
		}
		const value = clean(cf / ((r - g) / 100));
		steps.push(
			g
				? `Divide by r − g = ${r}% − ${g}% = ${r - g}% → × ${fmtPlain(100 / (r - g), 2)}`
				: `÷ ${r}% = × ${fmtPlain(100 / r, 2)}`,
			`${fmt(cf)} × ${fmtPlain(100 / (r - g), 2)} = ${fmt(value)}`
		);
		if (level <= 3) {
			return {
				prompt: g
					? `Cash flow ${money(cf)}/yr growing ${g}% forever, discount rate ${r}%. Value?`
					: `Perpetuity of ${money(cf)}/yr at a ${r}% discount rate. Value?`,
				answer: value,
				tolerance: g ? 0.005 : 0,
				unit: '$',
				steps
			};
		}
		const cost = clean(roundSig(value * (0.4 + rng() * 0.8), 2));
		const npv = clean(value - cost);
		return {
			prompt: g
				? `Invest ${money(cost)} to save ${money(cf)}/yr, growing ${g}%, forever. r = ${r}%. NPV?`
				: `Invest ${money(cost)} to save ${money(cf)}/yr forever. r = ${r}%. NPV?`,
			answer: npv,
			tolerance: g ? 0.01 : 0,
			unit: '$',
			steps: [...steps, `NPV = ${fmt(value)} − ${fmt(cost)} = ${fmt(npv)}`]
		};
	}
};

const payback: Skill = {
	id: 'payback',
	category: 'case',
	title: 'Payback period',
	blurb: 'Investment ÷ annual savings, net of running costs.',
	targetMs: CASE_TIME,
	generate(level, rng) {
		const s = factor(rng, level >= 2 ? 2 : 1, 3, 6).v;
		switch (level) {
			case 1:
			case 2: {
				const n = level === 1 ? int(rng, 2, 9) : int(rng, 3, 19) / 2;
				const cost = clean(s * n);
				return {
					prompt: `Invest ${money(cost)}, save ${money(s)} a year. Payback?`,
					answer: n,
					tolerance: 0.01,
					unit: 'years',
					steps: [`${fmt(cost)} ÷ ${fmt(s)} = ${n} years`]
				};
			}
			case 3: {
				const n = int(rng, 2, 16) / 2;
				const opex = clean(roundSig(s * (0.1 + rng() * 0.5), 1));
				const cost = clean(s * n);
				return {
					prompt: `Invest ${money(cost)}; it saves ${money(clean(s + opex))} a year but costs ${money(opex)} a year to run. Payback?`,
					answer: n,
					tolerance: 0.01,
					unit: 'years',
					steps: [`Net saving: ${fmt(s + opex)} − ${fmt(opex)} = ${fmt(s)}`, `${fmt(cost)} ÷ ${fmt(s)} = ${n} years`]
				};
			}
			case 4: {
				const monthly = factor(rng, 1, 3, 5).v;
				const months = int(rng, 4, 36);
				const cost = clean(monthly * months);
				return {
					prompt: `Invest ${money(cost)}, save ${money(monthly)} a month. Payback in months?`,
					answer: months,
					tolerance: 0.01,
					unit: 'months',
					steps: [`${fmt(cost)} ÷ ${fmt(monthly)} = ${months} months`]
				};
			}
			default: {
				const n = int(rng, 3, 14) / 2;
				const cost = clean(s * (n - 0.5));
				// Year one runs at half the savings while it ramps, then full speed.
				return {
					prompt: `Invest ${money(cost)}. Saves ${money(s)} a year at full speed, but only half that in year one. Payback?`,
					answer: n,
					tolerance: 0.02,
					unit: 'years',
					steps: [
						`Year 1 recovers ${fmt(s / 2)}; ${fmt(cost - s / 2)} left`,
						`${fmt(cost - s / 2)} ÷ ${fmt(s)} = ${clean(n - 1)} more years → ${n}`
					]
				};
			}
		}
	}
};

const weightedAvg: Skill = {
	id: 'weighted-avg',
	category: 'case',
	title: 'Blended averages',
	blurb: 'Weight each segment’s margin by its share of revenue.',
	targetMs: CASE_TIME,
	generate(level, rng) {
		const margins = (n: number) => Array.from({ length: n }, () => int(rng, 1, 12) * 5);
		let shares: number[];
		let ms: number[];
		let prompt = 'Blended margin?';
		let facts: string[];
		const steps: string[] = [];
		if (level === 4) {
			ms = margins(2);
			const revs = [factor(rng, 1, 5, 6), factor(rng, 1, 5, 6)].map((f) => f.v);
			const total = revs[0] + revs[1];
			shares = revs.map((r) => (r / total) * 100);
			facts = [`A: ${money(revs[0])} revenue at ${ms[0]}% margin`, `B: ${money(revs[1])} revenue at ${ms[1]}% margin`];
			steps.push(`Profits: ${fmt((revs[0] * ms[0]) / 100)} + ${fmt((revs[1] * ms[1]) / 100)} = ${fmt((revs[0] * ms[0] + revs[1] * ms[1]) / 100)}`);
			steps.push(`÷ total revenue ${fmt(total)}`);
		} else if (level === 5) {
			ms = margins(2);
			const from = int(rng, 2, 8) * 10;
			let to = int(rng, 2, 8) * 10;
			while (to === from) to = int(rng, 2, 8) * 10;
			shares = [to, 100 - to];
			facts = [
				`A: ${ms[0]}% margin, ${from}% of sales`,
				`B: ${ms[1]}% margin, the other ${100 - from}%`,
				`The mix shifts to ${to}% A`
			];
			prompt = 'New blended margin?';
			steps.push(`Only the new mix matters: ${to}% × ${ms[0]}% + ${100 - to}% × ${ms[1]}%`);
		} else {
			const n = level === 3 ? 3 : 2;
			ms = margins(n);
			if (level === 1) shares = [50, 50];
			else if (level === 2) {
				const a = pick(rng, [20, 25, 40, 60, 75, 80]);
				shares = [a, 100 - a];
			} else {
				const a = int(rng, 1, 6) * 10;
				const b = int(rng, 1, 8 - a / 10) * 10;
				shares = [a, b, 100 - a - b];
			}
			facts = shares.map((s, i) => `${'ABC'[i]}: ${s}% of sales at ${ms[i]}% margin`);
			steps.push(shares.map((s, i) => `${s}% × ${ms[i]}%`).join(' + '));
		}
		const answer = clean(shares.reduce((sum, s, i) => sum + (s * ms[i]) / 100, 0));
		steps.push(`= ${pct(Math.round(answer * 100) / 100)}`);
		return { prompt, facts, answer, tolerance: 0.005, unit: '%', steps };
	}
};

const marketSizing: Skill = {
	id: 'market-sizing',
	category: 'case',
	title: 'Market sizing chains',
	blurb: 'Chain population, share, frequency and price without losing a zero.',
	targetMs: timing(15, 20, 25, 30, 40),
	generate(level, rng) {
		const pop = factor(rng, level >= 4 ? 2 : 1, 6, 7).v;
		const share = int(rng, 1, 9) * (level >= 4 ? 5 : 10);
		const price = level >= 4 ? intNotRound(rng, 12, 95) : pick(rng, [2, 4, 5, 10, 20, 50, 100, 200, 500]);
		const freq = pick(rng, [2, 4, 12, 24, 52]);
		const hh = pick(rng, [2, 2.5, 4]);
		const parts: string[] = [`Population ${fmt(pop)}`];
		let units = pop;
		const steps: string[] = [];
		if (level === 3 || level === 5) {
			units = clean(units / hh);
			parts.push(`${hh} people per household`);
			steps.push(`Households: ${fmt(pop)} ÷ ${hh} = ${fmt(units)}`);
		}
		units = clean((units * share) / 100);
		parts.push(level === 3 || level === 5 ? `${share}% of households buy` : `${share}% buy`);
		steps.push(`Buyers: × ${share}% = ${fmt(units)}`);
		if (level >= 2) {
			units = clean(units * freq);
			parts.push(`${freq}× a year`);
			steps.push(`Purchases: × ${freq} = ${fmt(units)}`);
		}
		const answer = clean(units * price);
		parts.push(`$${price} each`);
		steps.push(`Market: × $${price} = ${money(answer)}`);
		return {
			prompt: 'Annual market?',
			facts: parts,
			answer,
			tolerance: level === 5 ? 0.03 : 0,
			unit: '$',
			steps
		};
	}
};

// ─── Estimation ──────────────────────────────────────────────────────────

const ESTIMATE_TOL = [0.1, 0.07, 0.05, 0.07, 0.05];

const estMul: Skill = {
	id: 'est-mul',
	category: 'estimate',
	title: 'Estimate products',
	blurb: 'Round one factor up and the other down; keep the error balanced.',
	targetMs: EST_TIME,
	generate(level, rng) {
		const specs: [number, number, number][][] = [
			[[2, 0, 0], [2, 0, 0]],
			[[3, 0, 0], [2, 0, 0]],
			[[3, 3, 6], [3, 0, 2]],
			[[2, 0, 1], [3, 0, 1], [2, 0, 0]],
			[[3, 4, 7], [2, 0, 1], [3, 0, 0]]
		];
		const xs = specs[level - 1].map(([sig, lo, hi]) => ugly(rng, sig, lo, hi));
		const answer = clean(xs.reduce((p, x) => p * x, 1));
		const rounded = xs.map(roundFriendly);
		const est = clean(rounded.reduce((p, x) => p * x, 1));
		return {
			prompt: `≈ ${xs.map((x) => fmt(x)).join(' × ')}`,
			answer,
			tolerance: ESTIMATE_TOL[level - 1],
			steps: [
				`Round: ${rounded.map((x) => fmt(x)).join(' × ')} = ${fmt(est)}`,
				`Then nudge for the rounding direction`,
				`Exact: ${fmt(answer)}; anything within ${fmtPlain(ESTIMATE_TOL[level - 1] * 100)}% counts`
			]
		};
	}
};

const estDiv: Skill = {
	id: 'est-div',
	category: 'estimate',
	title: 'Estimate quotients',
	blurb: 'Round both numbers the same direction so the ratio survives.',
	targetMs: EST_TIME,
	generate(level, rng) {
		const specs: [number, number, number, number, number, number][] = [
			[3, 2, 3, 2, 0, 0],
			[3, 3, 4, 2, 1, 1],
			[3, 5, 7, 2, 1, 3],
			[3, 6, 8, 3, 2, 4],
			[3, 7, 9, 3, 3, 5]
		];
		const [sa, ea1, ea2, sb, eb1, eb2] = specs[level - 1];
		let x = ugly(rng, sa, ea1, ea2);
		const y = ugly(rng, sb, eb1, eb2);
		if (x < y) x = clean(x * 100);
		const answer = clean(x / y);
		const [rx, ry] = [roundSig(x, 2), roundFriendly(y)];
		return {
			prompt: `≈ ${fmt(x)} ÷ ${fmt(y)}`,
			answer,
			tolerance: ESTIMATE_TOL[level - 1],
			steps: [
				`Round: ${fmt(rx)} ÷ ${fmt(ry)} ≈ ${fmt(clean(rx / ry))}`,
				`Exact: ${fmt(answer)}; anything within ${fmtPlain(ESTIMATE_TOL[level - 1] * 100)}% counts`
			]
		};
	}
};

const estShare: Skill = {
	id: 'est-share',
	category: 'estimate',
	title: 'Estimate shares & growth',
	blurb: 'What % is A of B? What was the CAGR?',
	targetMs: EST_TIME,
	generate(level, rng) {
		if (level === 5) {
			const n = pick(rng, [3, 4, 5, 6, 8, 10]);
			const r = int(rng, 4, 25);
			const start = ugly(rng, 2, 5, 7);
			const end = clean(roundSig(start * (1 + r / 100) ** n, 2));
			const answer = clean(((end / start) ** (1 / n) - 1) * 100);
			const ratio = end / start;
			return {
				prompt: `Revenue grew from ${money(start)} to ${money(end)} over ${n} years. CAGR?`,
				answer,
				tolerance: 0.1,
				unit: '%',
				steps: [
					`Ratio ≈ ${fmtPlain(ratio, 2)}× = ${fmtPlain(Math.log2(ratio), 2)} doublings in ${n} years`,
					`One doubling every ${fmtPlain(n / Math.log2(ratio), 1)} years → 72 ÷ that ≈ ${fmtPlain((72 * Math.log2(ratio)) / n, 1)}%`,
					`Exact: ${pct(Math.round(answer * 10) / 10)}`
				]
			};
		}
		if (level === 4) {
			const x = ugly(rng, 3, 4, 6);
			const p = (int(rng, 3, 60) * pick(rng, [-1, 1])) / 100;
			const y = clean(roundSig(x * (1 + p), 3));
			const answer = clean(((y - x) / x) * 100);
			return {
				prompt: `≈ % change from ${fmt(x)} to ${fmt(y)}?`,
				answer,
				tolerance: 0.07,
				unit: '%',
				steps: [`Change ≈ ${fmt(roundSig(y - x, 2))}`, `÷ ${fmt(roundSig(x, 2))} ≈ ${pct(Math.round(answer))}`]
			};
		}
		const eMax = [0, 1, 4][level - 1];
		const total = ugly(rng, 3, eMax, eMax);
		const part = clean(roundSig(total * (0.03 + rng() * 0.6), 3));
		const answer = clean((part / total) * 100);
		return {
			prompt: `≈ ${fmt(part)} is what % of ${fmt(total)}?`,
			answer,
			tolerance: ESTIMATE_TOL[level - 1],
			unit: '%',
			steps: [
				`Round: ${fmt(roundSig(part, 2))} ÷ ${fmt(roundSig(total, 2))}`,
				`Benchmark with 10% = ${fmt(total / 10)}`,
				`Exact: ${pct(Math.round(answer * 10) / 10)}`
			]
		};
	}
};

export const SKILLS: Skill[] = [
	mulZeros,
	divZeros,
	mulTricks,
	nearRound,
	squares,
	percentOf,
	fractions,
	pctChange,
	sums,
	margin,
	breakeven,
	rule72,
	compound,
	perpetuity,
	payback,
	weightedAvg,
	marketSizing,
	estMul,
	estDiv,
	estShare
];

export const SKILL_BY_ID: Record<string, Skill> = Object.fromEntries(SKILLS.map((s) => [s.id, s]));

export const isLevel = (n: unknown): n is number => Number.isInteger(n) && (n as number) >= 1 && (n as number) <= MAX_LEVEL;

/** Regenerate the question a (skill, level, seed) triple names. */
export function questionFor(skill: string, level: number, seed: number): Question {
	return SKILL_BY_ID[skill].generate(level, mulberry32(seed));
}
