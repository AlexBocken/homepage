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

	// Capture the daily-calorie target the preset set. This is the value stored
	// verbatim (goal.dailyCalories); the day view's macro *grams* are derived from
	// it plus burned calories and rounded, so they drift across a reload — assert
	// on the stable stored field instead.
	const calInput = page.locator('#goal-calories');
	await expect(calInput).toBeVisible();
	const savedCalories = await calInput.inputValue();
	expect(Number(savedCalories)).toBeGreaterThan(0);

	await page.getByRole('button', { name: /Next/i }).first().click(); // → step 3 (macros)
	await page.getByRole('button', { name: /^Save$/i }).click();

	// The saved goal drives the day view's macro bars (vs. the "set a goal" prompt).
	await expect(page.locator('.macro-bar-info').first()).toBeVisible();

	// Persisted: reload, the goal still drives the macro bars, and reopening the
	// wizard shows the same stored calorie target.
	await gotoHydrated(page, '/fitness/nutrition');
	await expect(page.locator('.macro-bar-info').first()).toBeVisible();

	await page.getByRole('button', { name: /Daily Goal/i }).first().click();
	await page.locator('.wizard-step').nth(1).click(); // → step 2 (calories)
	await expect(page.locator('#goal-calories')).toHaveValue(savedCalories);
});
