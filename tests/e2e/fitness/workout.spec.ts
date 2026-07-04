import { test, expect } from '@playwright/test';
import { storageStateFor } from '../helpers/auth';
import { gotoHydrated } from '../helpers/nav';
import { createLoggedSession, deleteSession } from '../helpers/fitness';

test.use({ storageState: storageStateFor('fitness') });

test('log a full workout: start → add exercise → log a set → finish → history', async ({ page }) => {
	const sessionUrl = await createLoggedSession(page);
	await expect(page.getByText(/Bench Press/i).first()).toBeVisible();
	const sessionId = sessionUrl.split('/').pop()!;

	// It appears in the history list too.
	await gotoHydrated(page, '/fitness/history');
	await expect(page.locator(`a[href*="${sessionId}"]`).first()).toBeVisible();

	// Clean up so the test is idempotent.
	await deleteSession(page, sessionUrl);
	await expect(page.locator(`a[href*="${sessionId}"]`)).toHaveCount(0);
});
