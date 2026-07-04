import { test, expect } from '@playwright/test';
import { storageStateFor } from '../helpers/auth';
import { gotoHydrated } from '../helpers/nav';

// Check-in input + persistence: edit the profile and delete a measurement,
// all through the UI. Serial since they share e2e_fitness's check-in data.

test.use({ storageState: storageStateFor('fitness') });
test.describe.configure({ mode: 'serial' });

test('edit the profile height and confirm it persists', async ({ page }) => {
	await gotoHydrated(page, '/fitness/check-in');
	await page.getByRole('button', { name: /Edit profile/i }).first().click();
	const height = page.getByPlaceholder('175'); // height (cm)
	const original = (await height.inputValue()) || '183';

	await height.fill('181');
	await page.getByRole('button', { name: /^Save$/i }).click();
	await page.waitForTimeout(500);

	// Persisted: reload, reopen the profile, height is the new value.
	await gotoHydrated(page, '/fitness/check-in');
	await page.getByRole('button', { name: /Edit profile/i }).first().click();
	await expect(page.getByPlaceholder('175')).toHaveValue('181');

	// Revert so the fixture (and derived kcal) is unchanged for re-runs.
	await page.getByPlaceholder('175').fill(original);
	await page.getByRole('button', { name: /^Save$/i }).click();
});

test('log a measurement then delete it from the history', async ({ page }) => {
	await gotoHydrated(page, '/fitness/check-in');
	await page.locator('input#m-weight').fill('77.7');
	await page.getByRole('button', { name: /Save Measurement/i }).click();
	await page.waitForTimeout(600);
	// If today already had a measurement, confirm the overwrite.
	const overwrite = page.locator('button.confirm-btn.confirm');
	if (await overwrite.count()) await overwrite.first().click();
	await page.waitForTimeout(500);

	// Open the history and delete the most recent (today's) measurement.
	await page.getByRole('button', { name: 'Past measurements' }).click({ force: true });
	await page.waitForTimeout(500);
	const del = page.locator('button[aria-label="Delete measurement"]');
	const before = await del.count();
	await del.first().click();
	await page.locator('button.confirm-btn.confirm').click();
	await expect.poll(() => del.count()).toBe(before - 1);
});
