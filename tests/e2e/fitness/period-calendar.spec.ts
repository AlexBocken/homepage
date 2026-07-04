import { test, expect, request as pw } from '@playwright/test';
import { storageStateFor } from '../helpers/auth';
import { gotoHydrated } from '../helpers/nav';

// Shared period calendar: create a subscription link, and verify the ICS feed it
// exposes is Basic-Auth gated and serves a valid calendar. Runs as anna (female
// profile + seeded cycles).

const BASE = 'http://localhost:4173';

test.use({ storageState: storageStateFor('anna') });
test.describe.configure({ mode: 'serial' }); // both mutate anna's subscription list

test('create a shared calendar subscription via the UI', async ({ page }) => {
	await gotoHydrated(page, '/fitness/check-in');
	await page.locator('button[aria-label="Subscribe calendar"]').click();

	const revoke = page.getByRole('button', { name: /^Revoke$/i });
	const before = await revoke.count();

	await page.getByPlaceholder(/Note/i).fill('E2E device');
	await page.getByRole('button', { name: /Create link/i }).click();

	// A new subscription row appears with its copy/revoke controls.
	await expect.poll(() => revoke.count()).toBe(before + 1);
	await expect(page.getByRole('button', { name: /Copy token/i }).first()).toBeVisible();

	// Clean up: revoke the newly created (prepended) link.
	await revoke.first().click();
	await expect.poll(() => revoke.count()).toBe(before);
});

test('the subscription ICS feed requires Basic Auth and serves a valid calendar', async ({ page }) => {
	// Create the subscription in the UI and read its credentials from the webcal
	// link the modal hands out (webcal://user:token@host/period/<name>.ics).
	await gotoHydrated(page, '/fitness/check-in');
	await page.locator('button[aria-label="Subscribe calendar"]').click();
	await page.getByPlaceholder(/Note/i).fill('E2E feed');
	await page.getByRole('button', { name: /Create link/i }).click();
	const webcal = await page.locator('a[href^="webcal://"]').first().getAttribute('href');
	const u = new URL(webcal!.replace(/^webcal:/, 'http:'));
	const user = decodeURIComponent(u.username);
	const token = decodeURIComponent(u.password);
	const feedPath = u.pathname; // e.g. /period/Period%20Anna.ics
	const basic = 'Basic ' + Buffer.from(`${user}:${token}`).toString('base64');

	// The ICS feed is a machine endpoint (consumed by calendar clients, not a
	// browser UI), so it's exercised over HTTP the way a calendar app would.
	const anon = await pw.newContext({ baseURL: BASE });
	try {
		// No credentials → 401 with a Basic challenge.
		const no = await anon.get(feedPath, { maxRedirects: 0 });
		expect(no.status()).toBe(401);
		expect(no.headers()['www-authenticate']).toContain('Basic realm="Period calendar"');

		// Wrong token → 401.
		const wrong = await anon.get(feedPath, {
			headers: { Authorization: 'Basic ' + Buffer.from(`${user}:not-the-token`).toString('base64') }
		});
		expect(wrong.status()).toBe(401);

		// Valid credentials → 200 text/calendar.
		const ok = await anon.get(feedPath, { headers: { Authorization: basic } });
		expect(ok.status()).toBe(200);
		expect(ok.headers()['content-type']).toContain('text/calendar');

		// ICS quality: well-formed VCALENDAR with balanced VEVENTs and real data.
		const ics = await ok.text();
		expect(ics.startsWith('BEGIN:VCALENDAR')).toBe(true);
		expect(ics.trimEnd().endsWith('END:VCALENDAR')).toBe(true);
		expect(ics).toContain('VERSION:2.0');
		expect(ics).toMatch(/X-WR-CALNAME:Period(e)? Anna/);
		const begins = (ics.match(/BEGIN:VEVENT/g) ?? []).length;
		const ends = (ics.match(/END:VEVENT/g) ?? []).length;
		expect(begins).toBe(ends);
		expect(begins).toBeGreaterThanOrEqual(6); // ≥ the 6 seeded cycles
		expect(ics).toMatch(/SUMMARY:Period/);
		expect(ics).toContain('DTSTART;VALUE=DATE:20260610'); // a seeded cycle start
	} finally {
		await anon.dispose();
		// Revoke via the UI.
		await page.getByRole('button', { name: /^Revoke$/i }).first().click().catch(() => {});
	}
});
