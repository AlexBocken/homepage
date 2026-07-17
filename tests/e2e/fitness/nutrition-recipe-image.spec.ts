import { test, expect } from '@playwright/test';
import { storageStateFor } from '../helpers/auth';
import { acceptConfirm, gotoHydrated } from '../helpers/nav';

// Logging one of your own recipes shows its thumbnail immediately. The day page
// resolves recipe images server-side at load, so an entry added afterwards used
// to render imageless until the next navigation re-ran the load.

test.use({ storageState: storageStateFor('fitness') });

test('a recipe logged from search shows its image without a reload', async ({ page }) => {
	await gotoHydrated(page, '/fitness/nutrition');

	await page.getByRole('button', { name: 'Add food' }).first().click();
	// A recipe seeded uniquely for this spec (image + nutrition mapping), so the
	// log→delete round-trip below can't collide with the shared Älplermagronen
	// that other nutrition specs log concurrently on the same user. Recipe search
	// matches the German name field, so query that; the row shows "E2E Bildkuchen".
	await page.getByPlaceholder(/Search food/i).fill('Bildkuchen');

	const row = page.locator('.fs-result-row').filter({ has: page.locator('.fs-source-badge.recipe') }).first();
	await expect(row).toBeVisible();
	const name = (await row.locator('.fs-result-name').innerText()).trim();

	await row.locator('button.fs-result').click();
	await page.locator('button.fs-btn-confirm').click();

	// No reload between logging and asserting — this is the regression.
	const card = page.locator('.food-card').filter({ hasText: name }).first();
	await expect(card).toBeVisible();
	await expect(card).toHaveClass(/has-image/);
	await expect(card.locator('img').first()).toHaveAttribute('src', /\/static\/rezepte\/thumb\//);

	// The image must survive a reload too, i.e. it isn't only a client-side guess.
	// Re-navigate rather than reload() so the page is hydrated before the clicks
	// below — a click fired pre-hydration is a silent no-op.
	await gotoHydrated(page, '/fitness/nutrition');
	const reloaded = page.locator('.food-card').filter({ hasText: name }).first();
	await expect(reloaded).toHaveClass(/has-image/);

	// Round-trip: leave the diary as we found it.
	await reloaded.locator('button[aria-label="Delete"]').click();
	await acceptConfirm(page);
	await expect(page.locator('.food-card').filter({ hasText: name })).toHaveCount(0);
});
