/**
 * CHARACTERIZATION tests — they pin what SplitMethodSelector.svelte does *today*
 * (floating-point quirks, no rounding, stale keys and all), not what it should
 * do. They exist so a refactor that extracts a pure `computeSplits()` can prove
 * zero behaviour change. If one of these fails after a refactor, the refactor
 * changed behaviour — decide deliberately, don't just update the number.
 *
 * Values are asserted with toBe / toEqual (exact IEEE-754 doubles) on purpose:
 * the component does no rounding, and the exact floats are part of the
 * contract the server stores.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import { flushSync } from 'svelte';
import SplitHarness from './SplitHarness.svelte';
import { loadPatched, cleanupPatched } from './patchedSvelte';

let Selector: unknown;
beforeAll(async () => {
	Selector = await loadPatched('src/lib/components/cospend/SplitMethodSelector.svelte');
});
afterAll(cleanupPatched);

type Init = {
	splitMethod?: string;
	users: string[];
	amount: unknown;
	paidBy: string;
	splitAmounts?: Record<string, number>;
	personalAmounts?: Record<string, number>;
	predefinedMode?: boolean;
};

type Harness = {
	get(): {
		splitMethod: string;
		users: string[];
		amount: unknown;
		paidBy: string;
		splitAmounts: Record<string, number>;
		personalAmounts: Record<string, number>;
	};
	set(patch: Partial<Init>): void;
};

function mount(initial: Init) {
	const r = render(SplitHarness, { Selector, initial });
	flushSync();
	const h = r.component as unknown as Harness;
	return {
		...r,
		splits: () => h.get().splitAmounts,
		state: () => h.get(),
		set: (patch: Partial<Init>) => {
			h.set(patch);
			flushSync();
		}
	};
}

const TWO = ['alexander', 'anna'];
const THREE = ['alexander', 'anna', 'bob'];

describe('SplitMethodSelector — equal', () => {
	it('2 users, payer gets share - amount', () => {
		const { splits } = mount({ splitMethod: 'equal', users: TWO, amount: 100, paidBy: 'alexander' });
		expect(splits()).toEqual({ alexander: -50, anna: 50 });
	});

	it('payer is the second user', () => {
		const { splits } = mount({ splitMethod: 'equal', users: TWO, amount: 100, paidBy: 'anna' });
		expect(splits()).toEqual({ alexander: 50, anna: -50 });
	});

	it('odd cents 10.01 / 3 — no rounding, raw floats, sum is not exactly 0', () => {
		const { splits } = mount({ splitMethod: 'equal', users: THREE, amount: 10.01, paidBy: 'alexander' });
		const s = splits();
		expect(s).toEqual({
			alexander: -6.673333333333334,
			anna: 3.3366666666666664,
			bob: 3.3366666666666664
		});
		// pin the float drift too
		expect(s.alexander + s.anna + s.bob).toBe(-6.673333333333334 + 3.3366666666666664 + 3.3366666666666664);
	});

	it('100 / 3 — repeating decimals kept as-is', () => {
		const { splits } = mount({ splitMethod: 'equal', users: THREE, amount: 100, paidBy: 'bob' });
		expect(splits()).toEqual({
			alexander: 33.333333333333336,
			anna: 33.333333333333336,
			bob: -66.66666666666666
		});
	});

	it('amount given as a string (as the add page passes it) is coerced with Number()', () => {
		const { splits } = mount({ splitMethod: 'equal', users: TWO, amount: '10.01', paidBy: 'alexander' });
		expect(splits()).toEqual({ alexander: -5.005, anna: 5.005 });
	});

	it('amount 0 → no calculation, splitAmounts untouched', () => {
		const { splits } = mount({
			splitMethod: 'equal',
			users: TWO,
			amount: 0,
			paidBy: 'alexander',
			splitAmounts: { alexander: 7, anna: -7 }
		});
		expect(splits()).toEqual({ alexander: 7, anna: -7 });
	});

	it('empty-string amount → no calculation', () => {
		const { splits } = mount({ splitMethod: 'equal', users: TWO, amount: '', paidBy: 'alexander' });
		expect(splits()).toEqual({});
	});

	it('no payer → no calculation', () => {
		const { splits } = mount({ splitMethod: 'equal', users: TWO, amount: 100, paidBy: '' });
		expect(splits()).toEqual({});
	});

	it('no users → no calculation', () => {
		const { splits } = mount({ splitMethod: 'equal', users: [], amount: 100, paidBy: 'alexander' });
		expect(splits()).toEqual({});
	});

	it('payer not among users → everyone gets a positive share, nobody is credited', () => {
		const { splits } = mount({ splitMethod: 'equal', users: ['anna', 'bob'], amount: 10, paidBy: 'alexander' });
		expect(splits()).toEqual({ anna: 5, bob: 5 });
	});

	it('single user who is also the payer → share - amount = 0', () => {
		const { splits } = mount({ splitMethod: 'equal', users: ['alexander'], amount: 42, paidBy: 'alexander' });
		expect(splits()).toEqual({ alexander: 0 });
	});

	it('negative amount is not guarded (truthy) — computes negative shares', () => {
		const { splits } = mount({ splitMethod: 'equal', users: TWO, amount: -10, paidBy: 'alexander' });
		expect(splits()).toEqual({ alexander: 5, anna: -5 });
	});

	it('recalculates when the amount changes', () => {
		const m = mount({ splitMethod: 'equal', users: TWO, amount: 100, paidBy: 'alexander' });
		m.set({ amount: 30 });
		expect(m.splits()).toEqual({ alexander: -15, anna: 15 });
	});

	it('recalculates when the payer changes', () => {
		const m = mount({ splitMethod: 'equal', users: TWO, amount: 100, paidBy: 'alexander' });
		m.set({ paidBy: 'anna' });
		expect(m.splits()).toEqual({ alexander: 50, anna: -50 });
	});

	it('recalculates when a user is added', () => {
		const m = mount({ splitMethod: 'equal', users: TWO, amount: 90, paidBy: 'alexander' });
		m.set({ users: THREE });
		expect(m.splits()).toEqual({ alexander: -60, anna: 30, bob: 30 });
	});

	it('removing a user leaves a stale key in splitAmounts (not cleaned up)', () => {
		const m = mount({ splitMethod: 'equal', users: THREE, amount: 90, paidBy: 'alexander' });
		m.set({ users: TWO });
		expect(m.splits()).toEqual({ alexander: -45, anna: 45, bob: 30 });
	});

	it('setting amount back to 0 keeps the previous splits', () => {
		const m = mount({ splitMethod: 'equal', users: TWO, amount: 100, paidBy: 'alexander' });
		m.set({ amount: 0 });
		expect(m.splits()).toEqual({ alexander: -50, anna: 50 });
	});
});

describe('SplitMethodSelector — full ("paid for the other")', () => {
	it('2 users: payer -amount, other +amount', () => {
		const { splits } = mount({ splitMethod: 'full', users: TWO, amount: 100, paidBy: 'alexander' });
		expect(splits()).toEqual({ alexander: -100, anna: 100 });
	});

	it('3 users, 10.01: the others split it evenly', () => {
		const { splits } = mount({ splitMethod: 'full', users: THREE, amount: 10.01, paidBy: 'anna' });
		expect(splits()).toEqual({ alexander: 5.005, anna: -10.01, bob: 5.005 });
	});

	it('single user who is the payer → -amount only (sum ≠ 0)', () => {
		const { splits } = mount({ splitMethod: 'full', users: ['alexander'], amount: 12, paidBy: 'alexander' });
		expect(splits()).toEqual({ alexander: -12 });
	});

	it('payer not among users → others split the full amount, no negative entry', () => {
		const { splits } = mount({ splitMethod: 'full', users: ['anna', 'bob'], amount: 10, paidBy: 'alexander' });
		expect(splits()).toEqual({ anna: 5, bob: 5 });
	});

	it('amount 0 → untouched', () => {
		const { splits } = mount({ splitMethod: 'full', users: TWO, amount: 0, paidBy: 'alexander' });
		expect(splits()).toEqual({});
	});

	it('string amount coerced', () => {
		const { splits } = mount({ splitMethod: 'full', users: TWO, amount: '19.99', paidBy: 'anna' });
		expect(splits()).toEqual({ alexander: 19.99, anna: -19.99 });
	});
});

describe('SplitMethodSelector — personal_equal', () => {
	it('2 users: personal + equal share of the remainder', () => {
		const { splits } = mount({
			splitMethod: 'personal_equal',
			users: TWO,
			amount: 100,
			paidBy: 'alexander',
			personalAmounts: { alexander: 20, anna: 30 }
		});
		// remainder 50 → 25 each; alexander owes 45 → 45-100
		expect(splits()).toEqual({ alexander: -55, anna: 55 });
	});

	it('no personal amounts → behaves like equal', () => {
		const { splits } = mount({ splitMethod: 'personal_equal', users: TWO, amount: 100, paidBy: 'anna' });
		expect(splits()).toEqual({ alexander: 50, anna: -50 });
	});

	it('3 users, 10.01 with fractional personal amounts', () => {
		const { splits } = mount({
			splitMethod: 'personal_equal',
			users: THREE,
			amount: 10.01,
			paidBy: 'alexander',
			personalAmounts: { anna: 1, bob: 0.5 }
		});
		expect(splits()).toEqual({
			alexander: -7.173333333333334,
			anna: 3.8366666666666664,
			bob: 3.3366666666666664
		});
	});

	it('personal amounts exceeding the total: error shown, remainder clamped to 0, splits still computed by the method-change effect', () => {
		const { splits, container } = mount({
			splitMethod: 'personal_equal',
			users: TWO,
			amount: 100,
			paidBy: 'alexander',
			personalAmounts: { alexander: 80, anna: 50 }
		});
		// remainder = max(0, 100-130) = 0 → alexander owes 80 → 80-100 = -20, anna owes 50
		expect(splits()).toEqual({ alexander: -20, anna: 50 });
		expect(container.querySelector('.remainder-info')).toHaveClass('error');
		expect(container.querySelector('.error-message')).not.toBeNull();
	});

	it('personal amounts pushed over the total AFTER mount: splits keep the last valid values', () => {
		const m = mount({
			splitMethod: 'personal_equal',
			users: TWO,
			amount: 100,
			paidBy: 'alexander',
			personalAmounts: { alexander: 80, anna: 0 }
		});
		// remainder 20 → 10 each
		expect(m.splits()).toEqual({ alexander: -10, anna: 10 });
		m.set({ personalAmounts: { alexander: 80, anna: 50 } });
		// total 130 > 100 → error flagged, no recalculation (unlike the mount case above)
		expect(m.splits()).toEqual({ alexander: -10, anna: 10 });
		expect(m.container.querySelector('.error-message')).not.toBeNull();
		// ...but a payer change re-runs the method effect, which computes anyway (remainder clamped)
		m.set({ paidBy: 'anna' });
		expect(m.splits()).toEqual({ alexander: 80, anna: -50 });
	});

	it('personal amounts exactly equal to total: no error, remainder 0', () => {
		const { splits, container } = mount({
			splitMethod: 'personal_equal',
			users: TWO,
			amount: 100,
			paidBy: 'anna',
			personalAmounts: { alexander: 60, anna: 40 }
		});
		expect(splits()).toEqual({ alexander: 60, anna: -60 });
		expect(container.querySelector('.error-message')).toBeNull();
	});

	it('personal amounts of a user not in `users` are ignored in the per-user sum but count toward the error check', () => {
		const { splits, container } = mount({
			splitMethod: 'personal_equal',
			users: TWO,
			amount: 100,
			paidBy: 'alexander',
			personalAmounts: { alexander: 10, ghost: 95 }
		});
		// calculatePersonalEqualSplit only sums users → remainder 90, 45 each
		expect(splits()).toEqual({ alexander: -45, anna: 45 });
		// the error check sums Object.values(personalAmounts) → 105 > 100
		expect(container.querySelector('.error-message')).not.toBeNull();
	});

	it('string personal amounts are coerced with Number()', () => {
		const { splits } = mount({
			splitMethod: 'personal_equal',
			users: TWO,
			amount: '50',
			paidBy: 'anna',
			personalAmounts: { alexander: '10' as unknown as number, anna: '' as unknown as number }
		});
		// remainder 40 → 20 each; alexander 30, anna 20-50
		expect(splits()).toEqual({ alexander: 30, anna: -30 });
	});

	it('recalculates when a personal amount is typed in', async () => {
		const m = mount({ splitMethod: 'personal_equal', users: TWO, amount: 100, paidBy: 'alexander' });
		expect(m.splits()).toEqual({ alexander: -50, anna: 50 });
		const input = m.container.querySelector('#personal_anna') as HTMLInputElement;
		await fireEvent.input(input, { target: { value: '20' } });
		flushSync();
		expect(m.state().personalAmounts).toEqual({ anna: 20 });
		expect(m.splits()).toEqual({ alexander: -60, anna: 60 });
	});

	it('amount 0 → untouched', () => {
		const { splits } = mount({
			splitMethod: 'personal_equal',
			users: TWO,
			amount: 0,
			paidBy: 'alexander',
			personalAmounts: { anna: 5 }
		});
		expect(splits()).toEqual({});
	});
});

describe('SplitMethodSelector — proportional (custom)', () => {
	it('no automatic calculation: fills missing users with 0', () => {
		const { splits } = mount({ splitMethod: 'proportional', users: THREE, amount: 100, paidBy: 'alexander' });
		expect(splits()).toEqual({ alexander: 0, anna: 0, bob: 0 });
	});

	it('keeps existing values untouched (including ones that do not sum to 0)', () => {
		const { splits } = mount({
			splitMethod: 'proportional',
			users: THREE,
			amount: 100,
			paidBy: 'alexander',
			splitAmounts: { alexander: -70, anna: 30 }
		});
		expect(splits()).toEqual({ alexander: -70, anna: 30, bob: 0 });
	});

	it('does not recalculate when the amount changes', () => {
		const m = mount({
			splitMethod: 'proportional',
			users: TWO,
			amount: 100,
			paidBy: 'alexander',
			splitAmounts: { alexander: -40, anna: 40 }
		});
		m.set({ amount: 200 });
		expect(m.splits()).toEqual({ alexander: -40, anna: 40 });
	});

	it('custom inputs write straight into splitAmounts', async () => {
		const m = mount({ splitMethod: 'proportional', users: TWO, amount: 100, paidBy: 'alexander' });
		await fireEvent.input(m.container.querySelector('#split_anna') as HTMLInputElement, {
			target: { value: '33.5' }
		});
		flushSync();
		expect(m.splits()).toEqual({ alexander: 0, anna: 33.5 });
	});

	it('switching from equal to proportional keeps the equal values as the starting point', () => {
		const m = mount({ splitMethod: 'equal', users: TWO, amount: 100, paidBy: 'alexander' });
		m.set({ splitMethod: 'proportional' });
		expect(m.splits()).toEqual({ alexander: -50, anna: 50 });
	});
});

describe('SplitMethodSelector — method switching via the cards', () => {
	it('clicking a method card recalculates with that method', async () => {
		const m = mount({ splitMethod: 'equal', users: TWO, amount: 100, paidBy: 'alexander' });
		const radios = screen.getAllByRole('radio');
		// order: equal, personal_equal, full, proportional
		expect(radios).toHaveLength(4);
		await fireEvent.click(radios[2]);
		flushSync();
		expect(m.state().splitMethod).toBe('full');
		expect(m.splits()).toEqual({ alexander: -100, anna: 100 });
		await fireEvent.click(radios[0]);
		flushSync();
		expect(m.state().splitMethod).toBe('equal');
		expect(m.splits()).toEqual({ alexander: -50, anna: 50 });
	});

	it('full → personal_equal with personal amounts', () => {
		const m = mount({
			splitMethod: 'full',
			users: TWO,
			amount: 100,
			paidBy: 'alexander',
			personalAmounts: { anna: 10 }
		});
		expect(m.splits()).toEqual({ alexander: -100, anna: 100 });
		m.set({ splitMethod: 'personal_equal' });
		// remainder 90 → 45 each; anna 55
		expect(m.splits()).toEqual({ alexander: -55, anna: 55 });
	});
});

describe('SplitMethodSelector — ledger preview (display rounding)', () => {
	it('shows two-decimal values and a settled-up threshold of ±0.005', () => {
		const { container } = mount({ splitMethod: 'equal', users: THREE, amount: 10.01, paidBy: 'alexander' });
		const chips = [...container.querySelectorAll('.ledger-chip')].map((el) => el.textContent?.trim().replace(/\s+/g, ' '));
		expect(chips).toMatchInlineSnapshot(`
			[
			  "is owed CHF 6.67",
			  "owes CHF 3.34",
			  "owes CHF 3.34",
			]
		`);
	});

	it('single payer-only user renders as settled up', () => {
		const { container } = mount({ splitMethod: 'equal', users: ['alexander'], amount: 42, paidBy: 'alexander' });
		const chip = container.querySelector('.ledger-chip');
		expect(chip).not.toHaveClass('owe');
		expect(chip).not.toHaveClass('back');
	});
});
