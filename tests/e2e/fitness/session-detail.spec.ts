import { test, expect, type APIRequestContext } from '@playwright/test';
import { storageStateFor } from '../helpers/auth';
import { gotoHydrated } from '../helpers/nav';

// Session detail input + persistence: create a segment from a run and delete it.
// The GPS run is injected via the API (a run can't be recorded headless), but the
// segment is created and removed through the UI and verified in the segment list.

test.use({ storageState: storageStateFor('fitness') });

async function injectRun(request: APIRequestContext): Promise<string> {
	const start = Date.now() - 3_600_000;
	const N = 200;
	const dur = 3 * 60_000;
	const gpsTrack = Array.from({ length: N }, (_, i) => {
		const f = i / (N - 1);
		return { lat: 47.4 + 0.02 * f, lng: 8.5 + 0.03 * f, timestamp: start + dur * f };
	});
	const res = await request.post('/api/fitness/sessions', {
		data: {
			name: 'E2E segment source',
			mode: 'gps',
			activityType: 'running',
			startTime: new Date(start).toISOString(),
			endTime: new Date(start + dur).toISOString(),
			gpsTrack,
			totalDistance: 3.0
		}
	});
	expect(res.status()).toBe(201);
	return (await res.json()).session._id;
}

test('create a segment from a run, then delete it', async ({ page, request }) => {
	const sid = await injectRun(request);
	const segName = `E2E Segment ${Date.now()}`;
	try {
		await gotoHydrated(page, `/fitness/history/${sid}`);
		await page.getByRole('button', { name: /Create segment/i }).click();
		await page.getByPlaceholder('e.g. Bridge climb').fill(segName);
		await page.getByRole('button', { name: /Save segment/i }).click();

		// The new segment shows up in the segment list.
		await gotoHydrated(page, '/fitness/segments');
		await expect(page.getByText(segName)).toBeVisible();

		// Open it and delete it → gone from the list.
		await page.getByText(segName).first().click();
		await expect(page).toHaveURL(/\/fitness\/segments\/[a-f0-9]+/);
		await page.getByRole('button', { name: /Delete segment/i }).click();
		await page.locator('button.confirm-btn.confirm').click();

		await gotoHydrated(page, '/fitness/segments');
		await expect(page.getByText(segName)).toHaveCount(0);
	} finally {
		await request.delete(`/api/fitness/sessions/${sid}`);
	}
});
