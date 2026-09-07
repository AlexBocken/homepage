import { test, expect } from '@playwright/test';
import { ANONYMOUS } from '../helpers/auth';
import { gotoHydrated } from '../helpers/nav';

// The Church Fathers' commentary: discs under the verses, the peek with a
// portrait, the settings toggle for the later commentators, and a chapter
// page. Needs the commentary collection (pnpm commentary:import --apply).

test.use({ storageState: ANONYMOUS });

test('a verse shows its commentators and a click opens the peek with a portrait', async ({ page }) => {
	await page.setViewportSize({ width: 1400, height: 900 });
	await gotoHydrated(page, '/glaube/bibel/joh/3');
	await expect(page.locator('.commentaries a[href$="/kommentar/chrysostom"]')).toBeVisible();
	const disc = page.locator('#v1 .fathers .disc[data-father="augustine"]');
	await expect(disc).toBeVisible();
	await disc.click();
	const peek = page.locator('.peek');
	await expect(peek.locator('.who b')).toHaveText('Hl. Augustinus von Hippo');
	await expect(peek.locator('.father img')).toBeVisible();
	await expect(peek.locator('.excerpt').first()).toContainText('Nicodemus');
});

test('only Aquinas and Augustine show by default; the picker widens the circle', async ({ page }) => {
	await page.setViewportSize({ width: 1400, height: 900 });
	await gotoHydrated(page, '/glaube/bibel/joh/3');
	await expect(page.locator('.fathers .disc[data-father="chrysostom"]')).toHaveCount(0);
	await page.locator('.rail .menu > .tool').click();
	await page.getByRole('menuitem', { name: /Ausleger wählen/ }).click();
	await page.locator('.picker .seg button', { hasText: 'Alle Kirchenväter' }).click();
	await expect(page.locator('.fathers .disc[data-father="chrysostom"]').first()).toBeVisible();
	await expect(page.locator('.fathers .disc[data-father="lapide"]')).toHaveCount(0);
	await page.locator('.picker .seg button', { hasText: 'Alle, auch' }).click();
	await expect(page.locator('.fathers .disc[data-father="lapide"]').first()).toBeVisible();
});

test('on a phone a disc opens the sheet', async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await gotoHydrated(page, '/glaube/bibel/joh/3');
	await page.locator('#v1 .fathers .disc').first().click();
	await expect(page.locator('.sheet .father-head b')).toBeVisible();
});

test('a chapter commentary page renders the homily with verse links', async ({ page }) => {
	await page.goto('/faith/bible/joh/3/kommentar/chrysostom');
	await expect(page.locator('h1')).toHaveText('St John Chrysostom');
	await expect(page.locator('.section h2 a').first()).toHaveAttribute('href', /\/faith\/bible\/joh\/3#\d+$/);
	const missing = await page.goto('/glaube/bibel/joh/3/kommentar/nobody');
	expect(missing?.status()).toBe(404);
});
