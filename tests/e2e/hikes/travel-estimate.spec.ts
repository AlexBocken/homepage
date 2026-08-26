import { test, expect, type Page } from '@playwright/test';
import { ANONYMOUS } from '../helpers/auth';
import { gotoHydrated } from '../helpers/nav';

// The precomputed travel-time line above each hike's JourneyPlanner. The hub it
// measures from is guessed from the visitor's IP (nginx GeoIP2 → `?hub=` →
// cookie, see docs/NGINX_GEOIP.md); in the test stack there is no GeoIP2, so
// every visitor starts at the default hub and the interesting part is the
// override.
//
// Durations are asserted as relations, never as numbers: the table is refreshed
// against the live timetable, and a hard-coded "2 h 10" would start failing the
// day SBB changes the schedule.

test.use({ storageState: ANONYMOUS });

// A hike whose two ends are ordinary, year-round served stops, so the estimate
// exists from every hub in both directions.
const HIKE = '/hikes/2026-mattstock';

const cards = (page: Page) => page.locator('.grid li');
const estimate = (page: Page) => page.locator('.estimate').first();
const hubSelect = (page: Page) =>
	page.getByLabel('Startbahnhof für die Reisezeit-Schätzung').first();

test('a hike shows an estimated travel time before anything is pressed', async ({ page }) => {
	await gotoHydrated(page, HIKE);
	await expect(estimate(page)).toBeVisible();
	// "ca. 2 h 10" / "ca. 55 min" — the shape, not the value.
	await expect(estimate(page)).toContainText(/ca\.\s*\d+\s*(h|min)/);
});

test('the listing puts the same travel time on the cards', async ({ page }) => {
	await gotoHydrated(page, '/hikes');
	const chips = page.locator('.chip-travel');
	// Not every card carries one — a hike the timetable cannot reach in time
	// from the current hub shows nothing rather than a guess — so this asserts
	// "some, and each well-formed", not a count.
	expect(await chips.count()).toBeGreaterThan(0);
	// "ab Zürich HB 2 h 55" — names the hub it was measured from, so the number
	// can't be read as a property of the hike itself.
	await expect(chips.first()).toHaveText(/^ab .+\s(\d+ h( \d{2})?|\d+ min)$/);
});

test('switching hubs changes the estimate without loading a page', async ({ page }) => {
	await gotoHydrated(page, HIKE);
	const before = await estimate(page).innerText();

	// Survives a client-side state change, dies on a real navigation.
	await page.evaluate(() => ((window as unknown as { __same: boolean }).__same = true));
	await hubSelect(page).selectOption('chur');

	await expect.poll(() => estimate(page).innerText()).not.toBe(before);
	expect(await page.evaluate(() => (window as unknown as { __same?: boolean }).__same)).toBe(true);
});

test('the chosen hub is remembered on the next hike page', async ({ page }) => {
	await gotoHydrated(page, HIKE);
	await hubSelect(page).selectOption('bern');
	const picked = await estimate(page).innerText();

	await gotoHydrated(page, HIKE);
	// Server-rendered from the cookie, so it is right in the first paint.
	await expect(hubSelect(page)).toHaveValue('bern');
	expect(await estimate(page).innerText()).toBe(picked);
});

test('?hub= works for a reader with no script, and sticks', async ({ page }) => {
	// The script-free path: the picker is a GET form, the layout reads the
	// parameter and writes the same cookie the click path writes.
	await page.goto(`${HIKE}?hub=basel`);
	await expect(hubSelect(page)).toHaveValue('basel');

	await page.goto(HIKE);
	await expect(hubSelect(page)).toHaveValue('basel');
});

test('a hub id that is not one of ours falls back instead of erroring', async ({ page }) => {
	const res = await page.goto(`${HIKE}?hub=../../etc/passwd`);
	expect(res?.status()).toBe(200);
	await expect(hubSelect(page)).toHaveValue('zurich');
});

test('the travel-time filter narrows the listing, and the hub rescales it', async ({ page }) => {
	// Script-free spelling: the range form submits one field per input and the
	// listing redirects it to the compact form before rendering.
	await page.goto('/hikes?travminneg=0&travmax=90');
	await expect(page).toHaveURL(/[?&]trav=/);
	const near = await cards(page).count();
	expect(near).toBeGreaterThan(0);

	await gotoHydrated(page, '/hikes');
	const all = await cards(page).count();
	expect(near).toBeLessThan(all);

	// The same ceiling means fewer hikes from a corner of the country than from
	// the middle of it — which is the whole point of the hub being a choice.
	await page.goto('/hikes?hub=lugano&trav=0-90');
	expect(await cards(page).count()).toBeLessThan(near);
});

test('picking a hub in the filter bar re-measures the cards', async ({ page }) => {
	await gotoHydrated(page, '/hikes');
	const chip = page.locator('.chip-travel').first();
	const before = await chip.innerText();

	await page.locator('label.filter-toggle').click();
	await page.getByLabel('Anreise ab').selectOption('lugano');

	await expect(chip).toContainText('ab Lugano');
	expect(await chip.innerText()).not.toBe(before);
});
