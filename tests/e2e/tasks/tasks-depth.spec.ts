import { test, expect, type Page } from '@playwright/test';
import { storageStateFor } from '../helpers/auth';
import { gotoHydrated } from '../helpers/nav';

// Tasks input + persistence: complete, edit and delete a task through the UI.
// Each test creates its own task. Serial so completion's sticker popup and the
// shared list don't interfere.

test.use({ storageState: storageStateFor('tasks') });
test.describe.configure({ mode: 'serial' });

async function createTask(page: Page): Promise<string> {
	const title = `E2E Depth ${Date.now()}`;
	await gotoHydrated(page, '/tasks/new');
	await page.locator('#title').fill(title);
	await page.getByRole('button', { name: /anna/i }).first().click();
	await page.getByRole('button', { name: 'Erstellen', exact: true }).click();
	await page.waitForURL(/\/tasks$/);
	await expect(page.getByText(title).first()).toBeVisible();
	return title;
}

const cardFor = (page: Page, title: string) => page.locator('[class*=card]').filter({ hasText: title }).first();

test('delete a task', async ({ page }) => {
	const title = await createTask(page);
	const card = cardFor(page, title);
	await card.hover();
	await card.locator('[title="Löschen"]').click();
	await page.locator('button.confirm-btn.confirm').click();
	await expect(page.getByText(title)).toHaveCount(0);
});

test('edit a task title and confirm it persists', async ({ page }) => {
	const title = await createTask(page);
	await cardFor(page, title).hover();
	await cardFor(page, title).locator('[title="Bearbeiten"]').click();
	await expect(page).toHaveURL(/\/tasks\/[a-f0-9]+\/edit/);

	const newTitle = `${title} edited`;
	await page.locator('#title').fill(newTitle);
	await page.getByRole('button', { name: /Aktualisieren/i }).click();
	await page.waitForURL(/\/tasks$/);

	await expect(page.getByText(newTitle).first()).toBeVisible();

	// Clean up.
	await cardFor(page, newTitle).hover();
	await cardFor(page, newTitle).locator('[title="Löschen"]').click();
	await page.locator('button.confirm-btn.confirm').click();
});

test('complete a task and see it recorded in the history', async ({ page }) => {
	const title = await createTask(page);
	await cardFor(page, title).locator('.btn-complete').click();
	// A sticker reward popup appears; the completed (non-recurring) task leaves
	// the active list.
	await expect(page.getByText(title)).toHaveCount(0, { timeout: 10_000 });

	// The completion is recorded in the history log.
	await gotoHydrated(page, '/tasks/verlauf');
	await expect(page.getByText(title).first()).toBeVisible();
});
