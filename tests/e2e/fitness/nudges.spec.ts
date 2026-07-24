import { test, expect } from '@playwright/test';
import { storageStateFor } from '../helpers/auth';

test.use({ storageState: storageStateFor('fitness') });

/**
 * These exercise the API rather than the card, because the card only appears when a
 * day is genuinely short on macros — a state that takes several fixtures to stage and
 * would make the spec brittle. The reversibility guarantee is the part worth pinning:
 * a suggestion that cannot be undone cleanly is worse than no suggestion.
 */
const CHICKEN = { calories: 165, protein: 31, fat: 3.6, carbs: 0 };

function isoDay(offsetDays: number) {
	const d = new Date();
	d.setDate(d.getDate() + offsetDays);
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

test('a bump is an exact inverse when undone', async ({ request }) => {
	const date = isoDay(0);
	const res = await request.post('/api/fitness/food-log', {
		data: { date, mealType: 'lunch', name: 'E2E Bump Fixture', source: 'bls', sourceId: 'E2E-BUMP', amountGrams: 150, per100g: CHICKEN },
	});
	expect(res.ok()).toBeTruthy();
	const { _id: id } = await res.json();

	try {
		// Apply, as the card does.
		const bump = await request.put(`/api/fitness/food-log/${id}`, { data: { amountGrams: 275 } });
		expect(bump.ok()).toBeTruthy();
		expect((await bump.json()).amountGrams).toBe(275);

		// Undo restores the original weight exactly, not an approximation.
		const undo = await request.put(`/api/fitness/food-log/${id}`, { data: { amountGrams: 150 } });
		expect(undo.ok()).toBeTruthy();
		expect((await undo.json()).amountGrams).toBe(150);
	} finally {
		await request.delete(`/api/fitness/food-log/${id}`);
	}
});

test('nudges never suggest less than the 50 g floor', async ({ request }) => {
	const res = await request.get('/api/fitness/nudges', {
		params: { remainingKcal: 600, remainingProtein: 40, remainingFat: 10, remainingCarbs: 40, date: isoDay(0) },
	});
	expect(res.ok()).toBeTruthy();
	const { nudges } = await res.json();
	for (const n of nudges) {
		expect(n.deltaGrams).toBeGreaterThanOrEqual(50);
		expect(n.deltaGrams % 5).toBe(0);
	}
});

test('a day with nothing left to close returns no nudges', async ({ request }) => {
	const res = await request.get('/api/fitness/nudges', {
		params: { remainingKcal: 0, remainingProtein: 0, remainingFat: 0, remainingCarbs: 0, date: isoDay(0) },
	});
	expect(res.ok()).toBeTruthy();
	expect((await res.json()).nudges).toEqual([]);
});

test('copy-day duplicates a day and the copies can be removed again', async ({ request }) => {
	const from = isoDay(-1);
	const to = isoDay(0);

	const seed = await request.post('/api/fitness/food-log', {
		data: { date: from, mealType: 'breakfast', name: 'E2E Copy Fixture', source: 'bls', sourceId: 'E2E-COPY', amountGrams: 120, per100g: CHICKEN },
	});
	expect(seed.ok()).toBeTruthy();
	const { _id: seedId } = await seed.json();

	let copiedIds: string[] = [];
	try {
		const res = await request.post('/api/fitness/food-log/copy-day', { data: { from, to } });
		expect(res.ok()).toBeTruthy();
		const body = await res.json();
		copiedIds = body.ids;
		expect(body.copied).toBeGreaterThanOrEqual(1);

		// The copy is a snapshot: it must be its own entry, not a reference.
		expect(copiedIds).not.toContain(seedId);
	} finally {
		for (const id of copiedIds) await request.delete(`/api/fitness/food-log/${id}`);
		await request.delete(`/api/fitness/food-log/${seedId}`);
	}
});

test('copy-day refuses a same-day or malformed request', async ({ request }) => {
	const day = isoDay(0);
	expect((await request.post('/api/fitness/food-log/copy-day', { data: { from: day, to: day } })).status()).toBe(400);
	expect((await request.post('/api/fitness/food-log/copy-day', { data: { from: 'yesterday', to: day } })).status()).toBe(400);
});
