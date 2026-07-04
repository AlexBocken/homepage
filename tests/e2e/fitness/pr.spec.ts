import { test, expect, type APIRequestContext } from '@playwright/test';
import { storageStateFor } from '../helpers/auth';
import { gotoHydrated } from '../helpers/nav';

// Running / segment PR *calculation* happens server-side when a GPS session is
// saved. A GPS run cannot be recorded from a headless browser — it needs native
// geolocation (Tauri), and GPX upload doesn't recompute efforts — so the run is
// injected via the API. But the RESULT is verified through the UI (the stats
// fastest-effort card + the segment leaderboard). Strength PRs are covered fully
// in the workout UI (see workout.spec).

test.use({ storageState: storageStateFor('fitness') });
test.describe.configure({ mode: 'serial' });

async function injectRun(request: APIRequestContext, data: object): Promise<string> {
	const res = await request.post('/api/fitness/sessions', { data });
	expect(res.status(), 'inject GPS run').toBe(201);
	return (await res.json()).session._id;
}

test('a fast run becomes the fastest-5k best effort on the stats page', async ({ page, request }) => {
	const name = `E2E fast5k ${Date.now()}`;
	const start = Date.now() - 3_600_000;
	const N = 300;
	const dur = 5.3 * 40_000; // ~40 s/km — faster than any real run → a guaranteed PR
	const gpsTrack = Array.from({ length: N }, (_, i) => {
		const f = i / (N - 1);
		return { lat: 47.4 + 0.03 * f, lng: 8.5 + 0.05 * f, timestamp: start + dur * f };
	});
	const sid = await injectRun(request, {
		name,
		mode: 'gps',
		activityType: 'running',
		startTime: new Date(start).toISOString(),
		endTime: new Date(start + dur).toISOString(),
		gpsTrack,
		totalDistance: 5.3
	});
	try {
		// Verify in the UI: the fastest-5k record on the stats dashboard is now this run.
		await gotoHydrated(page, '/fitness/stats');
		await expect(page.getByText(name).first()).toBeVisible();
	} finally {
		await request.delete(`/api/fitness/sessions/${sid}`);
	}
});

test('running a segment records an effort shown on the segment leaderboard', async ({ page, request }) => {
	// Discover a segment from the UI, then read its geometry to run exactly along it.
	await gotoHydrated(page, '/fitness/segments');
	const segHref = await page.locator('a[href*="/fitness/segments/"]').first().getAttribute('href');
	const segId = segHref!.split('/').pop()!;
	const seg = (await (await request.get(`/api/fitness/segments/${segId}`)).json()).segment;

	const start = Date.now() - 3_600_000;
	const gpsTrack: { lat: number; lng: number; timestamp: number }[] = seg.points.map(
		(p: number[], i: number) => ({ lat: p[0], lng: p[1], timestamp: start + i * 800 })
	);
	const sid = await injectRun(request, {
		name: `E2E seg ${Date.now()}`,
		mode: 'gps',
		activityType: 'running',
		startTime: new Date(start).toISOString(),
		endTime: new Date(start + seg.points.length * 800).toISOString(),
		gpsTrack,
		totalDistance: seg.distance
	});
	try {
		// Verify in the UI: the segment leaderboard now shows my effort as the best.
		await gotoHydrated(page, `/fitness/segments/${segId}`);
		await expect(page.getByText(/Your best/i)).toBeVisible();
		await expect(page.getByText(/\d+:\d\d/).first()).toBeVisible(); // an effort time
	} finally {
		await request.delete(`/api/fitness/sessions/${sid}`);
	}
});
