import { describe, it, expect } from 'vitest';
import { nutrientRow, nutrientRows } from '../../../src/lib/fitness/nutrientRows';
import { getDRI } from '../../../src/lib/data/dailyReferenceIntake';

const dri = getDRI('male');

describe('nutrientRow', () => {
	it('states an amount as a share of what a day asks for', () => {
		const row = nutrientRow('vitaminC', dri.vitaminC / 2, dri, true);
		expect(row.pct).toBe(50);
		expect(row.bar).toBe(50);
		expect(row.goal).toBe(dri.vitaminC);
	});

	it('labels in the reader’s language', () => {
		expect(nutrientRow('iron', 5, dri, true).label).toBe('Iron');
		expect(nutrientRow('iron', 5, dri, false).label).toBe('Eisen');
	});

	// A dash, not a zero: an empty bar against a reference intake reads as a
	// deficiency, when it only means nothing eaten publishes the figure.
	it('marks a nutrient nothing reported as unmeasured rather than absent', () => {
		const row = nutrientRow('selenium', null, dri, true);
		expect(row.noData).toBe(true);
		expect(row.pct).toBeNull();
		expect(row.bar).toBe(0);
	});

	it('keeps a reported zero as a real zero', () => {
		const row = nutrientRow('vitaminD', 0, dri, true);
		expect(row.noData).toBe(false);
		expect(row.pct).toBe(0);
	});

	it('carries the ceiling flag, so the bar can be coloured as a limit', () => {
		expect(nutrientRow('sodium', 1000, dri, true).isMax).toBe(true);
		expect(nutrientRow('iron', 5, dri, true).isMax).toBe(false);
	});

	// Retinol, starch and the two sugars have no requirement of their own — the
	// interesting question is what share of the figure they are part of they make up.
	it('measures a share-of-a-parent nutrient against its parent', () => {
		const row = nutrientRow('retinol', 300, dri, true, k => (k === 'vitaminA' ? 1200 : 0));
		expect(row.relativeTo).toBe('vitaminA');
		expect(row.pct).toBe(25);
		expect(row.goal).toBe(0);
	});

	it('says nothing when there is no parent figure to be a share of', () => {
		const row = nutrientRow('starch', 40, dri, true, () => 0);
		expect(row.pct).toBeNull();
	});

	it('does not invent a percentage for a nutrient with no reference', () => {
		expect(nutrientRow('caffeine', 80, dri, true).pct).toBeNull();
	});
});

describe('nutrientRows', () => {
	it('keeps the order it was given', () => {
		const keys = ['iron', 'zinc', 'calcium'];
		expect(nutrientRows(keys, () => 1, dri, true).map(r => r.key)).toEqual(keys);
	});

	it('feeds parent figures from the same lookup, so relative rows work in a list', () => {
		const values: Record<string, number> = { vitaminA: 800, retinol: 200 };
		const [, retinol] = nutrientRows(['vitaminA', 'retinol'], k => values[k], dri, true);
		expect(retinol.pct).toBe(25);
	});
});
