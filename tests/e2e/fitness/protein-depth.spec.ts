import { test, expect } from '@playwright/test';
import { storageStateFor } from '../helpers/auth';
import { gotoHydrated } from '../helpers/nav';

/**
 * The protein-per-kg detail view behind the stats dashboard's protein card.
 *
 * The page needs both a food log and at least one weigh-in to divide by, and the
 * cloned e2e_fitness data may carry neither, so the chart assertions accept the
 * documented empty states too. What holds regardless of data: the card links
 * through, and the page it reaches is the right one in both languages.
 */

test.use({ storageState: storageStateFor('fitness') });

test('the protein card opens the protein-per-kg detail view', async ({ page }) => {
	await gotoHydrated(page, '/fitness/stats');

	await page.getByRole('link', { name: 'Protein per kg' }).click();
	await expect(page).toHaveURL(/\/fitness\/stats\/protein$/);
	await expect(page.getByRole('heading', { name: 'Protein per kg', level: 1 })).toBeVisible();

	// Either the breakdown rendered, or the page said why it could not.
	const daily = page.getByRole('heading', { name: 'Protein per kg, by day' });
	const empty = page.locator('.empty');
	await expect(daily.or(empty).first()).toBeVisible();

	if (await daily.count()) {
		// Two stacked charts: the ratio, and the inputs it is made of (protein bars
		// with the weight line on its own right-hand axis).
		await expect(page.locator('canvas')).toHaveCount(2);
		// The charts open on their default window, so reset does nothing yet.
		await expect(page.getByRole('button', { name: /Reset zoom/i })).toBeDisabled();
	}
});

test('the German slug reaches the same view', async ({ page }) => {
	await gotoHydrated(page, '/fitness/statistik/protein');
	await expect(page.getByRole('heading', { name: 'Protein pro kg', level: 1 })).toBeVisible();
});
