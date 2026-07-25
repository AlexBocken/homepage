import { test, expect } from '@playwright/test';
import { storageStateFor } from '../helpers/auth';
import { gotoHydrated } from '../helpers/nav';

/**
 * Body-trend detail view. The charts live in a canvas, so what is asserted here is
 * the part the DOM can speak for: the view opens on its default window rather than
 * the whole history, and the reset control reflects that.
 */

test.use({ storageState: storageStateFor('fitness') });

test('body trends open on the last 30 days with nothing to reset', async ({ page }) => {
	await gotoHydrated(page, '/fitness/stats/body');
	await expect(page.getByRole('heading', { name: /Body trends/i })).toBeVisible();

	await expect(page.getByText(/last 30 days/i)).toBeVisible();
	await expect(page.getByRole('button', { name: /Reset zoom/i })).toBeDisabled();
	await expect(page.locator('canvas').first()).toBeVisible();
});
