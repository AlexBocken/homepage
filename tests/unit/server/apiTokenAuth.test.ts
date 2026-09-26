import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$utils/db', () => ({ dbConnect: vi.fn().mockResolvedValue(undefined) }));

import { extractApiToken, createApiTokenAuth } from '$lib/server/apiTokenAuth';

const URL_BASE = 'https://bocken.org/api/cospend/export';

function req(headers: Record<string, string> = {}) {
	return new Request(URL_BASE, { headers });
}

describe('extractApiToken', () => {
	it('reads a Bearer header', () => {
		expect(extractApiToken(req({ authorization: 'Bearer abc123' }), new URL(URL_BASE))).toBe('abc123');
	});

	it('is case-insensitive on the scheme and trims the value', () => {
		expect(extractApiToken(req({ authorization: 'bearer   abc123  ' }), new URL(URL_BASE))).toBe('abc123');
	});

	it('falls back to ?token=', () => {
		expect(extractApiToken(req(), new URL(`${URL_BASE}?token=q456`))).toBe('q456');
	});

	it('prefers the header when both are given', () => {
		expect(
			extractApiToken(req({ authorization: 'Bearer fromHeader' }), new URL(`${URL_BASE}?token=fromQuery`))
		).toBe('fromHeader');
	});

	it('ignores a non-Bearer Authorization header', () => {
		expect(extractApiToken(req({ authorization: 'Basic dXNlcjpwYXNz' }), new URL(URL_BASE))).toBeNull();
		expect(
			extractApiToken(req({ authorization: 'Basic dXNlcjpwYXNz' }), new URL(`${URL_BASE}?token=q`))
		).toBe('q');
	});

	it('returns null when neither is present', () => {
		expect(extractApiToken(req(), new URL(URL_BASE))).toBeNull();
	});
});

describe('createApiTokenAuth', () => {
	const doc = { token: 'good', createdBy: 'alice', label: 'importer' };
	const findOne = vi.fn();
	const updateOne = vi.fn();
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const model = { findOne, updateOne } as any;
	const verify = createApiTokenAuth(model);

	beforeEach(() => {
		findOne.mockReset();
		updateOne.mockReset().mockResolvedValue({});
		findOne.mockImplementation(({ token }: { token: string }) => ({
			lean: async () => (token === 'good' ? doc : null)
		}));
	});

	it('resolves a valid token and touches lastUsedAt', async () => {
		const res = await verify(req({ authorization: 'Bearer good' }), new URL(URL_BASE));
		expect(res).toEqual(doc);
		expect(findOne).toHaveBeenCalledWith({ token: 'good' });
		expect(updateOne).toHaveBeenCalledWith({ token: 'good' }, { $set: { lastUsedAt: expect.any(Date) } });
	});

	it('returns null for an unknown token without touching anything', async () => {
		expect(await verify(req(), new URL(`${URL_BASE}?token=bad`))).toBeNull();
		expect(updateOne).not.toHaveBeenCalled();
	});

	it('returns null without a DB lookup when no token is presented', async () => {
		expect(await verify(req(), new URL(URL_BASE))).toBeNull();
		expect(findOne).not.toHaveBeenCalled();
	});

	it('does not fail the request when the lastUsedAt write fails', async () => {
		updateOne.mockRejectedValue(new Error('write failed'));
		expect(await verify(req({ authorization: 'Bearer good' }), new URL(URL_BASE))).toEqual(doc);
	});
});
