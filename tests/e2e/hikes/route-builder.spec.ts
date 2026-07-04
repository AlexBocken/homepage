import { test, expect, type Page } from '@playwright/test';
import { storageStateFor } from '../helpers/auth';
import { gotoHydrated } from '../helpers/nav';

// Route-builder input + export: draw a route by clicking waypoints on the map,
// name it and download the GPX — all through the UI. Snap-to-route is turned
// off so the geometry is a local straight-line densification (no dependency on
// the external BRouter routing service), which keeps the distance deterministic
// and the export self-contained. Login-only route (any signed-in user).

test.use({ storageState: storageStateFor('full') });

// Click the Leaflet map at a pixel offset from its top-left. Positions are kept
// clear of the search box (top-centre), the nav bar (top-right, appears after
// the first waypoint) and the layer control (bottom-right).
async function clickMap(page: Page, x: number, y: number) {
	await page.locator('.edit-map').click({ position: { x, y } });
}

test('draw waypoints on the map and export a named GPX', async ({ page }) => {
	await gotoHydrated(page, '/hikes/route-builder');
	await expect(page.getByPlaceholder('Name der Tour…')).toBeVisible();

	// Wait for Leaflet to mount and settle before interacting.
	await expect(page.locator('.edit-map.leaflet-container')).toBeVisible();
	await page.waitForTimeout(1200);

	// Off-trail mode: straight-line geometry, no external routing call.
	await page.getByText('Auf Wege snappen').click();

	// Drop three waypoints — the route now spans two segments.
	await clickMap(page, 220, 260);
	await clickMap(page, 400, 300);
	await clickMap(page, 320, 460);

	// The waypoint table reflects all three, each with populated coordinates.
	await expect(page.getByRole('heading', { name: /Wegpunkte \(3\)/ })).toBeVisible();
	const lat = page.getByLabel('Breitengrad');
	await expect(lat).toHaveCount(3);
	await expect(lat.first()).not.toHaveValue('');

	// The stats bar computes a real distance from the drawn geometry.
	const distance = page.locator('.metric', { hasText: 'Distanz' }).locator('.value');
	await expect(distance).not.toHaveText(/^–/);
	const km = parseFloat((await distance.innerText()).replace(',', '.'));
	expect(km).toBeGreaterThan(0);

	// The GPX export requires a timestamp on the first and last waypoint. Set
	// today's date on both via the date picker (open display → "today").
	const wps = page.locator('.wp');
	for (const wp of [wps.first(), wps.last()]) {
		await wp.locator('.dtp-display').click();
		await wp.locator('.dtp-today-btn').click();
	}

	// Name the tour and wait until the route/elevation pipeline is idle so the
	// download CTA is enabled.
	await page.getByPlaceholder('Name der Tour…').fill('E2E Test Tour');
	await expect(page.getByText('Bereit')).toBeVisible({ timeout: 15_000 });

	// Export → a GPX download fires; assert its filename and that the payload is
	// well-formed GPX carrying the name and track points.
	const [download] = await Promise.all([
		page.waitForEvent('download'),
		page.getByRole('button', { name: /GPX herunterladen/i }).click()
	]);
	expect(download.suggestedFilename()).toMatch(/e2e-test-tour\.gpx$/);

	const stream = await download.createReadStream();
	const chunks: Buffer[] = [];
	for await (const c of stream) chunks.push(c as Buffer);
	// The tour name reaches the export via the filename slug (asserted above).
	// The body is well-formed GPX: a named track with the densified track points.
	const gpx = Buffer.concat(chunks).toString('utf8');
	expect(gpx).toContain('<gpx');
	expect(gpx).toContain('<trk>');
	expect(gpx).toMatch(/<name>Etappe 1<\/name>/);
	expect(gpx.match(/<trkpt/g)?.length ?? 0).toBeGreaterThan(2);
});
