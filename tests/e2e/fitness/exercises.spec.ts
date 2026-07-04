import { test, expect } from '@playwright/test';
import { storageStateFor } from '../helpers/auth';
import { gotoHydrated } from '../helpers/nav';

// Fitness requires login (no group). Exercise catalog is a bundled data module,
// so it's populated regardless of DB state.

test.use({ storageState: storageStateFor('fitness') });

test('exercises browser filters and opens a detail', async ({ page }) => {
	await gotoHydrated(page, '/fitness/exercises');
	const rows = page.locator('a[href^="/fitness/exercises/"]');
	await expect(rows.first()).toBeVisible();
	const before = await rows.count();

	await page.getByPlaceholder(/Search exercises|Übung/i).fill('press');
	await expect.poll(() => rows.count()).toBeLessThan(before);

	await rows.first().click();
	await expect(page).toHaveURL(/\/fitness\/exercises\/[^/]+$/);
	await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});
