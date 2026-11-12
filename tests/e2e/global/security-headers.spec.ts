import { test, expect } from '@playwright/test';
import { ANONYMOUS } from '../helpers/auth';
import { gotoHydrated } from '../helpers/nav';

// Baseline security headers from src/hooks.server.ts + kit.csp (svelte.config.js).
// HSTS is owned by nginx, so the app itself must not send it.

test.use({ storageState: ANONYMOUS });

test('rendered pages carry a nonced script-src CSP and the baseline headers', async ({ request }) => {
	const res = await request.get('/rezepte');
	expect(res.ok()).toBe(true);
	const h = res.headers();

	const csp = h['content-security-policy'];
	expect(csp).toMatch(/script-src [^;]*'self'/);
	expect(csp).toMatch(/script-src [^;]*'nonce-/);
	expect(csp).not.toMatch(/'unsafe-inline'|'unsafe-eval'/);
	expect(csp).toContain("object-src 'none'");
	expect(csp).toContain("base-uri 'self'");
	expect(csp).toContain("frame-ancestors 'none'");

	expect(h['x-content-type-options']).toBe('nosniff');
	expect(h['x-frame-options']).toBe('DENY');
	expect(h['referrer-policy']).toBe('strict-origin-when-cross-origin');
	expect(h['permissions-policy']).toContain('camera=(self)');
	expect(h['strict-transport-security']).toBeUndefined();
});

test('the page hydrates under the CSP with no violations', async ({ page }) => {
	const violations: string[] = [];
	page.on('console', (msg) => {
		if (/Content.Security.Policy/i.test(msg.text())) violations.push(msg.text());
	});
	// Hydration only completes if SvelteKit's nonced bootstrap and the bundles ran.
	await gotoHydrated(page, '/rezepte');
	expect(violations).toEqual([]);
});

test('endpoints without a page CSP still forbid framing', async ({ request }) => {
	const res = await request.get('/api/rezepte/favorites');
	const h = res.headers();
	expect(h['content-security-policy']).toContain("frame-ancestors 'none'");
	expect(h['x-content-type-options']).toBe('nosniff');
});
