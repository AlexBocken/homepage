import { test, expect } from '@playwright/test';
import { storageStateFor } from '../helpers/auth';
import { gotoHydrated } from '../helpers/nav';

/**
 * The fat-composition list has to read the same in the diary and in the averages —
 * an omega total heading the acids it is the sum of, not a flat list where nothing
 * says EPA is already counted two rows above.
 */

test.use({ storageState: storageStateFor('fitness') });

const OILY_FISH = {
	name: 'E2E Omega Fixture',
	source: 'bls',
	sourceId: 'E2E-OMEGA-1',
	amountGrams: 100,
	per100g: {
		calories: 200, protein: 20, fat: 13, carbs: 0,
		monounsaturatedFat: 3.9, polyunsaturatedFat: 3.7,
		linoleicAcid: 0.6, arachidonicAcid: 0.3,
		alphaLinolenicAcid: 0.4, epa: 0.7, dha: 1.5,
	},
};

/** Today in the local calendar, matching how the diary keys days. */
function today() {
	const d = new Date();
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

test('the diary nests the fatty acids under their omega total', async ({ page, request }) => {
	const date = today();
	const res = await request.post('/api/fitness/food-log', {
		data: { ...OILY_FISH, date, mealType: 'lunch' },
	});
	expect(res.ok()).toBeTruthy();
	const { _id: id } = await res.json();

	try {
		await gotoHydrated(page, `/fitness/nutrition/${date}`);
		await page.getByRole('button', { name: /^Details$/i }).first().click();

		// The total heads the group…
		const omega3 = page.locator('.micro-row.is-group', { hasText: 'Omega-3' });
		await expect(omega3).toBeVisible();
		// …and the acids it sums are indented under it.
		await expect(page.locator('.micro-row.is-child', { hasText: 'EPA' }).first()).toBeVisible();
		await expect(page.locator('.micro-row.is-group', { hasText: 'Omega-6' })).toBeVisible();
	} finally {
		if (id) await request.delete(`/api/fitness/food-log/${id}`);
	}
});

test('the nutrient averages show the same section, structured the same way', async ({ page }) => {
	await gotoHydrated(page, '/fitness/stats/nutrients');

	await expect(page.getByRole('heading', { name: 'Fat Composition' })).toBeVisible();
	await expect(page.locator('.micro-row.is-group', { hasText: 'Omega-3' })).toBeVisible();
	await expect(page.locator('.micro-row.is-child').first()).toBeVisible();
});
