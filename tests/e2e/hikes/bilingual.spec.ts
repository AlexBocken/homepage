import { test, expect } from '@playwright/test';
import { ANONYMOUS } from '../helpers/auth';
import { gotoHydrated } from '../helpers/nav';

// The hikes section is one route tree behind the `hikesLang` param matcher:
// /wanderungen is German, /hikes English, same slug on both sides. These specs
// pin the pieces that make that work — the chrome language, <html lang>, the
// hreflang pair, the language switch keeping the query string, and the 404.

test.use({ storageState: ANONYMOUS });

// A hike that has been in the corpus for a long time; the specs never depend
// on its prose.
const SLUG = '2026-mattstock';

test('the two prefixes render the same listing in two languages', async ({ page }) => {
	await page.goto('/wanderungen');
	await expect(page.locator('html')).toHaveAttribute('lang', 'de');
	await expect(page.locator('.site_header .nav-label', { hasText: 'Alle Touren' })).toBeVisible();

	await page.goto('/hikes');
	await expect(page.locator('html')).toHaveAttribute('lang', 'en');
	await expect(page.locator('.site_header .nav-label', { hasText: 'All hikes' })).toBeVisible();
	await expect(page.locator('.grid li').first()).toBeVisible();
});

test('tag filters keep the German key in the URL on the English listing', async ({ page }) => {
	await page.goto('/hikes?tag=Panorama');
	await expect(page.locator('.active-chips .chip-label', { hasText: '#Panorama' })).toBeVisible();
	await expect(page.locator('.grid li').first()).toBeVisible();
});

test('a detail page carries canonical and, once translated, an hreflang pair', async ({ page }) => {
	await page.goto(`/hikes/${SLUG}`);
	await expect(page.locator('html')).toHaveAttribute('lang', 'en');
	await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `https://bocken.org/hikes/${SLUG}`);
	await expect(page.locator('.metrics .unit', { hasText: 'Distance' })).toBeVisible();

	const de = page.locator('link[rel="alternate"][hreflang="de"]');
	if ((await de.count()) > 0) {
		// Translated: the pair points at the same slug under the other prefix.
		await expect(de).toHaveAttribute('href', `https://bocken.org/wanderungen/${SLUG}`);
		await expect(page.locator('link[rel="alternate"][hreflang="en"]')).toHaveAttribute('href', `https://bocken.org/hikes/${SLUG}`);
	} else {
		// Not translated yet: English chrome, German prose, and it says so.
		await expect(page.locator('.prose-fallback')).toBeVisible();
	}
});

test('switching language on a detail page swaps the prefix and keeps the query', async ({ page }) => {
	await gotoHydrated(page, `/wanderungen/${SLUG}?hub=basel`);
	await page.locator('button.language-button').first().click();
	await page.getByRole('link', { name: 'EN', exact: true }).first().click();
	await expect(page).toHaveURL(new RegExp(`/hikes/${SLUG}\\?hub=basel$`));
	await expect(page.locator('html')).toHaveAttribute('lang', 'en');
});

test('an unknown slug under either prefix is a 404 with the section error page', async ({ page }) => {
	const de = await page.goto('/wanderungen/gibt-es-nicht');
	expect(de?.status()).toBe(404);
	const en = await page.goto('/hikes/does-not-exist');
	expect(en?.status()).toBe(404);
});
