import { describe, it, expect } from 'vitest';
import { CANON, CANON_BY_TESTAMENT } from '../../../src/lib/faith/bibleCanon';
import {
	PLAN_IDS, planLanes, chapterKey, chapterCount, nextPortion, remainingLanes, todayPortion, daysLeft, wordsPerDay,
	nextInPlan, interleave, laneWords
} from '../../../src/lib/faith/readingPlan';
import { streaks } from '../../../src/lib/faith/readingStreak';

const totalChapters = Object.keys(CANON).reduce((n, s) => n + chapterCount(s), 0);

describe('plan lanes', () => {
	it('every plan lists each of its chapters exactly once', () => {
		for (const id of PLAN_IDS) {
			const keys = planLanes(id).flat().map(chapterKey);
			expect(new Set(keys).size, id).toBe(keys.length);
		}
	});

	it('the whole-Bible plans cover the canon, the testament plans their half', () => {
		expect(planLanes('canon').flat().length).toBe(totalChapters);
		expect(planLanes('historia').flat().length).toBe(totalChapters);
		const ot = CANON_BY_TESTAMENT.ot.reduce((n, s) => n + chapterCount(s), 0);
		expect(planLanes('ot')[0].length).toBe(ot);
		expect(planLanes('nt')[0].length).toBe(totalChapters - ot);
		expect(planLanes('nt-psalms')[1].length).toBe(150);
	});

	it('salvation history starts with Genesis 1 and ends with Revelation', () => {
		const main = planLanes('historia')[0];
		expect(main[0]).toEqual({ slug: 'gen', ch: 1 });
		expect(main[main.length - 1]).toEqual({ slug: 'offb', ch: 22 });
		// Job is read alongside the patriarchs, not after Genesis.
		const gen12 = main.findIndex((r) => r.slug === 'gen' && r.ch === 12);
		const job1 = main.findIndex((r) => r.slug === 'ijob' && r.ch === 1);
		expect(job1 - gen12).toBeLessThan(5);
	});

	it('interleaves two sequences proportionally', () => {
		const a = [1, 2, 3, 4].map((ch) => ({ slug: 'a', ch }));
		const b = [1, 2].map((ch) => ({ slug: 'b', ch }));
		expect(interleave(a, b).map(chapterKey)).toEqual(['a/1', 'b/1', 'a/2', 'a/3', 'b/2', 'a/4']);
	});
});

describe('portions', () => {
	it('the whole Bible at 15 minutes a day is about a year', () => {
		const lanes = planLanes('canon');
		const days = daysLeft(lanes, wordsPerDay(15, 'de'), 'de');
		expect(days).toBeGreaterThan(350);
		expect(days).toBeLessThan(375);
	});

	it('walks the canon plan to the end, one portion a day, never empty, never repeating', () => {
		const lanes = planLanes('nt-psalms');
		const read = new Set<string>();
		const target = wordsPerDay(10, 'de');
		let days = 0;
		while (remainingLanes(lanes, read).flat().length > 0) {
			const portion = nextPortion(remainingLanes(lanes, read), target, 'de');
			expect(portion.length).toBeGreaterThan(0);
			for (const r of portion) {
				expect(read.has(chapterKey(r))).toBe(false);
				read.add(chapterKey(r));
			}
			days++;
			expect(days).toBeLessThan(400);
		}
		// Psalms were spread over the whole run, not front-loaded: the last day still had one.
		expect(read.size).toBe(lanes.flat().length);
		// Portions close at or past the done share, so a run lands a little under the word estimate.
		const estimate = laneWords(lanes.flat(), 'de') / target;
		expect(days).toBeGreaterThan(estimate * 0.8);
		expect(days).toBeLessThan(estimate * 1.1);
	});

	it('is deterministic', () => {
		const rest = remainingLanes(planLanes('historia'), new Set());
		expect(nextPortion(rest, 2250, 'de')).toEqual(nextPortion(rest, 2250, 'de'));
	});

	it("today's portion keeps what was read and shrinks the rest", () => {
		const lanes = planLanes('nt');
		const target = wordsPerDay(15, 'de');
		const fresh = todayPortion(lanes, new Set(), new Set(), target, 'de');
		expect(fresh.items[0].key).toBe('mt/1');
		expect(fresh.done).toBe(false);
		const read = new Set(fresh.items.map((i) => i.key));
		const after = todayPortion(lanes, read, read, target, 'de');
		expect(after.done).toBe(true);
		expect(after.items.every((i) => i.read)).toBe(true);
	});

	it('past the goal, next points beyond today\'s portion; read through, it is null', () => {
		const lanes = planLanes('nt');
		const target = wordsPerDay(15, 'de');
		const fresh = todayPortion(lanes, new Set(), new Set(), target, 'de');
		// Not yet done: the way on is the first chapter after what today portions out.
		const last = fresh.items[fresh.items.length - 1];
		expect(fresh.next).toEqual({ slug: 'mt', ch: last.ch + 1 });
		const read = new Set(fresh.items.map((i) => i.key));
		const after = todayPortion(lanes, read, read, target, 'de');
		expect(after.next).toEqual({ slug: 'mt', ch: last.ch + 1 });
		const all = new Set(lanes.flat().map(chapterKey));
		expect(todayPortion(lanes, all, new Set(), target, 'de').next).toBeNull();
	});

	it('next in plan skips what is read and wraps to earlier gaps', () => {
		const lanes = planLanes('nt');
		expect(nextInPlan(lanes, new Set(['mt/2']), { slug: 'mt', ch: 1 })).toEqual({ slug: 'mt', ch: 3 });
		expect(nextInPlan(lanes, new Set(), { slug: 'offb', ch: 22 })).toEqual({ slug: 'mt', ch: 1 });
	});
});

describe('streaks', () => {
	it('counts consecutive days and bridges one gap a week', () => {
		const s = streaks(['2026-09-01', '2026-09-02', '2026-09-04', '2026-09-05', '2026-09-06'], '2026-09-06');
		expect(s.current).toBe(5);
		expect(s.bridged).toEqual(['2026-09-03']);
	});

	it('does not bridge two gaps within a week', () => {
		// 1, (2), 3 is one run of two; the gap at 4 cannot be bridged so 5, 6 starts anew.
		const s = streaks(['2026-09-01', '2026-09-03', '2026-09-05', '2026-09-06'], '2026-09-06');
		expect(s.current).toBe(2);
		expect(s.longest).toBe(2);
		expect(s.bridged).toEqual([]);
	});

	it('today is pending, yesterday may be forgiven', () => {
		expect(streaks(['2026-09-04', '2026-09-05'], '2026-09-06').current).toBe(2);
		const held = streaks(['2026-09-03', '2026-09-04'], '2026-09-06');
		expect(held.current).toBe(2);
		expect(held.heldByGrace).toBe(true);
		expect(streaks(['2026-09-01', '2026-09-02'], '2026-09-06').current).toBe(0);
	});

	it('keeps the longest run from the past', () => {
		const s = streaks(['2026-08-01', '2026-08-02', '2026-08-03', '2026-09-05'], '2026-09-06');
		expect(s.current).toBe(1);
		expect(s.longest).toBe(3);
	});
});
