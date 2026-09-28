import { test, expect, type Page } from '@playwright/test';
import { storageStateFor } from '../helpers/auth';
import { gotoHydrated } from '../helpers/nav';

// What the diary POSTs when food is logged: from a meal's inline "Add food", from
// the add FAB, and a custom meal from both. The POST is intercepted and answered
// with a fake entry, so nothing is written and the test is repeatable; the custom
// meals list is a fixture for the same reason.

test.use({ storageState: storageStateFor('fitness') });

const DAY = '2026-01-15';

const MEAL = {
	_id: 'e2e-meal-porridge',
	name: 'E2E Porridge',
	ingredients: [
		{ name: 'Vollmilch', source: 'bls', sourceId: 'N110000', amountGrams: 200, per100g: { calories: 64, protein: 3.3, fat: 3.5, carbs: 4.8, iodine: 11 } },
		{ name: 'Haferflocken', source: 'bls', sourceId: 'C133000', amountGrams: 50, per100g: { calories: 370, protein: 13.5, fat: 7, carbs: 58.7, fiber: 10 } }
	]
};

type Body = Record<string, any>;

/** Answer food-log POSTs with a fake entry; returns the bodies sent. */
async function capture(page: Page): Promise<Body[]> {
	const bodies: Body[] = [];
	await page.route('**/api/fitness/food-log', async (route) => {
		if (route.request().method() !== 'POST') return route.continue();
		const body = route.request().postDataJSON();
		bodies.push(body);
		await route.fulfill({ status: 201, json: { _id: `e2e-fake-${bodies.length}`, ...body } });
	});
	await page.route('**/api/fitness/custom-meals', (route) =>
		route.request().method() === 'GET' ? route.fulfill({ json: { meals: [MEAL] } }) : route.continue()
	);
	return bodies;
}

const FOOD_KEYS = ['date', 'mealType', 'name', 'source', 'sourceId', 'amountGrams', 'portions', 'selectedPortion', 'per100g'];

/** Keys appear in this order (absent optional ones skipped). */
function expectKeyOrder(body: Body, order: string[]) {
	const keys = Object.keys(body);
	expect(keys.every((k) => order.includes(k))).toBe(true);
	expect(keys).toEqual(order.filter((k) => keys.includes(k)));
}

async function pickFirstSearchResult(page: Page, query: string) {
	await page.getByPlaceholder(/Search food/i).first().fill(query);
	const row = page.locator('.fs-result-row').first();
	await expect(row).toBeVisible();
	const name = (await row.locator('.fs-result-name').innerText()).trim();
	await row.locator('button.fs-result').click();
	await page.locator('button.fs-btn-confirm').click();
	return name;
}

function expectMealBody(body: Body, mealType: string, date: string) {
	expectKeyOrder(body, ['date', 'mealType', 'name', 'source', 'sourceId', 'amountGrams', 'per100g', 'liquidMl']);
	expect(body).toMatchObject({ date, mealType, name: 'E2E Porridge', source: 'custom', sourceId: 'e2e-meal-porridge', amountGrams: 250, liquidMl: 200 });
	expect(body.per100g.calories).toBeCloseTo(125.2, 10);
	expect(body.per100g.protein).toBeCloseTo(5.34, 10);
	expect(body.per100g.fiber).toBeCloseTo(2, 10);
	// A trace mineral keeps its concentration over the grams that reported it.
	expect(body.per100g.iodine).toBeCloseTo(11, 10);
}

test('inline add: a searched food and a custom meal', async ({ page }) => {
	const bodies = await capture(page);
	await gotoHydrated(page, `/fitness/nutrition/${DAY}`);

	await page.getByRole('button', { name: 'Add food' }).first().click();
	const name = await pickFirstSearchResult(page, 'apfel');
	await expect.poll(() => bodies.length).toBe(1);
	expectKeyOrder(bodies[0], FOOD_KEYS);
	expect(bodies[0]).toMatchObject({ date: DAY, mealType: 'breakfast', name });
	expect(bodies[0].amountGrams).toBeGreaterThan(0);
	// Logged → the inline form closes and the entry is shown.
	await expect(page.locator('.food-card').filter({ hasText: name }).first()).toBeVisible();

	await page.getByRole('button', { name: 'Add food' }).first().click();
	await page.locator('.fab-tab').filter({ hasText: /Meals/i }).first().click();
	await page.locator('.custom-meal-card').filter({ hasText: 'E2E Porridge' }).click();
	await page.locator('.cm-detail-btn-confirm').click();
	await expect.poll(() => bodies.length).toBe(2);
	expectMealBody(bodies[1], 'breakfast', DAY);
	await expect(page.locator('.food-card').filter({ hasText: 'E2E Porridge' }).first()).toBeVisible();
});

test('add FAB: a searched food and a custom meal', async ({ page }) => {
	const bodies = await capture(page);
	await gotoHydrated(page, '/fitness/nutrition?add');
	const modal = page.locator('.fab-modal');
	await expect(modal).toBeVisible();
	await modal.locator('.fab-meal-btn').nth(2).click();
	const mealType = await modal.locator('.fab-meal-btn.active span').innerText();

	const name = await pickFirstSearchResult(page, 'apfel');
	await expect.poll(() => bodies.length).toBe(1);
	expectKeyOrder(bodies[0], FOOD_KEYS);
	expect(bodies[0].name).toBe(name);
	expect(bodies[0].date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
	expect(mealType.length).toBeGreaterThan(0);
	const fabMeal = bodies[0].mealType;
	await expect(modal).toHaveCount(0);

	await gotoHydrated(page, '/fitness/nutrition?add');
	await modal.locator('.fab-meal-btn').nth(2).click();
	await modal.locator('.fab-tab').filter({ hasText: /Meals/i }).click();
	await modal.locator('.custom-meal-card').filter({ hasText: 'E2E Porridge' }).click();
	await modal.locator('.cm-detail-btn-confirm').click();
	await expect.poll(() => bodies.length).toBe(2);
	expectMealBody(bodies[1], fabMeal, bodies[0].date);
	await expect(modal).toHaveCount(0);
});
