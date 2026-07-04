import { test, expect } from '@playwright/test';
import { storageStateFor } from '../helpers/auth';
import { gotoHydrated } from '../helpers/nav';

// Food diary: search + log a food from each nutrition source. Data is real —
// BLS/USDA from the bundled index, OFF cloned from the dev DB by brand term,
// recipe from a cloned recipe that has nutrition mappings.

test.use({ storageState: storageStateFor('fitness') });

const SOURCES = [
	{ name: 'OFF', query: 'nutella', badge: '.fs-source-badge.off' },
	{ name: 'recipe', query: 'Älplermagronen', badge: '.fs-source-badge.recipe' },
	{ name: 'USDA', query: 'banana', badge: '.fs-source-badge.usda' },
	{ name: 'BLS', query: 'apple', badge: '.fs-source-badge:not(.usda):not(.off):not(.recipe)' }
];

for (const s of SOURCES) {
	test(`log a food from ${s.name}`, async ({ page }) => {
		await gotoHydrated(page, '/fitness/nutrition');

		await page.getByRole('button', { name: 'Add food' }).first().click();
		await page.getByPlaceholder(/Search food/i).fill(s.query);

		// Pick the result carrying this source's badge.
		const row = page.locator('.fs-result-row').filter({ has: page.locator(s.badge) }).first();
		await expect(row).toBeVisible();
		const foodName = (await row.locator('.fs-result-name').innerText()).trim();

		await row.locator('button.fs-result').click();
		await page.locator('button.fs-btn-confirm').click();

		// The logged entry surfaces in the day view.
		await expect(page.getByText(foodName, { exact: false }).first()).toBeVisible();
	});
}
