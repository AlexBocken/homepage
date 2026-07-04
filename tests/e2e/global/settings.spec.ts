import { test, expect } from '@playwright/test';
import { storageStateFor } from '../helpers/auth';
import { gotoHydrated } from '../helpers/nav';

// Self-service settings write: change the display name and confirm it persists
// through the Authentik admin proxy (the settings page reads the name back from
// Authentik on load). Runs as e2e_full and reverts so the account is unchanged.

test.use({ storageState: storageStateFor('full') });

test('change the display name and confirm it persists', async ({ page }) => {
	await gotoHydrated(page, '/einstellungen');
	await expect(page.getByRole('heading', { name: 'Einstellungen' })).toBeVisible();

	const name = page.locator('input.name-input');
	const original = await name.inputValue();
	const newName = `E2E Name ${Date.now()}`;

	await name.fill(newName);
	await page.getByRole('button', { name: /^(Save|Speichern)$/i }).click();
	await expect(page.getByText(/Saved|Gespeichert/i)).toBeVisible();

	// Persisted: a reload re-fetches the name from Authentik.
	await gotoHydrated(page, '/einstellungen');
	await expect(page.locator('input.name-input')).toHaveValue(newName);

	// Revert to the original name.
	await page.locator('input.name-input').fill(original);
	await page.getByRole('button', { name: /^(Save|Speichern)$/i }).click();
	await expect(page.getByText(/Saved|Gespeichert/i)).toBeVisible();
	await gotoHydrated(page, '/einstellungen');
	await expect(page.locator('input.name-input')).toHaveValue(original);
});
