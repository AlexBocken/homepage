import { test, expect, type Page } from '@playwright/test';
import { storageStateFor } from '../helpers/auth';
import { gotoHydrated, acceptConfirm } from '../helpers/nav';

test.use({ storageState: storageStateFor('fitness') });

// Cancel any in-progress workout so the test is idempotent (an unfinished
// workout makes /fitness/workout redirect straight to /active).
async function cancelIfActive(page: Page) {
	if (!page.url().includes('/active')) return;
	await page.getByRole('button', { name: /CANCEL WORKOUT/i }).click();
	await page.locator('button.confirm-btn.confirm').click({ timeout: 2000 }).catch(() => {});
	await page.waitForURL(/\/fitness\/workout$/, { timeout: 10_000 }).catch(() => {});
}

async function startEmptyWorkout(page: Page) {
	await gotoHydrated(page, '/fitness/workout');
	await cancelIfActive(page);
	if (!page.url().endsWith('/workout')) await gotoHydrated(page, '/fitness/workout');
	// With no templates the Template Library modal auto-opens over the page.
	const close = page.locator('button.close-btn[aria-label="Close"]');
	if (await close.isVisible().catch(() => false)) await close.click();
	await page.getByRole('button', { name: /Empty Workout/i }).click();
	await expect(page).toHaveURL(/\/fitness\/workout\/active/, { timeout: 15_000 });
}

test('log a full workout: start → add exercise → log a set → finish → history', async ({ page }) => {
	await startEmptyWorkout(page);

	// Add an exercise from the picker.
	await page.getByRole('button', { name: /ADD EXERCISE/i }).first().click();
	await page.getByPlaceholder(/Search exercises/i).fill('bench press');
	await page.locator('.exercise-item').first().click();

	// Log one set: weight + reps (both placeholder "0"), then mark it complete.
	await page.locator('input[placeholder="0"]').nth(0).fill('60');
	await page.locator('input[placeholder="0"]').nth(1).fill('10');
	await page.locator('button[aria-label="Mark set complete"]').first().click();

	// Finish → completion summary.
	await page.getByRole('button', { name: /^FINISH$/i }).click();
	await expect(page.getByRole('heading', { name: 'Workout Complete' })).toBeVisible();

	// View the saved session (a /fitness/history/<id> route → it's in history).
	await page.getByRole('button', { name: /VIEW WORKOUT/i }).click();
	await expect(page).toHaveURL(/\/fitness\/history\/[a-f0-9]+/);
	await expect(page.getByText(/Bench Press/i).first()).toBeVisible();
	const sessionUrl = page.url();
	const sessionId = sessionUrl.split('/').pop()!;

	// It appears in the history list too.
	await gotoHydrated(page, '/fitness/history');
	await expect(page.locator(`a[href*="${sessionId}"]`).first()).toBeVisible();

	// Clean up: delete the session so the test is idempotent.
	await gotoHydrated(page, sessionUrl);
	await page.getByRole('button', { name: /Delete session/i }).click();
	await acceptConfirm(page);
	await expect(page).toHaveURL(/\/fitness\/history(\/|$|\?)/);
	await expect(page.locator(`a[href*="${sessionId}"]`)).toHaveCount(0);
});
