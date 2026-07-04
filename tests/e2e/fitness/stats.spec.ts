import { test, expect } from '@playwright/test';
import { storageStateFor } from '../helpers/auth';
import { gotoHydrated } from '../helpers/nav';

// Stats dashboard for e2e_fitness (cloned realistic workouts/measurements/runs).

test.use({ storageState: storageStateFor('fitness') });

test('dashboard renders summary cards, charts and best efforts', async ({ page }) => {
	await gotoHydrated(page, '/fitness/stats');
	await expect(page.getByRole('heading', { name: 'Stats', exact: true })).toBeVisible();

	// Weight / body-fat / nutrition charts.
	expect(await page.locator('canvas').count()).toBeGreaterThan(0);

	// A running best effort (e.g. fastest 5k) surfaces on the dashboard.
	await expect(page.getByText(/Fastest|5k|1st\b/i).first()).toBeVisible();
});

test('customize dashboard enters and leaves edit mode', async ({ page }) => {
	await gotoHydrated(page, '/fitness/stats');
	await page.getByRole('button', { name: /Customize dashboard/i }).click();
	// Edit mode exposes Save + Cancel.
	await expect(page.getByRole('button', { name: /^Cancel$/i })).toBeVisible();
	await page.getByRole('button', { name: /^Cancel$/i }).click();
	await expect(page.getByRole('button', { name: /Customize dashboard/i })).toBeVisible();
});
