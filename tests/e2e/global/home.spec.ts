import { test, expect } from '@playwright/test';
import { ANONYMOUS, storageStateFor } from '../helpers/auth';
import { gotoHydrated } from '../helpers/nav';

test.describe('home tiles (logged out)', () => {
	test.use({ storageState: ANONYMOUS });

	test('the pages grid renders and public tiles navigate', async ({ page }) => {
		await page.goto('/');
		await expect(page.getByRole('heading', { name: /^(Seiten|Pages)$/ })).toBeVisible();

		await page.getByRole('link', { name: 'Rezepte', exact: true }).click();
		await expect(page).toHaveURL(/\/rezepte$/);
	});

	test('a locked tile sends a logged-out user to login', async ({ page }) => {
		await gotoHydrated(page, '/');
		await page.getByRole('link', { name: 'Fitness', exact: true }).click();
		await expect(page).toHaveURL(/\/login|localhost:9100/);
	});
});

test.describe('home tiles (logged in)', () => {
	test.use({ storageState: storageStateFor('full') });

	test('a gated tile opens for a permitted user', async ({ page }) => {
		await gotoHydrated(page, '/');
		await page.getByRole('link', { name: 'Fitness', exact: true }).click();
		await expect(page).toHaveURL(/\/fitness/);
	});
});
