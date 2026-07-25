import { test, expect } from '@playwright/test';
import { storageStateFor } from '../helpers/auth';
import { gotoHydrated } from '../helpers/nav';

/**
 * The calorie-balance and adherence detail views behind the stats dashboard cards.
 *
 * Both pages need a calorie goal and enough profile data to estimate expenditure, and
 * the cloned e2e_fitness data may or may not carry either, so the assertions accept
 * the documented empty state as well as a rendered grid. What is asserted
 * unconditionally is the part that must hold regardless of data: the cards link
 * through, and the page they reach is the right one.
 */

test.use({ storageState: storageStateFor('fitness') });

test('the balance card opens the calorie-balance detail view', async ({ page }) => {
	await gotoHydrated(page, '/fitness/stats');

	await page.getByRole('link', { name: 'Calorie Balance' }).click();
	await expect(page).toHaveURL(/\/fitness\/stats\/deficit$/);
	await expect(page.getByRole('heading', { name: 'Calorie Balance' })).toBeVisible();

	// Either the breakdown rendered, or the page said why it could not.
	const grid = page.locator('.grid');
	const empty = page.locator('.empty');
	await expect(grid.or(empty).first()).toBeVisible();

	// With a breakdown, the bar chart opens zoomed to its default window: the reset
	// control is present and does nothing until a gesture moves it.
	if (await grid.count()) {
		await expect(page.locator('canvas')).toBeVisible();
		await expect(page.getByRole('button', { name: /Reset zoom/i })).toBeDisabled();
	}
});

test('the adherence card opens the adherence detail view', async ({ page }) => {
	await gotoHydrated(page, '/fitness/stats');

	await page.getByRole('link', { name: 'Adherence' }).click();
	await expect(page).toHaveURL(/\/fitness\/stats\/adherence$/);
	await expect(page.getByRole('heading', { name: 'Adherence' })).toBeVisible();

	await expect(page.locator('.grid').or(page.locator('.empty')).first()).toBeVisible();
});

test('the German slugs reach the same two views', async ({ page }) => {
	await gotoHydrated(page, '/fitness/statistik/deficit');
	await expect(page.getByRole('heading', { name: 'Kalorienbilanz' })).toBeVisible();

	await gotoHydrated(page, '/fitness/statistik/adherence');
	await expect(page.getByRole('heading', { name: 'Einhaltung' })).toBeVisible();
});
