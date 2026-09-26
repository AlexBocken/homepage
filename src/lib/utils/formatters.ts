/**
 * Shared currency formatting for both client and server
 */

/**
 * Format a number as currency with proper symbol and locale
 *
 * @param amount - The amount to format
 * @param currency - The currency code (EUR, USD, etc.)
 * @param locale - The locale for formatting (default: 'de-DE')
 * @returns Formatted currency string
 *
 * @example
 * ```ts
 * formatCurrency(1234.56, 'EUR') // "1.234,56 €"
 * formatCurrency(1234.56, 'USD', 'en-US') // "$1,234.56"
 * ```
 */
export function formatCurrency(
	amount: number,
	currency: string = 'EUR',
	locale: string = 'de-DE'
): string {
	return new Intl.NumberFormat(locale, {
		style: 'currency',
		currency: currency
	}).format(amount);
}
