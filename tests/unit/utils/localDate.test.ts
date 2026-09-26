import { describe, it, expect } from 'vitest';
import { pad2, localDateStr, localDateOffset } from '../../../src/lib/js/localDate';

describe('pad2', () => {
	it('zero-pads to two digits and leaves longer numbers alone', () => {
		expect(pad2(0)).toBe('00');
		expect(pad2(7)).toBe('07');
		expect(pad2(12)).toBe('12');
		expect(pad2(2026)).toBe('2026');
	});
});

describe('localDateStr', () => {
	it('uses the local calendar day, not UTC', () => {
		// 00:30 local on 7 Sep — toISOString would say the 6th east of UTC.
		expect(localDateStr(new Date(2026, 8, 7, 0, 30))).toBe('2026-09-07');
		expect(localDateStr(new Date(2026, 0, 1, 23, 59))).toBe('2026-01-01');
	});

	it('offsets by whole local days', () => {
		const y = new Date();
		y.setDate(y.getDate() - 1);
		expect(localDateOffset(-1)).toBe(localDateStr(y));
	});
});
