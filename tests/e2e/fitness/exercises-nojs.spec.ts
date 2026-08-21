import { test, expect } from '@playwright/test';
import { storageStateFor } from '../helpers/auth';
import { gotoHydrated } from '../helpers/nav';

// The exercise search as a document rather than as an app: the query is a form, every
// filter is a link, and the muscle figure is a set of links drawn on a body.

test.use({ storageState: storageStateFor('fitness') });

const rows = (page: import('@playwright/test').Page) => page.locator('.exercise-list .exercise-row');

test('filters live in the URL, so a search survives a reload', async ({ page }) => {
	await gotoHydrated(page, '/fitness/exercises');

	await page.getByRole('tab', { name: /Cardio/i }).click();
	await expect(page).toHaveURL(/type=cardio/);

	const filtered = await rows(page).count();
	await page.reload();
	await expect.poll(() => rows(page).count()).toBe(filtered);
	await expect(page.getByRole('tab', { name: /Cardio/i })).toHaveAttribute('aria-selected', 'true');
});

test.describe('without JavaScript', () => {
	test.use({ javaScriptEnabled: false });

	test('the search box is a form that filters server-side', async ({ page }) => {
		await page.goto('/fitness/exercises');
		const all = await rows(page).count();
		expect(all).toBeGreaterThan(0);

		await page.locator('form.search-bar input[name="q"]').fill('press');
		await page.locator('form.search-bar button[type="submit"]').click();

		await expect(page).toHaveURL(/q=press/);
		const found = await rows(page).count();
		expect(found).toBeGreaterThan(0);
		expect(found).toBeLessThan(all);
	});

	test('an equipment filter is a link the server honours', async ({ page }) => {
		await page.goto('/fitness/exercises');
		const all = await rows(page).count();

		await page.locator('.equipment-chip').first().click();

		await expect(page).toHaveURL(/[?&]eq=/);
		await expect.poll(() => rows(page).count()).toBeLessThan(all);
		// The pressed state is rendered by the server, not by a click handler.
		await expect(page.locator('.equipment-chip[aria-current="true"]')).toHaveCount(1);
	});

	test('a muscle on the figure filters the list', async ({ page }) => {
		await page.goto('/fitness/exercises');
		const all = await rows(page).count();

		// Every region of the body is an SVG link to the same search filtered by it.
		const chest = page.locator('.svg-wrap a[aria-label]').first();
		await expect(chest).toBeVisible();
		await chest.click();

		await expect(page).toHaveURL(/[?&]muscle=/);
		await expect.poll(() => rows(page).count()).toBeLessThan(all);
	});

	test('the filters carry each other rather than starting over', async ({ page }) => {
		await page.goto('/fitness/exercises?type=stretch');
		await page.locator('.muscle-chip').first().click();

		await expect(page).toHaveURL(/type=stretch/);
		await expect(page).toHaveURL(/[?&]muscle=/);
	});
});
