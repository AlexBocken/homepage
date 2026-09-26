import { defineConfig, devices } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Load .env.test into process.env (no dotenv dependency). Both the webServer
// (build/runtime env for $env/static + $env/dynamic) and auth.setup (test-user
// password) read from here. Real environment variables win over the file.
function loadEnvTest() {
	let raw: string;
	try {
		raw = readFileSync(resolve(process.cwd(), '.env.test'), 'utf8');
	} catch {
		return;
	}
	for (const line of raw.split('\n')) {
		const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
		if (!m) continue;
		const key = m[1];
		let val = m[2].trim();
		if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
			val = val.slice(1, -1);
		}
		if (process.env[key] === undefined) process.env[key] = val;
	}
}
loadEnvTest();

const PORT = 4173;
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
	testDir: 'tests/e2e',
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 1 : 0,
	workers: process.env.CI ? 2 : undefined,
	reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list']],

	timeout: 45_000,
	expect: { timeout: 10_000 },

	use: {
		baseURL: BASE_URL,
		trace: 'on-first-retry',
		screenshot: 'only-on-failure'
	},

	projects: [
		// Logs every role into Authentik once and saves storageState.
		{ name: 'setup', testMatch: /auth\.setup\.ts/ },
		{
			name: 'chromium',
			dependencies: ['setup'],
			testMatch: /.*\.spec\.ts/,
			use: { ...devices['Desktop Chrome'] }
		},
		// Opt-in page-HTML snapshots (tests/e2e/snapshots/*.snap.ts), for "record a
		// baseline before a refactor, compare after". Only defined when
		// HTML_SNAPSHOT=1, so a normal run neither lists nor pays for it; the
		// `.snap.ts` suffix keeps the chromium project from picking it up either.
		// Baselines land in tests/e2e/.tmp/ (gitignored): they depend on the cloned
		// dev content and the current day, so they are never committed.
		...(process.env.HTML_SNAPSHOT
			? [
					{
						name: 'html-snapshots',
						dependencies: ['setup'],
						testMatch: /snapshots\/.*\.snap\.ts$/,
						snapshotPathTemplate: '{testDir}/.tmp/html-snapshots/{arg}{ext}',
						use: { ...devices['Desktop Chrome'] }
					}
				]
			: [])
	],

	// The app under test. Requires the docker stack (Mongo + Authentik) already up
	// and provisioned/seeded — see scripts/e2e/run.sh. reuseExistingServer lets a
	// dev server started by hand be reused during local iteration.
	webServer: {
		command: `pnpm exec vite dev --port ${PORT} --host 127.0.0.1`,
		url: BASE_URL,
		reuseExistingServer: !process.env.CI,
		timeout: 120_000,
		stdout: 'ignore',
		stderr: 'pipe'
	}
});
