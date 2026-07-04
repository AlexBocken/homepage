import { test, expect } from '@playwright/test';
import { storageStateFor } from '../helpers/auth';
import { gotoHydrated } from '../helpers/nav';

test.use({ storageState: storageStateFor('fitness') });

test('nutrition day view opens food search and returns results', async ({ page }) => {
	await gotoHydrated(page, '/fitness/nutrition');

	// Open a food search (per-meal "Add food" or the global add FAB).
	const addFood = page.getByRole('button', { name: /Add food|Essen hinzufügen|hinzufügen/i }).first();
	await addFood.click();

	const search = page.getByPlaceholder(/Search food|Essen suchen|suchen/i).first();
	await search.fill('apple');

	// Results show calories.
	await expect(page.getByText(/kcal/i).first()).toBeVisible();
});
