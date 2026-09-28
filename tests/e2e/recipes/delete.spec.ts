import { test, expect } from '@playwright/test';
import { storageStateFor } from '../helpers/auth';
import { gotoHydrated } from '../helpers/nav';

// Deleting a recipe from the bottom of its edit page. Each test owns its
// fixtures (seed.mjs), which the seed puts back on the next run. Cancelling
// runs first, on the recipe the next test then deletes.

test.use({ storageState: storageStateFor('recipes') });

const deleteButton = (page: import('@playwright/test').Page) =>
	page.getByRole('region', { name: 'Rezept löschen' }).getByRole('button', { name: 'Löschen' });

test('cancelling keeps the recipe', async ({ page }) => {
	await gotoHydrated(page, '/rezepte/edit/e2e_loeschkuchen');
	await deleteButton(page).click();
	await page.locator('button.confirm-btn.cancel').click();

	await expect(page).toHaveURL(/\/rezepte\/edit\/e2e_loeschkuchen$/);
	const still = await page.request.get('/rezepte/e2e_loeschkuchen');
	expect(still.status()).toBe(200);
});

test('a recipe is deleted after confirming, and is gone', async ({ page }) => {
	await gotoHydrated(page, '/rezepte/edit/e2e_loeschkuchen');

	await deleteButton(page).click();
	await expect(page.locator('.confirm-dialog, [role="dialog"]').first()).toContainText('E2E Loeschkuchen');
	await page.locator('button.confirm-btn.confirm').click();

	await expect(page).toHaveURL(/\/rezepte$/);
	const gone = await page.goto('/rezepte/e2e_loeschkuchen');
	expect(gone?.status()).toBe(404);
});

test('deleting a base recipe names its users and copies its content into them', async ({ page }) => {
	await gotoHydrated(page, '/rezepte/edit/e2e_loeschbasis');
	await expect(page.getByRole('region', { name: 'Rezept löschen' })).toContainText('Basisrezept für ein anderes Rezept');

	await deleteButton(page).click();
	await expect(page.locator('.confirm-dialog, [role="dialog"]').first()).toContainText('E2E Loeschnutzer');
	await page.locator('button.confirm-btn.confirm').click();
	await expect(page).toHaveURL(/\/rezepte$/);

	// The base's own ingredient now lives in the recipe that referenced it.
	await gotoHydrated(page, '/rezepte/e2e_loeschnutzer');
	await expect(page.getByText('Loeschhefe').first()).toBeVisible();
});
