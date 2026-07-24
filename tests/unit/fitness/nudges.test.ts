import { describe, it, expect } from 'vitest';
import {
	buildNudges, learnStaples, gapCost, remainingAfter,
	MIN_DELTA_GRAMS, MAX_DELTA_GRAMS, GRAM_STEP,
} from '../../../src/lib/fitness/nudges';

const RICE = { calories: 130, protein: 2.7, fat: 0.3, carbs: 28 };
const CHICKEN = { calories: 165, protein: 31, fat: 3.6, carbs: 0 };
const OIL = { calories: 884, protein: 0, fat: 100, carbs: 0 };

const rem = (kcal: number, protein: number, fat: number, carbs: number) => ({ kcal, protein, fat, carbs });

describe('gapCost', () => {
	it('counts a shortfall at full weight', () => {
		expect(gapCost(rem(0, 10, 0, 0))).toBe(10);
	});

	// Overshoot has to cost something. When it was free the ranking would blow past
	// one target to close another — a protein gap "solved" by oats that overshot
	// carbohydrate by 64 g and still left protein short, beating the chicken already
	// on the plate.
	it('counts overshoot, but less than an equal shortfall', () => {
		const over = gapCost(rem(0, -10, 0, 0));
		expect(over).toBeGreaterThan(0);
		expect(over).toBeLessThan(gapCost(rem(0, 10, 0, 0)));
	});

	// Fat carries 9 kcal/g, so a gram of it moves the day further than a gram of
	// protein — the weighting has to reflect that or fat gaps never get closed.
	it('weights fat above the others', () => {
		expect(gapCost(rem(0, 0, 10, 0))).toBeGreaterThan(gapCost(rem(0, 10, 0, 0)));
	});

	it('ignores calories, which are a constraint rather than a cost', () => {
		expect(gapCost(rem(500, 0, 0, 0))).toBe(0);
	});
});

describe('remainingAfter', () => {
	it('subtracts the scaled macros', () => {
		const after = remainingAfter(rem(500, 30, 10, 60), RICE, 200);
		expect(after.kcal).toBeCloseTo(500 - 260);
		expect(after.carbs).toBeCloseTo(60 - 56);
	});

	it('treats missing macros as zero rather than failing', () => {
		expect(remainingAfter(rem(500, 30, 10, 60), { calories: 100 }, 100).protein).toBe(30);
	});
});

describe('buildNudges', () => {
	const logged = [
		{ id: 'e1', name: 'Rice', amountGrams: 150, per100g: RICE },
		{ id: 'e2', name: 'Chicken', amountGrams: 120, per100g: CHICKEN },
	];

	it('suggests eating more of something already logged', () => {
		const [top] = buildNudges(rem(400, 30, 5, 20), logged, []);
		expect(top.kind).toBe('bump');
		expect(top.entryId).toBeTruthy();
		expect(top.toGrams).toBe((top.fromGrams ?? 0) + top.deltaGrams);
	});

	it('picks the food that closes the binding gap', () => {
		// Protein-shaped gap: chicken, not rice.
		const [top] = buildNudges(rem(400, 40, 2, 5), logged, []);
		expect(top.name).toBe('Chicken');
	});

	it('never suggests less than the relevance floor', () => {
		for (const n of buildNudges(rem(2000, 100, 50, 200), logged, [])) {
			expect(n.deltaGrams).toBeGreaterThanOrEqual(MIN_DELTA_GRAMS);
		}
	});

	it('quantises to whole steps so amounts read as instructions', () => {
		for (const n of buildNudges(rem(900, 60, 20, 90), logged, [])) {
			expect(n.deltaGrams % GRAM_STEP).toBe(0);
		}
	});

	it('caps a nudge before it becomes a meal', () => {
		for (const n of buildNudges(rem(5000, 300, 100, 600), logged, [])) {
			expect(n.deltaGrams).toBeLessThanOrEqual(MAX_DELTA_GRAMS);
		}
	});

	// The failure this design exists to remove: closing a macro gap by blowing the
	// day's energy budget.
	it('does not overshoot the calorie budget to close a macro gap', () => {
		// A big carb gap but almost no calories left to spend on it.
		for (const n of buildNudges(rem(120, 0, 0, 200), logged, [])) {
			expect(n.after.kcal).toBeGreaterThan(-30);
		}
	});

	it('returns nothing when the day has no room left', () => {
		expect(buildNudges(rem(0, 20, 10, 30), logged, [])).toEqual([]);
		expect(buildNudges(rem(-200, 20, 10, 30), logged, [])).toEqual([]);
	});

	// Saying nothing is a valid answer; the caller hides the card on an empty array.
	it('returns nothing when no amount improves the day', () => {
		// Every macro already met — only calories remain, which are not a shortfall.
		expect(buildNudges(rem(300, 0, 0, 0), logged, [])).toEqual([]);
	});

	// A day within a few grams of target does not need finishing. Before overshoot
	// was penalised this suggested +300 g of yoghurt, overshooting protein by 27 g.
	it('stays quiet when the day is already close', () => {
		expect(buildNudges(rem(240, 3, 2, 6), logged, [])).toEqual([]);
	});

	it('prefers a bump over an equally good add', () => {
		const staples = [{ name: 'Rice (staple)', source: 'bls', sourceId: 'S1', per100g: RICE }];
		const nudges = buildNudges(rem(400, 10, 2, 60), logged, staples);
		expect(nudges[0].kind).toBe('bump');
	});

	it('still surfaces a staple when nothing logged fits', () => {
		// A pure fat gap with nothing fatty logged.
		const fatOnly = [{ id: 'e1', name: 'Rice', amountGrams: 150, per100g: RICE }];
		const staples = [{ name: 'Olive oil', source: 'bls', sourceId: 'Q1', per100g: OIL }];
		const nudges = buildNudges(rem(600, 0, 40, 0), fatOnly, staples);
		expect(nudges[0].kind).toBe('add');
		expect(nudges[0].name).toBe('Olive oil');
	});

	it('reports the gaps left after applying, for display instead of a score', () => {
		const [top] = buildNudges(rem(400, 30, 5, 20), logged, []);
		const expected = remainingAfter(rem(400, 30, 5, 20), CHICKEN, top.deltaGrams);
		if (top.name === 'Chicken') expect(top.after.protein).toBeCloseTo(expected.protein);
		expect(top.after).toHaveProperty('kcal');
	});

	it('lists each food once', () => {
		const nudges = buildNudges(rem(900, 60, 20, 90), logged, [
			{ name: 'Rice', source: 'bls', sourceId: 'S1', per100g: RICE },
		]);
		const keys = nudges.map(n => n.kind === 'bump' ? `bump:${n.entryId}` : `add:${n.sourceId}`);
		expect(new Set(keys).size).toBe(keys.length);
	});

	it('ignores entries with no weight and foods with no energy', () => {
		const odd = [
			{ id: 'z', name: 'Zero', amountGrams: 0, per100g: CHICKEN },
			{ id: 'w', name: 'Water', amountGrams: 200, per100g: { calories: 0, protein: 0, fat: 0, carbs: 0 } },
		];
		expect(buildNudges(rem(500, 30, 10, 40), odd, [])).toEqual([]);
	});

	it('honours the limit', () => {
		expect(buildNudges(rem(900, 60, 20, 90), logged, [], 1)).toHaveLength(1);
	});
});

describe('learnStaples', () => {
	const day = (d: number) => new Date(Date.UTC(2026, 0, d)).toISOString();

	it('counts distinct days, not entries', () => {
		// Same food three times on one day is a meal, not a habit.
		const entries = [
			{ name: 'Rice', source: 'bls', sourceId: 'R', date: day(1), per100g: RICE },
			{ name: 'Rice', source: 'bls', sourceId: 'R', date: day(1), per100g: RICE },
			{ name: 'Rice', source: 'bls', sourceId: 'R', date: day(1), per100g: RICE },
		];
		expect(learnStaples(entries, 3)).toEqual([]);
	});

	it('promotes a food eaten on enough separate days', () => {
		const entries = [1, 2, 3].map(d => ({ name: 'Rice', source: 'bls', sourceId: 'R', date: day(d), per100g: RICE }));
		const staples = learnStaples(entries, 3);
		expect(staples).toHaveLength(1);
		expect(staples[0]).toMatchObject({ name: 'Rice', days: 3 });
	});

	it('ranks by how routine a food is', () => {
		const entries = [
			...[1, 2, 3, 4, 5].map(d => ({ name: 'Rice', source: 'bls', sourceId: 'R', date: day(d), per100g: RICE })),
			...[1, 2, 3].map(d => ({ name: 'Chicken', source: 'bls', sourceId: 'C', date: day(d), per100g: CHICKEN })),
		];
		expect(learnStaples(entries, 3).map(s => s.name)).toEqual(['Rice', 'Chicken']);
	});

	it('skips entries with no stable identity', () => {
		const entries = [1, 2, 3].map(d => ({ name: 'Ad hoc', date: day(d), per100g: RICE }));
		expect(learnStaples(entries, 3)).toEqual([]);
	});

	it('carries per100g through so a staple can be logged directly', () => {
		const entries = [1, 2, 3].map(d => ({ name: 'Rice', source: 'bls', sourceId: 'R', date: day(d), per100g: RICE }));
		expect(learnStaples(entries, 3)[0].per100g).toEqual(RICE);
	});
});
