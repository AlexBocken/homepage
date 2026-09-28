import { describe, it, expect } from 'vitest';
import { computeShares, rescaleProportional, buildSplitPayload } from '$lib/utils/cospendSplits';

const users = ['alexander', 'anna'];

describe('computeShares', () => {
	it('equal: each owes a share, the payer nets out what they laid out', () => {
		expect(computeShares('equal', { amount: 100, users, paidBy: 'alexander' })).toEqual({ alexander: -50, anna: 50 });
	});

	it('full: the others owe everything', () => {
		expect(computeShares('full', { amount: 80, users, paidBy: 'anna' })).toEqual({ alexander: 80, anna: -80 });
	});

	it('personal_equal: own spending plus an equal share of the rest', () => {
		const personal = { alexander: 10, anna: 30 } as Record<string, number>;
		expect(computeShares('personal_equal', { amount: 100, users, paidBy: 'alexander', personal: (u) => personal[u] })).toEqual({
			alexander: 40 - 100,
			anna: 60
		});
	});

	it('personal amounts over the total leave nothing to share', () => {
		const shares = computeShares('personal_equal', { amount: 20, users, paidBy: 'anna', personal: () => 15 });
		expect(shares).toEqual({ alexander: 15, anna: 15 - 20 });
	});

	it('nothing to compute without an amount, users, or for hand-typed methods', () => {
		expect(computeShares('equal', { amount: 0, users, paidBy: 'anna' })).toBeNull();
		expect(computeShares('equal', { amount: 10, users: [], paidBy: 'anna' })).toBeNull();
		expect(computeShares('proportional', { amount: 10, users, paidBy: 'anna' })).toBeNull();
	});
});

describe('rescaleProportional', () => {
	it('scales net proportions as they are', () => {
		expect(rescaleProportional(200, [-0.6, 0.6], 0)).toEqual([-120, 120]);
	});

	it('takes the outlay off the payer for plain shares', () => {
		expect(rescaleProportional(100, [0.3, 0.7], 1)).toEqual([30, 70 - 100]);
	});
});

describe('buildSplitPayload', () => {
	it('keeps the proportion or personal amount only for its method', () => {
		const amounts = { alexander: -60, anna: 60 };
		expect(buildSplitPayload(users, 'proportional', 100, amounts, {})).toEqual([
			{ username: 'alexander', amount: -60, proportion: -0.6, personalAmount: undefined },
			{ username: 'anna', amount: 60, proportion: 0.6, personalAmount: undefined }
		]);
		expect(buildSplitPayload(users, 'personal_equal', 100, amounts, { anna: 5 })[0]).toEqual({
			username: 'alexander',
			amount: -60,
			proportion: undefined,
			personalAmount: 0
		});
	});
});
