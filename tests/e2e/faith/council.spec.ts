import { test, expect } from '@playwright/test';
import { ANONYMOUS } from '../helpers/auth';
import { gotoHydrated } from '../helpers/nav';

test.use({ storageState: ANONYMOUS });

test('the council index leads into a document', async ({ page }) => {
	await gotoHydrated(page, '/glaube/konzil');
	await page.getByRole('link', { name: /Lumen gentium/ }).click();
	await expect(page).toHaveURL(/\/glaube\/konzil\/lg$/);
	await expect(page.locator('#a11')).toContainText('Taufe');
});

test('an article number is an address into the document', async ({ page }) => {
	await gotoHydrated(page, '/glaube/konzil/lg/11');
	await expect(page).toHaveURL(/\/glaube\/konzil\/lg#a11$/);
	await expect(page.locator('#a11')).toBeVisible();
});

test('a run of articles is marked where it was asked for', async ({ page }) => {
	await gotoHydrated(page, '/glaube/konzil/sc/122-127');
	await expect(page).toHaveURL(/\/glaube\/konzil\/sc\?r=122-127#a122$/);
	await expect(page.locator('.text.marked')).toHaveCount(6);
});

test('the notes of an article stand beside it, not at the foot of the page', async ({ page }) => {
	await gotoHydrated(page, '/glaube/konzil/dv');
	const first = page.locator('.body > .text').first();
	await expect(first.locator('xpath=following-sibling::aside[1]')).toBeVisible();
});

test('a canon is read in the division it stands in', async ({ page }) => {
	await gotoHydrated(page, '/glaube/kirchenrecht');
	await page.getByLabel('Canon', { exact: true }).fill('1055');
	await page.getByRole('button', { name: 'Nachschlagen' }).click();

	await expect(page).toHaveURL(/\/glaube\/kirchenrecht\/1055$/);
	await expect(page.locator('#c1055')).toContainText('Ehebund');
	// The canons around it are there too — the title on marriage, as in the book.
	await expect(page.locator('#c1056')).toBeVisible();
});

test('the Catechism links and peeks its council citations', async ({ page }) => {
	await gotoHydrated(page, '/glaube/katechese/kkk/1601');
	const citation = page.locator('a.dref[data-council]').first();
	await expect(citation).toHaveAttribute('href', /\/glaube\/konzil\/[a-z]{2}#a\d+$/);
	await citation.scrollIntoViewIfNeeded();
	await citation.hover();
	await expect(page.locator('.peek')).toBeVisible();
	await expect(page.locator('.peek')).not.toBeEmpty();
});

test('the Catechism links and peeks its canon citations', async ({ page }) => {
	await gotoHydrated(page, '/glaube/katechese/kkk/1601');
	const citation = page.locator('a.dref[data-canon]').first();
	await expect(citation).toHaveAttribute('href', /\/glaube\/kirchenrecht\/\d+#c\d+$/);
	await citation.scrollIntoViewIfNeeded();
	await citation.hover();
	await expect(page.locator('.peek')).toContainText(/Can\./);
});

test('all three language slugs read the same article and the same canon', async ({ page }) => {
	for (const [path, word] of [
		['/glaube/konzil/lg', 'Kirche'],
		['/faith/council/lg', 'Church'],
		['/fides/concilium/lg', 'Ecclesia']
	]) {
		await gotoHydrated(page, path);
		await expect(page.locator('.body')).toContainText(word);
	}
	for (const [path, word] of [
		['/glaube/kirchenrecht/1055', 'Ehebund'],
		['/faith/canon-law/1055', 'matrimonial'],
		['/fides/ius-canonicum/1055', 'Matrimoniale']
	]) {
		await gotoHydrated(page, path);
		await expect(page.locator('#c1055')).toContainText(word);
	}
});
