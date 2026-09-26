import { describe, it, expect } from 'vitest';
import { pad2, localDateStr, localDateOffset, shiftDay } from '../../../src/lib/js/localDate';

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

describe('shiftDay', () => {
	it('steps across month, year and leap-day boundaries', () => {
		expect(shiftDay('2026-03-01', -1)).toBe('2026-02-28');
		expect(shiftDay('2028-03-01', -1)).toBe('2028-02-29');
		expect(shiftDay('2026-01-01', -1)).toBe('2025-12-31');
		expect(shiftDay('2026-12-31', 1)).toBe('2027-01-01');
	});

	it('ignores the local timezone and DST', () => {
		// 29 March 2026 is the CET→CEST switch
		expect(shiftDay('2026-03-30', -1)).toBe('2026-03-29');
		expect(shiftDay('2026-10-26', -1)).toBe('2026-10-25');
	});
});
