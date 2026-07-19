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

test('macro split card opens the nutrient averages page', async ({ page }) => {
	await gotoHydrated(page, '/fitness/stats');

	// The whole macro-split card is the link into the averages breakdown.
	await page.getByRole('link', { name: 'Nutrient Averages' }).click();
	await expect(page).toHaveURL(/\/fitness\/stats\/nutrition$/);
	await expect(page.getByRole('heading', { name: 'Nutrient Averages' })).toBeVisible();
});

test('nutrient averages switches between the 7- and 30-day range', async ({ page }) => {
	await gotoHydrated(page, '/fitness/stats/nutrition');
	await expect(page.getByText(/7-day average/i)).toBeVisible();

	await page.getByRole('link', { name: '30', exact: true }).click();
	await expect(page).toHaveURL(/days=30/);
	await expect(page.getByText(/30-day average/i)).toBeVisible();
});
