import { test, expect } from '@playwright/test';
import { ANONYMOUS } from '../helpers/auth';
import { gotoHydrated } from '../helpers/nav';

// Public facet-browsing: season / category / tag / icon clouds + search results.

test.use({ storageState: ANONYMOUS });

const cards = (page: import('@playwright/test').Page) =>
	page.locator('.recipe-grid .compact-card a.card-link');

test('search results page reports matches for a query', async ({ page }) => {
	await page.goto('/rezepte/search?q=Schoko');
	await expect(cards(page).first()).toBeVisible();
	await expect(page.locator('.recipe-grid .compact-card a.card-link[aria-label="Schokokuchen"]')).toBeVisible();
});

test('season index links to a month detail', async ({ page }) => {
	await page.goto('/rezepte/season');
	const month = page.locator('a.month').first();
	await expect(month).toBeVisible();
	await month.click();
	await expect(page).toHaveURL(/\/rezepte\/season\/\d+/);
});

test('a month lists the recipes in season then (Tomatensuppe in July)', async ({ page }) => {
	// Fixture Tomatensuppe has a June–September range. July holds far more than the
	// grid's first 24-card batch, so narrow to soups before looking for it.
	await gotoHydrated(page, '/rezepte/season/7');
	await page.locator('.rail').getByRole('button', { name: /^Suppe\b/ }).click();
	await expect(page.locator('.compact-card a.card-link[aria-label="Tomatensuppe"]')).toBeVisible();
});

test('category cloud navigates to a category detail', async ({ page }) => {
	await gotoHydrated(page, '/rezepte/category');
	const kuchen = page.getByRole('link', { name: /Kuchen/ }).first();
	await kuchen.click();
	await expect(page).toHaveURL(/\/rezepte\/category\/[^/]+/);
	await expect(cards(page).first()).toBeVisible();
});

test('tag cloud filters and opens a tag detail', async ({ page }) => {
	await gotoHydrated(page, '/rezepte/tag');
	// Filter input narrows the visible tag balls.
	const filter = page.locator('input[type="search"]').first();
	if (await filter.count()) await filter.fill('dessert');
	const tag = page.getByRole('link', { name: /dessert/i }).first();
	await tag.click();
	await expect(page).toHaveURL(/\/rezepte\/tag\/[^/]+/);
});
