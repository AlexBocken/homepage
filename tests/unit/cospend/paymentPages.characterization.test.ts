/**
 * CHARACTERIZATION tests for the split logic that lives inside route pages:
 *
 *  - payments/add/+page.svelte   — the `splits` payload builder in handleSubmit
 *    (amount / proportion / personalAmount per user) fed by SplitMethodSelector.
 *  - recurring/edit/[id]/+page.svelte — the duplicated payload builder, fed by
 *    SplitMethodSelector after loading a stored recurring payment.
 *  - payments/edit/[id]/+page.svelte — recalculateSplits() and the $effect that
 *    decides when it runs (amount / payer / personal-amount changes, foreign
 *    currency via convertedAmount).
 *
 * Both pages are rendered for real (patched copies, see patchedSvelte.ts) and
 * the JSON body they send to fetch() is the observation point. They pin
 * current behaviour — bugs included (see the "proportional" edit case) — so a
 * computeSplits() extraction can prove it changed nothing.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { render, fireEvent, waitFor, cleanup } from '@testing-library/svelte';
import { flushSync } from 'svelte';
import { loadPatched, cleanupPatched } from './patchedSvelte';
import { setPath } from './stubs/appState';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

let AddPage: Any;
let EditPage: Any;
let RecurringEditPage: Any;

beforeAll(async () => {
	AddPage = await loadPatched('src/routes/[cospendRoot=cospendRoot]/payments/add/+page.svelte');
	EditPage = await loadPatched('src/routes/[cospendRoot=cospendRoot]/payments/edit/[id]/+page.svelte');
	RecurringEditPage = await loadPatched('src/routes/[cospendRoot=cospendRoot]/recurring/edit/[id]/+page.svelte');
});
afterAll(cleanupPatched);

type Call = { url: string; method: string; body: Any };
let calls: Call[] = [];
let routes: Record<string, (init?: RequestInit) => Any> = {};

function jsonResponse(body: Any, ok = true) {
	return { ok, status: ok ? 200 : 500, json: async () => body };
}

beforeEach(() => {
	cleanup();
	calls = [];
	routes = {
		'/api/cospend/exchange-rates?action=currencies': () => ({ currencies: ['CHF', 'EUR'] }),
		'/api/cospend/payments': () => ({ success: true, payment: 'new-id' })
	};
	vi.mocked(fetch).mockReset();
	vi.mocked(fetch).mockImplementation((async (input: Any, init?: RequestInit) => {
		const url = String(input);
		const method = init?.method ?? 'GET';
		calls.push({ url, method, body: typeof init?.body === 'string' ? JSON.parse(init.body) : init?.body });
		const key = Object.keys(routes).find((k) => url === k || url.startsWith(k + '&') || (k.endsWith('*') && url.startsWith(k.slice(0, -1))));
		if (!key) return jsonResponse({ message: `unmocked ${url}` }, false);
		return jsonResponse(routes[key](init));
	}) as Any);
});

const lastBody = (method: string, url: string) => {
	const c = [...calls].reverse().find((x) => x.method === method && x.url === url);
	if (!c) throw new Error(`no ${method} ${url}; calls: ${calls.map((x) => `${x.method} ${x.url}`).join(', ')}`);
	return c.body;
};

async function input(el: Element | null, value: string) {
	if (!el) throw new Error('input not found');
	await fireEvent.input(el, { target: { value } });
	flushSync();
}

// ─────────────────────────────────────────────────────────────────────────────
// ADD PAGE — payload builder
// ─────────────────────────────────────────────────────────────────────────────

async function renderAdd(users: string[], currentUser = users[0]) {
	setPath('/expenses/payments/add');
	const r = render(AddPage, {
		data: { predefinedUsers: users, currentUser, session: { user: { nickname: currentUser } } },
		form: null
	});
	flushSync();
	// onMount sets jsEnhanced and the payer
	await waitFor(() => expect(r.container.querySelector('#amount')).not.toBeNull());
	return r;
}

function methodCard(container: HTMLElement, idx: 0 | 1 | 2 | 3) {
	// order: equal, personal_equal, full, proportional
	return container.querySelectorAll('.method-card')[idx] as HTMLElement;
}

function payerPill(container: HTMLElement, user: string) {
	const pill = [...container.querySelectorAll('.payer-pill')].find((b) => b.textContent?.includes(user));
	if (!pill) throw new Error(`no payer pill for ${user}`);
	return pill as HTMLElement;
}

async function submitAdd(container: HTMLElement) {
	await fireEvent.submit(container.querySelector('form.payment-form')!);
	await waitFor(() => lastBody('POST', '/api/cospend/payments'));
	return lastBody('POST', '/api/cospend/payments');
}

describe('add page — splits payload', () => {
	it('equal, 2 users, 100: amount per user, no proportion/personalAmount keys', async () => {
		const { container } = await renderAdd(['alexander', 'anna']);
		await input(container.querySelector('#title'), 'Dinner');
		await input(container.querySelector('#amount'), '100');
		const body = await submitAdd(container);
		expect(body.amount).toBe(100);
		expect(body.paidBy).toBe('alexander');
		expect(body.splitMethod).toBe('equal');
		expect(body.splits).toEqual([
			{ username: 'alexander', amount: -50 },
			{ username: 'anna', amount: 50 }
		]);
		// undefined proportion/personalAmount are dropped by JSON.stringify
		expect(Object.keys(body.splits[0])).toEqual(['username', 'amount']);
	});

	it('equal, 3 users, 10.01 paid by anna: raw floats, unrounded', async () => {
		const { container } = await renderAdd(['alexander', 'anna', 'bob']);
		await input(container.querySelector('#title'), 'Coffee');
		await input(container.querySelector('#amount'), '10.01');
		await fireEvent.click(payerPill(container, 'anna'));
		flushSync();
		const body = await submitAdd(container);
		expect(body.amount).toBe(10.01);
		expect(body.paidBy).toBe('anna');
		expect(body.splits).toEqual([
			{ username: 'alexander', amount: 3.3366666666666664 },
			{ username: 'anna', amount: -6.673333333333334 },
			{ username: 'bob', amount: 3.3366666666666664 }
		]);
	});

	it('full, 2 users', async () => {
		const { container } = await renderAdd(['alexander', 'anna']);
		await input(container.querySelector('#title'), 'Gift');
		await input(container.querySelector('#amount'), '42.5');
		await fireEvent.click(methodCard(container, 2));
		flushSync();
		const body = await submitAdd(container);
		expect(body.splitMethod).toBe('full');
		expect(body.splits).toEqual([
			{ username: 'alexander', amount: -42.5 },
			{ username: 'anna', amount: 42.5 }
		]);
	});

	it('personal_equal: personalAmount present for every user (0 when untouched)', async () => {
		const { container } = await renderAdd(['alexander', 'anna', 'bob']);
		await input(container.querySelector('#title'), 'Groceries');
		await input(container.querySelector('#amount'), '10.01');
		await fireEvent.click(methodCard(container, 1));
		flushSync();
		await input(container.querySelector('#personal_anna'), '1');
		await input(container.querySelector('#personal_bob'), '0.5');
		const body = await submitAdd(container);
		expect(body.splitMethod).toBe('personal_equal');
		expect(body.splits).toEqual([
			{ username: 'alexander', amount: -7.173333333333334, personalAmount: 0 },
			{ username: 'anna', amount: 3.8366666666666664, personalAmount: 1 },
			{ username: 'bob', amount: 3.3366666666666664, personalAmount: 0.5 }
		]);
	});

	it('personal_equal exceeding total: client still posts (server rejects) with STALE splits from the last valid state', async () => {
		const { container } = await renderAdd(['alexander', 'anna']);
		await input(container.querySelector('#title'), 'Too much');
		await input(container.querySelector('#amount'), '100');
		await fireEvent.click(methodCard(container, 1));
		flushSync();
		await input(container.querySelector('#personal_alexander'), '80');
		await input(container.querySelector('#personal_anna'), '50');
		const body = await submitAdd(container);
		// After alexander=80 (total 80 ≤ 100): remainder 20 → alexander 90-100=-10,
		// anna 10. Typing anna=50 pushes the total to 130 > 100, so the
		// personal-amount effect flags the error and skips recalculation; the
		// method-change effect does not re-run. The last valid splits are posted
		// next to the new personal amounts.
		expect(body.splits).toEqual([
			{ username: 'alexander', amount: -10, personalAmount: 80 },
			{ username: 'anna', amount: 10, personalAmount: 50 }
		]);
	});

	it('proportional: proportion = splitAmount / amount — the payer gets a NEGATIVE proportion', async () => {
		const { container } = await renderAdd(['alexander', 'anna']);
		await input(container.querySelector('#title'), 'Custom');
		await input(container.querySelector('#amount'), '100');
		// equal first computes -50/50; proportional keeps them as starting values
		await fireEvent.click(methodCard(container, 3));
		flushSync();
		await input(container.querySelector('#split_alexander'), '-60');
		await input(container.querySelector('#split_anna'), '60');
		const body = await submitAdd(container);
		expect(body.splitMethod).toBe('proportional');
		expect(body.splits).toEqual([
			{ username: 'alexander', amount: -60, proportion: -0.6 },
			{ username: 'anna', amount: 60, proportion: 0.6 }
		]);
	});

	it('proportional, 3 users, 10.01: proportion floats', async () => {
		const { container } = await renderAdd(['alexander', 'anna', 'bob']);
		await input(container.querySelector('#title'), 'Custom3');
		await input(container.querySelector('#amount'), '10.01');
		await fireEvent.click(methodCard(container, 3));
		flushSync();
		await input(container.querySelector('#split_alexander'), '-7.01');
		await input(container.querySelector('#split_anna'), '4');
		await input(container.querySelector('#split_bob'), '3.01');
		const body = await submitAdd(container);
		expect(body.splits).toEqual([
			{ username: 'alexander', amount: -7.01, proportion: -7.01 / 10.01 },
			{ username: 'anna', amount: 4, proportion: 4 / 10.01 },
			{ username: 'bob', amount: 3.01, proportion: 3.01 / 10.01 }
		]);
		expect(body.splits.map((s: Any) => s.proportion)).toEqual([
			-0.7002997002997003, 0.3996003996003996, 0.3006993006993007
		]);
	});

	it('amount 0 / empty → no POST at all (client validation)', async () => {
		const { container } = await renderAdd(['alexander', 'anna']);
		await input(container.querySelector('#title'), 'Nothing');
		await input(container.querySelector('#amount'), '0');
		await fireEvent.submit(container.querySelector('form.payment-form')!);
		flushSync();
		expect(calls.filter((c) => c.method === 'POST')).toEqual([]);
		expect(container.textContent).toContain('Please fill in all required fields with valid values');
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// EDIT PAGE — recalculateSplits
// ─────────────────────────────────────────────────────────────────────────────

type Split = { username: string; amount: number; proportion?: number; personalAmount?: number };

async function renderEdit(payment: {
	amount: number;
	paidBy: string;
	splitMethod: string;
	splits: Split[];
	currency?: string;
	originalAmount?: number;
	exchangeRate?: number;
}) {
	setPath('/expenses/payments/edit/p1');
	routes['/api/cospend/payments/p1'] = () => ({
		payment: {
			_id: 'p1',
			title: 'T',
			description: '',
			category: 'groceries',
			date: '2026-01-15T12:00:00.000Z',
			currency: 'CHF',
			...payment,
			splits: payment.splits.map((s) => ({ ...s }))
		}
	});
	const r = render(EditPage, { data: { paymentId: 'p1', session: { user: { nickname: 'alexander' } } } });
	await waitFor(() => expect(r.container.querySelector('form.payment-form')).not.toBeNull());
	flushSync();
	return r;
}

async function submitEdit(container: HTMLElement): Promise<Any> {
	await fireEvent.submit(container.querySelector('form.payment-form')!);
	await waitFor(() => lastBody('PUT', '/api/cospend/payments/p1'));
	return lastBody('PUT', '/api/cospend/payments/p1');
}

const amounts = (body: Any) => body.splits.map((s: Split) => [s.username, s.amount]);

describe('edit page — recalculateSplits', () => {
	beforeEach(() => {
		routes['/api/cospend/payments/p1'] = () => ({});
	});

	it('no change → stored splits are sent back untouched (no recalculation on load)', async () => {
		const { container } = await renderEdit({
			amount: 100,
			paidBy: 'alexander',
			splitMethod: 'equal',
			// deliberately inconsistent with "equal"
			splits: [
				{ username: 'alexander', amount: -30 },
				{ username: 'anna', amount: 30 }
			]
		});
		const body = await submitEdit(container);
		expect(amounts(body)).toEqual([
			['alexander', -30],
			['anna', 30]
		]);
	});

	it('equal: amount change 100 → 10.01 with 3 users', async () => {
		const { container } = await renderEdit({
			amount: 100,
			paidBy: 'alexander',
			splitMethod: 'equal',
			splits: [
				{ username: 'alexander', amount: -66.67 },
				{ username: 'anna', amount: 33.33 },
				{ username: 'bob', amount: 33.34 }
			]
		});
		await input(container.querySelector('#amount'), '10.01');
		const body = await submitEdit(container);
		expect(body.amount).toBe(10.01);
		expect(amounts(body)).toEqual([
			['alexander', -6.673333333333334],
			['anna', 3.3366666666666664],
			['bob', 3.3366666666666664]
		]);
	});

	it('equal: payer change triggers recalculation', async () => {
		const { container } = await renderEdit({
			amount: 100,
			paidBy: 'alexander',
			splitMethod: 'equal',
			splits: [
				{ username: 'alexander', amount: -50 },
				{ username: 'anna', amount: 50 }
			]
		});
		await fireEvent.click(payerPill(container, 'anna'));
		flushSync();
		const body = await submitEdit(container);
		expect(body.paidBy).toBe('anna');
		expect(amounts(body)).toEqual([
			['alexander', 50],
			['anna', -50]
		]);
	});

	it('full: amount change', async () => {
		const { container } = await renderEdit({
			amount: 100,
			paidBy: 'anna',
			splitMethod: 'full',
			splits: [
				{ username: 'alexander', amount: 50 },
				{ username: 'anna', amount: -100 },
				{ username: 'bob', amount: 50 }
			]
		});
		await input(container.querySelector('#amount'), '10.01');
		const body = await submitEdit(container);
		expect(amounts(body)).toEqual([
			['alexander', 5.005],
			['anna', -10.01],
			['bob', 5.005]
		]);
	});

	it('personal_equal: amount change keeps stored personalAmount', async () => {
		const { container } = await renderEdit({
			amount: 100,
			paidBy: 'alexander',
			splitMethod: 'personal_equal',
			splits: [
				{ username: 'alexander', amount: -55, personalAmount: 20 },
				{ username: 'anna', amount: 55, personalAmount: 30 }
			]
		});
		await input(container.querySelector('#amount'), '80');
		const body = await submitEdit(container);
		// remainder 30 → 15 each; alexander 35-80, anna 45
		expect(body.splits).toEqual([
			{ username: 'alexander', amount: -45, personalAmount: 20 },
			{ username: 'anna', amount: 45, personalAmount: 30 }
		]);
	});

	it('personal_equal: editing a personal amount recalculates', async () => {
		const { container } = await renderEdit({
			amount: 100,
			paidBy: 'alexander',
			splitMethod: 'personal_equal',
			splits: [
				{ username: 'alexander', amount: -50, personalAmount: 0 },
				{ username: 'anna', amount: 50, personalAmount: 0 }
			]
		});
		await input(container.querySelector('#personal_anna'), '10');
		const body = await submitEdit(container);
		expect(body.splits).toEqual([
			{ username: 'alexander', amount: -55, personalAmount: 0 },
			{ username: 'anna', amount: 55, personalAmount: 10 }
		]);
	});

	it('personal_equal: personal amounts exceeding the new total are NOT blocked — remainder clamps to 0', async () => {
		const { container } = await renderEdit({
			amount: 100,
			paidBy: 'alexander',
			splitMethod: 'personal_equal',
			splits: [
				{ username: 'alexander', amount: -40, personalAmount: 40 },
				{ username: 'anna', amount: 40, personalAmount: 40 }
			]
		});
		await input(container.querySelector('#amount'), '50');
		const body = await submitEdit(container);
		expect(body.splits).toEqual([
			{ username: 'alexander', amount: -10, personalAmount: 40 },
			{ username: 'anna', amount: 40, personalAmount: 40 }
		]);
		expect(container.querySelector('.error-message')).not.toBeNull();
	});

	it('personal_equal: missing personalAmount on load is initialised to 0', async () => {
		const { container } = await renderEdit({
			amount: 100,
			paidBy: 'alexander',
			splitMethod: 'personal_equal',
			splits: [
				{ username: 'alexander', amount: -50 },
				{ username: 'anna', amount: 50 }
			]
		});
		await input(container.querySelector('#amount'), '60');
		const body = await submitEdit(container);
		expect(body.splits).toEqual([
			{ username: 'alexander', amount: -30, personalAmount: 0 },
			{ username: 'anna', amount: 30, personalAmount: 0 }
		]);
	});

	it('proportional: amount * stored proportion, payer additionally minus amount', async () => {
		const { container } = await renderEdit({
			amount: 100,
			paidBy: 'anna',
			splitMethod: 'proportional',
			splits: [
				{ username: 'alexander', amount: 20, proportion: 0.2 },
				{ username: 'anna', amount: -50, proportion: 0.5 },
				{ username: 'bob', amount: 30, proportion: 0.3 }
			]
		});
		await input(container.querySelector('#amount'), '10.01');
		const body = await submitEdit(container);
		expect(amounts(body)).toEqual([
			['alexander', 2.0020000000000002],
			['anna', -5.005],
			['bob', 3.0029999999999997]
		]);
	});

	it('proportional with proportions as the ADD page stores them (payer negative) — payer is double-debited', async () => {
		// add page: splits {alexander:-60, anna:60} on 100 → proportions -0.6 / 0.6
		const { container } = await renderEdit({
			amount: 100,
			paidBy: 'alexander',
			splitMethod: 'proportional',
			splits: [
				{ username: 'alexander', amount: -60, proportion: -0.6 },
				{ username: 'anna', amount: 60, proportion: 0.6 }
			]
		});
		await input(container.querySelector('#amount'), '200');
		const body = await submitEdit(container);
		// 200 * -0.6 - 200 = -320 ; 200 * 0.6 = 120  (sum ≠ 0 — current behaviour)
		expect(amounts(body)).toEqual([
			['alexander', -320],
			['anna', 120]
		]);
	});

	it('proportional with missing proportion → 0 share (payer -amount)', async () => {
		const { container } = await renderEdit({
			amount: 100,
			paidBy: 'alexander',
			splitMethod: 'proportional',
			splits: [
				{ username: 'alexander', amount: -50 },
				{ username: 'anna', amount: 50 }
			]
		});
		await input(container.querySelector('#amount'), '40');
		const body = await submitEdit(container);
		expect(amounts(body)).toEqual([
			['alexander', -40],
			['anna', 0]
		]);
	});

	it('amount set to 0 → no recalculation, previous splits kept', async () => {
		const { container } = await renderEdit({
			amount: 100,
			paidBy: 'alexander',
			splitMethod: 'equal',
			splits: [
				{ username: 'alexander', amount: -50 },
				{ username: 'anna', amount: 50 }
			]
		});
		await input(container.querySelector('#amount'), '0');
		const body = await submitEdit(container);
		expect(body.amount).toBe(0);
		expect(amounts(body)).toEqual([
			['alexander', -50],
			['anna', 50]
		]);
	});

	it('unknown split method → splits untouched on amount change', async () => {
		const { container } = await renderEdit({
			amount: 100,
			paidBy: 'alexander',
			splitMethod: 'weird',
			splits: [
				{ username: 'alexander', amount: -1 },
				{ username: 'anna', amount: 1 }
			]
		});
		await input(container.querySelector('#amount'), '10');
		const body = await submitEdit(container);
		expect(amounts(body)).toEqual([
			['alexander', -1],
			['anna', 1]
		]);
	});

	it('foreign currency: recalculates on the live-converted CHF amount (originalAmount * current rate)', async () => {
		routes['/api/cospend/exchange-rates?from=EUR'] = () => ({ rate: 0.9 });
		const { container } = await renderEdit({
			amount: 95,
			currency: 'EUR',
			originalAmount: 100,
			exchangeRate: 0.95,
			paidBy: 'alexander',
			splitMethod: 'equal',
			splits: [
				{ username: 'alexander', amount: -47.5 },
				{ username: 'anna', amount: 47.5 }
			]
		});
		// exchange-rate fetch is debounced by 300 ms
		await waitFor(() => expect(calls.some((c) => c.url.startsWith('/api/cospend/exchange-rates?from=EUR'))).toBe(true), {
			timeout: 2000
		});
		await waitFor(() => expect(container.querySelector('.conversion-preview.success')).not.toBeNull());
		flushSync();
		const body = await submitEdit(container);
		// convertedAmount 90 ≠ lastCalculatedAmount 95 → equal split on 90;
		// the stored CHF amount itself is NOT updated
		expect(body.amount).toBe(95);
		expect(amounts(body)).toEqual([
			['alexander', -45],
			['anna', 45]
		]);
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// RECURRING EDIT PAGE — duplicated payload builder
// ─────────────────────────────────────────────────────────────────────────────

async function renderRecurring(rp: { amount: number; paidBy: string; splitMethod: string; splits: Split[] }) {
	setPath('/expenses/recurring/edit/r1');
	routes['/api/cospend/recurring-payments/r1'] = () => ({
		recurringPayment: {
			_id: 'r1',
			title: 'Rent',
			description: '',
			currency: 'CHF',
			category: 'groceries',
			frequency: 'monthly',
			startDate: '2026-01-01T00:00:00.000Z',
			isActive: true,
			...rp
		}
	});
	const r = render(RecurringEditPage, {
		data: { recurringPaymentId: 'r1', session: { user: { nickname: 'alexander' } } }
	});
	await waitFor(() => expect(r.container.querySelector('#amount')).not.toBeNull());
	flushSync();
	return r;
}

async function submitRecurring(container: HTMLElement): Promise<Any> {
	await fireEvent.submit(container.querySelector('form')!);
	await waitFor(() => lastBody('PUT', '/api/cospend/recurring-payments/r1'));
	return lastBody('PUT', '/api/cospend/recurring-payments/r1');
}

describe('recurring edit page — splits payload', () => {
	it('equal: stored splits are recomputed by the selector on load; amount sent as number', async () => {
		const { container } = await renderRecurring({
			amount: 100,
			paidBy: 'alexander',
			splitMethod: 'equal',
			splits: [
				{ username: 'alexander', amount: -10 },
				{ username: 'anna', amount: 10 }
			]
		});
		const body = await submitRecurring(container);
		expect(body.amount).toBe(100);
		expect(body.splits).toEqual([
			{ username: 'alexander', amount: -50 },
			{ username: 'anna', amount: 50 }
		]);
	});

	it('equal: amount change to 10.01 with 3 users', async () => {
		const { container } = await renderRecurring({
			amount: 100,
			paidBy: 'bob',
			splitMethod: 'equal',
			splits: [
				{ username: 'alexander', amount: 0 },
				{ username: 'anna', amount: 0 },
				{ username: 'bob', amount: 0 }
			]
		});
		await input(container.querySelector('#amount'), '10.01');
		const body = await submitRecurring(container);
		expect(body.amount).toBe(10.01);
		expect(body.splits).toEqual([
			{ username: 'alexander', amount: 3.3366666666666664 },
			{ username: 'anna', amount: 3.3366666666666664 },
			{ username: 'bob', amount: -6.673333333333334 }
		]);
	});

	it('personal_equal: stored personal amounts reused; personalAmount 0 filled for users without one', async () => {
		const { container } = await renderRecurring({
			amount: 100,
			paidBy: 'alexander',
			splitMethod: 'personal_equal',
			splits: [
				{ username: 'alexander', amount: 0, personalAmount: 20 },
				{ username: 'anna', amount: 0 }
			]
		});
		const body = await submitRecurring(container);
		// remainder 80 → 40 each; alexander 60-100
		expect(body.splits).toEqual([
			{ username: 'alexander', amount: -40, personalAmount: 20 },
			{ username: 'anna', amount: 40, personalAmount: 0 }
		]);
	});

	it('proportional: stored amounts kept, proportion recomputed = amount / total', async () => {
		const { container } = await renderRecurring({
			amount: 100,
			paidBy: 'alexander',
			splitMethod: 'proportional',
			splits: [
				{ username: 'alexander', amount: -70, proportion: -0.7 },
				{ username: 'anna', amount: 70, proportion: 0.7 }
			]
		});
		await input(container.querySelector('#amount'), '200');
		const body = await submitRecurring(container);
		// proportional does not rescale amounts when the total changes
		expect(body.splits).toEqual([
			{ username: 'alexander', amount: -70, proportion: -0.35 },
			{ username: 'anna', amount: 70, proportion: 0.35 }
		]);
	});
});
