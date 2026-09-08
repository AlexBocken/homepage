import { test, expect } from '@playwright/test';
import { ANONYMOUS } from '../helpers/auth';
import { gotoHydrated } from '../helpers/nav';

test.use({ storageState: ANONYMOUS });

test('the decalogue hub leads into the introduction', async ({ page }) => {
	await gotoHydrated(page, '/glaube/katechese');
	await expect(page.getByRole('heading', { name: 'Die Zehn Gebote Gottes', level: 1 })).toBeVisible();

	await page.getByRole('link', { name: /Ursprung und Sinn/ }).click();
	await expect(page).toHaveURL(/\/katechese\/einfuehrung$/);
	await expect(page.getByRole('heading', { name: 'Ursprung und Sinn', level: 1 })).toBeVisible();
	// Der biblische Text der zehn Worte steht auf dieser Seite, nicht mehr auf dem Hub.
	await expect(page.locator('.exodus-list li')).toHaveCount(10);
});

test('a commandment tile jumps to its own block on the hub', async ({ page }) => {
	await gotoHydrated(page, '/glaube/katechese');
	await page.locator('a.cmd.active').nth(1).click();
	await expect(page).toHaveURL(/#zweites$/);
	await expect(page.locator('#zweites')).toBeVisible();
});

test('the second commandment runs from the name through the offences to the oath', async ({ page }) => {
	await gotoHydrated(page, '/glaube/katechese/zweites-gebot');
	await expect(page.getByRole('heading', { name: 'Der Name Gottes', level: 1 })).toBeVisible();

	await page.locator('nav.series a.pn.next').click();
	await expect(page).toHaveURL(/\/katechese\/verstoesse-gegen-den-namen$/);
	// Die Leiter führt von der Gedankenlosigkeit bis zum Sakrileg.
	await expect(page.locator('.ladder .ladder-link')).toHaveCount(5);

	await page.locator('nav.series a.pn.next').click();
	await expect(page).toHaveURL(/\/katechese\/eid-und-schwur$/);
	await expect(page.getByRole('heading', { name: 'Der Eid', level: 1 })).toBeVisible();
	await expect(page.locator('.triad .triad-node')).toHaveCount(3);

	await page.locator('nav.series a.pn.prev').click();
	await expect(page).toHaveURL(/\/katechese\/verstoesse-gegen-den-namen$/);
});

test('every part of a series is reachable from its navigation', async ({ page }) => {
	await gotoHydrated(page, '/glaube/katechese/erstes-gebot');
	const steps = page.locator('nav.series .series-steps a');
	await expect(steps).toHaveCount(3);

	await steps.nth(2).click();
	await expect(page).toHaveURL(/\/katechese\/geluebde-und-suenden$/);
	await expect(page.locator('nav.series .series-steps a.active')).toContainText('Gelübde');
});

test('bible references open a peek on a catechesis page', async ({ page }) => {
	await gotoHydrated(page, '/glaube/katechese/einfuehrung');
	await page.locator('button.ref').first().click();
	// Auf schmalen Viewports erscheint statt des Peeks das Bottom-Sheet.
	await expect(page.locator('.peek, .sheet').first()).toBeVisible();
});

test('the retired ten-commandments url is gone', async ({ page }) => {
	const response = await page.goto('/glaube/katechese/zehn-gebote');
	expect(response?.status()).toBe(404);
});
