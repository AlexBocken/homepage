import { test, expect } from '@playwright/test';
import { storageStateFor } from '../helpers/auth';
import { gotoHydrated } from '../helpers/nav';

// Favourites are marked in the Search-food tab: every row shows a heart at its
// right — filled and red when favourited, outline when not — and favourited foods
// rank above the other matches. The heart is also a toggle, so favouriting can
// happen from the row itself as well as from the detail page.
//
// Round-trips (favourite → assert → unfavourite) so the spec is idempotent and
// leaves the e2e_fitness user's favourites as it found them.

test.use({ storageState: storageStateFor('fitness') });
// Serial: these tests favourite/unfavourite for the same e2e_fitness user and assert
// on the absence of hearts, so running them concurrently makes each see the other's
// state.
test.describe.configure({ mode: 'serial' });

const QUERY = 'banana';
// Every row has a .fs-fav-mark button; only favourited ones carry .is-fav.
const MARK = '.fs-fav-mark.is-fav';
// Only BLS/USDA/OFF rows carry a detail link, which is how we reach the favourite
// toggle. Recipes have no detail page from here.
const LINKED_ROW = '.fs-result-row:has(a.fs-detail-link)';

async function openSearch(page: import('@playwright/test').Page, query: string) {
	await gotoHydrated(page, '/fitness/nutrition');
	await page.getByRole('button', { name: 'Add food' }).first().click();
	await page.getByPlaceholder(/Search food/i).fill(query);
	await expect(page.locator('.fs-result-row').first()).toBeVisible();
}

/**
 * Favourite (or unfavourite) a food via its detail page. `query` is what to type —
 * the row's visible name can't be reused as a query, since USDA names now render
 * bilingually as "English (German)" and the parenthetical matches nothing.
 */
async function setFavorite(
	page: import('@playwright/test').Page,
	query: string,
	name: string,
	favorited: boolean
) {
	await openSearch(page, query);
	await page.locator(LINKED_ROW).filter({ hasText: name }).first().locator('a.fs-detail-link').click();
	await expect(page).toHaveURL(/\/fitness\/nutrition\/food\//);
	const fav = page.locator('button.fav-btn');
	await expect(fav).toBeVisible();
	if ((await fav.evaluate((el) => el.classList.contains('active'))) !== favorited) await fav.click();
	if (favorited) await expect(fav).toHaveClass(/active/);
	else await expect(fav).not.toHaveClass(/active/);
}

test('a favourited food is hearted and ranked first in search', async ({ page }) => {
	// Target a match that is NOT already first, so the reordering is observable.
	await openSearch(page, QUERY);
	const linked = page.locator(LINKED_ROW);
	await expect(linked.nth(1)).toBeVisible();
	const target = (await linked.nth(1).locator('.fs-result-name').innerText()).trim();
	const firstBefore = (await page.locator('.fs-result-row').first().locator('.fs-result-name').innerText()).trim();
	expect(target).not.toBe(firstBefore);

	// Nothing is hearted to begin with.
	await expect(page.locator(MARK)).toHaveCount(0);

	try {
		await setFavorite(page, QUERY, target, true);

		await openSearch(page, QUERY);
		const first = page.locator('.fs-result-row').first();
		await expect(first.locator('.fs-result-name')).toHaveText(target);
		await expect(first.locator(MARK)).toBeVisible();
		// Only that row is filled in; the rest show the outline heart.
		await expect(page.locator(MARK)).toHaveCount(1);
		await expect(page.locator('.fs-fav-mark')).toHaveCount(await page.locator('.fs-result-row').count());
	} finally {
		await setFavorite(page, QUERY, target, false);
	}

	await openSearch(page, QUERY);
	await expect(page.locator(MARK)).toHaveCount(0);
	await expect(page.locator('.fs-result-row').first().locator('.fs-result-name')).toHaveText(firstBefore);
});

test('the heart appears without a full page load after favouriting', async ({ page }) => {
	// FoodSearch caches result sets in module state, which survives client-side
	// navigation. Favouriting on the detail page and coming *back* through the SPA
	// — no reload to reset that cache — must still show the heart and the new order.
	await openSearch(page, QUERY);
	const linked = page.locator(LINKED_ROW);
	await expect(linked.nth(1)).toBeVisible();
	const target = (await linked.nth(1).locator('.fs-result-name').innerText()).trim();

	await linked.filter({ hasText: target }).first().locator('a.fs-detail-link').click();
	await expect(page).toHaveURL(/\/fitness\/nutrition\/food\//);
	const fav = page.locator('button.fav-btn');
	await expect(fav).toBeVisible();
	await fav.click();
	await expect(fav).toHaveClass(/active/);

	try {
		await page.goBack();
		await page.getByRole('button', { name: 'Add food' }).first().click();
		await page.getByPlaceholder(/Search food/i).fill(QUERY);
		const first = page.locator('.fs-result-row').first();
		await expect(first.locator('.fs-result-name')).toHaveText(target);
		await expect(first.locator(MARK)).toBeVisible();
	} finally {
		await setFavorite(page, QUERY, target, false);
	}
});

test('the heart in a search row toggles the favourite', async ({ page }) => {
	await openSearch(page, QUERY);
	const row = page.locator(LINKED_ROW).nth(1);
	await expect(row).toBeVisible();
	const target = (await row.locator('.fs-result-name').innerText()).trim();
	const heart = row.locator('.fs-fav-mark');
	await expect(heart).not.toHaveClass(/is-fav/);

	try {
		await heart.click();
		await expect(heart).toHaveClass(/is-fav/);

		// Survives a reload, i.e. the toggle actually persisted server-side, and the
		// food now ranks first.
		await openSearch(page, QUERY);
		const first = page.locator('.fs-result-row').first();
		await expect(first.locator('.fs-result-name')).toHaveText(target);
		await expect(first.locator('.fs-fav-mark')).toHaveClass(/is-fav/);

		// Toggling back off from the row leaves no heart filled.
		await first.locator('.fs-fav-mark').click();
		await expect(first.locator('.fs-fav-mark')).not.toHaveClass(/is-fav/);
		await openSearch(page, QUERY);
		await expect(page.locator(MARK)).toHaveCount(0);
	} finally {
		await setFavorite(page, QUERY, target, false);
	}
});
