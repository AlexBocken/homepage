import { test, expect } from '@playwright/test';
import { ANONYMOUS, storageStateFor } from './helpers/auth';

// Harness smoke test: proves the docker stack + Authentik login + seeded Mongo +
// per-role storageState + the app's authorization gating all line up. If this is
// green, the domain suites can be built on top with confidence.

test.describe('anonymous (logged out)', () => {
	test.use({ storageState: ANONYMOUS });

	test('home page renders', async ({ page }) => {
		await page.goto('/');
		await expect(page.getByText('Ad maiorem Dei gloriam')).toBeVisible();
	});

	test('public recipe content is served', async ({ page }) => {
		await page.goto('/rezepte/schokokuchen');
		await expect(page.getByRole('heading', { name: 'Schokokuchen' })).toBeVisible();
	});

	test('protected route redirects to login', async ({ request }) => {
		const res = await request.get('/fitness', { maxRedirects: 0 });
		expect(res.status()).toBe(303);
		expect(res.headers()['location']).toContain('/login');
	});
});
