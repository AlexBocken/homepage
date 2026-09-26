import { describe, it, expect } from 'vitest';
import { calculateNextExecutionDate } from '$lib/utils/recurring';
import { RECURRING_FREQUENCIES } from '$lib/js/cospendI18n';
import type { IRecurringPayment } from '$models/RecurringPayment';

const every = (frequency: IRecurringPayment['frequency'], cronExpression?: string) =>
	({ frequency, cronExpression }) as IRecurringPayment;

const from = new Date(2026, 0, 15, 9, 30);

describe('calculateNextExecutionDate', () => {
	it.each([
		['daily', new Date(2026, 0, 16, 9, 30)],
		['weekly', new Date(2026, 0, 22, 9, 30)],
		['monthly', new Date(2026, 1, 15, 9, 30)],
		['quarterly', new Date(2026, 3, 15, 9, 30)],
		['yearly', new Date(2027, 0, 15, 9, 30)]
	] as const)('%s steps forward from the given date', (frequency, expected) => {
		expect(calculateNextExecutionDate(every(frequency), from)).toEqual(expected);
	});

	it('yearly overflows a leap day into 1 March, like the month steps overflow short months', () => {
		expect(calculateNextExecutionDate(every('yearly'), new Date(2028, 1, 29))).toEqual(new Date(2029, 2, 1));
	});

	it('quarterly crosses the year end', () => {
		expect(calculateNextExecutionDate(every('quarterly'), new Date(2026, 10, 5))).toEqual(new Date(2027, 1, 5));
	});

	it('finds a custom cron occurrence days away', () => {
		// Mondays 09:00; 15 Jan 2026 is a Thursday
		expect(calculateNextExecutionDate(every('custom', '0 9 * * 1'), from)).toEqual(new Date(2026, 0, 19, 9, 0));
	});

	it('finds a yearly custom cron occurrence', () => {
		expect(calculateNextExecutionDate(every('custom', '0 0 1 1 *'), from)).toEqual(new Date(2027, 0, 1, 0, 0));
	});

	it('handles every frequency the API accepts', () => {
		for (const f of RECURRING_FREQUENCIES) {
			const payment = every(f, f === 'custom' ? '0 9 * * 1' : undefined);
			expect(() => calculateNextExecutionDate(payment, from)).not.toThrow();
		}
	});
});
