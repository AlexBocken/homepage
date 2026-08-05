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

// The German alt text had no field on the edit page, and saving any recipe blanked
// whatever the generator had written (the form never sent images_json, so the action
// fell back to ''). Covers both: the field round-trips, and an unrelated edit leaves
// it alone.
test('image alt text is editable and survives an unrelated save', async ({ page }) => {
	await gotoHydrated(page, '/rezepte/edit/schokokuchen');

	const altField = page.locator('input[aria-label="Bildbeschreibung"]');
	const origAlt = await altField.inputValue();

	const newAlt = `E2E Alt-Text ${Date.now()}`;
	await altField.fill(newAlt);
	await page.locator('button[aria-label="Rezept speichern"]').click();
	await page.waitForURL(/\/rezepte\/schokokuchen$/, { timeout: 20_000 });

	// Reaches the rendered hero image, and is still there on a fresh edit load.
	await expect(page.locator(`img[alt="${newAlt}"]`).first()).toBeAttached();
	await gotoHydrated(page, '/rezepte/edit/schokokuchen');
	await expect(altField).toHaveValue(newAlt);

	// Saving a different field must not wipe the alt text.
	const nameField = page.locator('input[aria-label="Rezeptname"]');
	const origName = await nameField.inputValue();
	await nameField.fill(`${origName} `);
	await page.locator('button[aria-label="Rezept speichern"]').click();
	await page.waitForURL(/\/rezepte\/schokokuchen$/, { timeout: 20_000 });
	await gotoHydrated(page, '/rezepte/edit/schokokuchen');
	await expect(altField).toHaveValue(newAlt);

	// Revert to the original fixture values.
	await altField.fill(origAlt);
	await page.locator('input[aria-label="Rezeptname"]').fill(origName);
	await page.locator('button[aria-label="Rezept speichern"]').click();
	await page.waitForURL(/\/rezepte\/schokokuchen$/, { timeout: 20_000 });
});
