import { expect, type Page } from '@playwright/test';
import { gotoHydrated } from './nav';

/** Cancel any in-progress workout (an unfinished one makes /fitness/workout
 *  redirect straight to /active), so callers start from a clean slate. */
export async function cancelIfActive(page: Page): Promise<void> {
	if (!page.url().includes('/active')) return;
	await page.getByRole('button', { name: /CANCEL WORKOUT/i }).click();
	await page.locator('button.confirm-btn.confirm').click({ timeout: 2000 }).catch(() => {});
	await page.waitForURL(/\/fitness\/workout$/, { timeout: 10_000 }).catch(() => {});
}

/** Start a blank workout and land on the active-workout page. */
export async function startEmptyWorkout(page: Page): Promise<void> {
	await gotoHydrated(page, '/fitness/workout');
	await cancelIfActive(page);
	if (!page.url().endsWith('/workout')) await gotoHydrated(page, '/fitness/workout');
	// With no templates the Template Library modal auto-opens over the page.
	const close = page.locator('button.close-btn[aria-label="Close"]');
	if (await close.isVisible().catch(() => false)) await close.click();
	await page.getByRole('button', { name: /Empty Workout/i }).click();
	await expect(page).toHaveURL(/\/fitness\/workout\/active/, { timeout: 15_000 });
}

/**
 * Create a completed workout session with one exercise + one logged set, and
 * navigate to its saved detail page. Returns the session detail URL.
 */
export async function createLoggedSession(
	page: Page,
	opts: { exercise?: string; weight?: string; reps?: string } = {}
): Promise<string> {
	const { exercise = 'bench press', weight = '60', reps = '10' } = opts;
	await startEmptyWorkout(page);

	await page.getByRole('button', { name: /ADD EXERCISE/i }).first().click();
	await page.getByPlaceholder(/Search exercises/i).fill(exercise);
	await page.locator('.exercise-item').first().click();

	await page.locator('input[placeholder="0"]').nth(0).fill(weight);
	await page.locator('input[placeholder="0"]').nth(1).fill(reps);
	await page.locator('button[aria-label="Mark set complete"]').first().click();

	await page.getByRole('button', { name: /^FINISH$/i }).click();
	await expect(page.getByRole('heading', { name: 'Workout Complete' })).toBeVisible();

	await page.getByRole('button', { name: /VIEW WORKOUT/i }).click();
	await expect(page).toHaveURL(/\/fitness\/history\/[a-f0-9]+/);
	return page.url();
}

/** Delete the session currently open at its detail page. */
export async function deleteSession(page: Page, sessionUrl: string): Promise<void> {
	await gotoHydrated(page, sessionUrl);
	await page.getByRole('button', { name: /Delete session/i }).click();
	await page.locator('button.confirm-btn.confirm').click();
	await expect(page).toHaveURL(/\/fitness\/history(\/|$|\?)/);
}
