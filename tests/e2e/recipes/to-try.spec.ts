import { test, expect } from '@playwright/test';
import { storageStateFor } from '../helpers/auth';
import { gotoHydrated, acceptConfirm } from '../helpers/nav';

// To-try list requires login. Round-trip a create → delete so the test cleans
// up after itself and doesn't depend on (or pollute) the cloned to-try data.

test.use({ storageState: storageStateFor('recipes') });

test('add then delete a to-try entry', async ({ page }) => {
	await gotoHydrated(page, '/rezepte/to-try');
	const name = `E2E To-Try ${Date.now()}`;

	await page.locator('button.add-btn').click();
	await page.locator('input#totry-name').fill(name);
	await page.locator('input[type="url"]').first().fill('https://example.com/e2e-recipe');
	await page.locator('button.btn-save').click();

	// The new card is prepended (ToTryCard renders as .card).
	const card = page.locator('.card').filter({ hasText: name });
	await expect(card).toBeVisible();

	await card.hover();
	await card.locator('button.delete-btn').click();
	await acceptConfirm(page);
	await expect(page.getByText(name)).toHaveCount(0);
});
