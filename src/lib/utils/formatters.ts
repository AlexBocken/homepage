/**
 * Shared formatting utilities for both client and server
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

/**
 * Format a date with customizable style
 *
 * @param date - The date to format (Date object, ISO string, or timestamp)
 * @param locale - The locale for formatting (default: 'de-DE')
 * @param options - Intl.DateTimeFormat options
 * @returns Formatted date string
 *
 * @example
 * ```ts
 * formatDate(new Date()) // "18.11.2025"
 * formatDate(new Date(), 'de-DE', { dateStyle: 'long' }) // "18. November 2025"
 * formatDate('2025-11-18') // "18.11.2025"
 * ```
 */
export function formatDate(
	date: Date | string | number,
	locale: string = 'de-DE',
	options: Intl.DateTimeFormatOptions = { dateStyle: 'short' }
): string {
	const dateObj = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;

	if (isNaN(dateObj.getTime())) {
		return 'Invalid Date';
	}

	return new Intl.DateTimeFormat(locale, options).format(dateObj);
}

/**
 * Format a date and time with customizable style
 *
 * @param date - The date to format (Date object, ISO string, or timestamp)
 * @param locale - The locale for formatting (default: 'de-DE')
 * @param options - Intl.DateTimeFormat options
 * @returns Formatted datetime string
 *
 * @example
 * ```ts
 * formatDateTime(new Date()) // "18.11.2025, 14:30"
 * formatDateTime(new Date(), 'de-DE', { dateStyle: 'medium', timeStyle: 'short' })
 * // "18. Nov. 2025, 14:30"
 * ```
 */
export function formatDateTime(
	date: Date | string | number,
	locale: string = 'de-DE',
	options: Intl.DateTimeFormatOptions = { dateStyle: 'short', timeStyle: 'short' }
): string {
	const dateObj = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;

	if (isNaN(dateObj.getTime())) {
		return 'Invalid Date';
	}

	return new Intl.DateTimeFormat(locale, options).format(dateObj);
}

/**
 * Format a number with customizable decimal places and locale
 *
 * @param num - The number to format
 * @param decimals - Number of decimal places (default: 2)
 * @param locale - The locale for formatting (default: 'de-DE')
 * @returns Formatted number string
 *
 * @example
 * ```ts
 * formatNumber(1234.5678) // "1.234,57"
 * formatNumber(1234.5678, 0) // "1.235"
 * formatNumber(1234.5678, 3) // "1.234,568"
 * ```
 */
export function formatNumber(
	num: number,
	decimals: number = 2,
	locale: string = 'de-DE'
): string {
	return new Intl.NumberFormat(locale, {
		minimumFractionDigits: decimals,
		maximumFractionDigits: decimals
	}).format(num);
}

/**
 * Format a relative time (e.g., "2 days ago", "in 3 hours")
 *
 * @param date - The date to compare
 * @param baseDate - The base date to compare against (default: now)
 * @param locale - The locale for formatting (default: 'de-DE')
 * @returns Formatted relative time string
 *
 * @example
 * ```ts
 * formatRelativeTime(new Date(Date.now() - 86400000)) // "vor 1 Tag"
 * formatRelativeTime(new Date(Date.now() + 3600000)) // "in 1 Stunde"
 * ```
 */
export function formatRelativeTime(
	date: Date | string | number,
	baseDate: Date = new Date(),
	locale: string = 'de-DE'
): string {
	const dateObj = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;

	if (isNaN(dateObj.getTime())) {
		return 'Invalid Date';
	}

	const diffMs = dateObj.getTime() - baseDate.getTime();
	const diffSeconds = Math.floor(diffMs / 1000);
	const diffMinutes = Math.floor(diffSeconds / 60);
	const diffHours = Math.floor(diffMinutes / 60);
	const diffDays = Math.floor(diffHours / 24);
	const diffWeeks = Math.floor(diffDays / 7);
	const diffMonths = Math.floor(diffDays / 30);
	const diffYears = Math.floor(diffDays / 365);

	const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

	if (Math.abs(diffYears) >= 1) return rtf.format(diffYears, 'year');
	if (Math.abs(diffMonths) >= 1) return rtf.format(diffMonths, 'month');
	if (Math.abs(diffWeeks) >= 1) return rtf.format(diffWeeks, 'week');
	if (Math.abs(diffDays) >= 1) return rtf.format(diffDays, 'day');
	if (Math.abs(diffHours) >= 1) return rtf.format(diffHours, 'hour');
	if (Math.abs(diffMinutes) >= 1) return rtf.format(diffMinutes, 'minute');
	return rtf.format(diffSeconds, 'second');
}

/**
 * Format bytes into human-readable file size
 *
 * @param bytes - Number of bytes
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted file size string
 *
 * @example
 * ```ts
 * formatFileSize(1024) // "1.00 KB"
 * formatFileSize(1234567) // "1.18 MB"
 * formatFileSize(1234567890) // "1.15 GB"
 * ```
 */
export function formatFileSize(bytes: number, decimals: number = 2): string {
	if (bytes === 0) return '0 Bytes';

	const k = 1024;
	const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
	const i = Math.floor(Math.log(bytes) / Math.log(k));

	return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
}

/**
 * Format a percentage with customizable decimal places
 *
 * @param value - The value to format as percentage (0-1 or 0-100)
 * @param decimals - Number of decimal places (default: 0)
 * @param isDecimal - Whether the value is between 0-1 (true) or 0-100 (false)
 * @param locale - The locale for formatting (default: 'de-DE')
 * @returns Formatted percentage string
 *
 * @example
 * ```ts
 * formatPercentage(0.456, 1, true) // "45,6 %"
 * formatPercentage(45.6, 1, false) // "45,6 %"
 * formatPercentage(0.75, 0, true) // "75 %"
 * ```
 */
export function formatPercentage(
	value: number,
	decimals: number = 0,
	isDecimal: boolean = true,
	locale: string = 'de-DE'
): string {
	const percentage = isDecimal ? value : value / 100;

	return new Intl.NumberFormat(locale, {
		style: 'percent',
		minimumFractionDigits: decimals,
		maximumFractionDigits: decimals
	}).format(percentage);
}
