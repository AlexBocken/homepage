import { test, expect } from '@playwright/test';
import { ANONYMOUS } from '../helpers/auth';
import { gotoHydrated } from '../helpers/nav';

test.use({ storageState: ANONYMOUS });

test('liturgical calendar switches rite and view', async ({ page }) => {
	await gotoHydrated(page, '/glaube/kalender/novus');

	// Rite tabs (Novus / Vetus).
	const vetus = page.getByRole('tab', { name: 'Vetus' });
	await vetus.click();
	await expect(page).toHaveURL(/\/kalender\/vetus/);
	await expect(page.getByRole('tab', { name: 'Vetus' })).toHaveAttribute('aria-selected', 'true');

	// View switcher (Ring / Hills / Month·Grid) — pick the grid view.
	const gridView = page.getByRole('tab', { name: /Raster|Monat/ });
	if (await gridView.count()) {
		await gridView.first().click();
		await expect(gridView.first()).toHaveClass(/active/);
	}
});

test('subscribe link exposes a webcal feed', async ({ page }) => {
	await gotoHydrated(page, '/glaube/kalender/novus');
	const sub = page.locator('a.cal-sub-btn');
	if (await sub.count()) {
		await expect(sub.first()).toHaveAttribute('href', /^webcal:\/\//);
	}
});
