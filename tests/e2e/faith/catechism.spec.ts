import { test, expect } from '@playwright/test';
import { ANONYMOUS } from '../helpers/auth';
import { gotoHydrated } from '../helpers/nav';

test.use({ storageState: ANONYMOUS });

test('a paragraph number is an address into the reader', async ({ page }) => {
	await gotoHydrated(page, '/glaube/katechismus');

	await page.getByLabel(/Nummer oder Suchbegriff/).fill('2095');
	await page.getByRole('button', { name: 'Suchen' }).click();

	// The citation redirects into the section that holds it, anchored at it.
	await expect(page).toHaveURL(/\/katechismus\/p3s3c1a1#n2095$/);
	await expect(page.locator('#n2095')).toBeVisible();
	await expect(page.locator('#n2095')).toContainText('Anbetung');
});

test('a range is marked where it was asked for', async ({ page }) => {
	await gotoHydrated(page, '/glaube/katechismus/1322-1327');
	await expect(page).toHaveURL(/\/katechismus\/p2s2c1a3\?r=1322-1327#n1322$/);
	await expect(page.locator('.text.marked')).toHaveCount(6);
});

test('the notes of a paragraph stand beside it, not at the foot of the page', async ({ page }) => {
	await gotoHydrated(page, '/glaube/katechismus/p2s2c1a2');
	const first = page.locator('.body > .text').first();
	// Each paragraph's own notes follow it immediately in the markup.
	await expect(first.locator('xpath=following-sibling::aside[1]')).toBeVisible();
});

test('a Scripture citation in the Catechism opens the passage', async ({ page }) => {
	await gotoHydrated(page, '/glaube/katechismus/p2s2c1a2');
	const citation = page.locator('.body a.ref[data-ref]').first();
	await citation.scrollIntoViewIfNeeded();
	await citation.hover();
	const peek = page.locator('.peek');
	await expect(peek).toBeVisible();
	// The peek carries the verse itself, not only its name.
	await expect(peek).not.toBeEmpty();
});

test('a KKK citation in the catechesis opens the paragraph', async ({ page }) => {
	await gotoHydrated(page, '/glaube/katechese/eid-und-schwur');
	const citation = page.locator('a.cref').first();
	await expect(citation).toHaveAttribute('href', /\/glaube\/katechismus\/\d+$/);
	await citation.scrollIntoViewIfNeeded();
	await citation.hover();
	await expect(page.locator('.peek')).toContainText('KKK');
});

test('the Bible reader says which paragraphs cite a verse', async ({ page }) => {
	await gotoHydrated(page, '/glaube/bibel/joh/3');
	const chip = page.locator('.v .cited a.cref').first();
	await expect(chip).toHaveAttribute('href', /\/glaube\/katechismus\/\d+$/);
});

test('search finds a word in each language', async ({ page }) => {
	for (const [path, term] of [
		['/glaube/katechismus/suche', 'Gewissen'],
		['/faith/catechism/suche', 'conscience'],
		['/fides/catechismus/suche', 'conscientia']
	]) {
		await gotoHydrated(page, `${path}?q=${term}`);
		await expect(page.locator('.hits li').first()).toBeVisible();
	}
});

test('the register sends a heading to the paragraphs that treat it', async ({ page }) => {
	await gotoHydrated(page, '/faith/catechism/register');
	const entry = page.locator('dl dt').first();
	await expect(entry).toContainText('Abortion');
	await entry.locator('a').first().click();
	await expect(page).toHaveURL(/\/catechism\/p3s3c2a2\?r=2270-2275#n2270$/);
});

test('the German register is the same index in German', async ({ page }) => {
	await gotoHydrated(page, '/glaube/katechismus/register');
	await expect(page.getByRole('heading', { name: 'Thematisches Register', level: 1 })).toBeVisible();
	// German order, German words, the same paragraphs.
	const entry = page.locator('dl dt', { hasText: 'Abtreibung' }).first();
	await expect(entry).toContainText('2270–2275');
	// A cross-reference leads to the headword it names.
	const see = page.locator('dl .see a.to').first();
	await see.click();
	await expect(page).toHaveURL(/#entry-/);
});

test('a glossary term is explained in the Catechism’s own words', async ({ page }) => {
	await gotoHydrated(page, '/glaube/katechismus/glossar');
	await page.getByRole('link', { name: 'Gnade', exact: true }).click();
	await expect(page).toHaveURL(/\/glossar\/gnade$/);
	await expect(page.getByRole('heading', { name: 'Gnade', level: 1 })).toBeVisible();
	// The paragraphs the entry points at, each addressable on its own.
	await expect(page.locator('.para .n').first()).toHaveAttribute('href', '/glaube/katechismus/1996');
});

test('all three language slugs read the same paragraph', async ({ page }) => {
	for (const [path, word] of [
		['/glaube/katechismus/1322', 'Eucharistie'],
		['/faith/catechism/1322', 'Eucharist'],
		['/fides/catechismus/1322', 'Eucharistia']
	]) {
		await gotoHydrated(page, path);
		await expect(page.locator('#n1322')).toContainText(word);
	}
});
