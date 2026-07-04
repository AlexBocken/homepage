import { test, expect } from '@playwright/test';
import { storageStateFor } from '../helpers/auth';
import { gotoHydrated } from '../helpers/nav';
import { startEmptyWorkout, deleteSession } from '../helpers/fitness';

test.use({ storageState: storageStateFor('fitness') });

// The one fitness UI workout flow (other UI workout specs use different users to
// avoid colliding on e2e_fitness's active-workout state). Logs a PR set so it
// also covers the completion summary's Personal Records section.
test('log a full workout: start → log a PR set → finish → PR summary → history', async ({ page }) => {
	await startEmptyWorkout(page);

	// Squat has prior history (best 120 kg); 500 kg is a guaranteed PR.
	await page.getByRole('button', { name: /ADD EXERCISE/i }).first().click();
	await page.getByPlaceholder(/Search exercises/i).fill('Squat (Barbell)');
	await page.locator('.exercise-item').first().click();
	await page.locator('input[placeholder="0"]').nth(0).fill('500');
	await page.locator('input[placeholder="0"]').nth(1).fill('5');
	await page.locator('button[aria-label="Mark set complete"]').first().click();

	await page.getByRole('button', { name: /^FINISH$/i }).click();
	await expect(page.getByRole('heading', { name: 'Workout Complete' })).toBeVisible();

	// The completion summary shows the computed PRs with their values.
	await expect(page.getByRole('heading', { name: /Personal Records/i })).toBeVisible();
	await expect(page.getByText(/Max Weight:\s*500\s*kg/i)).toBeVisible();
	await expect(page.getByText(/Est\.?\s*1RM:\s*583\s*kg/i)).toBeVisible(); // Epley round(500*(1+5/30))
	await expect(page.getByText(/Best Set Volume:\s*2500\s*kg/i)).toBeVisible();

	// The saved session is reachable in history and shows the exercise.
	await page.getByRole('button', { name: /VIEW WORKOUT/i }).click();
	await expect(page).toHaveURL(/\/fitness\/history\/[a-f0-9]+/);
	await expect(page.getByText(/Squat/i).first()).toBeVisible();
	const sessionUrl = page.url();
	const sessionId = sessionUrl.split('/').pop()!;

	await gotoHydrated(page, '/fitness/history');
	await expect(page.locator(`a[href*="${sessionId}"]`).first()).toBeVisible();

	// Clean up so the test is idempotent.
	await deleteSession(page, sessionUrl);
	await expect(page.locator(`a[href*="${sessionId}"]`)).toHaveCount(0);
});
