import { test, expect, type Page } from '@playwright/test';
import { storageStateFor } from '../helpers/auth';
import { gotoHydrated } from '../helpers/nav';

// Period tracker INPUT + persistence (start/end/add/edit/delete). Runs as the
// e2e_full user (also female-profiled) so anna's analysis fixtures stay pristine.
// Serial + self-cleaning so the shared history is stable between checks.

test.use({ storageState: storageStateFor('full') });
test.describe.configure({ mode: 'serial' });

async function periodEntries(page: Page): Promise<{ _id: string; startDate: string; endDate: string | null }[]> {
	return (await (await page.request.get('/api/fitness/period')).json()).entries;
}

/** End any ongoing period and delete entries created after `keepIds` (cleanup). */
async function reset(page: Page, keepIds: Set<string>) {
	const ended = page.getByRole('button', { name: /period ended/i });
	if (await ended.count()) {
		await ended.first().click();
		await page.waitForTimeout(500);
	}
	for (const e of await periodEntries(page)) {
		if (!keepIds.has(e._id)) await page.request.delete(`/api/fitness/period/${e._id}`);
	}
}

test('start a period, confirm it persists, end it, then delete it', async ({ page }) => {
	await gotoHydrated(page, '/fitness/check-in');
	const baseline = new Set((await periodEntries(page)).map((e) => e._id));
	await reset(page, baseline); // clear any leftover ongoing/entries from a prior run

	// Start → ongoing.
	await page.getByRole('button', { name: /^Start Period$/i }).click();
	await expect(page.getByText(/Day 1/i).first()).toBeVisible();
	await expect(page.getByRole('button', { name: /period ended/i })).toBeVisible();
	expect((await periodEntries(page)).length).toBe(baseline.size + 1);

	// Persists across a reload (server, not just local state).
	await page.reload();
	await page.waitForTimeout(800);
	await expect(page.getByRole('button', { name: /period ended/i })).toBeVisible();

	// End → completes the cycle.
	await page.getByRole('button', { name: /period ended/i }).click();
	await expect(page.getByRole('button', { name: /^Start Period$/i })).toBeVisible();
	const afterEnd = await periodEntries(page);
	const created = afterEnd.find((e) => !baseline.has(e._id))!;
	expect(created.endDate).not.toBeNull(); // now a completed cycle

	// Delete it via the history UI and confirm it's gone.
	await page.getByRole('button', { name: /^History$/i }).first().click();
	const delBtns = page.locator('button[aria-label="Delete"]');
	const before = await delBtns.count();
	await delBtns.first().click();
	await page.locator('button.confirm-btn.confirm').click();
	await expect.poll(() => delBtns.count()).toBe(before - 1);

	await reset(page, baseline); // safety net
	expect((await periodEntries(page)).length).toBe(baseline.size);
});

test('edit a period entry date and confirm it persists', async ({ page }) => {
	await gotoHydrated(page, '/fitness/check-in');
	const baseline = new Set((await periodEntries(page)).map((e) => e._id));

	// Own a fresh target: the newest entry → first in the history list.
	await page.request.post('/api/fitness/period', {
		data: { startDate: '2026-06-20T00:00:00.000Z', endDate: '2026-06-24T00:00:00.000Z' }
	});
	const created = (await periodEntries(page)).find((e) => !baseline.has(e._id))!;
	const originalEnd = new Date(created.endDate!).getTime();

	// Edit it in the UI: advance the end date one day (2nd picker = end).
	await page.reload();
	await page.waitForTimeout(600);
	await page.getByRole('button', { name: /^History$/i }).first().click();
	await page.locator('button[aria-label="Edit"]').first().click();
	const form = page.locator('.history-item.editing');
	await expect(form).toBeVisible();
	await form.locator('button[aria-label="Next day"]').nth(1).click();
	await page.getByRole('button', { name: /^Save$/i }).click();
	await page.waitForTimeout(500);

	// The change persisted server-side (end moved later).
	const after = (await periodEntries(page)).find((e) => e._id === created._id)!;
	expect(new Date(after.endDate!).getTime()).toBeGreaterThan(originalEnd);

	await page.request.delete(`/api/fitness/period/${created._id}`);
	expect((await periodEntries(page)).length).toBe(baseline.size);
});

test('add a past period via the form and confirm it persists', async ({ page }) => {
	await gotoHydrated(page, '/fitness/check-in');
	const baseline = new Set((await periodEntries(page)).map((e) => e._id));

	await page.getByRole('button', { name: /^History$/i }).first().click();
	await page.getByRole('button', { name: /Add Past Period/i }).click();
	const form = page.locator('.add-form, .history-item.editing').last();
	await expect(form).toBeVisible();
	// Back-date the start a week so it's clearly a past cycle.
	const prevDay = form.locator('button[aria-label="Previous day"]').first();
	for (let i = 0; i < 7; i++) await prevDay.click();
	await page.getByRole('button', { name: /^Save$/i }).click();
	await page.waitForTimeout(600);

	// A new entry was persisted.
	const after = await periodEntries(page);
	const created = after.filter((e) => !baseline.has(e._id));
	expect(created.length).toBe(1);

	// Clean up.
	await page.request.delete(`/api/fitness/period/${created[0]._id}`);
	expect((await periodEntries(page)).length).toBe(baseline.size);
});
