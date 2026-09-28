import { test, expect, type Page } from '@playwright/test';
import { ANONYMOUS } from '../helpers/auth';
import { gotoHydrated } from '../helpers/nav';

// The hikes listing's filter bar. Every control in it is a link — or, for the
// ranges, a GET form — to the same listing with that filter applied, so the bar
// works with no script running. With script those same controls call
// preventDefault and change the filter in place; the href is the fallback, never
// the mechanism.
//
// Counts are asserted as relations ("fewer than before", "more than zero")
// rather than as numbers: hikes are added over time and a fixed count would
// start failing the day one is.

test.use({ storageState: ANONYMOUS });

const cards = (page: Page) => page.locator('.grid li');

test('a difficulty facet filters in place, without loading a page', async ({ page }) => {
	await gotoHydrated(page, '/wanderungen');
	const before = await cards(page).count();
	expect(before).toBeGreaterThan(0);

	// Survives a client-side state change, dies on a real navigation.
	await page.evaluate(() => ((window as unknown as { __same: boolean }).__same = true));
	await page.locator('label.filter-toggle').click();
	await page.getByRole('link', { name: 'SAC-Schwierigkeit T3', exact: true }).click();

	await expect(page).toHaveURL(/[?&]d=T3/);
	await expect.poll(() => cards(page).count()).toBeLessThan(before);
	expect(await page.evaluate(() => (window as unknown as { __same?: boolean }).__same)).toBe(true);
	// The panel does not close under the filter that was just used.
	await expect(page.locator('#filter-panel')).toBeVisible();
});

test('a filtered listing is shareable and survives a reload', async ({ page }) => {
	await gotoHydrated(page, '/wanderungen');
	await page.locator('label.filter-toggle').click();
	await page.getByRole('link', { name: 'SAC-Schwierigkeit T2', exact: true }).click();
	await expect(page).toHaveURL(/[?&]d=T2/);
	const filtered = await cards(page).count();

	await page.reload();

	await expect(page).toHaveURL(/[?&]d=T2/);
	await expect.poll(() => cards(page).count()).toBe(filtered);
});

test('Escape closes the panel', async ({ page }) => {
	await gotoHydrated(page, '/wanderungen');
	await page.locator('label.filter-toggle').click();
	await expect(page.locator('#filter-panel')).toBeVisible();

	await page.keyboard.press('Escape');

	await expect(page.locator('#filter-panel')).toBeHidden();
});

// The in-page reset (script running) has to clear what the no-JS reset link
// drops, the travel-time range included.
test('clearing everything in place also drops the travel-time range', async ({ page }) => {
	await gotoHydrated(page, '/wanderungen?d=T3&trav=0-60');

	await page.getByRole('link', { name: 'Alle löschen' }).click();

	await expect(page).toHaveURL(/\/wanderungen$/);
});

test.describe('without JavaScript', () => {
	test.use({ javaScriptEnabled: false });

	test('the panel opens', async ({ page }) => {
		await page.goto('/wanderungen');
		// A checkbox behind a label, so it opens in CSS rather than in an effect.
		await expect(page.locator('#filter-panel')).toBeHidden();

		await page.locator('label.filter-toggle').click();

		await expect(page.locator('#filter-panel')).toBeVisible();
	});

	test('a difficulty facet is a link the server honours', async ({ page }) => {
		await page.goto('/wanderungen');
		const before = await cards(page).count();

		await page.locator('label.filter-toggle').click();
		await page.getByRole('link', { name: 'SAC-Schwierigkeit T3', exact: true }).click();

		await expect(page).toHaveURL(/[?&]d=T3/);
		await expect.poll(() => cards(page).count()).toBeLessThan(before);
	});

	test('the ranges are real sliders, sent by a button', async ({ page }) => {
		await page.goto('/wanderungen');
		await page.locator('label.filter-toggle').click();

		const form = page.locator('form.range-form');
		// The dual-thumb track needs pointer handlers, so it goes; its label and
		// readout are plain markup and stay.
		await expect(page.locator('.range-field .rs-track').first()).toBeHidden();

		// The lower bound runs on a reversed, negated axis so the browser's own fill
		// covers the half the filter keeps. On that axis the right arrow walks the
		// thumb toward the low end, which is what raises the floor.
		const lower = form.locator('input[name="distminneg"]');
		await expect(lower).toHaveAttribute('type', 'range');
		await expect(lower).toHaveAttribute('dir', 'rtl');
		await lower.focus();
		for (let i = 0; i < 4; i++) await lower.press('ArrowRight');

		await form.getByRole('button', { name: 'Anwenden' }).click();

		// The negation never reaches the URL: the listing rewrites the form's
		// spelling to the one the app itself writes.
		await expect(page).toHaveURL(/[?&]dist=\d+-\d+/);
		await expect(page).not.toHaveURL(/distminneg/);
	});

	test('the range form carries the other filters with it', async ({ page }) => {
		await page.goto('/wanderungen?d=T2');
		await page.locator('label.filter-toggle').click();

		const form = page.locator('form.range-form');
		await expect(form.locator('input[type="hidden"][name="d"]')).toHaveValue('T2');

		const lower = form.locator('input[name="distminneg"]');
		await lower.focus();
		await lower.press('ArrowRight');
		await form.getByRole('button', { name: 'Anwenden' }).click();

		// Narrowed, not restarted.
		await expect(page).toHaveURL(/[?&]d=T2/);
		await expect(page).toHaveURL(/[?&]dist=/);
	});

	test('a chip removes its own filter and the rest stay', async ({ page }) => {
		await page.goto('/wanderungen?d=T2&tag=Panorama');
		const both = await cards(page).count();

		await page.locator('.active-chips a', { hasText: '#Panorama' }).click();

		await expect(page).toHaveURL(/[?&]d=T2/);
		await expect(page).not.toHaveURL(/tag=/);
		await expect.poll(() => cards(page).count()).toBeGreaterThanOrEqual(both);
	});

	test('a country keeps the hikes filed under its regions', async ({ page }) => {
		// Austrian hikes are filed under a Bundesland, so filtering by Österreich
		// has to catch them — otherwise the only way to ask for all of them would
		// be to tick each region in turn.
		await page.goto('/wanderungen?area=state%3AAT-kaernten');
		const oneRegion = await cards(page).count();
		expect(oneRegion).toBeGreaterThan(0);

		await page.goto('/wanderungen?area=country%3AAT');

		await expect.poll(() => cards(page).count()).toBeGreaterThanOrEqual(oneRegion);
	});

	test('clearing everything returns the whole listing', async ({ page }) => {
		await page.goto('/wanderungen?d=T3');
		const filtered = await cards(page).count();

		await page.getByRole('link', { name: 'Alle löschen' }).click();

		await expect(page).toHaveURL(/\/wanderungen$/);
		await expect.poll(() => cards(page).count()).toBeGreaterThan(filtered);
	});

});
