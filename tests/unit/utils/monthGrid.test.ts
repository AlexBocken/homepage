import { describe, it, expect } from 'vitest';
import { monthGrid } from '../../../src/lib/js/localDate';

/**
 * The grid DatePicker.svelte and DateTimePicker.svelte each built inline before
 * monthGrid() existed, copied verbatim (minus the per-cell flags) so the
 * extraction can be proven to change nothing.
 */
function legacyGrid(viewYear: number, viewMonth: number) {
	const first = new Date(viewYear, viewMonth, 1);
	let startDay = first.getDay() - 1;
	if (startDay < 0) startDay = 6;
	const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
	const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();
	const days: { date: string; day: number; currentMonth: boolean }[] = [];
	for (let i = startDay - 1; i >= 0; i--) {
		const d = daysInPrevMonth - i;
		const m = viewMonth === 0 ? 11 : viewMonth - 1;
		const y = viewMonth === 0 ? viewYear - 1 : viewYear;
		days.push({ date: `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`, day: d, currentMonth: false });
	}
	for (let d = 1; d <= daysInMonth; d++) {
		days.push({ date: `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`, day: d, currentMonth: true });
	}
	const remaining = 7 - (days.length % 7);
	if (remaining < 7) {
		for (let d = 1; d <= remaining; d++) {
			const m = viewMonth === 11 ? 0 : viewMonth + 1;
			const y = viewMonth === 11 ? viewYear + 1 : viewYear;
			days.push({ date: `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`, day: d, currentMonth: false });
		}
	}
	return days;
}

const dates = (y: number, m: number) => monthGrid(y, m).map((d) => d.date);

describe('monthGrid', () => {
	it('matches the grid the pickers built inline, for every month 1990-2110', () => {
		for (let y = 1990; y <= 2110; y++) {
			for (let m = 0; m < 12; m++) {
				const got = monthGrid(y, m).map(({ date, day, currentMonth }) => ({ date, day, currentMonth }));
				expect(got).toEqual(legacyGrid(y, m));
			}
		}
	});

	it('pads a leap February to whole Monday-first weeks', () => {
		// 1 Feb 2024 is a Thursday; 29 Feb a Thursday.
		const g = monthGrid(2024, 1);
		expect(g).toHaveLength(35);
		expect(g[0]).toEqual({ date: '2024-01-29', year: 2024, month: 0, day: 29, currentMonth: false });
		expect(g.filter((d) => d.currentMonth)).toHaveLength(29);
		expect(g.at(-1)?.date).toBe('2024-03-03');
		// 2000 was a leap year, 2100 will not be.
		expect(monthGrid(2000, 1).filter((d) => d.currentMonth)).toHaveLength(29);
		expect(monthGrid(2100, 1).filter((d) => d.currentMonth)).toHaveLength(28);
	});

	it('fits a February starting on a Monday in exactly four rows', () => {
		// 1 Feb 2021 is a Monday, 28 Feb a Sunday: no padding either side.
		expect(dates(2021, 1)).toHaveLength(28);
		expect(dates(2021, 1)[0]).toBe('2021-02-01');
		expect(dates(2021, 1).at(-1)).toBe('2021-02-28');
	});

	it('puts a Sunday 1st in the last column, after six days of the month before', () => {
		// 1 Sep 2024 is a Sunday.
		const g = dates(2024, 8);
		expect(g.slice(0, 7)).toEqual(['2024-08-26', '2024-08-27', '2024-08-28', '2024-08-29', '2024-08-30', '2024-08-31', '2024-09-01']);
		expect(g).toHaveLength(42);
		expect(g.at(-1)).toBe('2024-10-06');
	});

	it('rolls December into January of the next year', () => {
		const g = monthGrid(2024, 11);
		expect(g[0].date).toBe('2024-11-25');
		expect(g.slice(-5).map((d) => d.date)).toEqual(['2025-01-01', '2025-01-02', '2025-01-03', '2025-01-04', '2025-01-05']);
		expect(g.at(-1)).toEqual({ date: '2025-01-05', year: 2025, month: 0, day: 5, currentMonth: false });
	});

	it('rolls January back into December of the year before', () => {
		// 1 Jan 2025 is a Wednesday.
		expect(dates(2025, 0).slice(0, 3)).toEqual(['2024-12-30', '2024-12-31', '2025-01-01']);
	});

	it('is always whole weeks of consecutive days', () => {
		for (let m = 0; m < 12; m++) {
			const g = monthGrid(2026, m);
			expect(g.length % 7).toBe(0);
			for (let i = 1; i < g.length; i++) {
				const prev = new Date(g[i - 1].year, g[i - 1].month, g[i - 1].day);
				prev.setDate(prev.getDate() + 1);
				expect([prev.getFullYear(), prev.getMonth(), prev.getDate()]).toEqual([g[i].year, g[i].month, g[i].day]);
			}
			expect(new Date(g[0].year, g[0].month, g[0].day).getDay()).toBe(1);
		}
	});
});
