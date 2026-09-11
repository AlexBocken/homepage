import { test, expect } from '@playwright/test';
import { ANONYMOUS, storageStateFor, userByKey } from '../helpers/auth';
import { gotoHydrated } from '../helpers/nav';

// The global header (theme, language, user menu) is reused on every (main) page,
// so these behaviours underpin the rest of the suite.

test.describe('theme toggle', () => {
	test.use({ storageState: ANONYMOUS });

	test('cycles system → light → dark and persists', async ({ page }) => {
		await gotoHydrated(page, '/');
		const html = page.locator('html');
		const toggle = page.locator('[aria-label^="Toggle theme"]');

		await expect(html).not.toHaveAttribute('data-theme', /.+/); // system
		await toggle.click();
		await expect(html).toHaveAttribute('data-theme', 'light');
		await toggle.click();
		await expect(html).toHaveAttribute('data-theme', 'dark');

		await page.reload(); // dark persists across reload (localStorage)
		await expect(html).toHaveAttribute('data-theme', 'dark');

		// reload re-runs hydration; let it finish before the next click registers.
		await page.waitForLoadState('networkidle');
		await page.waitForTimeout(300);
		await toggle.click(); // back to system
		await expect(html).not.toHaveAttribute('data-theme', /.+/);
	});
});

test.describe('language selector', () => {
	test.use({ storageState: ANONYMOUS });

	test('a faith page keeps its place when the language changes', async ({ page }) => {
		// Every container slug in the path is translated: the section, the
		// Catechism's own abbreviation, and the language segment itself.
		await gotoHydrated(page, '/glaube/katechese/kkk/p2s2c1a3');
		await page.locator('button.language-button').click();
		await page.getByRole('link', { name: 'EN', exact: true }).click();
		await expect(page).toHaveURL(/\/faith\/catechesis\/ccc\/p2s2c1a3$/);

		await page.locator('button.language-button').click();
		await page.getByRole('link', { name: 'LA', exact: true }).click();
		await expect(page).toHaveURL(/\/fides\/catechesis\/cce\/p2s2c1a3$/);
	});

	test('switches the home page to English and back', async ({ page }) => {
		await gotoHydrated(page, '/');
		await page.locator('button.language-button').click();
		await page.getByRole('link', { name: 'EN', exact: true }).click();
		await expect(page.getByText('Welcome to bocken.org')).toBeVisible();

		await page.locator('button.language-button').click();
		await page.getByRole('link', { name: 'DE', exact: true }).click();
		await expect(page.getByText('Willkommen auf bocken.org')).toBeVisible();
	});
});

test.describe('user menu', () => {
	test.describe('logged out', () => {
		test.use({ storageState: ANONYMOUS });
		test('login link targets /login with a callback', async ({ page }) => {
			await page.goto('/');
			const login = page.locator('a.login-link');
			await expect(login).toBeVisible();
			await expect(login).toHaveAttribute('href', /\/login\?callbackUrl=/);
		});
	});

	test.describe('logged in', () => {
		test.use({ storageState: storageStateFor('full') });
		test('avatar menu reveals name + log out', async ({ page }) => {
			await gotoHydrated(page, '/');
			const menu = page.locator('#options');
			await expect(menu).toBeHidden();
			// The avatar is a <label> driving a checkbox, so the menu opens with
			// no JS involved.
			await page.locator('label.avatar').click();
			await expect(menu.getByRole('heading', { name: userByKey('full').name })).toBeVisible();
			await expect(menu.getByRole('link', { name: /log ?out|abmelden/i })).toBeVisible();
		});

		test('avatar menu opens without JavaScript', async ({ browser }) => {
			const context = await browser.newContext({
				storageState: storageStateFor('full'),
				javaScriptEnabled: false
			});
			const page = await context.newPage();
			await page.goto('/');
			const menu = page.locator('#options');
			await expect(menu).toBeHidden();
			await page.locator('label.avatar').click();
			await expect(menu.getByRole('link', { name: /log ?out|abmelden/i })).toBeVisible();
			await context.close();
		});
	});
});
