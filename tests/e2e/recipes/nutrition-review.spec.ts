import { test, expect } from '@playwright/test';
import { storageStateFor } from '../helpers/auth';
import { gotoHydrated } from '../helpers/nav';

// The nutrition review queue (requires login + rezepte_users): the overview that
// counts how many recipes are fully checked, and the walk through the ones that
// are not.
//
// Keyed on e2e_pruefung, a copy of nutrition-mapping.spec's e2e_mapping fixture
// (which that spec changes and reverts while this one runs), seeded by
// scripts/e2e/seed.mjs with one line per triage state — an unmapped "Rätselzutat" and an amount-less "Olivenöl" among
// them — so it is deterministically a recipe that still needs review.
//
// Nothing here changes a mapping: the only save is a round trip that writes the
// fixture's own mappings back unchanged.

test.use({ storageState: storageStateFor('recipes') });

const QUEUE_URL = '/rezepte/admin/nutrition/review';
const stat = (page: import('@playwright/test').Page, name: string) =>
	page.locator(`[data-stat="${name}"]`);

test('counts the recipes that are done against the ones still open', async ({ page }) => {
	await gotoHydrated(page, QUEUE_URL);

	const green = Number(await stat(page, 'green').innerText());
	const pending = Number(await stat(page, 'pending').innerText());
	const total = Number(await stat(page, 'total').innerText());

	expect(total).toBeGreaterThan(0);
	// Every recipe is in exactly one of the two buckets — the claim the whole
	// page rests on.
	expect(green + pending).toBe(total);

	// And the same split, as the percentage the progress bar reports.
	const bar = page.getByRole('progressbar');
	const shown = Number(await bar.getAttribute('aria-valuenow'));
	expect(shown).toBeCloseTo((green / total) * 100, 0);
});

test('lists a recipe with open lines, badged with what it needs', async ({ page }) => {
	await gotoHydrated(page, QUEUE_URL);

	const row = page.locator('[data-review-row="e2e_pruefung"]');
	await expect(row).toBeVisible();
	// Rätselzutat matches nothing; Olivenöl states no amount.
	await expect(row.locator('.badge[data-state="open"]')).toBeVisible();
	await expect(row.locator('.badge[data-state="unsure"]')).toBeVisible();
});

test('walks into a recipe and shows its mapper', async ({ page }) => {
	await gotoHydrated(page, QUEUE_URL);
	await page.locator('[data-review-row="e2e_pruefung"]').click();

	await expect(page).toHaveURL(/\/rezepte\/admin\/nutrition\/review\/e2e_pruefung$/);
	// The editor's triage cards, in the same states the editor shows them in.
	await expect(page.locator('[data-mapper-card][aria-label="Rätselzutat"]')).toHaveAttribute(
		'data-state',
		'open',
	);
	await expect(page.locator('[data-mapper-card], [data-base-card]')).toHaveCount(7);
});

test('saving stays put and leaves the mappings as they were', async ({ page }) => {
	await gotoHydrated(page, `${QUEUE_URL}/e2e_pruefung`);

	await page.getByRole('button', { name: 'Speichern', exact: true }).click();

	// Same page, same states: a round trip through the action must not silently
	// re-triage anything.
	await expect(page).toHaveURL(/\/review\/e2e_pruefung$/);
	await expect(page.locator('[data-mapper-card][aria-label="Rätselzutat"]')).toHaveAttribute(
		'data-state',
		'open',
	);
	await expect(page.locator('[data-mapper-card][aria-label="Mehl"]')).toHaveAttribute(
		'data-state',
		'ok',
	);
});

test('skipping ahead moves to another recipe that needs work', async ({ page }) => {
	await gotoHydrated(page, `${QUEUE_URL}/e2e_pruefung`);

	const skip = page.getByRole('link', { name: 'Ohne Speichern weiter' });
	if ((await skip.count()) === 0) return; // e2e_pruefung is the only one left open

	await skip.click();
	await expect(page).not.toHaveURL(/\/review\/e2e_pruefung$/);
	await expect(page).toHaveURL(/\/rezepte\/admin\/nutrition\/review\/.+/);
});
