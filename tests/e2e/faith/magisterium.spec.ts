import { test, expect } from '@playwright/test';
import { ANONYMOUS } from '../helpers/auth';
import { gotoHydrated } from '../helpers/nav';

test.use({ storageState: ANONYMOUS });

test('the index leads into a document', async ({ page }) => {
	await gotoHydrated(page, '/glaube/lehrschreiben');
	await page.getByRole('link', { name: 'Centesimus annus' }).click();
	await expect(page).toHaveURL(/\/glaube\/lehrschreiben\/centesimus-annus$/);
	await expect(page.locator('#a24')).not.toBeEmpty();
});

test('an article number is an address into the document', async ({ page }) => {
	await gotoHydrated(page, '/glaube/lehrschreiben/centesimus-annus/24');
	await expect(page).toHaveURL(/\/glaube\/lehrschreiben\/centesimus-annus#a24$/);
	await expect(page.locator('#a24')).toBeVisible();
});

test('a run of articles is marked where it was asked for', async ({ page }) => {
	await gotoHydrated(page, '/glaube/lehrschreiben/redemptor-hominis/18-21');
	await expect(page).toHaveURL(/\/glaube\/lehrschreiben\/redemptor-hominis\?r=18-21#a18$/);
	await expect(page.locator('.text.marked')).toHaveCount(4);
});

// vatican.va publishes Leo XIII in English and Latin and not in German. The
// page has to say so rather than hand a German reader English without a word.
test('a document with no German says which language it is showing', async ({ page }) => {
	await gotoHydrated(page, '/glaube/lehrschreiben/rerum-novarum');
	await expect(page.locator('.notice')).toContainText('nicht auf Deutsch');
	await expect(page.locator('#a1')).toContainText('revolutionary change');
});

test('the Catechism links and peeks its papal citations', async ({ page }) => {
	await gotoHydrated(page, '/glaube/katechese/kkk/426');
	const citation = page.locator('a.dref[data-magisterium]').first();
	await expect(citation).toHaveAttribute('href', /\/glaube\/lehrschreiben\/[a-z-]+#a\d+$/);
	await citation.scrollIntoViewIfNeeded();
	await citation.hover();
	await expect(page.locator('.peek')).toBeVisible();
	await expect(page.locator('.peek')).not.toBeEmpty();
});

test('all three language slugs read the same article', async ({ page }) => {
	for (const [path, word] of [
		['/glaube/lehrschreiben/humanae-vitae', 'Leben'],
		['/faith/magisterium/humanae-vitae', 'life'],
		['/fides/magisterium/humanae-vitae', 'vitae']
	]) {
		await gotoHydrated(page, path);
		await expect(page.locator('#a1')).toContainText(word);
	}
});
