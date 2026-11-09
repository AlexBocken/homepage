import { describe, expect, it } from 'vitest';
import { computeShares } from '$lib/utils/cospendSplits';
import { detectTotalLine, parsePrice, type ReceiptLine } from '$lib/utils/receiptOcr';

/** A detected text box; `row` spaces lines 40px apart, as on a printed receipt. */
function box(text: string, row: number, x = 0, height = 30, slope = 0): ReceiptLine {
	const y0 = row * 40 + x * slope;
	return {
		text,
		price: parsePrice(text),
		bbox: { x0: x, y0, x1: x + text.length * 15, y1: y0 + height },
		height,
		slope
	};
}

describe('parsePrice', () => {
	it.each([
		['TOTAL CHF 23.50', 23.5],
		['Milch 2 1.95 3.90', 3.9],
		["Laptop 1'299.00", 1299],
		['1.234,50', 1234.5],
		['Rabatt -5.00', -5],
		['Aktion - 1.50', -1.5],
		['-CHF 5.00', -5],
		['- CHF 5.00', -5],
		['CHF -5.00', -5],
		['Aktion 1.50-', -1.5],
		['Aktion −1.50', -1.5],
		['Aktion 一1.50', -1.5],
		['Total ---- 23.50', 23.5],
		['Total-CHF 23.50', 23.5],
		['Total-EFT CHF: 23.50', 23.5],
		['45,50 A', 45.5]
	])('reads %s', (text, expected) => {
		expect(parsePrice(text)).toBe(expected);
	});

	it.each(['Buchung 12.03.24 14:33', '12.03.2024', '2026-11-09', '8.10%', 'Karte 1234'])(
		'finds no amount in %s',
		(text) => {
			expect(parsePrice(text)).toBeNull();
		}
	);
});

describe('detectTotalLine', () => {
	const items = [box('Brot 3.20', 0), box('Milch 1.95', 1), box('Wein 12.90', 2)];

	it('finds the amount of a label detected as a separate box', () => {
		const amount = box('18.05', 3, 300);
		expect(detectTotalLine([...items, box('Total', 3), amount])).toBe(amount);
	});

	it('takes the oversized amount when no label was read', () => {
		const big = box('18.05', 4, 300, 60);
		expect(detectTotalLine([...items, box('20.00', 3, 300), big])).toBe(big);
	});

	it('prefers the larger of two labelled totals', () => {
		const big = box('TOTAL 18.05', 3, 0, 60);
		const slip = box('Betrag CHF 18.05', 9);
		expect(detectTotalLine([...items, big, slip])).toBe(big);
	});

	it('prefers an oversized total over a larger labelled amount', () => {
		const big = box('Total 18.05', 3, 0, 60);
		expect(detectTotalLine([...items, big, box('Total Punkte 150.00', 8)])).toBe(big);
	});

	it('is not fooled by a card booking line', () => {
		const total = box('Total 18.05', 3);
		expect(detectTotalLine([...items, total, box('Buchung 12.03.24 14:33', 8)])).toBe(total);
	});

	it('skips an amount whose excluding label is a separate box', () => {
		const total = box('Total 18.05', 3);
		const lines = [...items, total, box('Gegeben', 4), box('50.00', 4, 300)];
		expect(detectTotalLine(lines)).toBe(total);
	});

	it('matches rows across a tilted photo', () => {
		const slope = 0.1;
		const amount = box('18.05', 3, 300, 30, slope);
		const lines = [box('Brot 3.20', 0, 0, 30, slope), box('Total', 3, 0, 30, slope), amount];
		expect(detectTotalLine(lines)).toBe(amount);
	});

	it('falls back to the largest amount without other signals', () => {
		expect(detectTotalLine(items)).toBe(items[2]);
	});

	it('never picks a deduction', () => {
		const total = box('18.05', 3, 300);
		expect(detectTotalLine([...items, total, box('Aktion -20.00', 2, 0, 60)])).toBe(total);
	});

	it('returns null without amounts', () => {
		expect(detectTotalLine([box('Danke', 0)])).toBeNull();
	});
});

describe('a deduction assigned to a person', () => {
	it('lowers only their share and still sums to the amount', () => {
		const shares = computeShares('personal_equal', {
			amount: 20,
			users: ['anna', 'ben'],
			paidBy: 'ben',
			personal: (user) => (user === 'anna' ? -2 : 0)
		});
		expect(shares).toEqual({ anna: 9, ben: -9 });
	});
});
