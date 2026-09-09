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
	await page.locator('.rail .seg a', { hasText: 'Douay-Rheims' }).click();
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

test('the chrome names the book in the reader\'s language, not the text\'s', async ({ page }) => {
	// 1 Samuel is the Douay's 1 Kings and the Vulgate's 1 Samuelis, so the
	// running head in the rail says which language the reader is in.
	for (const [path, name] of [
		['/glaube/bibel/1sam/1', '1 Samuel'],
		['/faith/bible/1sam/1', '1 Kings'],
		['/fides/biblia/1sam/1', '1 Samuelis']
	] as const) {
		await page.goto(path);
		await expect(page.locator('.rail a.book')).toHaveText(name);
		await expect(page.locator('.chapter-head .kicker')).toContainText(name);
	}
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
	await expect(page).toHaveURL(/\/glaube\/bibel\/ps\/21#v17$/);
	await gotoHydrated(page, '/glaube/bibel');
	await box.fill('1 Kor 13,4');
	await box.press('Enter');
	await expect(page).toHaveURL(/\/glaube\/bibel\/1kor\/13#v4$/);
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

test.describe('without JavaScript', () => {
	test.use({ javaScriptEnabled: false });

	test('a verse named in the address lands on the middle line, not under the header', async ({ page }) => {
		await page.setViewportSize({ width: 1400, height: 900 });
		await page.goto('/glaube/bibel/lk/24#v20');
		const verse = page.locator('#v20');
		await expect(verse).toBeInViewport();
		// scroll-margin-block on .v does this with no script running: the verse
		// sits about half a screen down rather than jammed against the header.
		const box = (await verse.boundingBox())!;
		expect(Math.abs(box.y + box.height / 2 - 450)).toBeLessThan(140);
	});

	test("the book introduction's references are links to the chapters they name", async ({ page }) => {
		await page.goto('/glaube/bibel/mt');
		// A bracketed parallel passage in the introduction's own prose…
		const ref = page.locator('.intro .t a.ref').first();
		const href = (await ref.getAttribute('href'))!;
		expect(href).toMatch(/^\/glaube\/bibel\/[^/]+\/\d+(#v\d+)?$/);
		// …and one inside a footnote of that introduction.
		await expect(page.locator('.intro-notes a.ref').first()).toHaveAttribute('href', /^\/glaube\/bibel\/[^/]+\/\d+/);
		await ref.click();
		await expect(page).toHaveURL(href);
	});

	test("the rail's links and the display form set the preferences through the cookie", async ({ page }) => {
		await page.setViewportSize({ width: 1400, height: 900 });
		await page.goto('/glaube/bibel/joh/3');
		// A rail control is a link carrying one preference; the layout writes
		// it into the cookie and sends the reader back to the clean address.
		await page.locator('.rail .seg a', { hasText: 'Vulgata' }).click();
		await expect(page).toHaveURL('/glaube/bibel/joh/3');
		await expect(page.locator('.chapter-head .kicker')).toContainText('Vulgata Clementina');
		await expect(page.locator('.rail .seg a.on')).toHaveText('Vulgata');
		await page.locator('.rail .sizes a', { hasText: 'A+' }).click();
		await expect(page.locator('.reader')).toHaveAttribute('style', /--text-size: 1\.18rem/);
		// The form under "Darstellung" carries what the links above it do not.
		const prefs = page.locator('.rail details.prefs');
		await expect(prefs).toBeVisible();
		await expect(prefs.locator('label', { hasText: 'Allioli' })).toHaveCount(0);
		await prefs.locator('summary').click();
		// The box sits hidden in its label, drawn as the rail's pill; the label takes the tap.
		await prefs.locator('label', { hasText: 'Nur Text' }).click();
		await expect(prefs.locator('input[name="notes"][value="hidden"]')).toBeChecked();
		await prefs.locator('label', { hasText: 'Alle Kirchenväter und Mittelalter' }).click();
		await prefs.getByRole('button', { name: 'Übernehmen' }).click();
		await expect(page).toHaveURL('/glaube/bibel/joh/3');
		await expect(page.locator('.reader')).toHaveClass(/no-markers/);
		await expect(page.locator('.reader')).toHaveAttribute('style', /--text-size: 1\.18rem/);
		await expect(page.locator('.chapter-head .kicker')).toContainText('Vulgata Clementina');
		// The choice survives the next chapter.
		await page.goto('/glaube/bibel/joh/4');
		await expect(page.locator('.reader')).toHaveClass(/no-markers/);
	});

	test("a commentator's disc leads to his page on the chapter, at the verse", async ({ page }) => {
		await page.setViewportSize({ width: 1400, height: 900 });
		await page.goto('/glaube/bibel/joh/3');
		const disc = page.locator('.v .fathers a.disc').first();
		const href = (await disc.getAttribute('href'))!;
		expect(href).toMatch(/^\/glaube\/bibel\/joh\/3\/kommentar\/[a-z0-9-]+#v\d+$/);
		await disc.click();
		await expect(page).toHaveURL(href);
		await expect(page.locator(`.commentary .section${href.slice(href.indexOf('#'))}`)).toBeVisible();
	});

	test('a cross-reference in a note is a link to its chapter and verse', async ({ page }) => {
		await page.setViewportSize({ width: 1400, height: 900 });
		await page.goto('/glaube/bibel/joh/3');
		const ref = page.locator('.notes a.ref').first();
		const href = (await ref.getAttribute('href'))!;
		expect(href).toMatch(/^\/glaube\/bibel\/[^/]+\/\d+(#v\d+)?$/);
		await ref.click();
		await expect(page).toHaveURL(href);
		if (href.includes('#v')) await expect(page.locator(`#${href.slice(href.indexOf('#') + 1)}`)).toBeInViewport();
	});

	test('on a phone the dock\'s "Aa" opens the form as a sheet, and the dock leads to the book', async ({ page }) => {
		await page.setViewportSize({ width: 390, height: 844 });
		await page.goto('/glaube/bibel/joh/1');
		await expect(page.locator('.rail details.prefs')).toBeHidden();
		await expect(page.locator('.dock .find')).toBeHidden();
		// A checkbox behind a label, so the sheet opens in CSS rather than in a handler.
		const sheet = page.locator('.nojs-sheet');
		await expect(sheet).toBeHidden();
		// No margin on a phone: the notes stand under the verse, and the form
		// offers only that or text only — no "on tap" a reader without script
		// could never answer.
		await expect(page.locator('.v .inline').first()).toBeVisible();
		await page.locator('.dock .aa').click();
		await expect(sheet).toBeVisible();
		await expect(sheet.locator('input[name="notes"]')).toHaveCount(2);
		await sheet.locator('label', { hasText: 'Nur Text' }).click();
		await expect(sheet.locator('input[name="notes"][value="hidden"]')).toBeChecked();
		await sheet.getByRole('button', { name: 'Übernehmen' }).click();
		await expect(page).toHaveURL('/glaube/bibel/joh/1');
		await expect(page.locator('.reader')).toHaveClass(/no-markers/);
		await expect(sheet).toBeHidden();
		await page.locator('.dock .aa').click();
		await sheet.locator('header .close').click();
		await expect(sheet).toBeHidden();
		await page.locator('.dock .where').click();
		await expect(page).toHaveURL('/glaube/bibel/joh');
	});
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
