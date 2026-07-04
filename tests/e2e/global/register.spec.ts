import { test, expect } from '@playwright/test';
import { ANONYMOUS } from '../helpers/auth';
import { gotoHydrated } from '../helpers/nav';

test.use({ storageState: ANONYMOUS });

test('register form validates, toggles a group, and submits', async ({ page }) => {
	await gotoHydrated(page, '/registrieren');
	await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

	const submit = page.getByRole('button', { name: /Anfrage senden|Send request/ });
	await expect(submit).toBeDisabled();

	await page.locator('input[type="email"]').fill('e2e-newuser@example.com');
	await page.locator('input[type="text"]:not([name="website"])').first().fill('e2e_newuser');
	await expect(submit).toBeEnabled();

	// Toggle a group choice.
	const choice = page.locator('button.choice').first();
	await choice.click();
	await expect(choice).toHaveAttribute('aria-pressed', 'true');

	// Intercept the request so the test doesn't send a real account request.
	await page.route('**/api/register-request', (route) =>
		route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' })
	);
	await submit.click();
	await expect(page.locator('.status')).toBeVisible();
});
