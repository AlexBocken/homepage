import { test, expect, type Page } from '@playwright/test';
import { storageStateFor } from '../helpers/auth';
import { gotoHydrated } from '../helpers/nav';

// Nutrition input + persistence: edit/delete a food-log entry and set a calorie
// goal — all through the UI. Serial since they share the e2e_fitness diary.

test.use({ storageState: storageStateFor('fitness') });
test.describe.configure({ mode: 'serial' });

async function logFood(page: Page, query: string): Promise<string> {
	await page.getByRole('button', { name: 'Add food' }).first().click();
	await page.getByPlaceholder(/Search food/i).fill(query);
	const row = page.locator('.fs-result-row').first();
	await expect(row).toBeVisible();
	const name = (await row.locator('.fs-result-name').innerText()).trim();
	await row.locator('button.fs-result').click();
	await page.locator('button.fs-btn-confirm').click();
	await expect(page.locator('.food-card').filter({ hasText: name }).first()).toBeVisible();
	return name;
}

test('log a food, then delete it from the diary', async ({ page }) => {
	await gotoHydrated(page, '/fitness/nutrition');
	const name = await logFood(page, 'nutella');
	const card = page.locator('.food-card').filter({ hasText: name });

	await card.first().locator('button[aria-label="Delete"]').click();
	await page.locator('button.confirm-btn.confirm').click();
	await expect(card).toHaveCount(0);
});

test('set a calorie goal via the wizard and it persists', async ({ page }) => {
	await gotoHydrated(page, '/fitness/nutrition');
	await page.getByRole('button', { name: /Daily Goal/i }).first().click();
	await page.getByRole('button', { name: /Maintain/i }).first().click(); // preset → step 2
	await page.getByRole('button', { name: /Next/i }).first().click(); // → step 3 (macros)
	await page.getByRole('button', { name: /^Save$/i }).click();

	// The saved goal drives the day view's macro targets; capture one and confirm
	// it survives a reload (server persistence).
	const macro = page.getByText(/\/\s*\d+\s*g\s*left/i).first();
	await expect(macro).toBeVisible();
	const targetGrams = (await macro.innerText()).match(/\/\s*(\d+)\s*g/)![1];

	await gotoHydrated(page, '/fitness/nutrition');
	await expect(page.getByText(new RegExp(`/\\s*${targetGrams}\\s*g\\s*left`, 'i')).first()).toBeVisible();
});
