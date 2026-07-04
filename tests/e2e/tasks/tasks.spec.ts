import { test, expect } from '@playwright/test';
import { storageStateFor } from '../helpers/auth';
import { gotoHydrated } from '../helpers/nav';

// Tasks require login + task_users. Household-global (assignees anna/alexander).

test.use({ storageState: storageStateFor('tasks') });

test('create a task and see it in the list', async ({ page }) => {
	await gotoHydrated(page, '/tasks/new');
	const title = `E2E Aufgabe ${Date.now()}`;

	await page.locator('#title').fill(title);
	await page.getByRole('button', { name: /anna/i }).first().click(); // assignee

	await page.getByRole('button', { name: 'Erstellen', exact: true }).click();
	await expect(page).toHaveURL(/\/tasks$/);
	await expect(page.getByText(title)).toBeVisible();
});

test('rewards album renders', async ({ page }) => {
	await gotoHydrated(page, '/tasks/rewards');
	await expect(page.getByRole('heading', { name: /Sticker-Sammlung/ })).toBeVisible();
});

test('history (verlauf) renders', async ({ page }) => {
	await gotoHydrated(page, '/tasks/verlauf');
	await expect(page.getByRole('heading', { name: 'Verlauf' })).toBeVisible();
});
