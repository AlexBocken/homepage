import { test, expect } from '@playwright/test';
import { ANONYMOUS } from '../helpers/auth';
import { gotoHydrated } from '../helpers/nav';

// The listing's left rail: season, category, keywords and nutrition, plus the
// order it puts recipes in. Assertions are written to hold whatever month the
// suite runs in — which recipes are in season changes by the day, so the tests
// key on invariants ("everything left is in season") rather than on counts.
//
// On the index the rail's filters are links to the same filter applied, so that
// they work without script; a facet listing that cannot honour those parameters
// server-side keeps plain buttons. Hence `getByRole('link')` here and
// `getByRole('button')` in the facet-route tests further down.

test.use({ storageState: ANONYMOUS });

const cards = (page: import('@playwright/test').Page) =>
	page.locator('.recipe-grid .compact-card');

test('the in-season group leads the listing', async ({ page }) => {
	await gotoHydrated(page, '/rezepte');
	const headings = page.locator('.group-head h2');
	// Season-first is the default order, so when anything is in season its group
	// is the first thing under the search bar.
	if (await headings.count()) {
		await expect(headings.first()).toHaveText(/Saison/i);
	}
});

test('"only what is in season" leaves nothing out of season', async ({ page }) => {
	await gotoHydrated(page, '/rezepte');
	const before = await cards(page).count();

	await page.getByRole('checkbox', { name: /Nur was jetzt Saison hat/ }).check();

	// The card's season badge is rendered for in-season recipes only.
	await expect.poll(() => cards(page).count()).toBeLessThanOrEqual(before);
	await expect(page.locator('.recipe-grid .compact-card:not(:has(.icon))')).toHaveCount(0);
	// One group, not two: there is no "everything else" left to show.
	await expect.poll(() => page.locator('.group').count()).toBeLessThanOrEqual(1);
});

test('a nutrition preset narrows the grid and resets cleanly', async ({ page }) => {
	await gotoHydrated(page, '/rezepte');
	const before = await cards(page).count();

	await page.getByText('Nährwerte', { exact: true }).click();
	const lowCarb = page.getByRole('link', { name: 'Wenig Kohlenhydrate' });
	await lowCarb.click();
	await expect(lowCarb).toHaveAttribute('aria-current', 'true');
	await expect.poll(() => cards(page).count()).toBeLessThanOrEqual(before);

	await page.getByRole('link', { name: 'Alle zurücksetzen' }).click();
	await expect(lowCarb).not.toHaveAttribute('aria-current', 'true');
	await expect.poll(() => cards(page).count()).toBe(before);
});

test('a filtered listing is shareable and survives a reload', async ({ page }) => {
	await gotoHydrated(page, '/rezepte');
	await page.getByRole('link', { name: /^Suppe\b/ }).click();
	await expect(page).toHaveURL(/[?&]category=Suppe/);

	await page.reload();
	await expect(page.getByRole('link', { name: /^Suppe\b/ })).toHaveAttribute('aria-current', 'true');
	await expect(
		page.locator('.recipe-grid .compact-card a.card-link[aria-label="Tomatensuppe"]')
	).toBeVisible();
});

// Every listing browses through the same rail; a facet route just opens with
// its own filter already pressed, and lifting it there widens the listing.

test('a category page opens with that category pressed in the rail', async ({ page }) => {
	await gotoHydrated(page, '/rezepte/category/Suppe');

	const suppe = page.getByRole('button', { name: /^Suppe\b/ });
	await expect(suppe).toHaveAttribute('aria-pressed', 'true');
	await expect(
		page.locator('.recipe-grid .compact-card a.card-link[aria-label="Tomatensuppe"]')
	).toBeVisible();
	// The grid renders in batches of 24, so compare the totals the bar reports
	// rather than the cards on screen.
	const total = async () =>
		Number((await page.locator('.result-count').textContent())?.match(/\d+/)?.[0] ?? 0);
	const before = await total();

	// "Alle" is the first option in the category section.
	await page.locator('.rail .options button').first().click();
	await expect(suppe).toHaveAttribute('aria-pressed', 'false');
	await expect.poll(total).toBeGreaterThan(before);
});

test('the search page opens with the query and the rail applied', async ({ page }) => {
	await gotoHydrated(page, '/rezepte/search?q=Tomatensuppe');

	await expect(page.locator('input#search')).toHaveValue('Tomatensuppe');
	await expect(
		page.locator('.recipe-grid .compact-card a.card-link[aria-label="Tomatensuppe"]')
	).toBeVisible();
	await expect(page.locator('.rail')).toBeVisible();
});

test('the rail becomes a sheet on a phone', async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await gotoHydrated(page, '/rezepte');

	const sheet = page.locator('.rail');
	await expect(sheet).toBeHidden();

	await page.locator('.filters-trigger').click();
	await expect(sheet).toBeVisible();

	await sheet.getByRole('link', { name: /^Suppe\b/ }).click();
	// The sheet's "show results" is a label for the same checkbox the trigger opens,
	// so closing it needs no script either.
	await page.locator('.done').click();
	await expect(sheet).toBeHidden();
	await expect(
		page.locator('.recipe-grid .compact-card a.card-link[aria-label="Tomatensuppe"]')
	).toBeVisible();
});

test('the sheet closes on Escape and on a tap outside it', async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await gotoHydrated(page, '/rezepte');

	const sheet = page.locator('.rail');

	await page.locator('.filters-trigger').click();
	await expect(sheet).toBeVisible();
	await page.keyboard.press('Escape');
	await expect(sheet).toBeHidden();

	await page.locator('.filters-trigger').click();
	await expect(sheet).toBeVisible();
	// The scrim covers everything the sheet does not.
	await page.locator('.scrim').click({ position: { x: 10, y: 10 } });
	await expect(sheet).toBeHidden();
});

// Filters outlive leaving the listing: the address bar carries them while you are
// here, and a per-tab memory brings them back when you return by a link, which is
// the one route the URL cannot cover.

test('a nutrition filter reaches the address bar, so a reload keeps it', async ({ page }) => {
	await gotoHydrated(page, '/rezepte');
	await page.getByText('Nährwerte', { exact: true }).click();
	await page.getByRole('link', { name: 'Wenig Kohlenhydrate' }).click();

	await expect(page).toHaveURL(/c=0-30/);
	const filtered = await cards(page).count();

	await page.reload();
	await expect.poll(() => cards(page).count()).toBe(filtered);
	await expect(page.getByRole('link', { name: 'Wenig Kohlenhydrate' })).toHaveAttribute('aria-current', 'true');
});

test('filters come back when you leave by a link and return to a bare listing', async ({ page }) => {
	await gotoHydrated(page, '/rezepte');
	await page.getByRole('checkbox', { name: /Nur was jetzt Saison hat/ }).check();
	await expect(page).toHaveURL(/season=now/);
	const filtered = await cards(page).count();

	// Away to a recipe, then back to the listing with no parameters at all — what
	// clicking "Rezepte" in the nav does.
	await gotoHydrated(page, '/rezepte/schokokuchen');
	await gotoHydrated(page, '/rezepte');

	await expect(page.getByRole('checkbox', { name: /Nur was jetzt Saison hat/ })).toBeChecked();
	await expect.poll(() => cards(page).count()).toBe(filtered);
	// The restored set is written back to the URL, so it stays shareable and the
	// back button still works from here.
	await expect(page).toHaveURL(/season=now/);
});

test('a cleared rail stays cleared on the next visit', async ({ page }) => {
	await gotoHydrated(page, '/rezepte');
	const all = await cards(page).count();

	await page.getByRole('checkbox', { name: /Nur was jetzt Saison hat/ }).check();
	await expect(page).toHaveURL(/season=now/);
	await page.getByRole('checkbox', { name: /Nur was jetzt Saison hat/ }).uncheck();

	await gotoHydrated(page, '/rezepte/schokokuchen');
	await gotoHydrated(page, '/rezepte');

	await expect(page.getByRole('checkbox', { name: /Nur was jetzt Saison hat/ })).not.toBeChecked();
	await expect.poll(() => cards(page).count()).toBe(all);
});

test('a filtered URL is filtered before any script runs', async ({ page }) => {
	// Fetched as a document, not driven by the browser: this is what a crawler, a
	// link preview and a reader with JavaScript off receive.
	const res = await page.request.get('/rezepte?category=Brot');
	expect(res.ok()).toBeTruthy();
	const html = await res.text();

	const cards = (html.match(/class="[^"]*compact-card/g) ?? []).length;
	expect(cards).toBeGreaterThan(0);

	const all = await page.request.get('/rezepte');
	const allCards = ((await all.text()).match(/class="[^"]*compact-card/g) ?? []).length;
	expect(cards).toBeLessThan(allCards);
});

// ─── With JavaScript switched off ────────────────────────────────────────────
// Everything above runs the rail as an app. This block runs it as a document:
// the disclosures are checkboxes, the filters are links, and the ranges are a
// form with a submit button, so the whole rail keeps working.

test.describe('without JavaScript', () => {
	test.use({ javaScriptEnabled: false });

	test('a category filter is a link the server honours', async ({ page }) => {
		await page.goto('/rezepte');
		const before = await cards(page).count();

		await page.getByRole('link', { name: /^Suppe\b/ }).click();

		await expect(page).toHaveURL(/[?&]category=Suppe/);
		await expect.poll(() => cards(page).count()).toBeLessThan(before);
		await expect(
			page.locator('.recipe-grid .compact-card a.card-link[aria-label="Tomatensuppe"]')
		).toBeVisible();
	});

	test('a collapsed section opens', async ({ page }) => {
		await page.goto('/rezepte');
		// Keywords start closed, and the chips inside are unreachable until it opens.
		const chips = page.locator('.section .chips');
		await expect(chips).toBeHidden();

		await page.getByText('Stichwörter', { exact: true }).click();
		await expect(chips).toBeVisible();
	});

	test('the ranges are real sliders, moved by keyboard and sent by a button', async ({ page }) => {
		await page.goto('/rezepte');

		await page.getByText('Nährwerte', { exact: true }).click();
		const form = page.locator('form.range-form');
		await expect(form).toBeVisible();
		// The dual-thumb track is gone rather than sitting there undraggable, while the
		// histogram it belongs to stays and the native inputs take its place under it.
		await expect(page.locator('.range-field .rs-track').first()).toBeHidden();
		await expect(page.locator('.range-field .rs-hist').first()).toBeVisible();

		// The lower bound runs on a reversed, negated axis so the browser's own fill
		// covers the half the filter keeps; the URL never shows that, because the
		// listing rewrites the form's spelling to its own on the way in.
		const proteinMin = form.locator('input[name="pminneg"]');
		await expect(proteinMin).toHaveAttribute('type', 'range');
		await expect(proteinMin).toHaveAttribute('dir', 'rtl');
		await proteinMin.focus();
		for (let i = 0; i < 5; i++) await proteinMin.press('ArrowLeft'); // step 5 → 25 %

		await form.getByRole('button', { name: 'Filter anwenden' }).click();

		await expect(page).toHaveURL(/[?&]p=25-100/);
		await expect(page).not.toHaveURL(/pminneg/);
		// The round trip is what makes the value readable: the server renders it back
		// into the slider and into the legend beside it.
		await page.getByText('Nährwerte', { exact: true }).click();
		await expect(page.locator('form.range-form input[name="pminneg"]')).toHaveValue('-25');
		await expect(page.locator('form.range-form legend').first()).toContainText('25');
	});

	test('the range form carries the other filters with it', async ({ page }) => {
		await page.goto('/rezepte?category=Suppe');
		await page.getByText('Nährwerte', { exact: true }).click();

		const form = page.locator('form.range-form');
		await expect(form.locator('input[type="hidden"][name="category"]')).toHaveValue('Suppe');

		const proteinMin = form.locator('input[name="pminneg"]');
		await proteinMin.focus();
		await proteinMin.press('ArrowLeft');

		await form.getByRole('button', { name: 'Filter anwenden' }).click();

		// Narrowed, not restarted.
		await expect(page).toHaveURL(/category=Suppe/);
		await expect(page).toHaveURL(/[?&]p=5-100/);
	});

	test('an empty listing has a way out', async ({ page }) => {
		// A query that matches nothing, so the only thing on screen is the escape hatch.
		await page.goto('/rezepte?q=zzzznichts');
		await expect(cards(page)).toHaveCount(0);

		await page.getByRole('link', { name: 'Filter zurücksetzen' }).click();

		await expect(page).toHaveURL(/\/rezepte$/);
		await expect.poll(() => cards(page).count()).toBeGreaterThan(0);
	});

	test('the sheet opens on a phone', async ({ page }) => {
		await page.setViewportSize({ width: 390, height: 844 });
		await page.goto('/rezepte');

		const sheet = page.locator('.rail');
		await expect(sheet).toBeHidden();

		await page.locator('.filters-trigger').click();
		await expect(sheet).toBeVisible();

		await page.locator('.done').click();
		await expect(sheet).toBeHidden();
	});

	test('the whole grid is one link away', async ({ page }) => {
		await page.goto('/rezepte');
		const first = await cards(page).count();

		const more = page.getByRole('link', { name: /Alle anzeigen/ });
		// Only there when the listing has more than one batch to give.
		if (!(await more.count())) return;
		// The link says how many are still held back; pressing it should leave none.
		const held = Number((await more.textContent())?.match(/\((\d+)\)/)?.[1]);

		await more.click();

		await expect(page).toHaveURL(/shown=\d+/);
		await expect.poll(() => cards(page).count()).toBe(first + held);
		await expect(page.getByRole('link', { name: /Alle anzeigen/ })).toHaveCount(0);
	});
});
