/**
 * CHARACTERIZATION tests for the server side of cospend splits: what the
 * payment / recurring-payment handlers validate and what they persist. The
 * server never recomputes splits from splitMethod — it trusts the client's
 * numbers — and these tests pin that, together with the personal_equal guard
 * and the foreign-currency scaling of split amounts.
 *
 * Models, db and currency conversion are mocked; auth is a plain locals.session.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const h = vi.hoisted(() => ({
	paymentCreate: vi.fn(),
	splitCreate: vi.fn(),
	recurringCreate: vi.fn(),
	recurringFindById: vi.fn(),
	recurringFindByIdAndUpdate: vi.fn(),
	recurringFind: vi.fn(),
	convertToCHF: vi.fn()
}));

vi.mock('$utils/db', () => ({ dbConnect: vi.fn(async () => {}) }));
vi.mock('$models/Payment', () => ({ Payment: { create: h.paymentCreate } }));
vi.mock('$models/PaymentSplit', () => ({ PaymentSplit: { create: h.splitCreate } }));
vi.mock('$models/RecurringPayment', () => ({
	RecurringPayment: {
		create: h.recurringCreate,
		findById: h.recurringFindById,
		findByIdAndUpdate: h.recurringFindByIdAndUpdate,
		find: h.recurringFind
	}
}));
vi.mock('$lib/utils/currency', () => ({
	convertToCHF: h.convertToCHF,
	isValidCurrencyCode: (c: string) => /^[A-Z]{3}$/.test(c)
}));

import { POST as createPayment } from '../../../src/routes/api/cospend/payments/+server';
import { POST as createRecurring } from '../../../src/routes/api/cospend/recurring-payments/+server';
import { PUT as updateRecurring } from '../../../src/routes/api/cospend/recurring-payments/[id]/+server';
import { POST as executeRecurring } from '../../../src/routes/api/cospend/recurring-payments/execute/+server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

const session = { user: { nickname: 'alexander' } };

function event(body: unknown, opts: { auth?: boolean; params?: Record<string, string> } = {}): Any {
	return {
		request: new Request('http://localhost/api', { method: 'POST', body: JSON.stringify(body) }),
		locals: { session: opts.auth === false ? null : session, auth: async () => null },
		params: opts.params ?? {},
		url: new URL('http://localhost/api')
	};
}

/** Run a handler, returning { status, body } for both success and thrown HttpErrors. */
async function call(handler: Any, ev: Any): Promise<{ status: number; body: Any }> {
	try {
		const res: Response = await handler(ev);
		return { status: res.status, body: await res.json() };
	} catch (e: Any) {
		if (e && typeof e.status === 'number') return { status: e.status, body: e.body };
		throw e;
	}
}

const base = {
	title: 'Dinner',
	amount: 100,
	paidBy: 'alexander',
	splitMethod: 'equal',
	splits: [
		{ username: 'alexander', amount: -50 },
		{ username: 'anna', amount: 50 }
	]
};

const storedSplits = () => h.splitCreate.mock.calls.map((c) => c[0]);

beforeEach(() => {
	vi.clearAllMocks();
	vi.spyOn(console, 'error').mockImplementation(() => {});
	h.paymentCreate.mockImplementation(async (doc: Any) => ({ _id: 'pay1', ...doc }));
	h.splitCreate.mockImplementation(async (doc: Any) => doc);
	h.recurringCreate.mockImplementation(async (doc: Any) => ({ _id: 'rec1', ...doc }));
});

describe('POST /api/cospend/payments — validation', () => {
	it('401 when logged out', async () => {
		expect((await call(createPayment, event(base, { auth: false }))).status).toBe(401);
	});

	it.each([
		['title', { title: '' }],
		['amount 0 (falsy → "missing", not "positive")', { amount: 0 }],
		['paidBy', { paidBy: '' }],
		['splitMethod', { splitMethod: '' }],
		['splits', { splits: undefined }]
	])('400 Missing required fields: %s', async (_n, patch) => {
		const r = await call(createPayment, event({ ...base, ...patch }));
		expect(r).toEqual({ status: 400, body: { message: 'Missing required fields' } });
	});

	it('400 Amount must be positive for negative amounts', async () => {
		const r = await call(createPayment, event({ ...base, amount: -5 }));
		expect(r).toEqual({ status: 400, body: { message: 'Amount must be positive' } });
	});

	it('400 Invalid split method', async () => {
		const r = await call(createPayment, event({ ...base, splitMethod: 'weird' }));
		expect(r).toEqual({ status: 400, body: { message: 'Invalid split method' } });
	});

	it.each(['equal', 'full', 'proportional', 'personal_equal'])('accepts split method %s', async (m) => {
		expect((await call(createPayment, event({ ...base, splitMethod: m }))).status).toBe(200);
	});

	it('empty splits array is accepted (truthy) and stores no splits', async () => {
		const r = await call(createPayment, event({ ...base, splits: [] }));
		expect(r.status).toBe(200);
		expect(storedSplits()).toEqual([]);
	});

	it('personal_equal: 400 when personal amounts exceed the amount', async () => {
		const r = await call(
			createPayment,
			event({
				...base,
				splitMethod: 'personal_equal',
				splits: [
					{ username: 'alexander', amount: -20, personalAmount: 80 },
					{ username: 'anna', amount: 50, personalAmount: 50 }
				]
			})
		);
		expect(r).toEqual({ status: 400, body: { message: 'Personal amounts cannot exceed total payment amount' } });
		expect(h.paymentCreate).not.toHaveBeenCalled();
	});

	it('personal_equal: personal amounts exactly equal to the amount are allowed', async () => {
		const r = await call(
			createPayment,
			event({
				...base,
				splitMethod: 'personal_equal',
				splits: [
					{ username: 'alexander', amount: -40, personalAmount: 60 },
					{ username: 'anna', amount: 40, personalAmount: 40 }
				]
			})
		);
		expect(r.status).toBe(200);
	});

	it('personal amounts are NOT checked for other split methods', async () => {
		const r = await call(
			createPayment,
			event({
				...base,
				splits: [
					{ username: 'alexander', amount: -50, personalAmount: 500 },
					{ username: 'anna', amount: 50, personalAmount: 500 }
				]
			})
		);
		expect(r.status).toBe(200);
	});

	it('personal_equal guard compares against the RAW (pre-conversion) amount for foreign currency', async () => {
		h.convertToCHF.mockResolvedValue({ convertedAmount: 50, exchangeRate: 0.5 });
		const r = await call(
			createPayment,
			event({
				...base,
				currency: 'EUR',
				splitMethod: 'personal_equal',
				splits: [
					{ username: 'alexander', amount: -10, personalAmount: 90 },
					{ username: 'anna', amount: 10, personalAmount: 0 }
				]
			})
		);
		// 90 ≤ 100 EUR → OK even though the CHF amount is 50
		expect(r.status).toBe(200);
	});
});

describe('POST /api/cospend/payments — persisted splits', () => {
	it('CHF: split amounts stored verbatim; server does not check they sum to 0 or match the method', async () => {
		const r = await call(
			createPayment,
			event({
				...base,
				splits: [
					{ username: 'alexander', amount: -6.673333333333334 },
					{ username: 'anna', amount: 3.3366666666666664 },
					{ username: 'bob', amount: 999 }
				]
			})
		);
		expect(r).toEqual({ status: 200, body: { success: true, payment: 'pay1' } });
		expect(h.paymentCreate.mock.calls[0][0]).toMatchObject({ amount: 100, currency: 'CHF', splitMethod: 'equal' });
		expect(storedSplits()).toEqual([
			{ paymentId: 'pay1', username: 'alexander', amount: -6.673333333333334, proportion: undefined, personalAmount: undefined },
			{ paymentId: 'pay1', username: 'anna', amount: 3.3366666666666664, proportion: undefined, personalAmount: undefined },
			{ paymentId: 'pay1', username: 'bob', amount: 999, proportion: undefined, personalAmount: undefined }
		]);
	});

	it('CHF: proportion and personalAmount passed through unchanged', async () => {
		await call(
			createPayment,
			event({
				...base,
				splitMethod: 'proportional',
				splits: [
					{ username: 'alexander', amount: -60, proportion: -0.6 },
					{ username: 'anna', amount: 60, proportion: 0.6, personalAmount: 3 }
				]
			})
		);
		expect(storedSplits()).toEqual([
			{ paymentId: 'pay1', username: 'alexander', amount: -60, proportion: -0.6, personalAmount: undefined },
			{ paymentId: 'pay1', username: 'anna', amount: 60, proportion: 0.6, personalAmount: 3 }
		]);
	});

	it('lower-case currency "chf" is treated as CHF (no conversion)', async () => {
		await call(createPayment, event({ ...base, currency: 'chf' }));
		expect(h.convertToCHF).not.toHaveBeenCalled();
		expect(h.paymentCreate.mock.calls[0][0].currency).toBe('CHF');
	});

	it('foreign currency: payment amount converted; split amount × rate; personalAmount × rate only when truthy; proportion untouched', async () => {
		h.convertToCHF.mockResolvedValue({ convertedAmount: 93.5, exchangeRate: 0.935 });
		await call(
			createPayment,
			event({
				...base,
				currency: 'eur',
				amount: 100,
				splitMethod: 'personal_equal',
				date: '2026-01-15',
				splits: [
					{ username: 'alexander', amount: -55, personalAmount: 20, proportion: 0.1 },
					{ username: 'anna', amount: 55, personalAmount: 0 }
				]
			})
		);
		expect(h.convertToCHF).toHaveBeenCalledWith(100, 'EUR', new Date('2026-01-15').toISOString());
		expect(h.paymentCreate.mock.calls[0][0]).toMatchObject({
			amount: 93.5,
			currency: 'EUR',
			originalAmount: 100,
			exchangeRate: 0.935
		});
		expect(storedSplits()).toEqual([
			{ paymentId: 'pay1', username: 'alexander', amount: -55 * 0.935, proportion: 0.1, personalAmount: 20 * 0.935 },
			{ paymentId: 'pay1', username: 'anna', amount: 55 * 0.935, proportion: undefined, personalAmount: 0 }
		]);
		expect(storedSplits().map((s) => s.amount)).toEqual([-51.425000000000004, 51.425000000000004]);
	});

	it('foreign currency conversion failure → 400, nothing stored', async () => {
		h.convertToCHF.mockRejectedValue(new Error('no rate'));
		const r = await call(createPayment, event({ ...base, currency: 'USD' }));
		expect(r).toEqual({ status: 400, body: { message: 'Failed to convert USD to CHF: no rate' } });
		expect(h.paymentCreate).not.toHaveBeenCalled();
	});

	it('invalid currency code → 400', async () => {
		const r = await call(createPayment, event({ ...base, currency: 'EURO' }));
		expect(r).toEqual({ status: 400, body: { message: 'Invalid currency code' } });
	});
});

const recurringBase = { ...base, frequency: 'monthly', startDate: '2026-01-01T00:00:00.000Z' };

describe('POST /api/cospend/recurring-payments', () => {
	it('stores splits verbatim (no recomputation, no conversion)', async () => {
		const splits = [
			{ username: 'alexander', amount: -6.673333333333334, proportion: 0.1, personalAmount: 1 },
			{ username: 'anna', amount: 3.3366666666666664 }
		];
		const r = await call(createRecurring, event({ ...recurringBase, splits }));
		expect(r).toEqual({ status: 200, body: { success: true, recurringPayment: 'rec1' } });
		const doc = h.recurringCreate.mock.calls[0][0];
		expect(doc.splits).toEqual(splits);
		expect(doc.amount).toBe(100);
		// currency from the body is ignored — always CHF
		expect(doc.currency).toBe('CHF');
	});

	it('amount 0 → 400 Missing required fields; negative → Amount must be positive', async () => {
		expect((await call(createRecurring, event({ ...recurringBase, amount: 0 }))).body.message).toBe('Missing required fields');
		expect((await call(createRecurring, event({ ...recurringBase, amount: -1 }))).body.message).toBe('Amount must be positive');
	});

	it('invalid split method → 400', async () => {
		const r = await call(createRecurring, event({ ...recurringBase, splitMethod: 'weird' }));
		expect(r).toEqual({ status: 400, body: { message: 'Invalid split method' } });
	});

	it('personal_equal exceeding amount → 400', async () => {
		const r = await call(
			createRecurring,
			event({
				...recurringBase,
				splitMethod: 'personal_equal',
				splits: [
					{ username: 'alexander', amount: 0, personalAmount: 60 },
					{ username: 'anna', amount: 0, personalAmount: 40.01 }
				]
			})
		);
		expect(r).toEqual({ status: 400, body: { message: 'Personal amounts cannot exceed total payment amount' } });
	});
});

describe('PUT /api/cospend/recurring-payments/[id]', () => {
	const id = '64b000000000000000000001';
	beforeEach(() => {
		h.recurringFindById.mockResolvedValue({ _id: id, toObject: () => ({ _id: id }) });
		h.recurringFindByIdAndUpdate.mockImplementation(async (_id: Any, update: Any) => ({ _id, ...update }));
	});

	it('stores splits verbatim', async () => {
		const splits = [
			{ username: 'alexander', amount: -50 },
			{ username: 'anna', amount: 50 }
		];
		const r = await call(updateRecurring, event({ amount: 100, splits }, { params: { id } }));
		expect(r.status).toBe(200);
		expect(h.recurringFindByIdAndUpdate.mock.calls[0][1]).toEqual({ amount: 100, splits });
	});

	it('personal_equal exceeding amount → 400', async () => {
		const r = await call(
			updateRecurring,
			event(
				{
					amount: 100,
					splitMethod: 'personal_equal',
					splits: [
						{ username: 'alexander', amount: 0, personalAmount: 80 },
						{ username: 'anna', amount: 0, personalAmount: 50 }
					]
				},
				{ params: { id } }
			)
		);
		expect(r).toEqual({ status: 400, body: { message: 'Personal amounts cannot exceed total payment amount' } });
		expect(h.recurringFindByIdAndUpdate).not.toHaveBeenCalled();
	});

	it('personal_equal guard is skipped when amount is not in the body', async () => {
		const r = await call(
			updateRecurring,
			event(
				{
					splitMethod: 'personal_equal',
					splits: [{ username: 'alexander', amount: 0, personalAmount: 1e9 }]
				},
				{ params: { id } }
			)
		);
		expect(r.status).toBe(200);
	});

	it('invalid split method → 400', async () => {
		const r = await call(updateRecurring, event({ splitMethod: 'weird' }, { params: { id } }));
		expect(r).toEqual({ status: 400, body: { message: 'Invalid split method' } });
	});
});

describe('POST /api/cospend/recurring-payments/execute — splits copied into a payment', () => {
	function due(overrides: Record<string, unknown>) {
		return {
			_id: 'rec1',
			title: 'Rent',
			description: '',
			amount: 100,
			currency: 'CHF',
			paidBy: 'alexander',
			category: 'groceries',
			splitMethod: 'personal_equal',
			createdBy: 'alexander',
			frequency: 'monthly',
			startDate: new Date('2026-01-01'),
			splits: [
				{ username: 'alexander', amount: -40, personalAmount: 20, proportion: undefined },
				{ username: 'anna', amount: 40, personalAmount: 0 },
				{ username: 'bob', amount: 0 }
			],
			save: vi.fn(async () => {}),
			...overrides
		};
	}

	it('CHF: split amounts copied as stored (not recomputed)', async () => {
		h.recurringFind.mockResolvedValue([due({})]);
		const r = await call(executeRecurring, event({}));
		expect(r.status).toBe(200);
		expect(storedSplits()).toEqual([
			{ paymentId: 'pay1', username: 'alexander', amount: -40, proportion: undefined, personalAmount: 20 },
			{ paymentId: 'pay1', username: 'anna', amount: 40, proportion: undefined, personalAmount: 0 },
			{ paymentId: 'pay1', username: 'bob', amount: 0, proportion: undefined, personalAmount: undefined }
		]);
	});

	it('foreign currency: split amount × rate only when amount truthy; personalAmount × rate only when truthy', async () => {
		h.recurringFind.mockResolvedValue([due({ currency: 'EUR' })]);
		h.convertToCHF.mockResolvedValue({ convertedAmount: 90, exchangeRate: 0.9 });
		await call(executeRecurring, event({}));
		expect(h.paymentCreate.mock.calls[0][0]).toMatchObject({ amount: 90, originalAmount: 100, exchangeRate: 0.9 });
		expect(storedSplits()).toEqual([
			{ paymentId: 'pay1', username: 'alexander', amount: -36, proportion: undefined, personalAmount: 18 },
			{ paymentId: 'pay1', username: 'anna', amount: 36, proportion: undefined, personalAmount: 0 },
			{ paymentId: 'pay1', username: 'bob', amount: 0, proportion: undefined, personalAmount: undefined }
		]);
	});

	it('foreign currency conversion failure: payment keeps the raw amount and splits are unscaled', async () => {
		h.recurringFind.mockResolvedValue([due({ currency: 'EUR' })]);
		h.convertToCHF.mockRejectedValue(new Error('down'));
		await call(executeRecurring, event({}));
		expect(h.paymentCreate.mock.calls[0][0]).toMatchObject({ amount: 100, currency: 'EUR', originalAmount: undefined });
		expect(storedSplits().map((s) => s.amount)).toEqual([-40, 40, 0]);
	});
});
