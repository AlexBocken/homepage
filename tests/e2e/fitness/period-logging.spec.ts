import { test, expect, type Page } from '@playwright/test';
import { storageStateFor } from '../helpers/auth';
import { gotoHydrated } from '../helpers/nav';

// Period tracker INPUT + persistence, driven and verified entirely through the
// UI. Runs as the e2e_full user (also female-profiled) so anna's analysis
// fixtures stay pristine. Serial + self-cleaning via the UI delete buttons.

test.use({ storageState: storageStateFor('full') });
test.describe.configure({ mode: 'serial' });

const items = (page: Page) => page.locator('.history-item');

/** Ensure the history list is expanded. */
async function openHistory(page: Page) {
	if (await items(page).first().isVisible().catch(() => false)) return;
	await page.getByRole('button', { name: /^History$/i }).first().click();
	await items(page).first().waitFor({ state: 'visible', timeout: 8000 }).catch(() => {});
}

/** End any ongoing period so a fresh one can be started (idempotent re-runs). */
async function endOngoing(page: Page) {
	const ended = page.getByRole('button', { name: /period ended/i });
	if (await ended.count()) {
		await ended.first().click();
		await page.waitForTimeout(400);
	}
}

test('start a period, confirm it persists on reload, end it, then delete it', async ({ page }) => {
	await gotoHydrated(page, '/fitness/check-in');
	await endOngoing(page);
	await openHistory(page);
	const before = await items(page).count();

	// Start → the UI reflects an ongoing period.
	await page.getByRole('button', { name: /^Start Period$/i }).click();
	await expect(page.getByRole('button', { name: /period ended/i })).toBeVisible();
	await expect(page.getByText(/Day 1/i).first()).toBeVisible();

	// Persists across a reload (read back from the server, in the UI).
	await gotoHydrated(page, '/fitness/check-in');
	await expect(page.getByRole('button', { name: /period ended/i })).toBeVisible();

	// End → the completed cycle shows up in history.
	await page.getByRole('button', { name: /period ended/i }).click();
	await expect(page.getByRole('button', { name: /^Start Period$/i })).toBeVisible();
	await openHistory(page);
	await expect.poll(() => items(page).count()).toBe(before + 1);

	// Delete it via the history UI → back to the original list.
	await items(page).first().locator('button[aria-label="Delete"]').click();
	await page.locator('button.confirm-btn.confirm').click();
	await expect.poll(() => items(page).count()).toBe(before);
});

test('edit a period entry date and see the change persist', async ({ page }) => {
	await gotoHydrated(page, '/fitness/check-in');
	await openHistory(page);
	const first = items(page).first();
	const originalText = (await first.innerText()).replace(/\s+/g, ' ').trim(); // e.g. "Jun 5 — Jun 10 6 days"

	await first.locator('button[aria-label="Edit"]').click();
	// Advance the end date by one day (2nd picker in the edit form = end).
	await page.locator('.history-item.editing button[aria-label="Next day"]').nth(1).click();
	await page.getByRole('button', { name: /^Save$/i }).click();

	// The history row now shows a later end date / longer duration.
	await expect.poll(() => items(page).first().innerText().then((t) => t.replace(/\s+/g, ' ').trim())).not.toBe(originalText);

	// Survives a reload.
	await gotoHydrated(page, '/fitness/check-in');
	await openHistory(page);
	await expect(items(page).first()).not.toHaveText(new RegExp(originalText.replace(/[.*+?^${}()|[\]\\—]/g, '\\$&')));

	// Revert so the fixture is unchanged for re-runs.
	await items(page).first().locator('button[aria-label="Edit"]').click();
	await page.locator('.history-item.editing button[aria-label="Previous day"]').nth(1).click();
	await page.getByRole('button', { name: /^Save$/i }).click();
	await expect.poll(() => items(page).first().innerText().then((t) => t.replace(/\s+/g, ' ').trim())).toBe(originalText);
});

test('add a past period via the form and see it in history', async ({ page }) => {
	await gotoHydrated(page, '/fitness/check-in');
	await openHistory(page);
	const before = await items(page).count();

	await page.getByRole('button', { name: /Add Past Period/i }).click();
	const form = page.locator('.add-form, .history-item.editing').last();
	await expect(form).toBeVisible();
	// Back-date the start a week so it's clearly a past cycle.
	const prevDay = form.locator('button[aria-label="Previous day"]').first();
	for (let i = 0; i < 7; i++) await prevDay.click();
	await page.getByRole('button', { name: /^Save$/i }).click();

	// A new row appears and survives a reload.
	await expect.poll(() => items(page).count()).toBe(before + 1);
	await gotoHydrated(page, '/fitness/check-in');
	await openHistory(page);
	await expect(items(page)).toHaveCount(before + 1);

	// Clean up via the UI delete (the added cycle is the most recent → first).
	await items(page).first().locator('button[aria-label="Delete"]').click();
	await page.locator('button.confirm-btn.confirm').click();
	await expect.poll(() => items(page).count()).toBe(before);
});
