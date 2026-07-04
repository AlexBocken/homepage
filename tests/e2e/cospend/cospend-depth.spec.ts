import { test, expect, type Page } from '@playwright/test';
import { storageStateFor } from '../helpers/auth';
import { gotoHydrated } from '../helpers/nav';

// Cospend input + persistence: add a payment, edit its amount, verify the change
// persisted, then delete it — all through the UI. Self-contained (owns its
// payment) so it doesn't disturb the seeded pool.

test.use({ storageState: storageStateFor('cospend') });

async function addPayment(page: Page, title: string, amount: string) {
	await gotoHydrated(page, '/expenses/payments/add');
	await page.locator('#title').fill(title);
	await page.locator('#amount').fill(amount);
	await page.getByRole('button', { name: /Create payment/i }).click();
	await expect(page).toHaveURL(/\/expenses\/dash/);
}

async function openEdit(page: Page, title: string) {
	await gotoHydrated(page, '/expenses/payments');
	await page.getByText(title).first().click();
	await expect(page).toHaveURL(/\/payments\/view\//);
	await page.locator('a[href*="/payments/edit/"]').first().click();
	await expect(page).toHaveURL(/\/payments\/edit\//);
}

test('add a payment, edit its amount, then delete it', async ({ page }) => {
	const title = `E2E Pay ${Date.now()}`;
	await addPayment(page, title, '42');

	// Edit the amount 42 → 99.
	await openEdit(page, title);
	await page.locator('#amount').fill('99');
	await page.getByRole('button', { name: /Save changes/i }).click();
	await expect(page).toHaveURL(/\/payments(\b|\/|$)/);

	// The new amount persisted (visible on the payment view).
	await gotoHydrated(page, '/expenses/payments');
	await page.getByText(title).first().click();
	await expect(page.getByText(/99/).first()).toBeVisible();

	// Delete it from the edit page.
	await page.locator('a[href*="/payments/edit/"]').first().click();
	await page.getByRole('button', { name: /Delete payment/i }).click();
	await page.locator('button.confirm-btn.confirm').click();

	await gotoHydrated(page, '/expenses/payments');
	await expect(page.getByText(title)).toHaveCount(0);
});

test('create a recurring payment and delete it', async ({ page }) => {
	await gotoHydrated(page, '/expenses/payments/add');
	const title = `E2E Recurring ${Date.now()}`;
	await page.locator('#title').fill(title);
	await page.locator('#amount').fill('25');
	await page.getByText(/Make this a recurring/i).click(); // reveals frequency + dates
	await page.getByRole('button', { name: /Create payment/i }).click();
	await page.waitForTimeout(800);

	// It shows on the recurring page.
	await gotoHydrated(page, '/expenses/recurring');
	await expect(page.getByText(title).first()).toBeVisible();

	// Delete it.
	const card = page.locator('[class*=card]').filter({ hasText: title }).first();
	await card.getByRole('button', { name: /Delete|Löschen/i }).click();
	await page.locator('button.confirm-btn.confirm').click();
	await expect(page.getByText(title)).toHaveCount(0);
});
