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

// Every listing browses through the same rail; a facet route just opens with
// its own filter already pressed, and lifting it there widens the listing.

test('a category page opens with that category pressed in the rail', async ({ page }) => {
	await gotoHydrated(page, '/rezepte/category/Suppe');

	const suppe = page.getByRole('button', { name: /^Suppe\b/ });
	await expect(suppe).toHaveAttribute('aria-pressed', 'true');
	await expect(
		page.locator('.recipe-grid .compact-card a.card-link[aria-label="Tomatensuppe"]')
	).toBeVisible();
	// The grid renders in batches of 24, so compare the totals the bar reports
	// rather than the cards on screen.
	const total = async () =>
		Number((await page.locator('.result-count').textContent())?.match(/\d+/)?.[0] ?? 0);
	const before = await total();

	// "Alle" is the first option in the category section.
	await page.locator('.rail .options button').first().click();
	await expect(suppe).toHaveAttribute('aria-pressed', 'false');
	await expect.poll(total).toBeGreaterThan(before);
});

test('the search page opens with the query and the rail applied', async ({ page }) => {
	await gotoHydrated(page, '/rezepte/search?q=Tomatensuppe');

	await expect(page.locator('input#search')).toHaveValue('Tomatensuppe');
	await expect(
		page.locator('.recipe-grid .compact-card a.card-link[aria-label="Tomatensuppe"]')
	).toBeVisible();
	await expect(page.locator('.rail')).toBeVisible();
});

test('the rail becomes a sheet on a phone', async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await gotoHydrated(page, '/rezepte');

	const sheet = page.locator('.rail');
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

test('the sheet closes on Escape and on a tap outside it', async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await gotoHydrated(page, '/rezepte');

	const sheet = page.locator('.rail');

	await page.locator('.filters-trigger').click();
	await expect(sheet).toBeVisible();
	await page.keyboard.press('Escape');
	await expect(sheet).toBeHidden();

	await page.locator('.filters-trigger').click();
	await expect(sheet).toBeVisible();
	// The scrim covers everything the sheet does not.
	await page.locator('.scrim').click({ position: { x: 10, y: 10 } });
	await expect(sheet).toBeHidden();
});

// Filters outlive leaving the listing: the address bar carries them while you are
// here, and a per-tab memory brings them back when you return by a link, which is
// the one route the URL cannot cover.

test('a nutrition filter reaches the address bar, so a reload keeps it', async ({ page }) => {
	await gotoHydrated(page, '/rezepte');
	await page.getByRole('button', { name: 'Nährwerte' }).click();
	await page.getByRole('button', { name: 'Wenig Kohlenhydrate' }).click();

	await expect(page).toHaveURL(/c=0-30/);
	const filtered = await cards(page).count();

	await page.reload();
	await expect.poll(() => cards(page).count()).toBe(filtered);
	await expect(page.getByRole('button', { name: 'Wenig Kohlenhydrate' })).toHaveAttribute('aria-pressed', 'true');
});

test('filters come back when you leave by a link and return to a bare listing', async ({ page }) => {
	await gotoHydrated(page, '/rezepte');
	await page.getByRole('checkbox', { name: /Nur was jetzt Saison hat/ }).check();
	await expect(page).toHaveURL(/season=now/);
	const filtered = await cards(page).count();

	// Away to a recipe, then back to the listing with no parameters at all — what
	// clicking "Rezepte" in the nav does.
	await gotoHydrated(page, '/rezepte/schokokuchen');
	await gotoHydrated(page, '/rezepte');

	await expect(page.getByRole('checkbox', { name: /Nur was jetzt Saison hat/ })).toBeChecked();
	await expect.poll(() => cards(page).count()).toBe(filtered);
	// The restored set is written back to the URL, so it stays shareable and the
	// back button still works from here.
	await expect(page).toHaveURL(/season=now/);
});

test('a cleared rail stays cleared on the next visit', async ({ page }) => {
	await gotoHydrated(page, '/rezepte');
	const all = await cards(page).count();

	await page.getByRole('checkbox', { name: /Nur was jetzt Saison hat/ }).check();
	await expect(page).toHaveURL(/season=now/);
	await page.getByRole('checkbox', { name: /Nur was jetzt Saison hat/ }).uncheck();

	await gotoHydrated(page, '/rezepte/schokokuchen');
	await gotoHydrated(page, '/rezepte');

	await expect(page.getByRole('checkbox', { name: /Nur was jetzt Saison hat/ })).not.toBeChecked();
	await expect.poll(() => cards(page).count()).toBe(all);
});
