import { test, expect } from '@playwright/test';
import { storageStateFor } from '../helpers/auth';
import { gotoHydrated } from '../helpers/nav';

// Favoriting a food from each nutrition source. The heart lives on the food
// detail page (button.fav-btn / .active) and persists to FavoriteIngredient. We
// resolve a real id per source from the search API, then favorite → verify it
// survives a reload (server remembered) → unfavorite to leave state clean.

test.use({ storageState: storageStateFor('fitness') });

const SOURCES = [
	{ name: 'OFF', query: 'nutella', src: 'off' },
	{ name: 'recipe', query: 'Älplermagronen', src: 'recipe' },
	{ name: 'USDA', query: 'banana', src: 'usda' },
	{ name: 'BLS', query: 'apple', src: 'bls' }
];

for (const s of SOURCES) {
	test(`favorite a food from ${s.name}`, async ({ page, request }) => {
		const res = await request.get('/api/nutrition/search?q=' + encodeURIComponent(s.query));
		const body = await res.json();
		const items = Array.isArray(body) ? body : (body.results ?? []);
		const item = items.find((x: { source: string }) => x.source === s.src);
		expect(item, `expected a ${s.name} result for "${s.query}"`).toBeTruthy();

		await gotoHydrated(page, `/fitness/nutrition/food/${item.source}/${encodeURIComponent(item.id)}`);
		const fav = page.locator('button.fav-btn');
		await expect(fav).toBeVisible();

		// Reset any leftover favorite from a prior run, then favorite fresh.
		if (await fav.evaluate((el) => el.classList.contains('active'))) {
			await fav.click();
			await expect(fav).not.toHaveClass(/active/);
		}
		await fav.click();
		await expect(fav).toHaveClass(/active/);

		// Persisted: a reload re-fetches favorite state from the server.
		await page.reload();
		await expect(page.locator('button.fav-btn')).toHaveClass(/active/);

		// Cleanup.
		await page.locator('button.fav-btn').click();
		await expect(page.locator('button.fav-btn')).not.toHaveClass(/active/);
	});
}
