import { test, expect } from '@playwright/test';
import { ANONYMOUS, storageStateFor } from '../helpers/auth';
import { gotoHydrated } from '../helpers/nav';

// Recipe detail interactions: portion scaling + cake-form (public), and the
// favourite toggle (requires login + rezepte_users).

test.describe('portion scaling', () => {
	test.use({ storageState: ANONYMOUS });

	test('multiplier rescales ingredient amounts', async ({ page }) => {
		await gotoHydrated(page, '/rezepte/schokokuchen');
		// Fixture "Mehl" starts at 250 g.
		await expect(page.getByText('250 g').first()).toBeVisible();

		await page.getByRole('button', { name: '2x', exact: true }).click();
		await expect(page.getByText('500 g').first()).toBeVisible();
		await expect(page).toHaveURL(/multiplier=2/);
	});

	test('cake-form scaler expands for a form recipe', async ({ page }) => {
		await gotoHydrated(page, '/rezepte/gugelhupf');
		const toggle = page.locator('button.cake-form-toggle');
		await expect(toggle).toHaveAttribute('aria-expanded', 'false');
		await toggle.click();
		await expect(toggle).toHaveAttribute('aria-expanded', 'true');
	});
});

test.describe('favourite toggle (logged in)', () => {
	test.use({ storageState: storageStateFor('recipes') });

	test('toggles favourite state on a recipe', async ({ page }) => {
		await gotoHydrated(page, '/rezepte/pfannkuchen');
		const fav = page.locator('button.favorite-button');
		await expect(fav).toBeVisible();

		const before = await fav.getAttribute('aria-label');
		await fav.click();
		await expect.poll(() => fav.getAttribute('aria-label')).not.toBe(before);

		await fav.click(); // toggle back to leave state clean
		await expect.poll(() => fav.getAttribute('aria-label')).toBe(before);
	});
});
