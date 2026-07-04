import { test, expect } from '@playwright/test';
import { storageStateFor } from '../helpers/auth';
import { gotoHydrated } from '../helpers/nav';

// Cospend requires login + the `cospend` group. Uses the /expenses (English)
// slug for stable labels. Data is the seeded alexander/anna shared pool.

test.use({ storageState: storageStateFor('cospend') });

test('dashboard shows recent activity from seeded payments', async ({ page }) => {
	await gotoHydrated(page, '/expenses/dash');
	await expect(page.getByText(/Wocheneinkauf|Restaurant|Kinoabend/).first()).toBeVisible();
});

test('payments list shows seeded payments and filters by search', async ({ page }) => {
	await gotoHydrated(page, '/expenses/payments');
	await expect(page.getByText('Wocheneinkauf')).toBeVisible();

	await page.getByPlaceholder(/Search payments/i).fill('Kino');
	await expect(page.getByText('Kinoabend')).toBeVisible();
	await expect(page.getByText('Wocheneinkauf')).toBeHidden();
});

test('add a payment and see it on the dashboard', async ({ page }) => {
	await gotoHydrated(page, '/expenses/payments/add');
	const title = `E2E Zahlung ${Date.now()}`;
	await page.locator('#title').fill(title);
	await page.locator('#amount').fill('42');
	await page.getByRole('button', { name: /Create payment/i }).click();

	await expect(page).toHaveURL(/\/expenses\/dash/);
	await expect(page.getByText(title)).toBeVisible();
});

test('shopping list: add, check, and clear an item', async ({ page }) => {
	// The list holds a live SSE stream open, so networkidle never settles — wait
	// for the add input instead.
	await page.goto('/expenses/list');
	const addInput = page.getByPlaceholder(/Add item/i);
	await addInput.waitFor({ state: 'visible' });
	await page.waitForTimeout(500);
	const item = `E2E Milch ${Date.now()}`;

	await addInput.fill(item);
	await page.locator('.btn-add').click();

	// Auto-categorisation can briefly render the item in two sections, so target
	// the first match.
	const card = page.locator('.item-card').filter({ hasText: item }).first();
	await expect(card).toBeVisible();
	await page.waitForTimeout(800); // let the item sync (server id) before toggling

	// Toggle can race the realtime sync; retry until the checked state sticks.
	await expect(async () => {
		await card.click();
		await expect(card).toHaveClass(/checked/, { timeout: 1500 });
	}).toPass({ timeout: 12_000 });

	await page.locator('.btn-clear-checked').click();
	await expect(page.locator('.item-card.checked').filter({ hasText: item })).toHaveCount(0);
});

// The shared pool is between alexander & anna; only the anna role has a personal
// balance. Read-only settle assertion so it doesn't mutate shared seeded state.
test.describe('as anna (has a personal balance)', () => {
	test.use({ storageState: storageStateFor('anna') });

	test('settle page surfaces a debt and its details', async ({ page }) => {
		await gotoHydrated(page, '/expenses/settle');
		const option = page.locator('.settlement-option').first();
		await expect(option).toBeVisible();

		await option.click();
		await expect(page.locator('#amount')).toBeVisible();
		await expect(page.getByRole('button', { name: /Record Settlement/i })).toBeVisible();
	});
});
