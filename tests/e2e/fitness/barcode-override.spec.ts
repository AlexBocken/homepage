import { test, expect, request, type APIRequestContext } from '@playwright/test';
import { storageStateFor } from '../helpers/auth';

/**
 * Barcode → BLS/USDA mappings. These are global and shared, so each test owns a
 * throwaway barcode in a private range and deletes it again — the suite stays
 * idempotent and never collides with real cloned data.
 *
 * Driven through the API rather than the scanner UI: the camera path can't run
 * headless, and the contract worth pinning is that a mapped barcode resolves to
 * the BLS/USDA record everywhere a barcode is turned into a food.
 */

const BASE = 'http://localhost:4173';
// Oat flakes — a stable BLS entry (see src/lib/data/blsDb.ts).
const BLS_CODE = 'C133000';

/** Codes below are test-only and must not exist in the cloned OFF data. */
const CODE_MAPPED = '0000000000101';
const CODE_UNKNOWN = '0000000000102';

async function ctxFor(role: string): Promise<APIRequestContext> {
	return request.newContext({ baseURL: BASE, storageState: storageStateFor(role) });
}

async function unlink(ctx: APIRequestContext, code: string) {
	await ctx.delete(`/api/nutrition/barcode-override?code=${code}`);
}

test.describe('barcode → BLS/USDA overrides', () => {
	test('a mapped barcode resolves to its BLS entry instead of OFF', async () => {
		const ctx = await ctxFor('fitness');
		try {
			await unlink(ctx, CODE_MAPPED);

			const created = await ctx.post('/api/nutrition/barcode-override', {
				data: { barcode: CODE_MAPPED, source: 'bls', blsCode: BLS_CODE }
			});
			expect(created.ok()).toBe(true);
			const { food } = await created.json();
			expect(food.source).toBe('bls');
			expect(food.id).toBe(BLS_CODE);

			// The scanner path must now return the BLS record, not the OFF entry.
			const scan = await ctx.get(`/api/nutrition/barcode?code=${CODE_MAPPED}`);
			expect(scan.ok()).toBe(true);
			const scanned = await scan.json();
			expect(scanned.source).toBe('bls');
			expect(scanned.id).toBe(BLS_CODE);
			// The whole point of the feature: micros OFF does not carry.
			expect(scanned.per100g.magnesium).toBeGreaterThan(0);
			expect(scanned.overriddenBarcode).toBe(CODE_MAPPED);
		} finally {
			await unlink(ctx, CODE_MAPPED);
			await ctx.dispose();
		}
	});

	test('a barcode OFF has never seen can still be mapped', async () => {
		const ctx = await ctxFor('fitness');
		try {
			await unlink(ctx, CODE_UNKNOWN);

			// Unmapped and unknown to OFF: a dead end.
			const before = await ctx.get(`/api/nutrition/barcode?code=${CODE_UNKNOWN}`);
			expect(before.status()).toBe(404);

			await ctx.post('/api/nutrition/barcode-override', {
				data: { barcode: CODE_UNKNOWN, source: 'bls', blsCode: BLS_CODE }
			});

			const after = await ctx.get(`/api/nutrition/barcode?code=${CODE_UNKNOWN}`);
			expect(after.ok()).toBe(true);
			expect((await after.json()).id).toBe(BLS_CODE);
		} finally {
			await unlink(ctx, CODE_UNKNOWN);
			await ctx.dispose();
		}
	});

	test('several barcodes may point at one entry, and unlinking restores OFF', async () => {
		const ctx = await ctxFor('fitness');
		try {
			for (const code of [CODE_MAPPED, CODE_UNKNOWN]) {
				const res = await ctx.post('/api/nutrition/barcode-override', {
					data: { barcode: code, source: 'bls', blsCode: BLS_CODE }
				});
				expect(res.ok(), `${code} should map to ${BLS_CODE}`).toBe(true);
			}

			await unlink(ctx, CODE_MAPPED);
			// Removing one mapping must not disturb the other.
			expect((await ctx.get(`/api/nutrition/barcode-override?code=${CODE_MAPPED}`)).ok()).toBe(true);
			expect((await (await ctx.get(`/api/nutrition/barcode-override?code=${CODE_MAPPED}`)).json()).override).toBeNull();
			const other = await ctx.get(`/api/nutrition/barcode-override?code=${CODE_UNKNOWN}`);
			expect((await other.json()).override.blsCode).toBe(BLS_CODE);
		} finally {
			await unlink(ctx, CODE_MAPPED);
			await unlink(ctx, CODE_UNKNOWN);
			await ctx.dispose();
		}
	});

	test('a mapping to an unknown target is rejected', async () => {
		const ctx = await ctxFor('fitness');
		try {
			const res = await ctx.post('/api/nutrition/barcode-override', {
				data: { barcode: CODE_MAPPED, source: 'bls', blsCode: 'NOT_A_REAL_CODE' }
			});
			expect(res.status()).toBe(400);
		} finally {
			await ctx.dispose();
		}
	});
});
