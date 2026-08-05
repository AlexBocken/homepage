import { test, expect } from '@playwright/test';
import { storageStateFor } from '../helpers/auth';
import { gotoHydrated } from '../helpers/nav';

// The recipe editor's nutrition triage section (requires login + rezepte_users).
//
// Runs against e2e_mapping, a fixture owned by this spec whose four ingredient
// lines are seeded one per triage state, plus a base recipe reference. Its
// mappings are pre-baked in scripts/e2e/seed.mjs — generating them would run two
// embedding models, which no CI run should carry.
//
// Every test that changes something changes it back, so the fixture is unchanged
// for re-runs and for whatever runs next.

test.use({ storageState: storageStateFor('recipes') });

const EDIT_URL = '/rezepte/edit/e2e_mapping';

const card = (page: import('@playwright/test').Page, name: string) =>
	page.locator(`[data-mapper-card][aria-label="${name}"]`);

const chip = (page: import('@playwright/test').Page, state: string) =>
	page.locator(`button[data-filter="${state}"]`);

test('shows each ingredient in the bucket its mapping puts it in', async ({ page }) => {
	await gotoHydrated(page, EDIT_URL);

	// Matched, measured in grams, amount stated — nothing to do.
	await expect(card(page, 'Mehl')).toHaveAttribute('data-state', 'ok');
	// No match at all.
	await expect(card(page, 'Rätselzutat')).toHaveAttribute('data-state', 'open');
	// Matched, but the line states no amount so one unit is assumed. This is the
	// case the old confidence column could not express.
	await expect(card(page, 'Olivenöl')).toHaveAttribute('data-state', 'unsure');
	await expect(card(page, 'Salz')).toHaveAttribute('data-state', 'skipped');
});

test('the coverage bar is weighted by grams, not by row count', async ({ page }) => {
	await gotoHydrated(page, EDIT_URL);

	// 500 g flour + 15 g oil of 500 + 250 + 15 + 1 g, plus the 300 g base recipe:
	// two of five rows are unmapped or skipped, but they are a small share of the
	// weight — which a "3 von 5" summary would not say.
	const note = page.locator('.coverage-note');
	await expect(note).toContainText('des Gewichts erfasst');
	await expect(page.locator('.coverage-pct')).toContainText('%');

	// One segment per row, base recipe included.
	await expect(page.locator('.strip .seg')).toHaveCount(5);
});

test('filtering to open shows only the unmapped ingredient', async ({ page }) => {
	await gotoHydrated(page, EDIT_URL);

	await chip(page, 'open').click();
	await expect(page.locator('[data-mapper-card], [data-base-card]')).toHaveCount(1);
	await expect(card(page, 'Rätselzutat')).toBeVisible();

	await chip(page, 'all').click();
	await expect(page.locator('[data-mapper-card], [data-base-card]')).toHaveCount(5);
});

test('the base recipe gets a card stating what it contributes', async ({ page }) => {
	await gotoHydrated(page, EDIT_URL);

	// A type:'reference' section has no mapping, so the old table had no row to
	// put it in — while it is 300 of the recipe's ~1066 g.
	const base = page.locator('[data-base-card]');
	await expect(base).toHaveCount(1);
	await expect(base).toContainText('Grundrezept');
	await expect(base).toContainText('E2E Mapping Basis');
	await expect(base).toContainText('300 g');
	await expect(base).toContainText('des Rezepts');
	// Its multiplier is owned by the ingredient section above, so it is stated,
	// not editable here.
	await expect(base.locator('input')).toHaveCount(0);
});

test('the assumed-amount line shows its resolved grams', async ({ page }) => {
	await gotoHydrated(page, EDIT_URL);

	// "Olivenöl, 1 EL" with no number used to contribute nothing whatever the
	// gram figure said. One tablespoon at 15 g/unit is 15 g.
	const oil = card(page, 'Olivenöl');
	await expect(oil).toContainText('15 g');
	await expect(oil).toContainText('Menge angenommen');
});

test('the mapper search offers no barcode scanner and no source pills', async ({ page }) => {
	await gotoHydrated(page, EDIT_URL);

	const mystery = card(page, 'Rätselzutat');
	await mystery.getByRole('button', { name: 'Zuordnung ändern' }).click();

	await expect(mystery.locator('input[type="text"]')).toBeVisible();
	// A mapping can only point at BLS or USDA, so the pills would be furniture and
	// a camera is not how a recipe is edited.
	await expect(mystery.locator('.fs-barcode-btn')).toHaveCount(0);
	await expect(mystery.locator('.fs-sources')).toHaveCount(0);
});

test('grams per unit is editable on an automatic match', async ({ page }) => {
	await gotoHydrated(page, EDIT_URL);

	// Mehl is an untouched automatic match. The old table locked its g/u field
	// until the match itself had been changed by hand.
	const flour = card(page, 'Mehl');
	await flour.getByRole('button', { name: 'Zuordnung ändern' }).click();

	const gpu = flour.getByLabel('Gramm pro Einheit');
	await expect(gpu).toBeEditable();
	await expect(gpu).toHaveValue('1');

	await gpu.fill('2');
	// The card restates the weight from the new figure: 500 units × 2 g.
	await expect(flour).toContainText('1’000 g');

	await gpu.fill('1');
	await expect(flour).toContainText('500 g');
});

test('reverting one row leaves the others alone', async ({ page }) => {
	await gotoHydrated(page, EDIT_URL);

	// Salz is seeded manuallyEdited + excluded. Bringing it back must not disturb
	// the rest — the old "auto" button regenerated the whole recipe to do this.
	const salt = card(page, 'Salz');
	const oil = card(page, 'Olivenöl');
	await expect(oil).toHaveAttribute('data-state', 'unsure');

	await salt.getByRole('button', { name: 'Wieder aufnehmen' }).click();
	await expect(salt).not.toHaveAttribute('data-state', 'skipped');
	await expect(oil).toHaveAttribute('data-state', 'unsure');

	// Put it back, so the fixture is as seeded.
	await salt.getByRole('button', { name: 'Überspringen' }).click();
	await expect(salt).toHaveAttribute('data-state', 'skipped');
});

test('a manual assignment survives a save and reload', async ({ page }) => {
	await gotoHydrated(page, EDIT_URL);

	const mystery = card(page, 'Rätselzutat');
	await mystery.getByRole('button', { name: 'Zuordnung ändern' }).click();

	await mystery.locator('input[type="text"]').fill('Weizenmehl');
	const firstResult = mystery.locator('.fs-result').first();
	await expect(firstResult).toBeVisible({ timeout: 15_000 });
	const chosenName = (await firstResult.locator('.fs-result-name').innerText()).trim();
	await firstResult.click();

	// The per-unit step asks what one of the ingredient's units weighs, not how
	// much was eaten.
	const perUnit = mystery.locator('.fs-per-unit-input');
	await expect(perUnit).toBeVisible();
	await perUnit.fill('1');
	await mystery.locator('.fs-btn-confirm').click();

	await expect(mystery).toHaveAttribute('data-state', 'ok');
	await expect(mystery).toContainText(chosenName);

	await page.locator('button[aria-label="Rezept speichern"]').click();
	await page.waitForURL((url) => !url.pathname.includes('/edit/'), { timeout: 20_000 });

	await gotoHydrated(page, EDIT_URL);
	const reloaded = card(page, 'Rätselzutat');
	await expect(reloaded).toHaveAttribute('data-state', 'ok');
	await expect(reloaded).toContainText(chosenName);

	// Revert to the seeded unmapped state so the spec is idempotent.
	await reloaded.getByRole('button', { name: 'Zurück auf automatisch' }).click();
	await expect(reloaded).not.toContainText(chosenName, { timeout: 20_000 });
	await page.locator('button[aria-label="Rezept speichern"]').click();
	await page.waitForURL((url) => !url.pathname.includes('/edit/'), { timeout: 20_000 });
});
