import { test, expect } from '@playwright/test';
import { storageStateFor } from '../helpers/auth';
import { gotoHydrated } from '../helpers/nav';

// Favourite a food from each database source, entirely through the UI: log the
// food, open it from the diary entry (which links to its detail page), toggle
// the heart, and confirm it persists across a reload. Then unfavourite + delete
// the log entry.

test.use({ storageState: storageStateFor('fitness') });

const SOURCES = [
	{ name: 'OFF', query: 'nutella', badge: '.fs-source-badge.off' },
	{ name: 'recipe', query: 'Älplermagronen', badge: '.fs-source-badge.recipe' },
	{ name: 'USDA', query: 'banana', badge: '.fs-source-badge.usda' },
	{ name: 'BLS', query: 'apple', badge: '.fs-source-badge:not(.usda):not(.off):not(.recipe)' }
];

for (const s of SOURCES) {
	test(`favorite a food from ${s.name}`, async ({ page }) => {
		await gotoHydrated(page, '/fitness/nutrition');
		await page.getByRole('button', { name: 'Add food' }).first().click();
		await page.getByPlaceholder(/Search food/i).fill(s.query);

		const row = page.locator('.fs-result-row').filter({ has: page.locator(s.badge) }).first();
		await expect(row).toBeVisible();
		const name = (await row.locator('.fs-result-name').innerText()).trim();
		await row.locator('button.fs-result').click();
		await page.locator('button.fs-btn-confirm').click();

		// Open the food's detail page from its diary entry, then favourite it.
		await page.locator('a.food-card-link').filter({ hasText: name }).first().click();
		await expect(page).toHaveURL(/\/fitness\/nutrition\/food\//);
		const fav = page.locator('button.fav-btn');
		await expect(fav).toBeVisible();
		if (await fav.evaluate((el) => el.classList.contains('active'))) {
			await fav.click();
			await expect(fav).not.toHaveClass(/active/);
		}
		await fav.click();
		await expect(fav).toHaveClass(/active/);

		// Persisted across a reload.
		await page.reload();
		await page.waitForTimeout(600);
		await expect(page.locator('button.fav-btn')).toHaveClass(/active/);
		await page.locator('button.fav-btn').click(); // unfavourite
		await expect(page.locator('button.fav-btn')).not.toHaveClass(/active/);

		// Clean up the log entry.
		await gotoHydrated(page, '/fitness/nutrition');
		const card = page.locator('.food-card').filter({ hasText: name }).first();
		await card.locator('button[aria-label="Delete"]').click();
		await page.locator('button.confirm-btn.confirm').click();
	});
}
