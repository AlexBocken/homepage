import { describe, it, expect } from 'vitest';
import { prCount } from '$lib/fitness/prCount';

// prCount sums the three independently-computed record kinds a run can earn:
// strength/cardio PRs (`prs`), new distance PRs (`bestEffortPrs`), and segment
// PB/KOM records (`segmentPrs`, already filtered to PB-or-KOM when persisted).
describe('prCount', () => {
	it('is 0 for a run with no records (all fields absent)', () => {
		expect(prCount({})).toBe(0);
	});

	it('counts strength PRs alone (back-compat with the old count)', () => {
		expect(prCount({ prs: [{}, {}] })).toBe(2);
	});

	it('sums all three kinds', () => {
		expect(
			prCount({
				prs: [{}, {}], // 2 strength
				bestEffortPrs: [{}], // 1 distance
				segmentPrs: [{}, {}, {}] // 3 segment PB/KOM
			})
		).toBe(6);
	});

	it('treats null/undefined arrays as empty', () => {
		expect(prCount({ prs: undefined, bestEffortPrs: null, segmentPrs: [{}] })).toBe(1);
	});
});
