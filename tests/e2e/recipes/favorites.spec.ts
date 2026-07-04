import { test, expect } from '@playwright/test';
import { storageStateFor } from '../helpers/auth';
import { gotoHydrated } from '../helpers/nav';

// Favorites are per-user and require login. Round-trip: favorite → verify it
// appears on the favorites page → unfavorite to leave state clean.

test.use({ storageState: storageStateFor('recipes') });

test('favoriting a recipe surfaces it on the favorites page', async ({ page }) => {
	await gotoHydrated(page, '/rezepte/gugelhupf');
	const fav = page.locator('button.favorite-button');
	await expect(fav).toBeVisible();
	if (!(await fav.evaluate((el) => el.classList.contains('is-favorite')))) await fav.click();
	await expect(fav).toHaveClass(/is-favorite/);

	await gotoHydrated(page, '/rezepte/favorites');
	await expect(page.locator('.compact-card a.card-link[aria-label="Gugelhupf"]')).toBeVisible();

	// cleanup
	await gotoHydrated(page, '/rezepte/gugelhupf');
	await page.locator('button.favorite-button').click();
	await expect(page.locator('button.favorite-button')).not.toHaveClass(/is-favorite/);
});
