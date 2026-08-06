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

test('body-change tiles round-trip a reference period and body-fat unit', async ({ page }) => {
	await gotoHydrated(page, '/fitness/stats');

	// One tile per body chart (weight left, body fat right), each opening the
	// settings for its own metric.
	const tiles = page.getByRole('button', { name: /Change the reference period/i });
	await expect(tiles.first()).toBeVisible();
	await expect(tiles.first()).toContainText(/Last 7 days/i);

	// The weight card is titled for its own metric, and carries no unit choice —
	// kilos-or-percentage-points is a body-fat question.
	await tiles.first().click();
	await expect(page.getByRole('heading', { name: /Weight change/i })).toBeVisible();
	await expect(page.getByRole('button', { name: /% points/i })).toBeHidden();
	await page.getByRole('button', { name: /^Cancel$/i }).click();

	// The body-fat card has it.
	await tiles.last().click();
	await expect(page.getByRole('heading', { name: /Body-fat change/i })).toBeVisible();
	await page.getByRole('button', { name: /% points/i }).click();
	await page.getByRole('button', { name: /^Save$/i }).click();

	// The choice is persisted server-side, so it survives a reload.
	await gotoHydrated(page, '/fitness/stats');
	await expect(page.getByRole('button', { name: /Change the reference period/i }).last()).toContainText('pp');

	// Put it back so the spec is idempotent.
	await page.getByRole('button', { name: /Change the reference period/i }).last().click();
	await page.getByRole('button', { name: /kg of fat/i }).click();
	await page.getByRole('button', { name: /^Save$/i }).click();
	await expect(page.getByRole('heading', { name: /Body-fat change/i })).toBeHidden();
});

test('macro split card opens the nutrient averages page', async ({ page }) => {
	await gotoHydrated(page, '/fitness/stats');

	// The whole macro-split card is the link into the averages breakdown.
	await page.getByRole('link', { name: 'Nutrient Averages' }).click();
	await expect(page).toHaveURL(/\/fitness\/stats\/nutrients$/);
	await expect(page.getByRole('heading', { name: 'Nutrient Averages' })).toBeVisible();
});

test('nutrient averages switches between the 7- and 30-day range', async ({ page }) => {
	await gotoHydrated(page, '/fitness/stats/nutrients');
	await expect(page.getByText(/7-day average/i)).toBeVisible();

	await page.getByRole('link', { name: '30', exact: true }).click();
	await expect(page).toHaveURL(/days=30/);
	await expect(page.getByText(/30-day average/i)).toBeVisible();
});
