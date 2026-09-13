import { describe, expect, it } from 'vitest';
import { paceOn, qualifyingDays, streaks, type PlanPeriod } from '../../../src/lib/faith/readingStreak';
import { chapterWords, wordsPerDay, DONE_SHARE } from '../../../src/lib/faith/readingPlan';
import { localDateStrAtOffset } from '../../../src/lib/js/localDate';

const day = (keys: string[]) => new Set(keys);

/** Enough chapters of `slug` from chapter 1 to pass `target` German words. */
const enoughOf = (slug: string, target: number): string[] => {
	const keys: string[] = [];
	let words = 0;
	for (let ch = 1; words < target; ch++) {
		keys.push(`${slug}/${ch}`);
		words += chapterWords(slug, ch, 'de');
	}
	return keys;
};

describe('the days that count toward the streak', () => {
	const plan: PlanPeriod = { plan: 'nt-psalms', lang: 'de', from: '2026-09-01', to: null, paces: [{ from: '2026-09-01', minutesPerDay: 10 }] };
	const target = DONE_SHARE * wordsPerDay(10, 'de');

	it('without a plan every reading day counts', () => {
		const byDay = new Map([['2026-09-02', day(['gen/1'])], ['2026-09-01', day(['joh/1'])]]);
		expect(qualifyingDays(byDay, [])).toEqual(['2026-09-01', '2026-09-02']);
	});

	it('with a plan a chapter outside its books does nothing, however long', () => {
		const byDay = new Map([['2026-09-02', day(['gen/1', 'gen/2', 'gen/3', 'gen/4', 'gen/5'])]]);
		expect(qualifyingDays(byDay, [plan])).toEqual([]);
	});

	it('a day counts once the target is read inside the plan, not after one chapter', () => {
		const byDay = new Map([
			['2026-09-02', day(enoughOf('lk', target))],
			['2026-09-03', day(['1joh/1'])]
		]);
		expect(chapterWords('1joh', 1, 'de')).toBeLessThan(target);
		expect(qualifyingDays(byDay, [plan])).toEqual(['2026-09-02']);
	});

	it('the psalms lane counts with the New Testament lane', () => {
		expect(qualifyingDays(new Map([['2026-09-05', day(enoughOf('ps', target))]]), [plan])).toEqual(['2026-09-05']);
	});

	it('days before the plan began count as they were', () => {
		const byDay = new Map([['2026-08-30', day(['gen/1'])], ['2026-09-02', day(['1joh/1'])]]);
		expect(qualifyingDays(byDay, [plan])).toEqual(['2026-08-30']);
	});

	it('feeds the streak the same way on every device', () => {
		const byDay = new Map([['2026-09-05', day(['gen/1'])], ['2026-09-06', day(['gen/2'])]]);
		expect(streaks(qualifyingDays(byDay, []), '2026-09-06').current).toBe(2);
		// A stale "today" of yesterday is what made one device say 1: the day must come from the clock.
		expect(streaks(qualifyingDays(byDay, []), '2026-09-05').current).toBe(1);
	});
});

describe('a goal raised later leaves the days behind it alone', () => {
	const target10 = DONE_SHARE * wordsPerDay(10, 'de');
	// Ten minutes from the first, thirty from the sixth on.
	const raised: PlanPeriod = {
		plan: 'nt',
		lang: 'de',
		from: '2026-09-01',
		to: null,
		paces: [{ from: '2026-09-01', minutesPerDay: 10 }, { from: '2026-09-06', minutesPerDay: 30 }]
	};

	it('takes the goal that stood on the day', () => {
		expect(paceOn(raised.paces, '2026-09-03')).toBe(10);
		expect(paceOn(raised.paces, '2026-09-06')).toBe(30);
		expect(paceOn(raised.paces, '2026-09-20')).toBe(30);
	});

	it('keeps the days that met the old goal and asks the new one of the days after', () => {
		const ten = day(enoughOf('mt', target10));
		const byDay = new Map([
			['2026-09-02', ten],
			['2026-09-03', ten],
			['2026-09-07', ten]
		]);
		expect(qualifyingDays(byDay, [raised])).toEqual(['2026-09-02', '2026-09-03']);
	});

	it('does not take back the very day the goal was raised', () => {
		// Both points sit on the 6th: the reader met ten minutes, then aimed at thirty.
		const sameDay: PlanPeriod = { ...raised, paces: [{ from: '2026-09-01', minutesPerDay: 10 }, { from: '2026-09-06', minutesPerDay: 10 }, { from: '2026-09-06', minutesPerDay: 30 }] };
		expect(paceOn(sameDay.paces, '2026-09-06')).toBe(10);
		expect(paceOn(sameDay.paces, '2026-09-07')).toBe(30);
		expect(qualifyingDays(new Map([['2026-09-06', day(enoughOf('mt', target10))]]), [sameDay])).toEqual(['2026-09-06']);
	});
});

describe('switching plans leaves the days behind it alone', () => {
	const target = DONE_SHARE * wordsPerDay(10, 'de');
	const pace = [{ from: '2026-09-01', minutesPerDay: 10 }];
	// The Old Testament until the 5th, then the New — the day of the switch in both.
	const periods: PlanPeriod[] = [
		{ plan: 'ot', lang: 'de', from: '2026-09-01', to: '2026-09-05', paces: pace },
		{ plan: 'nt', lang: 'de', from: '2026-09-05', to: null, paces: [{ from: '2026-09-05', minutesPerDay: 10 }] }
	];

	it('reads a day under the plan that ran that day', () => {
		const byDay = new Map([
			['2026-09-02', day(enoughOf('gen', target))], // under the Old Testament plan
			['2026-09-07', day(enoughOf('gen', target))], // Genesis no longer counts
			['2026-09-08', day(enoughOf('mt', target))]
		]);
		expect(qualifyingDays(byDay, periods)).toEqual(['2026-09-02', '2026-09-08']);
	});

	it('on the day of the switch either plan is enough', () => {
		expect(qualifyingDays(new Map([['2026-09-05', day(enoughOf('gen', target))]]), periods)).toEqual(['2026-09-05']);
		expect(qualifyingDays(new Map([['2026-09-05', day(enoughOf('mt', target))]]), periods)).toEqual(['2026-09-05']);
	});

	it('a gap between two plans counts as reading with no plan at all', () => {
		const gapped: PlanPeriod[] = [periods[0], { ...periods[1], from: '2026-09-10' }];
		expect(qualifyingDays(new Map([['2026-09-07', day(['gen/1'])]]), gapped)).toEqual(['2026-09-07']);
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
