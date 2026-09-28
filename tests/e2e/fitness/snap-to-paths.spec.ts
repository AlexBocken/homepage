import { test, expect, type APIRequestContext, type Page } from '@playwright/test';
import { storageStateFor } from '../helpers/auth';
import { gotoHydrated } from '../helpers/nav';
import { installFakeApp } from '../helpers/fakeGps';

// "Snap track to paths": preview a BRouter-snapped copy of a GPS track, then keep
// the recorded one or save the snapped one. It lives on the workout completion
// screen and in the history detail page's edit mode. BRouter is external, so the
// snap endpoint is mocked; what is pinned here is the page side — the requests it
// sends, the preview/choice/result states and the error + retry path.

test.use({ storageState: storageStateFor('fitness'), serviceWorkers: 'block' });

const SNAPPED_KM = 1.234;

type SnapBody = { exerciseIndex: number; profile: string; persist: boolean };

/** Mock the snap endpoint; returns the request bodies it received. */
async function mockSnap(page: Page, opts: { failFirst?: boolean } = {}): Promise<SnapBody[]> {
	const bodies: SnapBody[] = [];
	let fail = !!opts.failFirst;
	await page.route('**/api/fitness/sessions/*/snap', async (route) => {
		bodies.push(route.request().postDataJSON());
		if (fail) {
			fail = false;
			await route.fulfill({ status: 502, json: { error: 'BRouter down' } });
			return;
		}
		const { persist } = route.request().postDataJSON() as SnapBody;
		if (persist) {
			await route.fulfill({ json: { ok: true, totalDistance: SNAPPED_KM, kcalEstimate: null } });
		} else {
			const track = Array.from({ length: 10 }, (_, i) => ({ lat: 47.0 + i * 0.001, lng: 8.0005 }));
			await route.fulfill({ json: { track, distance: SNAPPED_KM } });
		}
	});
	return bodies;
}

async function injectRun(request: APIRequestContext): Promise<string> {
	const start = Date.now() - 3_600_000;
	const N = 60;
	const dur = 12 * 60_000;
	const gpsTrack = Array.from({ length: N }, (_, i) => {
		const f = i / (N - 1);
		return { lat: 47.4 + 0.02 * f, lng: 8.5 + 0.01 * f, timestamp: start + dur * f };
	});
	const res = await request.post('/api/fitness/sessions', {
		data: {
			name: 'E2E snap source',
			activityType: 'running',
			startTime: new Date(start).toISOString(),
			endTime: new Date(start + dur).toISOString(),
			exercises: [
				{ exerciseId: 'running', name: 'Running', sets: [{ distance: 2.5, duration: 12, completed: true }], gpsTrack, totalDistance: 2.5 }
			]
		}
	});
	expect(res.status()).toBe(201);
	return (await res.json()).session._id;
}

test('history edit mode: snap fails, retry previews, saving the snapped track', async ({ page, request }) => {
	const sid = await injectRun(request);
	try {
		const bodies = await mockSnap(page, { failFirst: true });
		await gotoHydrated(page, `/fitness/history/${sid}`);
		await expect(page.locator('.snap-section')).toHaveCount(0);
		await page.getByRole('button', { name: 'Edit session' }).click();

		const panel = page.locator('.snap-section');
		await expect(panel.getByRole('heading', { name: 'Snap track to paths' })).toBeVisible();
		await expect(panel.locator('.snap-map')).toBeVisible();
		await expect(panel.locator('.snap-legend')).toHaveText(/Recorded · 2\.50 km/);

		await panel.getByRole('button', { name: 'Snap to paths' }).click();
		await expect(panel.locator('.snap-error')).toHaveText('Snapping failed');
		await panel.getByRole('button', { name: 'Try again' }).click();

		await expect(panel.locator('.snap-hint')).toBeVisible();
		await expect(panel.locator('.snap-legend')).toHaveText(/Snapped · 1\.23 km/);
		await panel.getByRole('button', { name: 'Use snapped' }).click();
		await expect(panel.locator('.snap-result')).toHaveText(/Snapped track saved/);

		expect(bodies).toEqual([
			{ exerciseIndex: 0, profile: 'trekking', persist: false },
			{ exerciseIndex: 0, profile: 'trekking', persist: false },
			{ exerciseIndex: 0, profile: 'trekking', persist: true }
		]);
		// Still in edit mode afterwards.
		await expect(page.getByRole('button', { name: /^SAVE$/ })).toBeVisible();
	} finally {
		await request.delete(`/api/fitness/sessions/${sid}`);
	}
});

test('history edit mode: keeping the recorded track sends no save', async ({ page, request }) => {
	const sid = await injectRun(request);
	try {
		const bodies = await mockSnap(page);
		await gotoHydrated(page, `/fitness/history/${sid}`);
		await page.getByRole('button', { name: 'Edit session' }).click();
		const panel = page.locator('.snap-section');
		await panel.getByRole('button', { name: 'Snap to paths' }).click();
		await panel.getByRole('button', { name: 'Keep recorded' }).click();
		await expect(panel.locator('.snap-result')).toHaveText(/Kept recorded track/);
		expect(bodies.map((b) => b.persist)).toEqual([false]);
	} finally {
		await request.delete(`/api/fitness/sessions/${sid}`);
	}
});

test('completion screen: preview and save the snapped track, stats follow', async ({ page, request }) => {
	let sessionId: string | null = null;
	await installFakeApp(page, { seedWorkout: true, paused: false });
	try {
		const bodies = await mockSnap(page);
		await gotoHydrated(page, '/fitness/workout/active');
		const posted = page.waitForResponse(
			(r) => r.url().endsWith('/api/fitness/sessions') && r.request().method() === 'POST'
		);
		await page.locator('.gps-overlay-finish').click();
		const res = await posted;
		expect(res.status()).toBe(201);
		sessionId = (await res.json()).session._id;
		await expect(page.getByRole('heading', { name: 'Workout Complete' })).toBeVisible();

		const panel = page.locator('.snap-section');
		await expect(panel.getByRole('heading', { name: 'Snap track to paths' })).toBeVisible();
		await expect(panel.locator('.snap-map')).toBeVisible();
		await expect(panel.locator('.snap-legend')).toHaveText(/Recorded · \d+\.\d\d km/);

		await panel.getByRole('button', { name: 'Snap to paths' }).click();
		await expect(panel.locator('.snap-legend')).toHaveText(/Snapped · 1\.23 km/);
		await panel.getByRole('button', { name: 'Use snapped' }).click();
		await expect(panel.locator('.snap-result')).toHaveText(/Snapped track saved/);

		// The completion stats take the saved distance.
		await expect(panel.locator('.snap-legend')).toHaveText(/Recorded · 1\.23 km/);
		await expect(page.locator('.comp-stat-value', { hasText: /km$/ })).toHaveText('1.2 km');

		expect(bodies).toEqual([
			{ exerciseIndex: 0, profile: 'trekking', persist: false },
			{ exerciseIndex: 0, profile: 'trekking', persist: true }
		]);
	} finally {
		if (sessionId) await request.delete(`/api/fitness/sessions/${sessionId}`);
		await request.delete('/api/fitness/workout/active');
	}
});
