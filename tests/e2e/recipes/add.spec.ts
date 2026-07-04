import { test, expect } from '@playwright/test';
import { storageStateFor } from '../helpers/auth';
import { gotoHydrated } from '../helpers/nav';

// Add recipe requires login + rezepte_users. Full submission (image upload +
// many fields + translation) is out of scope here; assert the editor renders
// with its key fields for a permitted user.

test.use({ storageState: storageStateFor('recipes') });

test('add-recipe editor renders its core fields', async ({ page }) => {
	await gotoHydrated(page, '/rezepte/add');
	await expect(page.locator('input[aria-label="Rezeptname"]')).toBeVisible();
	await expect(page.locator('input[aria-label="Kategorie"]')).toBeVisible();
	await expect(page.locator('input[name="short_name"]')).toBeVisible();
});
