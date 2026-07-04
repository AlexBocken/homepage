import { test, expect } from '@playwright/test';
import { ANONYMOUS } from '../helpers/auth';
import { gotoHydrated } from '../helpers/nav';

// Recipe browsing is public. Data is a mix of cloned real recipes + guaranteed
// fixtures (scripts/e2e/seed.mjs), so assertions lean on the fixtures for
// stability and on structure for the rest.

test.use({ storageState: ANONYMOUS });

const cards = (page: import('@playwright/test').Page) =>
	page.locator('.recipe-grid .compact-card a.card-link');

test('index lists recipes and links into a detail page', async ({ page }) => {
	await page.goto('/rezepte');
	await expect(cards(page).first()).toBeVisible();
	expect(await cards(page).count()).toBeGreaterThan(5);

	await cards(page).first().click();
	await expect(page).toHaveURL(/\/rezepte\/[^/]+$/);
	await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});

test('live search narrows the grid to a known fixture', async ({ page }) => {
	await gotoHydrated(page, '/rezepte');
	await page.locator('input#search').fill('Schokokuchen');

	// Card name lives in the link's aria-label, not a text node.
	await expect.poll(() => cards(page).count()).toBeLessThan(15);
	await expect(cards(page).first()).toHaveAttribute('aria-label', /Schokokuchen/);
});

test('a category chip filters the grid', async ({ page }) => {
	await gotoHydrated(page, '/rezepte');
	const before = await page.locator('.recipe-grid .compact-card').count();

	// Suppe (fewer than the 24-card first batch) reliably shrinks the grid, and
	// contains the seeded Tomatensuppe fixture.
	const suppe = page.getByRole('button', { name: /^Suppe \(/ });
	await suppe.click();
	await expect(suppe).toHaveClass(/active/);
	await expect.poll(() => page.locator('.recipe-grid .compact-card').count()).toBeLessThan(before);
	await expect(page.locator('.recipe-grid .compact-card a.card-link[aria-label="Tomatensuppe"]')).toBeVisible();
});

test('English route serves translated content', async ({ page }) => {
	await page.goto('/recipes/chocolate-cake');
	await expect(page.getByRole('heading', { name: 'Chocolate Cake' })).toBeVisible();
});
