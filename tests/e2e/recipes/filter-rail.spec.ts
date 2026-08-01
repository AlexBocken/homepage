import { test, expect } from '@playwright/test';
import { ANONYMOUS } from '../helpers/auth';
import { gotoHydrated } from '../helpers/nav';

// The listing's left rail: season, category, keywords and nutrition, plus the
// order it puts recipes in. Assertions are written to hold whatever month the
// suite runs in — which recipes are in season changes by the day, so the tests
// key on invariants ("everything left is in season") rather than on counts.

test.use({ storageState: ANONYMOUS });

const cards = (page: import('@playwright/test').Page) =>
	page.locator('.recipe-grid .compact-card');

test('the in-season group leads the listing', async ({ page }) => {
	await gotoHydrated(page, '/rezepte');
	const headings = page.locator('.group-head h2');
	// Season-first is the default order, so when anything is in season its group
	// is the first thing under the search bar.
	if (await headings.count()) {
		await expect(headings.first()).toHaveText(/Saison/i);
	}
});

test('"only what is in season" leaves nothing out of season', async ({ page }) => {
	await gotoHydrated(page, '/rezepte');
	const before = await cards(page).count();

	await page.getByRole('checkbox', { name: /Nur was jetzt Saison hat/ }).check();

	// The card's season badge is rendered for in-season recipes only.
	await expect.poll(() => cards(page).count()).toBeLessThanOrEqual(before);
	await expect(page.locator('.recipe-grid .compact-card:not(:has(.icon))')).toHaveCount(0);
	// One group, not two: there is no "everything else" left to show.
	await expect.poll(() => page.locator('.group').count()).toBeLessThanOrEqual(1);
});

test('a nutrition preset narrows the grid and resets cleanly', async ({ page }) => {
	await gotoHydrated(page, '/rezepte');
	const before = await cards(page).count();

	await page.getByRole('button', { name: 'Nährwerte' }).click();
	const lowCarb = page.getByRole('button', { name: 'Wenig Kohlenhydrate' });
	await lowCarb.click();
	await expect(lowCarb).toHaveAttribute('aria-pressed', 'true');
	await expect.poll(() => cards(page).count()).toBeLessThanOrEqual(before);

	await page.getByRole('button', { name: 'Alle zurücksetzen' }).click();
	await expect(lowCarb).toHaveAttribute('aria-pressed', 'false');
	await expect.poll(() => cards(page).count()).toBe(before);
});

test('a filtered listing is shareable and survives a reload', async ({ page }) => {
	await gotoHydrated(page, '/rezepte');
	await page.getByRole('button', { name: /^Suppe\b/ }).click();
	await expect(page).toHaveURL(/[?&]category=Suppe/);

	await page.reload();
	await expect(page.getByRole('button', { name: /^Suppe\b/ })).toHaveAttribute('aria-pressed', 'true');
	await expect(
		page.locator('.recipe-grid .compact-card a.card-link[aria-label="Tomatensuppe"]')
	).toBeVisible();
});

test('the rail becomes a sheet on a phone', async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await gotoHydrated(page, '/rezepte');

	const sheet = page.locator('dialog.rail');
	await expect(sheet).toBeHidden();

	await page.locator('.filters-trigger').click();
	await expect(sheet).toBeVisible();

	await sheet.getByRole('button', { name: /^Suppe\b/ }).click();
	await page.getByRole('button', { name: /Ergebnisse zeigen/ }).click();
	await expect(sheet).toBeHidden();
	await expect(
		page.locator('.recipe-grid .compact-card a.card-link[aria-label="Tomatensuppe"]')
	).toBeVisible();
});
