import { test, expect } from '@playwright/test';
import { storageStateFor } from '../helpers/auth';
import { gotoHydrated } from '../helpers/nav';
import { createLoggedSession, deleteSession } from '../helpers/fitness';

// Editing a saved workout. Runs as the `full` user (fitness is login-only, so
// full has access) — a different account from workout.spec's `fitness` user, so
// their active-workout state never collides when the specs run in parallel.

test.use({ storageState: storageStateFor('full') });

test('edit a saved workout and confirm the changes persist', async ({ page }) => {
	const sessionUrl = await createLoggedSession(page); // logged Bench Press @ 60kg × 10

	// Enter edit mode: rename the session and change the set weight 60 → 65.
	await page.locator('button[aria-label="Edit session"]').click();
	const newName = `Edited Workout ${Date.now()}`;
	await page.locator('input[type="text"]').first().fill(newName);
	await page.locator('input[placeholder="0"]').nth(0).fill('65');
	await page.getByRole('button', { name: /^SAVE$/i }).click();

	// Out of edit mode, the new name is shown.
	await expect(page.getByText(newName).first()).toBeVisible();

	// Persisted: re-navigating re-fetches from the server, and re-opening the
	// editor shows the saved weight.
	await gotoHydrated(page, sessionUrl);
	await expect(page.getByText(newName).first()).toBeVisible();
	await page.locator('button[aria-label="Edit session"]').click();
	await expect(page.locator('input[placeholder="0"]').nth(0)).toHaveValue('65');
	await page.getByRole('button', { name: /^CANCEL$/i }).click();

	// Clean up.
	await deleteSession(page, sessionUrl);
});
