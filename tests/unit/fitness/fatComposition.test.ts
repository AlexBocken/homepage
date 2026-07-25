import { describe, it, expect } from 'vitest';
import { fatCompositionRows, FAT_COMPOSITION_GROUPS } from '../../../src/lib/fitness/fatComposition';

/**
 * The three views that list fat composition share this builder precisely so they
 * cannot drift apart again, so what is pinned here is the contract they rely on:
 * the order, the nesting, and which total each percentage is measured against.
 */

const VALUES = {
	monounsaturatedFat: 12,
	polyunsaturatedFat: 8,
	omega6: 6,
	linoleicAcid: 5,
	gammaLinolenicAcid: 1,
	omega3: 2,
	alphaLinolenicAcid: 1.5,
	epa: 0.2,
	dha: 0.3,
};

describe('fatCompositionRows', () => {
	it('puts each omega total ahead of the acids it is the sum of', () => {
		const rows = fatCompositionRows(VALUES, { totalFat: 40 });
		const keys = rows.map(r => r.key);
		expect(keys.slice(0, 3)).toEqual(['monounsaturatedFat', 'polyunsaturatedFat', 'omega6']);
		expect(keys.indexOf('linoleicAcid')).toBeGreaterThan(keys.indexOf('omega6'));
		expect(keys.indexOf('epa')).toBeGreaterThan(keys.indexOf('omega3'));
		// Every acid of a family sits between its own total and the next one.
		expect(keys.indexOf('arachidonicAcid')).toBeLessThan(keys.indexOf('omega3'));
	});

	it('marks the omega totals as headers and the acids as children', () => {
		const rows = fatCompositionRows(VALUES, { totalFat: 40 });
		const omega6 = rows.find(r => r.key === 'omega6')!;
		const la = rows.find(r => r.key === 'linoleicAcid')!;
		expect(omega6).toMatchObject({ header: true, child: false });
		expect(la).toMatchObject({ header: false, child: true });
		// Monounsaturated has no acids under it, so it heads nothing.
		expect(rows.find(r => r.key === 'monounsaturatedFat')!.header).toBe(false);
	});

	// The two percentages answer different questions, and summing one column of both
	// would count the same fat twice.
	it('measures a top-level row against total fat and an acid against its family', () => {
		const rows = fatCompositionRows(VALUES, { totalFat: 40 });
		expect(rows.find(r => r.key === 'monounsaturatedFat')!.pct).toBe(30); // 12 of 40
		expect(rows.find(r => r.key === 'omega6')!.pct).toBe(15); // 6 of 40
		expect(rows.find(r => r.key === 'linoleicAcid')!.pct).toBe(83); // 5 of 6
		expect(rows.find(r => r.key === 'dha')!.pct).toBe(15); // 0.3 of 2
	});

	it('reports no share rather than an invented one when total fat is unknown', () => {
		const rows = fatCompositionRows(VALUES, { totalFat: 0 });
		expect(rows.find(r => r.key === 'polyunsaturatedFat')!.pct).toBeNull();
		// A family total is still known, so its acids keep their share.
		expect(rows.find(r => r.key === 'linoleicAcid')!.pct).toBe(83);
	});

	it('scales top-level bars against each other and acid bars within their family', () => {
		const rows = fatCompositionRows(VALUES, { totalFat: 40 });
		expect(rows.find(r => r.key === 'monounsaturatedFat')!.bar).toBe(100); // the largest
		expect(rows.find(r => r.key === 'polyunsaturatedFat')!.bar).toBeCloseTo(66.67, 1);
		// Within omega-6, linoleic acid is 5 of 6 — legible even though the whole
		// family is a sliver next to the monounsaturates.
		expect(rows.find(r => r.key === 'linoleicAcid')!.bar).toBeCloseTo(83.33, 1);
	});

	it('shows unmeasured rows as zero for a day or an average', () => {
		const rows = fatCompositionRows({ omega3: 2, dha: 2 }, { totalFat: 10 });
		expect(rows.map(r => r.key)).toEqual(
			FAT_COMPOSITION_GROUPS.flatMap(g => [g.key, ...g.children])
		);
		expect(rows.find(r => r.key === 'epa')!.value).toBe(0);
	});

	it('drops unmeasured rows for a single food', () => {
		const rows = fatCompositionRows({ omega3: 2, dha: 2 }, { totalFat: 10, includeMissing: false });
		expect(rows.map(r => r.key)).toEqual(['omega3', 'dha']);
	});

	// A family whose total is absent but whose acids are not must still appear —
	// USDA publishes the acids and no roll-up.
	it('keeps a family a source reported only as individual acids', () => {
		const rows = fatCompositionRows({ epa: 0.4 }, { totalFat: 10, includeMissing: false });
		expect(rows.map(r => r.key)).toEqual(['omega3', 'epa']);
		expect(rows[0].value).toBe(0);
	});

	it('appends the biochemical shorthand only when asked', () => {
		const plain = fatCompositionRows(VALUES, { includeMissing: false });
		const short = fatCompositionRows(VALUES, { includeMissing: false, withShort: true });
		expect(plain.find(r => r.key === 'linoleicAcid')!.label).toBe('Linoleic acid');
		expect(short.find(r => r.key === 'linoleicAcid')!.label).toBe('Linoleic acid (LA (18:2 n-6))');
	});

	it('speaks German', () => {
		const rows = fatCompositionRows(VALUES, { isEn: false, includeMissing: false });
		expect(rows.find(r => r.key === 'omega3')!.label).toBe('Omega-3');
		expect(rows.find(r => r.key === 'linoleicAcid')!.label).toBe('Linolsäure');
	});

	it('survives an empty record', () => {
		expect(fatCompositionRows(null, { includeMissing: false })).toEqual([]);
		expect(fatCompositionRows(undefined, {}).every(r => r.value === 0)).toBe(true);
	});
});
