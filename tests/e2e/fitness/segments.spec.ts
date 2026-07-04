import { test, expect } from '@playwright/test';
import { storageStateFor } from '../helpers/auth';
import { gotoHydrated } from '../helpers/nav';

// e2e_fitness owns the cloned segments + efforts, so list, "Mine", and the
// leaderboard all have data.

test.use({ storageState: storageStateFor('fitness') });

test('segment list opens a detail with a leaderboard and effort times', async ({ page }) => {
	await gotoHydrated(page, '/fitness/segments');
	await expect(page.getByRole('heading', { name: 'Segments', exact: true })).toBeVisible();

	const seg = page.locator('a[href*="/fitness/segments/"]').first();
	await expect(seg).toBeVisible();
	await seg.click();

	await expect(page).toHaveURL(/\/fitness\/segments\/[a-f0-9]+/);
	await expect(page.getByRole('heading', { name: /Leaderboard/i })).toBeVisible();
	// Effort times are mm:ss.
	await expect(page.getByText(/\d+:\d\d/).first()).toBeVisible();
});

test('"Mine" scope shows the user\'s own segments', async ({ page }) => {
	await gotoHydrated(page, '/fitness/segments');
	await page.getByRole('button', { name: /^Mine$/i }).click();
	await expect(page.locator('a[href*="/fitness/segments/"]').first()).toBeVisible();
});
