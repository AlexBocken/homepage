import { test, expect } from '@playwright/test';
import { ANONYMOUS } from '../helpers/auth';
import { gotoHydrated } from '../helpers/nav';

// The commentators' lives under /bibel/patres: the index of everyone who
// speaks in the reader, one page per commentator, and the links that lead
// there from the peeks and the chapter commentaries.

test.use({ storageState: ANONYMOUS });

test('the index lists the commentators by group and links their lives', async ({ page }) => {
	await page.goto('/glaube/bibel/patres');
	await expect(page.getByRole('heading', { level: 1, name: 'Kirchenväter und Ausleger' })).toBeVisible();
	await expect(page.locator('.group h2').first()).toHaveText('Kirchenväter');
	await expect(page.locator('a.row[href="/glaube/bibel/patres/augustine"]')).toBeVisible();
	await expect(page.locator('a.row[href="/glaube/bibel/patres/aquinas"]')).toBeVisible();
});

test('a life page has its four sections, the feast and where he speaks in the reader', async ({ page }) => {
	await page.goto('/glaube/bibel/patres/augustine');
	await expect(page.locator('h1')).toHaveText('Hl. Augustinus von Hippo');
	await expect(page.locator('.head img')).toBeVisible();
	for (const id of ['life', 'teaching', 'church', 'particular']) await expect(page.locator(`#${id} p`).first()).toBeVisible();
	await expect(page.locator('#particular')).toContainText('Dornbusch');
	await expect(page.locator('.feast')).toContainText('28. August');
	await expect(page.locator('.reader .books a[href="/glaube/bibel/joh/1/kommentar/augustine"]')).toBeVisible();
	await expect(page.locator('.sources a').first()).toHaveAttribute('href', /vatican\.va/);
});

test('the English route reads the same life in English and Latin falls back to it', async ({ page }) => {
	await page.goto('/faith/bible/patres/augustine');
	await expect(page.locator('h1')).toHaveText('St Augustine of Hippo');
	await expect(page.locator('#particular')).toContainText('burning bush');
	await page.goto('/fides/biblia/patres/augustine');
	await expect(page.locator('.lang-note')).toBeVisible();
	await expect(page.locator('article.bio')).toHaveAttribute('lang', 'en');
	expect((await page.goto('/glaube/bibel/patres/nobody'))?.status()).toBe(404);
});

test('the peek and the chapter commentary link to the life', async ({ page }) => {
	await page.setViewportSize({ width: 1400, height: 900 });
	await gotoHydrated(page, '/glaube/bibel/joh/3');
	await page.locator('#v1 .fathers .disc[data-father="augustine"]').click();
	await expect(page.locator('.peek .who .bio-link')).toHaveAttribute('href', '/glaube/bibel/patres/augustine');
	await page.goto('/glaube/bibel/joh/1/kommentar/aquinas');
	await expect(page.locator('h1 .bio-link')).toHaveAttribute('href', '/glaube/bibel/patres/aquinas');
});
