import { test, expect, type Page } from '@playwright/test';
import { storageStateFor } from '../helpers/auth';
import { gotoHydrated } from '../helpers/nav';

// Portion sizes: log a food in portions rather than grams, and check the chosen
// basis survives a round-trip. Grams stay canonical everywhere — the portion is
// only how the amount is entered and restated. Serial since these share the
// e2e_fitness diary; each test deletes what it logs.
//
// 'nutella' is an OFF product cloned from the dev DB and carries a serving size,
// so its portion dropdown is populated.

test.use({ storageState: storageStateFor('fitness') });
test.describe.configure({ mode: 'serial' });

/** Open the add-food panel and select the first result for `query`. */
async function selectFood(page: Page, query: string): Promise<string> {
	await page.getByRole('button', { name: 'Add food' }).first().click();
	await page.getByPlaceholder(/Search food/i).fill(query);
	const row = page.locator('.fs-result-row').first();
	await expect(row).toBeVisible();
	const name = (await row.locator('.fs-result-name').innerText()).trim();
	await row.locator('button.fs-result').click();
	return name;
}

async function deleteCard(page: Page, name: string) {
	const card = page.locator('.food-card').filter({ hasText: name });
	await card.first().locator('button[aria-label="Delete"]').click();
	await page.locator('button.confirm-btn.confirm').click();
	await expect(card).toHaveCount(0);
}

test('an OFF food offers portions and defaults to one of them', async ({ page }) => {
	await gotoHydrated(page, '/fitness/nutrition');
	await selectFood(page, 'nutella');

	// A portion basis, not raw grams: the unit select carries 'g' plus at least
	// one real portion, and the amount defaults to 1 of it.
	const unit = page.locator('.pa-unit');
	await expect(unit).toBeVisible();
	expect(await unit.locator('option').count()).toBeGreaterThan(1);
	await expect(page.locator('.pa-qty')).toHaveValue('1');
	await expect(unit).not.toHaveValue('-1');

	// The gram equivalent of the chosen portion is spelled out.
	await expect(page.locator('.pa-hint')).toContainText(/= \d+ g/);
});

test('logging 2 portions stores 2x the grams and restates it as a portion count', async ({ page }) => {
	await gotoHydrated(page, '/fitness/nutrition');
	const name = await selectFood(page, 'nutella');

	// Read the portion's gram weight off the hint at qty 1, then log two of them.
	const hint = page.locator('.pa-hint');
	const oneGrams = Number((await hint.innerText()).match(/= (\d+) g/)![1]);
	expect(oneGrams).toBeGreaterThan(0);

	await page.locator('.pa-qty').fill('2');
	await expect(hint).toHaveText(`= ${oneGrams * 2} g`);

	await page.locator('button.fs-btn-confirm').click();

	// The diary shows the portion count *and* the real grams — grams are canonical.
	const card = page.locator('.food-card').filter({ hasText: name }).first();
	await expect(card.locator('.food-card-detail')).toContainText(`2 × `);
	await expect(card.locator('.food-card-detail')).toContainText(`${oneGrams * 2} g`);

	await deleteCard(page, name);
});

test('the chosen portion survives a reload and reopens in the edit form', async ({ page }) => {
	await gotoHydrated(page, '/fitness/nutrition');
	const name = await selectFood(page, 'nutella');
	const unitLabel = await page.locator('.pa-unit option:checked').innerText();
	await page.locator('.pa-qty').fill('2');
	await page.locator('button.fs-btn-confirm').click();

	const card = page.locator('.food-card').filter({ hasText: name }).first();
	await expect(card.locator('.food-card-detail')).toContainText('2 × ');

	// Persisted, not just client state.
	await gotoHydrated(page, '/fitness/nutrition');
	await expect(card.locator('.food-card-detail')).toContainText('2 × ');

	// Editing reopens on the same basis rather than collapsing to raw grams.
	await card.locator('button[aria-label="Edit"]').click();
	await expect(card.locator('.pa-qty')).toHaveValue('2');
	await expect(card.locator('.pa-unit option:checked')).toHaveText(unitLabel);

	await deleteCard(page, name);
});

test('switching the unit to grams holds the amount steady and drops the portion', async ({ page }) => {
	await gotoHydrated(page, '/fitness/nutrition');
	const name = await selectFood(page, 'nutella');

	const grams = Number((await page.locator('.pa-hint').innerText()).match(/= (\d+) g/)![1]);
	await page.locator('.pa-unit').selectOption('-1');

	// Same food, same amount — only the units it's expressed in changed.
	await expect(page.locator('.pa-qty')).toHaveValue(String(grams));
	await expect(page.locator('.pa-hint')).toHaveCount(0);

	await page.locator('button.fs-btn-confirm').click();
	const card = page.locator('.food-card').filter({ hasText: name }).first();
	await expect(card.locator('.food-card-detail')).toContainText(`${grams} g`);
	await expect(card.locator('.food-card-detail')).not.toContainText('×');

	await deleteCard(page, name);
});

test('a BLS food, which has no portions, still logs in plain grams', async ({ page }) => {
	await gotoHydrated(page, '/fitness/nutrition');
	const name = await selectFood(page, 'apple');

	// BLS ships no portion table — the unit select collapses to a static 'g'.
	await expect(page.locator('.pa-unit')).toHaveCount(0);
	await expect(page.locator('.pa-unit-label')).toHaveText('g');
	await expect(page.locator('.pa-qty')).toHaveValue('100');

	await page.locator('button.fs-btn-confirm').click();
	const card = page.locator('.food-card').filter({ hasText: name }).first();
	await expect(card.locator('.food-card-detail')).toContainText('100 g');

	await deleteCard(page, name);
});
