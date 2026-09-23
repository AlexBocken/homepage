import { test, expect } from '@playwright/test';
import { ANONYMOUS } from '../helpers/auth';
import { gotoHydrated } from '../helpers/nav';

test.use({ storageState: ANONYMOUS });

test('prayers list filters by category and search, and opens a prayer', async ({ page }) => {
	await gotoHydrated(page, '/glaube/gebete');
	await expect(page.getByRole('heading', { name: 'Gebete', level: 1 })).toBeVisible();

	const cards = page.locator('a:has(h2)');
	const initial = await cards.count();
	expect(initial).toBeGreaterThan(3);

	// Category filter: Marianisch narrows the rendered set (URL-driven).
	await page.getByRole('link', { name: 'Marianisch', exact: true }).click();
	await expect.poll(() => cards.count()).toBeLessThan(initial);

	// Live search keeps the matching prayer present.
	await page.getByRole('link', { name: /Alle/ }).first().click();
	await page.getByPlaceholder(/suchen/i).fill('Ave');
	await expect(page.getByRole('link', { name: /^Ave Maria/ })).toBeVisible();
});

test('opens the Ave Maria prayer', async ({ page }) => {
	await page.goto('/glaube/gebete/ave-maria');
	await expect(page.getByRole('heading', { name: 'Ave Maria', level: 1 })).toBeVisible();
});

test('the Ave Maria page names its verses in Luke, and they peek', async ({ page }) => {
	await page.setViewportSize({ width: 1400, height: 900 });
	await gotoHydrated(page, '/glaube/gebete/ave-maria');
	const note = page.locator('.scripture-note');
	await expect(note.getByRole('heading', { name: 'Woher die Worte stammen' })).toBeVisible();
	const ref = note.locator('.ref', { hasText: 'Lk 1,28' });
	await ref.hover();
	const peek = page.locator('.peek').first();
	await expect(peek).toBeVisible();
	await expect(peek).toContainText(/Gnade/);
});

test('the Angelus page cites John 1,14 and links the Hail Mary', async ({ page }) => {
	await gotoHydrated(page, '/glaube/gebete/angelus');
	const note = page.locator('.scripture-note');
	await expect(note.locator('.ref', { hasText: 'Joh 1,14' })).toBeVisible();
	await expect(note.getByRole('link', { name: 'Ave Maria' })).toHaveAttribute('href', '/glaube/gebete/ave-maria');
});

test('the Hail Mary page carries the note in English', async ({ page }) => {
	await page.goto('/faith/prayers/hail-mary');
	const note = page.locator('.scripture-note');
	await expect(note.getByRole('heading', { name: 'Where the words come from' })).toBeVisible();
	await expect(note.locator('.ref', { hasText: 'Lk 1:42' })).toBeVisible();
});

test('the Angelus streak explainer peeks its Catechism citations', async ({ page }) => {
	await page.setViewportSize({ width: 1400, height: 900 });
	await gotoHydrated(page, '/glaube/gebete/angelus');
	await page.locator('.angelus-streak .info-btn').click();
	const dialog = page.getByRole('dialog', { name: 'Über diese Zählung' });
	await expect(dialog).toBeVisible();
	const ccc = dialog.locator('.cref').first();
	await expect(ccc).toHaveText('KKK 2698');
	await ccc.hover();
	await expect(page.locator('.peek').first()).toBeVisible();
});
