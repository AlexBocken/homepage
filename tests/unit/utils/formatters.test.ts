import { describe, it, expect } from 'vitest';
import { formatCurrency } from '$lib/utils/formatters';

describe('formatters', () => {
	describe('formatCurrency', () => {
		it('should format EUR currency in German locale', () => {
			const result = formatCurrency(1234.56, 'EUR', 'de-DE');
			expect(result).toBe('1.234,56\xa0€');
		});

		it('should format USD currency in US locale', () => {
			const result = formatCurrency(1234.56, 'USD', 'en-US');
			expect(result).toBe('$1,234.56');
		});

		it('should use EUR and de-DE as defaults', () => {
			const result = formatCurrency(1000);
			expect(result).toContain('€');
			expect(result).toContain('1.000');
		});

		it('should handle zero', () => {
			const result = formatCurrency(0, 'EUR', 'de-DE');
			expect(result).toBe('0,00\xa0€');
		});

		it('should handle negative numbers', () => {
			const result = formatCurrency(-1234.56, 'EUR', 'de-DE');
			expect(result).toContain('-');
			expect(result).toContain('1.234,56');
		});
	});
});
