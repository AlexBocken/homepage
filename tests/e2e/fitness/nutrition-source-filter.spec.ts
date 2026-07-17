import { test, expect } from '@playwright/test';
import { storageStateFor } from '../helpers/auth';
import { gotoHydrated } from '../helpers/nav';

// Food search: the source filter pills and the ready-meal exclusion. Default is
// every database enabled and ready meals shown; the first source click narrows to
// one source, further clicks toggle sources on and off, and turning the last one
// off returns to "all".

test.use({ storageState: storageStateFor('fitness') });

const OFF_BADGE = '.fs-source-badge.off';
const USDA_BADGE = '.fs-source-badge.usda';

async function openSearch(page: import('@playwright/test').Page, query: string) {
	await gotoHydrated(page, '/fitness/nutrition');
	await page.getByRole('button', { name: 'Add food' }).first().click();
	await page.getByPlaceholder(/Search food/i).fill(query);
	await expect(page.locator('.fs-result-row').first()).toBeVisible();
}

/**
 * "cola" matches BLS ("Colagetränk…"), USDA ("…pina colada…") and OFF products —
 * OFF data is only cloned for a handful of brand terms (see clone-dev.mjs), and
 * cola is one of them, so every source is represented and a filter is observable.
 */
const QUERY = 'cola';

test('all sources are enabled by default', async ({ page }) => {
	await openSearch(page, QUERY);
	for (const name of ['Recipes', 'USDA', 'BLS', 'OFF']) {
		await expect(page.getByRole('button', { name, exact: true })).toHaveAttribute('aria-pressed', 'true');
	}
});

test('first click narrows to that source alone', async ({ page }) => {
	await openSearch(page, QUERY);
	await expect(page.locator(OFF_BADGE).first()).toBeVisible();

	await page.getByRole('button', { name: 'USDA', exact: true }).click();

	await expect(page.getByRole('button', { name: 'USDA', exact: true })).toHaveAttribute('aria-pressed', 'true');
	await expect(page.getByRole('button', { name: 'OFF', exact: true })).toHaveAttribute('aria-pressed', 'false');
	// Every remaining result is USDA.
	await expect(page.locator(USDA_BADGE).first()).toBeVisible();
	await expect(page.locator(OFF_BADGE)).toHaveCount(0);
});

test('a second click adds a source, and clearing the last returns to all', async ({ page }) => {
	await openSearch(page, QUERY);
	const usda = page.getByRole('button', { name: 'USDA', exact: true });
	const off = page.getByRole('button', { name: 'OFF', exact: true });

	await usda.click();
	await expect(page.locator(OFF_BADGE)).toHaveCount(0);

	// Multi-select: OFF comes back alongside USDA.
	await off.click();
	await expect(off).toHaveAttribute('aria-pressed', 'true');
	await expect(page.locator(OFF_BADGE).first()).toBeVisible();
	await expect(page.locator(USDA_BADGE).first()).toBeVisible();

	// Turning both off leaves no explicit selection — back to every database.
	await usda.click();
	await off.click();
	for (const name of ['Recipes', 'USDA', 'BLS', 'OFF']) {
		await expect(page.getByRole('button', { name, exact: true })).toHaveAttribute('aria-pressed', 'true');
	}
	await expect(page.locator(USDA_BADGE).first()).toBeVisible();
});

test('ready meals are shown by default and removed when excluded', async ({ page }) => {
	// "Gemüsebrühe" sits in BLS's "Brühen & Fertiggerichte", which the toggle drops.
	// The search index matches on word prefixes, so the query has to be the start of
	// the entry name — a bare "brühe" only finds the seasoning-category stock cubes.
	// Each row renders its category into the meta line, so it is directly assertable.
	await openSearch(page, 'gemüsebrühe');
	await page.getByRole('button', { name: 'BLS', exact: true }).click();

	const readyMealRows = page.locator('.fs-result-row', { hasText: 'Brühen & Fertiggerichte' });
	await expect(readyMealRows.first()).toBeVisible();

	const toggle = page.getByRole('button', { name: /No ready meals/i });
	await expect(toggle).toHaveAttribute('aria-pressed', 'false');
	await toggle.click();

	await expect(toggle).toHaveAttribute('aria-pressed', 'true');
	await expect(readyMealRows).toHaveCount(0);

	// Toggling back restores them — the filter is not one-way.
	await toggle.click();
	await expect(readyMealRows.first()).toBeVisible();
});
