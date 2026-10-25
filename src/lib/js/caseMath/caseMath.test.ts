import { describe, expect, it } from 'vitest';
import { mulberry32 } from './rng';
import { fmt, grade, parseAnswer } from './parse';
import { MAX_LEVEL, SKILLS, questionFor } from './skills';
import { TIPS } from './tips';
import { type AttemptLite, buildDailySet, nextLevel, streak, weekOf } from './adaptive';

describe('parseAnswer', () => {
	it.each([
		['3.2M', 3.2e6],
		['450k', 450_000],
		['1.2bn', 1.2e9],
		['1.2 B', 1.2e9],
		['12.5%', 12.5],
		['1/8', 0.125],
		['3,200', 3200],
		['1,250,000.5', 1_250_000.5],
		['3,2', 3.2],
		["12'500", 12_500],
		['2.5e6', 2.5e6],
		['$4.5M', 4.5e6],
		['-20', -20],
		['−12.5%', -12.5],
		['.5', 0.5]
	])('%s → %d', (raw, value) => {
		expect(parseAnswer(raw)).toBeCloseTo(value, 9);
	});

	it.each(['', 'abc', '3.2x', '1/0', '1..2', '--3'])('rejects %j', (raw) => {
		expect(parseAnswer(raw)).toBeNull();
	});
});

describe('fmt', () => {
	it('uses case-style magnitudes', () => {
		expect(fmt(3_200_000)).toBe('3.2M');
		expect(fmt(450_000)).toBe('450k');
		expect(fmt(1.25e9)).toBe('1.25B');
		expect(fmt(7500)).toBe('7,500');
		expect(fmt(12_000)).toBe('12k');
	});
});

describe('grade', () => {
	it('is exact at tolerance 0 but forgives float noise', () => {
		expect(grade(0.3, 0.1 + 0.2, 0).correct).toBe(true);
		expect(grade(100, 101, 0).correct).toBe(false);
	});
	it('accepts within a relative tolerance', () => {
		expect(grade(100, 104, 0.05).correct).toBe(true);
		expect(grade(100, 106, 0.05).correct).toBe(false);
	});
	it('fails unparseable input', () => {
		expect(grade(5, null, 0.5)).toEqual({ correct: false, relErr: null });
	});
});

describe('skills', () => {
	it('has a tip for every skill', () => {
		for (const s of SKILLS) expect(TIPS[s.id], s.id).toBeDefined();
	});

	it('has unique ids', () => {
		expect(new Set(SKILLS.map((s) => s.id)).size).toBe(SKILLS.length);
	});

	for (const skill of SKILLS) {
		it(`${skill.id}: every level yields sane, reproducible questions`, () => {
			for (let level = 1; level <= MAX_LEVEL; level++) {
				for (let seed = 1; seed <= 200; seed++) {
					const q = questionFor(skill.id, level, seed);
					const ctx = `${skill.id} L${level} seed ${seed}: ${q.prompt}`;
					expect(Number.isFinite(q.answer), ctx).toBe(true);
					expect([q.prompt, ...(q.facts ?? [])].join(' '), ctx).not.toMatch(/NaN|undefined|Infinity/);
					expect(q.steps.join(' '), ctx).not.toMatch(/NaN|undefined|Infinity/);
					expect(q.steps.length, ctx).toBeGreaterThan(0);
					expect(q.tolerance, ctx).toBeGreaterThanOrEqual(0);
					expect(questionFor(skill.id, level, seed), ctx).toEqual(q);
				}
				expect(skill.targetMs(level)).toBeGreaterThan(0);
			}
		});
	}

	it('the correct answer, formatted as shown, grades as correct', () => {
		for (const skill of SKILLS) {
			for (let level = 1; level <= MAX_LEVEL; level++) {
				for (let seed = 1; seed <= 50; seed++) {
					const q = questionFor(skill.id, level, seed);
					expect(grade(q.answer, parseAnswer(String(q.answer)), q.tolerance).correct).toBe(true);
				}
			}
		}
	});

	it('exact core answers are integers or short decimals', () => {
		for (const id of ['mul-zeros', 'div-zeros', 'mul-tricks', 'near-round', 'squares', 'sums']) {
			for (let level = 1; level <= MAX_LEVEL; level++) {
				for (let seed = 1; seed <= 100; seed++) {
					const q = questionFor(id, level, seed);
					expect(Number.isInteger(q.answer), `${id} L${level}: ${q.prompt} = ${q.answer}`).toBe(true);
				}
			}
		}
	});
});

describe('nextLevel', () => {
	const run = (n: number, correct: (i: number) => boolean, ms = 1000, level = 2): AttemptLite[] =>
		Array.from({ length: n }, (_, i) => ({ skill: 'squares', level, correct: correct(i), ms, at: 1000 + i }));

	it('promotes after 10 fast, accurate answers', () => {
		expect(nextLevel('squares', 2, 0, run(10, () => true))).toBe(3);
	});
	it('needs a full window to promote', () => {
		expect(nextLevel('squares', 2, 0, run(9, () => true))).toBe(2);
	});
	it('does not promote when slow', () => {
		expect(nextLevel('squares', 2, 0, run(10, () => true, 60_000))).toBe(2);
	});
	it('demotes when the last 6 are mostly wrong', () => {
		expect(nextLevel('squares', 2, 0, run(6, (i) => i < 2))).toBe(1);
	});
	it('ignores attempts from before the level was set', () => {
		expect(nextLevel('squares', 2, 5000, run(10, () => true))).toBe(2);
	});
	it('never leaves 1..MAX', () => {
		expect(nextLevel('squares', MAX_LEVEL, 0, run(10, () => true, 1000, MAX_LEVEL))).toBe(MAX_LEVEL);
		expect(nextLevel('squares', 1, 0, run(6, () => false, 1000, 1))).toBe(1);
	});
});

describe('buildDailySet', () => {
	it('covers every category and caps each skill', () => {
		let s = 1;
		const set = buildDailySet({}, mulberry32(42), Date.now(), 20, () => s++);
		expect(set).toHaveLength(20);
		const cats = new Set(set.map((q) => SKILLS.find((k) => k.id === q.skill)!.category));
		expect(cats).toEqual(new Set(['core', 'case', 'estimate']));
		const counts: Record<string, number> = {};
		for (const q of set) counts[q.skill] = (counts[q.skill] ?? 0) + 1;
		expect(Math.max(...Object.values(counts))).toBeLessThanOrEqual(3);
	});

	it('favours weak skills', () => {
		const now = Date.now();
		const states = Object.fromEntries(
			SKILLS.map((k) => [k.id, { level: 3, accuracy: 1, speed: 0.5, lastSeen: now }])
		);
		states.squares = { level: 2, accuracy: 0.2, speed: 2, lastSeen: now - 30 * 86_400_000 };
		let hits = 0;
		for (let seed = 1; seed <= 50; seed++) {
			hits += buildDailySet(states, mulberry32(seed), now).filter((q) => q.skill === 'squares').length;
		}
		expect(hits / 50).toBeGreaterThan(2);
	});

	it('uses the stored level, with occasional stretch questions', () => {
		const states = Object.fromEntries(SKILLS.map((k) => [k.id, { level: 2, accuracy: 0.8, speed: 1, lastSeen: null }]));
		const levels = buildDailySet(states, mulberry32(7)).map((q) => q.level);
		expect(levels.every((l) => l === 2 || l === 3)).toBe(true);
	});
});

describe('streak', () => {
	it('counts back from today', () => {
		expect(streak(['2026-10-25', '2026-10-24', '2026-10-23', '2026-10-20'], '2026-10-25')).toBe(3);
	});
	it('keeps yesterday’s streak alive before today’s set', () => {
		expect(streak(['2026-10-24', '2026-10-23'], '2026-10-25')).toBe(2);
	});
	it('is 0 after a missed day', () => {
		expect(streak(['2026-10-23'], '2026-10-25')).toBe(0);
	});
	it('crosses month ends', () => {
		expect(streak(['2026-11-01', '2026-10-31'], '2026-11-01')).toBe(2);
	});
});

describe('weekOf', () => {
	it('returns the Monday', () => {
		expect(weekOf('2026-10-25')).toBe('2026-10-19'); // Sunday
		expect(weekOf('2026-10-19')).toBe('2026-10-19');
	});
});
