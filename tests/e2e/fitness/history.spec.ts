import { test, expect, type Page } from '@playwright/test';
import { storageStateFor } from '../helpers/auth';
import { gotoHydrated } from '../helpers/nav';

test.use({ storageState: storageStateFor('fitness') });

const cards = (page: Page) => page.locator('a[href*="/fitness/history/"]');

test('history lists past sessions', async ({ page }) => {
	await gotoHydrated(page, '/fitness/history');
	await expect(page.getByRole('heading', { name: 'History', exact: true })).toBeVisible();
	await expect(cards(page).first()).toBeVisible();
	expect(await cards(page).count()).toBeGreaterThan(3);
});

test('filter panel narrows the session list by search', async ({ page }) => {
	await gotoHydrated(page, '/fitness/history');
	const before = await cards(page).count();

	await page.getByRole('button', { name: /^Filters$/i }).click();
	await page.getByPlaceholder(/Search workouts/i).fill('Pull');
	await expect.poll(() => cards(page).count()).toBeLessThan(before);
});
