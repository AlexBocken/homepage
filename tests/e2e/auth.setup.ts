import fs from 'node:fs';
import { test as setup } from '@playwright/test';
import { AUTH_DIR, USERS, login, storageStateFor } from './helpers/auth';

// One "setup" test per role: run the real Authentik login in an isolated context
// and persist the authenticated storageState. The chromium project depends on
// this project, so every real test starts from a warm, logged-in cookie jar
// without paying the OIDC round-trip itself.

setup.beforeAll(() => {
	fs.mkdirSync(AUTH_DIR, { recursive: true });
});

for (const user of USERS) {
	setup(`authenticate: ${user.key} (${user.username})`, async ({ browser }) => {
		// Fresh context per user so Authentik's SSO session cookie from a previous
		// role can't silently skip the login form.
		const context = await browser.newContext();
		const page = await context.newPage();
		try {
			await login(page, user.username);
			await context.storageState({ path: storageStateFor(user.key) });
		} finally {
			await context.close();
		}
	});
}
