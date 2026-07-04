import { test, expect } from '@playwright/test';
import { ANONYMOUS } from '../helpers/auth';

// The faith domain is fully public.

test.use({ storageState: ANONYMOUS });

test('faith landing renders and tiles navigate', async ({ page }) => {
	await page.goto('/glaube');
	await expect(page.getByRole('heading', { name: 'Glaube', level: 1 })).toBeVisible();

	// Prayers tile → prayers list.
	await page.getByRole('link', { name: /Gebete/ }).first().click();
	await expect(page).toHaveURL(/\/glaube\/gebete/);
	await expect(page.getByRole('heading', { name: 'Gebete', level: 1 })).toBeVisible();
});

test('English + Latin landings resolve via the language slug', async ({ page }) => {
	await page.goto('/faith');
	await expect(page.getByRole('heading', { name: 'Faith', level: 1 })).toBeVisible();

	await page.goto('/fides');
	await expect(page.getByRole('heading', { name: 'Fides', level: 1 })).toBeVisible();
});
