import { test, expect } from '@playwright/test';
import { ANONYMOUS } from '../helpers/auth';
import { gotoHydrated } from '../helpers/nav';

// The Bible reader: /glaube/bibel/<book>/<chapter>, with the translator's notes
// in the margin on wide screens and in a bottom sheet on phones, and the
// footnotes' cross-references answered by /api/<lang>/bibel/stelle.

test.use({ storageState: ANONYMOUS });

test('the index links every book of the canon', async ({ page }) => {
	await page.goto('/glaube/bibel');
	await expect(page.getByRole('heading', { level: 1, name: 'Bibel' })).toBeVisible();
	await expect(page.getByRole('link', { name: 'Johannes' })).toHaveAttribute('href', '/glaube/bibel/joh');
	await expect(page.locator('.books .soon')).toHaveCount(0);
	await expect(page.getByRole('link', { name: 'Römer' })).toHaveAttribute('href', '/glaube/bibel/röm');
});

test('a chapter renders verses, markers and the notes in the margin', async ({ page }) => {
	await page.setViewportSize({ width: 1400, height: 900 });
	await gotoHydrated(page, '/glaube/bibel/joh/3');
	await expect(page.locator('h1')).toContainText('Johannes');
	await expect(page.locator('#v16 .t')).toContainText('so sehr hat Gott die Welt');
	await expect(page.locator('.notes .ng').first()).toBeVisible();
	await expect(page.locator('.fn').first()).toBeVisible();
});

test('a reference in a note peeks the passage on hover', async ({ page }) => {
	await page.setViewportSize({ width: 1400, height: 900 });
	await gotoHydrated(page, '/glaube/bibel/joh/3');
	const ref = page.locator('.notes .ref').first();
	await ref.hover();
	await expect(page.locator('.peek')).toBeVisible();
	await expect(page.locator('.peek p .n').first()).toBeVisible();
});

test('a marker peeks its footnote, and a reference inside that peek opens a second one', async ({ page }) => {
	await page.setViewportSize({ width: 1400, height: 900 });
	await gotoHydrated(page, '/glaube/bibel/joh/3');
	// A note in the margin that carries a cross-reference, and its marker in the text.
	const id = await page.locator('.notes li:has(.ref)').first().getAttribute('id');
	const [, verse, n] = id!.match(/^n-(\d+)-(\d+)$/)!;
	await page.locator(`.fn[data-verse="${verse}"][data-n="${n}"]`).hover();
	const first = page.locator('.peek[data-depth="0"]');
	await expect(first.locator('p.note')).toBeVisible();
	await first.locator('.ref').first().hover();
	await expect(page.locator('.peek[data-depth="1"] p .n').first()).toBeVisible();
	await expect(first).toBeVisible();
});

test("the Douay-Rheims brings Challoner's notes into the margin", async ({ page }) => {
	await page.setViewportSize({ width: 1400, height: 900 });
	await gotoHydrated(page, '/faith/bible/joh/3');
	await page.locator('.rail .seg button', { hasText: 'Douay-Rheims' }).click();
	await expect(page.locator('h1')).toContainText('John');
	await expect(page.locator('.notes')).toHaveAttribute('lang', 'en');
	await expect(page.locator('#n-5-1')).toContainText('necessity of baptism');
	await expect(page.locator('#v5 .fn')).toBeVisible();
});

test('on a phone a marker opens the notes as a sheet', async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await gotoHydrated(page, '/glaube/bibel/joh/1');
	await page.locator('.fn').first().click();
	await expect(page.locator('.sheet.in')).toBeVisible();
	await expect(page.locator('.sheet .body li').first()).toBeVisible();
});

test('the English route reads the same chapter; an unknown book is a 404', async ({ page }) => {
	await page.goto('/faith/bible/joh/3');
	await expect(page.locator('html')).toHaveAttribute('lang', 'en');
	await expect(page.locator('h1')).toBeVisible();
	const missing = await page.goto('/glaube/bibel/nope/1');
	expect(missing?.status()).toBe(404);
});

test("the book's own page: the introduction, the prefaces inline, chapter 1 behind the arrow", async ({ page }) => {
	await page.goto('/faith/bible/mt');
	await expect(page.locator('article.book h1')).toHaveText('Matthew');
	await expect(page.locator('.intro h2')).toContainText(/gospel/i);
	await expect(page.locator('.chapters .first')).toHaveAttribute('href', '/faith/bible/mt/1');
	await expect(page.locator('#preface-aquinas')).toBeVisible();
	await expect(page.locator('#preface-aquinas .who-link')).toHaveAttribute('href', '/faith/bible/patres/aquinas');
	// Allioli's introduction with its footnote markers, in German.
	await page.goto('/glaube/bibel/mt');
	await expect(page.locator('.intro p .t').first()).toContainText('Das heilige Evangelium');
	await expect(page.locator('.intro .fn').first()).toBeVisible();
	await expect(page.locator('.intro-notes li').first()).toBeVisible();
	// Ecclesiastes has Allioli's introduction and Haydock's preface, off by default but inline all the same.
	await page.goto('/glaube/bibel/koh');
	await expect(page.locator('#preface-haydock')).toBeVisible();
	// Exodus has no introduction of its own (Genesis introduces the Pentateuch): the commentators' list instead.
	await page.goto('/glaube/bibel/ex');
	await expect(page.locator('.none')).toContainText('keine Einleitung');
	await expect(page.locator('.who .row').first()).toBeVisible();
	// The first chapter's "previous" is the book.
	await page.goto('/glaube/bibel/mt/1');
	await expect(page.locator('.chapter-nav .prev')).toHaveAttribute('href', '/glaube/bibel/mt');
	await expect(page.locator('.commentaries a[href$="/kommentar/aquinas"]')).toHaveCount(0);
	// The preface page under the book.
	await page.goto('/glaube/bibel/mt/kommentar/aquinas');
	await expect(page.locator('h1')).toHaveText('Hl. Thomas von Aquin');
	await expect(page.locator('.kicker a')).toHaveAttribute('href', '/glaube/bibel/mt');
});

test('the index search: a reference in either syntax opens the chapter, words search the whole Bible', async ({ page }) => {
	await gotoHydrated(page, '/glaube/bibel');
	const box = page.getByRole('search').getByRole('searchbox');
	await box.fill('Ps 21:17');
	await box.press('Enter');
	await expect(page).toHaveURL(/\/glaube\/bibel\/ps\/21#17$/);
	await gotoHydrated(page, '/glaube/bibel');
	await box.fill('1 Kor 13,4');
	await box.press('Enter');
	await expect(page).toHaveURL(/\/glaube\/bibel\/1kor\/13#4$/);
	await gotoHydrated(page, '/glaube/bibel');
	await box.fill('Nikodemus');
	await box.press('Enter');
	const hits = page.locator('.results .hit');
	await expect(hits.first()).toBeVisible();
	await expect(hits.first().locator('.n')).toContainText('Johannes 3');
	await expect(page).toHaveURL(/\?q=Nikodemus$/);
});

test('the reader search widens from the book to the whole Bible', async ({ page }) => {
	await page.setViewportSize({ width: 1400, height: 900 });
	await gotoHydrated(page, '/glaube/bibel/gen/1');
	await page.keyboard.press('/');
	const box = page.locator('.sheet .search input');
	await box.fill('Nikodemus');
	await box.press('Enter');
	await expect(page.locator('.sheet')).toContainText('Kein Vers');
	await page.locator('.sheet .scope button', { hasText: 'Ganze Bibel' }).click();
	await expect(page.locator('.sheet .hit').first()).toContainText('Johannes 3');
});

test('the reference endpoint answers a footnote cross-reference', async ({ request }) => {
	const res = await request.get('/api/glaube/bibel/stelle?ref=' + encodeURIComponent('Joh 1,42'));
	expect(res.ok()).toBeTruthy();
	const body = await res.json();
	expect(body.label).toMatch(/^Johannes 1,42/);
	expect(body.verses.length).toBeGreaterThan(0);
	// A deuterocanonical book: only the imported JSON has it.
	const wis = await request.get('/api/glaube/bibel/stelle?ref=' + encodeURIComponent('Weish 7,25'));
	expect(wis.ok()).toBeTruthy();
	expect((await wis.json()).slug).toBe('weish');
});
