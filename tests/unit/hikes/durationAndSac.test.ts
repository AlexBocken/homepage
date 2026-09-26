import { describe, it, expect } from 'vitest';
import { formatHikeDuration, hikeDurationLabel } from '../../../src/lib/hikes/elapsed';
import { sacBand } from '../../../src/lib/data/sacColors';

describe('formatHikeDuration', () => {
	it('prints whole hours plus unpadded leftover minutes', () => {
		expect(formatHikeDuration(0)).toBe('0h 0m');
		expect(formatHikeDuration(45)).toBe('0h 45m');
		expect(formatHikeDuration(60)).toBe('1h 0m');
		expect(formatHikeDuration(245)).toBe('4h 5m');
		expect(formatHikeDuration(600)).toBe('10h 0m');
	});
});

describe('hikeDurationLabel', () => {
	it('falls back to an em dash without a positive time', () => {
		expect(hikeDurationLabel(null)).toBe('—');
		expect(hikeDurationLabel(undefined)).toBe('—');
		expect(hikeDurationLabel(0)).toBe('—');
		expect(hikeDurationLabel(-5)).toBe('—');
	});

	it('formats a positive time', () => {
		expect(hikeDurationLabel(90)).toBe('1h 30m');
	});
});

describe('sacBand', () => {
	it('maps SAC tiers to the Swiss trail-sign colours', () => {
		expect(sacBand('T1')).toBe('yellow');
		expect(sacBand('T2')).toBe('red');
		expect(sacBand('T3')).toBe('red');
		expect(sacBand('T4')).toBe('blue');
		expect(sacBand('T5')).toBe('blue');
		expect(sacBand('T6')).toBe('blue');
	});

	it('treats anything unknown as blue, as the inline copies did', () => {
		expect(sacBand(null)).toBe('blue');
		expect(sacBand('')).toBe('blue');
		expect(sacBand('T7')).toBe('blue');
	});
});
