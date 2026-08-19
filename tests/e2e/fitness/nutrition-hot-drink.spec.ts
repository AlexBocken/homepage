import { test, expect } from '@playwright/test';
import { storageStateFor } from '../helpers/auth';
import { gotoHydrated } from '../helpers/nav';

// The liquids card's one-tap hot drink: a mug button that logs a fixed 250 ml of
// the configured BLS drink, tops up the row it already made instead of stacking a
// second one, and can be switched off entirely.

test.use({ storageState: storageStateFor('fitness') });

const BLACK_TEA = 'Schwarztee (Getränk)';

/** Removes every logged black tea, so the spec can be re-run as-is. */
async function clearTea(page: import('@playwright/test').Page) {
	const cards = page.locator('.food-card').filter({ hasText: BLACK_TEA });
	for (let left = await cards.count(); left > 0; left--) {
		await cards.first().getByRole('button', { name: /^(Delete|Löschen)$/i }).click();
		await page.getByRole('button', { name: /^(Remove|Entfernen)$/i }).click();
		await expect(cards).toHaveCount(left - 1);
	}
}

test('the mug button logs 250 ml and tops up the same entry on a second tap', async ({ page }) => {
	await gotoHydrated(page, '/fitness/nutrition');
	await clearTea(page);

	const mugButton = page.locator('button.hot-drink-add');
	await expect(mugButton).toBeVisible();
	// On by default, and present in the server's own markup.
	expect(await (await page.request.get('/fitness/nutrition')).text()).toContain('hot-drink-add');

	const teaRow = page.locator('.beverage-item').filter({ hasText: BLACK_TEA });
	await mugButton.click();
	await expect(teaRow).toHaveCount(1);
	await expect(teaRow).toContainText('250 ml');
	// A hot drink is drawn as a mug, never as one of the water glasses.
	await expect(page.locator('.water-cup.hot-drink')).toHaveCount(1);

	// Second tap grows that row rather than opening another one.
	await mugButton.click();
	await expect(teaRow).toContainText('500 ml');
	await expect(teaRow).toHaveCount(1);
	await expect(page.locator('.food-card').filter({ hasText: BLACK_TEA })).toHaveCount(1);

	await clearTea(page);
	await expect(page.locator('.beverage-item').filter({ hasText: BLACK_TEA })).toHaveCount(0);
});

test('clicking a mug pours away that cup and every one after it', async ({ page }) => {
	await gotoHydrated(page, '/fitness/nutrition');
	await clearTea(page);

	const mugButton = page.locator('button.hot-drink-add');
	const mugs = page.locator('.water-cup.hot-drink');
	const teaRow = page.locator('.beverage-item').filter({ hasText: BLACK_TEA });

	for (let i = 0; i < 3; i++) await mugButton.click();
	await expect(mugs).toHaveCount(3);
	await expect(teaRow).toContainText('750 ml');

	// The last mug takes only itself.
	await mugs.nth(2).click();
	await expect(mugs).toHaveCount(2);
	await expect(teaRow).toContainText('500 ml');

	// The first takes the lot, same as clicking the first logged glass of water.
	await mugs.first().click();
	await expect(mugs).toHaveCount(0);
	await expect(teaRow).toHaveCount(0);
	// And the button to pour another is still there.
	await expect(mugButton).toBeVisible();
});

test('the drink settings switch the button off and pick another BLS drink', async ({ page }) => {
	await gotoHydrated(page, '/fitness/nutrition');

	await page.getByRole('button', { name: /Drink settings|Getränke-Einstellungen/i }).click();

	// Another drink from the picker becomes what the button logs.
	const picker = page.locator('select.drink-select');
	await picker.selectOption({ label: 'Green tea' });
	await expect(page.locator('button.hot-drink-add')).toHaveAttribute('title', /Green tea/);

	// Off means gone, not greyed out.
	await page.getByRole('checkbox', { name: /One-tap hot drink/i }).setChecked(false);
	await expect(page.locator('button.hot-drink-add')).toHaveCount(0);
	await expect(picker).toHaveCount(0);

	// And the choice survives a reload — served that way, not corrected afterwards.
	// The button used to render for everyone and vanish a moment after hydration.
	const html = await (await page.request.get('/fitness/nutrition')).text();
	expect(html).not.toContain('hot-drink-add');

	await gotoHydrated(page, '/fitness/nutrition');
	await expect(page.locator('button.hot-drink-add')).toHaveCount(0);

	// Restore the default so the rest of the suite sees the button.
	await page.getByRole('button', { name: /Drink settings|Getränke-Einstellungen/i }).click();
	await page.getByRole('checkbox', { name: /One-tap hot drink/i }).setChecked(true);
	await page.locator('select.drink-select').selectOption({ label: 'Black tea' });
});
