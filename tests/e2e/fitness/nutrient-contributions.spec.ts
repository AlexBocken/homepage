import { test, expect } from '@playwright/test';
import { storageStateFor } from '../helpers/auth';
import { gotoHydrated } from '../helpers/nav';

test.use({ storageState: storageStateFor('fitness') });

/**
 * The contribution breakdown needs a food log to break down, and nothing is seeded
 * for it, so each test owns its entries and removes them again. Values are chosen so
 * the ranking is unambiguous: the liver-like fixture dominates by amount while the
 * parsley-like one wins on concentration, which is exactly the disagreement the sort
 * toggle exists to show.
 */
const RICH = {
	name: 'E2E Vitamin A Fixture',
	source: 'bls',
	sourceId: 'E2E-VITA-1',
	amountGrams: 100,
	per100g: { calories: 100, protein: 1, fat: 1, carbs: 1, vitaminA: 9000 },
};

const CONCENTRATED = {
	name: 'E2E Concentrated Fixture',
	source: 'bls',
	sourceId: 'E2E-VITA-2',
	amountGrams: 2,
	per100g: { calories: 100, protein: 1, fat: 1, carbs: 1, vitaminA: 20000 },
};

/** Today in the local calendar, matching how the diary keys days. */
function today() {
	const d = new Date();
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

test('nutrient contributions rank foods and can be re-sorted by concentration', async ({ page, request }) => {
	const date = today();
	const created: string[] = [];

	for (const food of [RICH, CONCENTRATED]) {
		const res = await request.post('/api/fitness/food-log', {
			data: { ...food, date, mealType: 'lunch' },
		});
		expect(res.ok()).toBeTruthy();
		const body = await res.json();
		created.push(body._id ?? body.id);
	}

	try {
		await gotoHydrated(page, `/fitness/nutrition/nutrient/vitaminA?date=${date}`);

		// Both foods reported the nutrient, so both are listed.
		await expect(page.getByText(RICH.name)).toBeVisible();
		await expect(page.getByText(CONCENTRATED.name)).toBeVisible();

		// By amount, 100 g at 9000 beats 2 g at 20000.
		const byAmount = page.locator('.rows li').first();
		await expect(byAmount).toContainText(RICH.name);

		// Switching to concentration flips the order.
		await page.getByRole('link', { name: /By concentration|Nach Gehalt/i }).click();
		await expect(page).toHaveURL(/by=per100g/);
		const byConcentration = page.locator('.rows li').first();
		await expect(byConcentration).toContainText(CONCENTRATED.name);
	} finally {
		for (const id of created) {
			if (id) await request.delete(`/api/fitness/food-log/${id}`);
		}
	}
});

test('a nutrient row in the diary links through to its breakdown', async ({ page, request }) => {
	const date = today();
	const res = await request.post('/api/fitness/food-log', {
		data: { ...RICH, date, mealType: 'lunch' },
	});
	expect(res.ok()).toBeTruthy();
	const { _id: id } = await res.json();

	try {
		await gotoHydrated(page, `/fitness/nutrition/${date}`);

		// The breakdown lives behind the collapsible details panel.
		await page.getByRole('button', { name: /^Details$/i }).first().click();

		await page.getByRole('link', { name: /Vitamin A/i }).first().click();
		await expect(page).toHaveURL(/\/nutrient\/vitaminA/);
		await expect(page.getByText(RICH.name)).toBeVisible();
	} finally {
		if (id) await request.delete(`/api/fitness/food-log/${id}`);
	}
});

test('an unknown nutrient key is rejected rather than rendered', async ({ request }) => {
	// The key reaches a plain-object lookup, so prototype keys must 404 too.
	for (const key of ['notANutrient', '__proto__', 'constructor']) {
		const res = await request.get(`/fitness/nutrition/nutrient/${key}`);
		expect(res.status(), `key ${key}`).toBe(404);
	}
});
