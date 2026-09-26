import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const h = vi.hoisted(() => ({
	dbConnect: vi.fn(async () => {}),
	findOne: vi.fn(),
	create: vi.fn(async () => ({}))
}));

vi.mock('$utils/db', () => ({ dbConnect: h.dbConnect }));
vi.mock('$models/ExchangeRate', () => ({ ExchangeRate: { findOne: h.findOne, create: h.create } }));

import { getExchangeRate } from '$lib/utils/currency';

describe('getExchangeRate', () => {
	const fetchMock = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
		vi.stubGlobal('fetch', fetchMock);
	});
	afterEach(() => vi.unstubAllGlobals());

	it('CHF is 1 without touching the cache or the API', async () => {
		expect(await getExchangeRate('CHF', '2026-01-01')).toBe(1);
		expect(h.dbConnect).not.toHaveBeenCalled();
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('serves a cached rate, keyed on the date part of a timestamp', async () => {
		h.findOne.mockResolvedValue({ rate: 0.93 });
		expect(await getExchangeRate('EUR', '2026-01-01T12:00:00Z')).toBe(0.93);
		expect(h.findOne).toHaveBeenCalledWith({ fromCurrency: 'EUR', toCurrency: 'CHF', date: '2026-01-01' });
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('fetches and caches a missing rate', async () => {
		h.findOne.mockResolvedValue(null);
		fetchMock.mockResolvedValue({ ok: true, json: async () => ({ rates: { CHF: 0.8 } }) });
		expect(await getExchangeRate('USD', '2026-01-01')).toBe(0.8);
		expect(fetchMock).toHaveBeenCalledWith('https://api.frankfurter.app/2026-01-01?from=USD&to=CHF');
		expect(h.create).toHaveBeenCalledWith({ fromCurrency: 'USD', toCurrency: 'CHF', rate: 0.8, date: '2026-01-01' });
	});

	it('throws when the API has no rate', async () => {
		h.findOne.mockResolvedValue(null);
		fetchMock.mockResolvedValue({ ok: true, json: async () => ({ rates: {} }) });
		await expect(getExchangeRate('XYZ', '2026-01-01')).rejects.toThrow(/No exchange rate/);
		expect(h.create).not.toHaveBeenCalled();
	});
});
