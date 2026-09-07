import { describe, expect, it } from 'vitest';
import { qualifyingDays, streaks } from '../../../src/lib/faith/readingStreak';
import { chapterWords, wordsPerDay, DONE_SHARE } from '../../../src/lib/faith/readingPlan';
import { localDateStrAtOffset } from '../../../src/lib/js/localDate';

const day = (keys: string[]) => new Set(keys);

describe('the days that count toward the streak', () => {
	const plan = { plan: 'nt-psalms' as const, lang: 'de' as const, minutesPerDay: 10, startDate: '2026-09-01' };
	const target = DONE_SHARE * wordsPerDay(10, 'de');

	it('without a plan every reading day counts', () => {
		const byDay = new Map([['2026-09-02', day(['gen/1'])], ['2026-09-01', day(['joh/1'])]]);
		expect(qualifyingDays(byDay, null)).toEqual(['2026-09-01', '2026-09-02']);
	});

	it('with a plan a chapter outside its books does nothing, however long', () => {
		const byDay = new Map([['2026-09-02', day(['gen/1', 'gen/2', 'gen/3', 'gen/4', 'gen/5'])]]);
		expect(qualifyingDays(byDay, plan)).toEqual([]);
	});

	it('a day counts once the target is read inside the plan, not after one chapter', () => {
		// Enough of Luke to pass the target, and a single short chapter that does not.
		const enough: string[] = [];
		let words = 0;
		for (let ch = 1; words < target; ch++) {
			enough.push(`lk/${ch}`);
			words += chapterWords('lk', ch, 'de');
		}
		const byDay = new Map([
			['2026-09-02', day(enough)],
			['2026-09-03', day(['1joh/1'])]
		]);
		expect(chapterWords('1joh', 1, 'de')).toBeLessThan(target);
		expect(qualifyingDays(byDay, plan)).toEqual(['2026-09-02']);
	});

	it('the psalms lane counts with the New Testament lane', () => {
		const keys: string[] = [];
		let words = 0;
		for (let ch = 1; words < target; ch++) {
			keys.push(`ps/${ch}`);
			words += chapterWords('ps', ch, 'de');
		}
		expect(qualifyingDays(new Map([['2026-09-05', day(keys)]]), plan)).toEqual(['2026-09-05']);
	});

	it('days before the plan began count as they were', () => {
		const byDay = new Map([['2026-08-30', day(['gen/1'])], ['2026-09-02', day(['1joh/1'])]]);
		expect(qualifyingDays(byDay, plan)).toEqual(['2026-08-30']);
	});

	it('feeds the streak the same way on every device', () => {
		const byDay = new Map([['2026-09-05', day(['gen/1'])], ['2026-09-06', day(['gen/2'])]]);
		expect(streaks(qualifyingDays(byDay, null), '2026-09-06').current).toBe(2);
		// A stale "today" of yesterday is what made one device say 1: the day must come from the clock.
		expect(streaks(qualifyingDays(byDay, null), '2026-09-05').current).toBe(1);
	});
});

describe('the reader’s calendar day from its UTC offset', () => {
	it('names the day at the reader’s offset, not the server’s', () => {
		const t = Date.UTC(2026, 8, 6, 22, 30); // 22:30 UTC on 6 Sep
		expect(localDateStrAtOffset(0, t)).toBe('2026-09-06');
		expect(localDateStrAtOffset(-120, t)).toBe('2026-09-07'); // Zurich in summer, 00:30 next day
		expect(localDateStrAtOffset(300, t)).toBe('2026-09-06'); // New York, 17:30
		expect(localDateStrAtOffset(-840, t)).toBe('2026-09-07'); // Kiritimati
	});
});
