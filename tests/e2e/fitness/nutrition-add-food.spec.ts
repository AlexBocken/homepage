import { test, expect } from '@playwright/test';
import { storageStateFor } from '../helpers/auth';
import { gotoHydrated } from '../helpers/nav';

// The per-meal "Add food" search (Breakfast/Lunch/…): detail links out to each
// entry's own page, and a micronutrient breakdown you can open before logging.

test.use({ storageState: storageStateFor('fitness') });

/** Opens the inline add-food search on the first meal card. */
async function openMealSearch(page: import('@playwright/test').Page, query: string) {
	await gotoHydrated(page, '/fitness/nutrition');
	await page.getByRole('button', { name: 'Add food' }).first().click();
	await page.getByPlaceholder(/Search food/i).fill(query);
	await expect(page.locator('.fs-result-row').first()).toBeVisible();
}

test('per-meal search links out to the food detail page', async ({ page }) => {
	await openMealSearch(page, 'banana');

	// A USDA row links to /fitness/nutrition/food/usda/<id>.
	const row = page.locator('.fs-result-row').filter({ has: page.locator('.fs-source-badge.usda') }).first();
	const link = row.locator('a.fs-detail-link');
	await expect(link).toBeVisible();
	await expect(link).toHaveAttribute('href', /\/fitness\/nutrition\/food\/usda\/\d+/);

	// And it actually reaches the detail page.
	await link.click();
	await expect(page).toHaveURL(/\/fitness\/nutrition\/food\/usda\/\d+/);
});

test('micronutrients are collapsed by default and expand on demand', async ({ page }) => {
	await openMealSearch(page, 'peppers, bell');

	await page.locator('.fs-result-row').filter({ has: page.locator('.fs-source-badge.usda') })
		.first().locator('button.fs-result').click();

	// Selected view: macros are shown, micros are not — until asked for.
	const toggle = page.getByRole('button', { name: /Micronutrients/i });
	await expect(toggle).toBeVisible();
	await expect(toggle).toHaveAttribute('aria-expanded', 'false');
	await expect(page.locator('.fs-micros')).toHaveCount(0);

	await toggle.click();
	await expect(toggle).toHaveAttribute('aria-expanded', 'true');
	const micros = page.locator('.fs-micros');
	await expect(micros).toBeVisible();
	// Bell pepper's headline micronutrient — proves real values, not an empty table.
	await expect(micros.locator('.fs-micro-row', { hasText: 'Vitamin C' })).toBeVisible();
	await expect(micros.getByText('Minerals')).toBeVisible();

	await toggle.click();
	await expect(page.locator('.fs-micros')).toHaveCount(0);
});
