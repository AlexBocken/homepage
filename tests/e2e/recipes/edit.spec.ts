import { test, expect } from '@playwright/test';
import { storageStateFor } from '../helpers/auth';
import { gotoHydrated } from '../helpers/nav';

// Recipe edit input + persistence (requires login + rezepte_users). Edits several
// fields of the seeded schokokuchen and confirms each change shows on the recipe
// page, then reverts so the fixture is unchanged for other specs / re-runs.

test.use({ storageState: storageStateFor('recipes') });

test('edit recipe fields and confirm each change persists', async ({ page }) => {
	await gotoHydrated(page, '/rezepte/edit/schokokuchen');

	const nameField = page.locator('input[aria-label="Rezeptname"]');
	const descField = page.locator('[aria-label="Kurzbeschreibung"]');
	const origName = await nameField.inputValue();
	const origDesc = (await descField.innerText()).trim();

	const newName = `Schokokuchen ${Date.now()}`;
	const newDesc = 'E2E geänderte Beschreibung.';
	await nameField.fill(newName);
	await descField.fill(newDesc);
	await page.locator('button[aria-label="Rezept speichern"]').click();

	// Both edits show on the recipe page (persisted), and survive a fresh load.
	await page.waitForURL(/\/rezepte\/schokokuchen$/, { timeout: 20_000 });
	await expect(page.getByRole('heading', { name: newName })).toBeVisible();
	await expect(page.getByText(newDesc)).toBeVisible();
	await gotoHydrated(page, '/rezepte/schokokuchen');
	await expect(page.getByRole('heading', { name: newName })).toBeVisible();

	// Revert to the original fixture values.
	await gotoHydrated(page, '/rezepte/edit/schokokuchen');
	await page.locator('input[aria-label="Rezeptname"]').fill(origName);
	await page.locator('[aria-label="Kurzbeschreibung"]').fill(origDesc);
	await page.locator('button[aria-label="Rezept speichern"]').click();
	await page.waitForURL(/\/rezepte\/schokokuchen$/, { timeout: 20_000 });
	await expect(page.getByRole('heading', { name: origName })).toBeVisible();
});
