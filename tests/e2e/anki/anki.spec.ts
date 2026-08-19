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
