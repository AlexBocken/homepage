import { test, expect } from '@playwright/test';
import { ANONYMOUS } from '../helpers/auth';
import { gotoHydrated } from '../helpers/nav';

// The /anki landing page: what Anki is, the browser client, how to point a real
// Anki at the sync server, and the decks on GitHub. Entirely public — it is the
// page you read *before* you have an account, so a logged-out visitor has to see
// all of it. The two things that would quietly rot are the outbound URLs (the
// study client, the sync server, the deck repos) and the language switch, so
// those are what is asserted.

test.use({ storageState: ANONYMOUS });

test('a logged-out visitor gets the whole page', async ({ page }) => {
	await gotoHydrated(page, '/anki');

	await expect(page.getByRole('heading', { name: 'Anki', level: 1 })).toBeVisible();
	await expect(page.getByRole('link', { name: /study\.bocken\.org/ })).toHaveAttribute(
		'href',
		'https://study.bocken.org'
	);
	// The sync address is an instruction, not decoration: it has to be on the page
	// as text someone can copy.
	await expect(page.getByText('https://anki.bocken.org/', { exact: true })).toBeVisible();
});

test('every deck links to its own repository', async ({ page }) => {
	await gotoHydrated(page, '/anki');

	const decks: Array<[owner: string, repo: string]> = [
		['AlexBocken', 'kanji'],
		['AlexBocken', 'KanjiLesungen'],
		['AlexBocken', 'gaido'],
		['AlexBocken', 'breVIA'],
		['AlexBocken', 'AVL'],
		['AlexBocken', 'GRE'],
		// Till's repository, not mine — the link must not be rewritten to my account.
		['TillDiem', 'SwissMountain'],
		['AlexBocken', 'birds']
	];
	for (const [owner, repo] of decks) {
		await expect(
			page.locator(`a[href="https://github.com/${owner}/${repo}"]`),
			`${repo} deck link`
		).toBeVisible();
	}
});

test('the page follows the language preference', async ({ page }) => {
	await gotoHydrated(page, '/anki');
	await expect(page.getByRole('heading', { name: 'Was ist Anki?' })).toBeVisible();

	await page.evaluate(() => localStorage.setItem('preferredLanguage', 'en'));
	await gotoHydrated(page, '/anki');
	await expect(page.getByRole('heading', { name: 'What is Anki?' })).toBeVisible();
	await expect(page.getByRole('link', { name: /Open study\.bocken\.org/ })).toBeVisible();
});

test('the home page links here', async ({ page }) => {
	await gotoHydrated(page, '/');
	await page.getByRole('link', { name: 'Anki', exact: true }).click();
	await expect(page).toHaveURL(/\/anki$/);
});

test('the demo card runs the review loop and ends it', async ({ page }) => {
	// The demo is the page's explanation of spaced repetition, so it has to survive
	// hydration and it has to finish: walking the ladder to the last rung swaps the
	// card for the conclusion rather than leaving four buttons that all read the
	// same interval.
	await gotoHydrated(page, '/anki');

	await page.getByRole('button', { name: 'Antwort zeigen' }).click();
	await expect(page.locator('.grades .g')).toHaveCount(4);
	await expect(page.locator('.ladder li.on .tick')).toHaveText('10 Min.');

	// Easy takes two rungs at a time, so three answers clear the six-rung ladder.
	for (let i = 0; i < 3; i++) {
		await page.locator('.g.easy').click();
		const reveal = page.getByRole('button', { name: 'Antwort zeigen' });
		if (await reveal.count()) await reveal.click();
	}

	await expect(page.getByText('Das ist die ganze Schleife.')).toBeVisible();
	await expect(page.locator('.ladder li.on .tick')).toHaveText('3 Monate');

	await page.getByRole('button', { name: 'Nochmal von vorn' }).click();
	await expect(page.locator('.ladder li.on .tick')).toHaveText('10 Min.');
});
