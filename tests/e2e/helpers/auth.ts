import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const usersJson = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'users.json'), 'utf8'));

export type TestUser = {
	key: string;
	username: string;
	name: string;
	email: string;
	groups: string[];
};

export const USERS: TestUser[] = usersJson.users;
export const userByKey = (key: string): TestUser => {
	const u = USERS.find((x) => x.key === key);
	if (!u) throw new Error(`unknown test user role: ${key}`);
	return u;
};

/** Where each role's authenticated storageState is persisted by auth.setup.ts. */
export const AUTH_DIR = path.resolve(__dirname, '..', '.auth');
export const storageStateFor = (role: string) => path.join(AUTH_DIR, `${role}.json`);

/** A blank storage state — use for tests that must run logged-out. */
export const ANONYMOUS = { cookies: [], origins: [] } as const;

const PASSWORD = process.env.E2E_USER_PASSWORD || 'e2e-user-password-123';

/**
 * Drive the real Authentik login flow for `username` and land back in the app.
 *
 * The app's /login auto-submits into Auth.js, which bounces to Authentik's
 * flow-executor (identification stage → password stage, both open-shadow-DOM Lit
 * components that Playwright pierces by CSS). A short settle before the password
 * submit avoids a race where the SPA advances before the field value registers.
 */
export async function login(page: Page, username: string, password: string = PASSWORD): Promise<void> {
	await page.goto('/login?callbackUrl=/');

	// Authentik's flow-executor is a Lit SPA: its <button type=submit> advances the
	// stage (Enter does NOT submit). The identification→password transition
	// re-renders the stage, so a fill landing mid-render is silently discarded
	// ("This field may not be blank"). Let each stage settle before filling.
	const submit = page.locator('button[type="submit"]');

	const uid = page.locator('input[name="uidField"]');
	await uid.waitFor({ state: 'visible', timeout: 30_000 });
	await uid.fill(username);
	await submit.first().click();

	const pw = page.locator('input[name="password"]');
	await pw.waitFor({ state: 'visible', timeout: 30_000 });
	await page.waitForTimeout(800); // let the password stage finish rendering
	await pw.fill(password);
	await page.waitForTimeout(300);
	await submit.first().click();

	// Back on the app origin (any path) once the OIDC callback has set the session.
	await page.waitForURL((url) => url.port === '4173' && !url.pathname.startsWith('/login'), {
		timeout: 30_000
	});
	// Sanity: the Auth.js session cookie exists on the app origin.
	const cookies = await page.context().cookies();
	expect(cookies.some((c) => c.name.includes('authjs.session-token'))).toBe(true);
}
