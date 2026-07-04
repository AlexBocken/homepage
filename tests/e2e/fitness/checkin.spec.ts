import { test, expect } from '@playwright/test';
import { storageStateFor } from '../helpers/auth';
import { gotoHydrated } from '../helpers/nav';

test.use({ storageState: storageStateFor('fitness') });

test('log a weight measurement', async ({ page }) => {
	await gotoHydrated(page, '/fitness/check-in');
	const weight = page.locator('input#m-weight');
	await expect(weight).toBeVisible();

	const value = (70 + Math.floor(Math.random() * 20) + 0.5).toString();
	await weight.fill(value);

	// SaveFab renders the label as its aria-label (ActionButton).
	await page.getByRole('button', { name: /Save Measurement/i }).click();

	// The logged value surfaces in the history list.
	await expect(page.getByText(value, { exact: false }).first()).toBeVisible();
});
