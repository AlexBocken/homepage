import { test, expect } from '@playwright/test';
import { ANONYMOUS } from '../helpers/auth';
import { gotoHydrated } from '../helpers/nav';

test.use({ storageState: ANONYMOUS });

test('rosary renders and lets you pick a mystery set', async ({ page }) => {
	await gotoHydrated(page, '/glaube/rosenkranz');
	await expect(page.getByRole('heading', { name: 'Interaktiver Rosenkranz', level: 1 })).toBeVisible();

	const buttons = page.locator('a.mystery-button');
	await expect(buttons.first()).toBeVisible();

	const glorreich = buttons.filter({ hasText: 'Glorreichen' });
	await glorreich.click();
	await expect(glorreich).toHaveClass(/selected/);
});

test('luminous toggle adds/removes the fourth mystery', async ({ page }) => {
	await gotoHydrated(page, '/glaube/rosenkranz');
	const buttons = page.locator('a.mystery-button');
	const before = await buttons.count();

	// Toggle.svelte renders the label text next to the control (matches >1 node).
	const toggle = page.getByText('Lichtreiche Geheimnisse einbeziehen').first();
	await toggle.click();
	await expect.poll(() => buttons.count()).toBe(before === 4 ? 3 : before + 1);
	await toggle.click();
	await expect.poll(() => buttons.count()).toBe(before);
});

test('a bible reference opens a verse modal', async ({ page }) => {
	await gotoHydrated(page, '/glaube/rosenkranz');
	await page.locator('button.bible-reference-link').first().click();
	await expect(page.locator('.modal-backdrop')).toBeVisible();
	await expect(page.locator('.modal-reference')).toBeVisible();
});
