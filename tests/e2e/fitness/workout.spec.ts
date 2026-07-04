import { test, expect } from '@playwright/test';
import { storageStateFor } from '../helpers/auth';
import { gotoHydrated } from '../helpers/nav';

test.use({ storageState: storageStateFor('fitness') });

// Cancel any in-progress workout so the test is idempotent (an unfinished
// workout makes /fitness/workout redirect straight to /active).
async function cancelIfActive(page: import('@playwright/test').Page) {
	if (!page.url().includes('/active')) return;
	await page.getByRole('button', { name: /CANCEL WORKOUT/i }).click();
	await page.locator('button.confirm-btn.confirm').click({ timeout: 2000 }).catch(() => {});
	await page.waitForURL(/\/fitness\/workout$/, { timeout: 10_000 }).catch(() => {});
}

test('start an empty workout', async ({ page }) => {
	await gotoHydrated(page, '/fitness/workout');
	await cancelIfActive(page);
	if (!page.url().endsWith('/workout')) await gotoHydrated(page, '/fitness/workout');

	// With no templates the Template Library modal auto-opens over the page.
	const close = page.locator('button.close-btn[aria-label="Close"]');
	if (await close.isVisible().catch(() => false)) await close.click();

	await page.getByRole('button', { name: /Empty Workout/i }).click();
	await expect(page).toHaveURL(/\/fitness\/workout\/active/, { timeout: 15_000 });

	await cancelIfActive(page); // clean up
});
