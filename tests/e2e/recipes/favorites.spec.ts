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

test('favorites API rejects a non-string recipeId (no operator injection)', async ({ page }) => {
	// {"$ne": null} as a short_name filter would match an arbitrary recipe.
	for (const method of ['post', 'delete'] as const) {
		const res = await page.request[method]('/api/rezepte/favorites', { data: { recipeId: { $ne: null } } });
		expect(res.status()).toBe(400);
	}
});

test('alt-text API rejects a non-string shortName (no operator injection)', async ({ page }) => {
	const res = await page.request.post('/api/generate-alt-text', { data: { shortName: { $ne: null }, imageIndex: 0 } });
	expect(res.status()).toBe(400);
});
