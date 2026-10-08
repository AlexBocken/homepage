import { test, expect, type Page } from '@playwright/test';
import { ANONYMOUS } from '../helpers/auth';
import { gotoHydrated } from '../helpers/nav';

// "Was kann ich kochen?" (/[recipeLang]/pantry): pick what you have, see what
// you can cook. Fixture e2e_vorrat in scripts/e2e/seed.mjs needs Zauberbohnen,
// Mondkraut and Salz — made-up names, so nothing cloned from dev interferes;
// Salz is a default basic.

test.use({ storageState: ANONYMOUS });

const group = (page: Page, missing: 0 | 1 | 2) => page.locator(`section[data-missing="${missing}"]`);
const card = (page: Page, missing: 0 | 1 | 2, name: string) =>
	group(page, missing).getByRole('link', { name, exact: true });
/** The result's list item — the card plus the "Fehlt: …" line above it. */
const item = (page: Page, missing: 0 | 1 | 2, name: string) =>
	group(page, missing).locator('li').filter({ has: page.getByRole('link', { name, exact: true }) });
const picker = (page: Page) => page.locator('#pantry-have-picker');

test('everything there, one missing, and back via the typeahead', async ({ page }) => {
	await gotoHydrated(page, '/rezepte/pantry?have=zauberbohnen,mondkraut');
	await expect(card(page, 0, 'E2E Vorrat')).toBeVisible();

	// Remove a chip: the recipe drops to "1 Zutat fehlt" and says what's missing.
	await picker(page).getByRole('button', { name: /^Mondkraut / }).click();
	await expect(card(page, 1, 'E2E Vorrat')).toBeVisible();
	await expect(item(page, 1, 'E2E Vorrat')).toContainText('Fehlt: Mondkraut');
	await expect(page).toHaveURL(/[?&]have=zauberbohnen$/);

	// Add it back through the typeahead.
	await picker(page).getByRole('combobox').first().fill('Mondkr');
	await picker(page).getByRole('button', { name: 'Mondkraut', exact: true }).click();
	await expect(card(page, 0, 'E2E Vorrat')).toBeVisible();
	await expect(page).toHaveURL(/have=zauberbohnen(%2C|,)mondkraut/);
});

test('a shared link works on the English page, with English labels', async ({ page }) => {
	await gotoHydrated(page, '/recipes/pantry?have=zauberbohnen');
	const li = item(page, 1, 'E2E Pantry');
	await expect(li).toContainText('Missing: Moonwort');
	await expect(li.locator('a.card-link')).toHaveAttribute('href', /^\/recipes\//);
});

test('removing a basic makes recipes need it', async ({ page }) => {
	await gotoHydrated(page, '/rezepte/pantry?have=zauberbohnen,mondkraut');
	await page.evaluate(() => localStorage.removeItem('pantry-basics'));
	await page.locator('#pantry-basics summary').click();
	await page.locator('#pantry-basics').getByRole('button', { name: /^Salz / }).click();
	const li = item(page, 1, 'E2E Vorrat');
	await expect(li).toContainText('Fehlt: Salz');

	// Remembered on this device…
	await page.reload();
	await expect(item(page, 1, 'E2E Vorrat')).toContainText('Fehlt: Salz');

	// …until reset.
	await page.locator('#pantry-basics summary').click();
	await page.locator('#pantry-basics').getByRole('button', { name: /Zurücksetzen/ }).click();
	await expect(card(page, 0, 'E2E Vorrat')).toBeVisible();
});
