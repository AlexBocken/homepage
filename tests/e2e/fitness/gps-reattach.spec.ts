import { test, expect, type Page } from '@playwright/test';
import { storageStateFor } from '../helpers/auth';
import { gotoHydrated } from '../helpers/nav';

/**
 * A GPS workout outlives the page that was showing it.
 *
 * The native service owns the route; the page is a view that re-attaches. That is what
 * keeps a run alive through a reload, a swipe from recents or a killed process — and it
 * is all page-side logic from the moment native answers, so a fake `AndroidBridge` is
 * enough to drive it. The fake keeps its state in sessionStorage, which survives
 * `page.reload()` the way the real service survives the WebView.
 *
 * Before this, a reload left the page believing nothing was tracking: it restarted the
 * service (zeroing the run) and "Finish" threw the workout away as having no track.
 */

test.use({ storageState: storageStateFor('fitness'), serviceWorkers: 'block' });

const POINTS = 20;

type FakeOptions = { seedWorkout: boolean; paused: boolean };

async function installFakeApp(page: Page, opts: FakeOptions) {
	await page.addInitScript(
		({ count, seedWorkout, paused }) => {
			const KEY = 'e2e_fake_gps';
			const read = () => JSON.parse(sessionStorage.getItem(KEY) ?? 'null');
			const write = (s: unknown) => sessionStorage.setItem(KEY, JSON.stringify(s));

			// First document of the test only — a reload must find what it left behind.
			if (!read()) {
				const start = Date.now() - 10 * 60_000;
				const points = Array.from({ length: count }, (_, i) => ({
					lat: 47.0 + i * 0.00045, // ~50 m apart, heading north
					lng: 8.0,
					altitude: 500,
					speed: 3.3,
					timestamp: start + i * 15_000,
				}));
				write({ tracking: true, paused, startTimeMs: start, points, starts: 0, resumes: 0 });
				if (seedWorkout) {
					localStorage.setItem(
						'fitness-active-workout',
						JSON.stringify({
							active: true,
							paused,
							mode: 'gps',
							activityType: 'running',
							name: 'E2E GPS Run',
							notes: '',
							templateId: null,
							intervalTemplateId: null,
							exercises: [],
							elapsed: 600,
							savedAt: Date.now(),
							restStartedAt: null,
							restTotal: 0,
							restExerciseIdx: -1,
							restSetIdx: -1,
						})
					);
				}
			}

			const patch = (fn: (s: any) => void) => {
				const s = read();
				fn(s);
				write(s);
			};

			(window as any).__TAURI__ = {};
			(window as any).AndroidBridge = {
				// GPS — the durable-session surface
				getSessionState: () => {
					const s = read();
					return JSON.stringify({
						tracking: s.tracking,
						recoverable: false,
						prestart: false,
						paused: s.paused,
						sessionId: String(s.startTimeMs),
						startTimeMs: s.startTimeMs,
						pointCount: s.points.length,
						totalDistanceKm: 0.95,
					});
				},
				getPointsSince: (i: number) => JSON.stringify(read().points.slice(i)),
				getPoints: () => '[]',
				resumeLocationService: () => patch((s) => { s.resumes++; }),
				startLocationService: () => patch((s) => { s.starts++; s.points = []; }),
				stopLocationService: () => patch((s) => { s.tracking = false; }),
				discardSession: () => patch((s) => { s.tracking = false; s.points = []; }),
				isTracking: () => read().tracking,
				pauseTracking: () => patch((s) => { s.paused = true; }),
				resumeTracking: () => patch((s) => { s.paused = false; }),
				getIntervalState: () => '{}',
				getAvailableTtsVoices: () => '[]',
				hasTtsEngine: () => false,
				installTtsEngine: () => {},
				hasActivityRecognitionPermission: () => true,
				isIgnoringBatteryOptimizations: () => true,
				requestIgnoreBatteryOptimizations: () => {},
				// Lifting-workout notification bridge — inert here
				startWorkoutService: () => {},
				updateWorkoutState: () => {},
				startWorkoutRest: () => {},
				stopWorkoutRest: () => {},
				startWorkoutHold: () => {},
				stopWorkoutHold: () => {},
				stopWorkoutService: () => {},
				isWorkoutServiceRunning: () => false,
				drainWorkoutActions: () => '[]',
				consumePendingRoute: () => '',
			};
		},
		{ count: POINTS, seedWorkout: opts.seedWorkout, paused: opts.paused }
	);
}

const fakeState = (page: Page) =>
	page.evaluate(() => JSON.parse(sessionStorage.getItem('e2e_fake_gps') ?? 'null'));

const distance = (page: Page) => page.locator('.gps-workout-stats .gps-stat-value').first();

test('a reload mid-run keeps the route, and finishing saves all of it', async ({ page, request }) => {
	let sessionId: string | null = null;
	await installFakeApp(page, { seedWorkout: true, paused: false });
	try {
		await gotoHydrated(page, '/fitness/workout/active');

		// Straight to the running view — not the pre-start screen, which is where a
		// tracker that fails to re-attach ends up.
		await expect(distance(page)).toBeVisible();
		await expect(page.locator('.gps-start-btn')).toHaveCount(0);
		const before = (await distance(page).textContent())?.trim();
		expect(Number(before)).toBeGreaterThan(0.8);

		await page.reload();
		await page.waitForLoadState('networkidle', { timeout: 2500 }).catch(() => {});

		await expect(distance(page)).toBeVisible();
		await expect(distance(page)).toHaveText(before!);
		await expect(page.locator('.gps-start-btn')).toHaveCount(0);

		// Re-attaching must never restart the service: that is what zeroed the run.
		const state = await fakeState(page);
		expect(state.starts).toBe(0);
		expect(state.points).toHaveLength(POINTS);

		const posted = page.waitForResponse(
			(r) => r.url().endsWith('/api/fitness/sessions') && r.request().method() === 'POST'
		);
		await page.locator('.gps-overlay-finish').click();
		const res = await posted;
		expect(res.status()).toBe(201);
		sessionId = (await res.json()).session._id;

		const body = res.request().postDataJSON();
		expect(body.exercises).toHaveLength(1);
		expect(body.exercises[0].exerciseId).toBe('running');
		expect(body.exercises[0].gpsTrack).toHaveLength(POINTS);
		expect(body.exercises[0].totalDistance).toBeGreaterThan(0.8);
	} finally {
		if (sessionId) await request.delete(`/api/fitness/sessions/${sessionId}`);
		await request.delete('/api/fitness/workout/active');
	}
});

test('a recording with no workout is offered back, not left running unseen', async ({ page, request }) => {
	// Paused, so the recovered run shows its discard button without another step.
	await installFakeApp(page, { seedWorkout: false, paused: true });
	try {
		await gotoHydrated(page, '/fitness/workout');

		// The themed confirm dialog: "Recover" is the confirming action.
		await page.locator('button.confirm-btn.confirm').click();

		await expect(page).toHaveURL(/\/fitness\/workout\/active$/);
		await expect(distance(page)).toBeVisible();
		expect(Number((await distance(page).textContent())?.trim())).toBeGreaterThan(0.8);
		expect((await fakeState(page)).starts).toBe(0);

		// Clean up through the UI: discard the recovered run.
		await page.locator('.gps-overlay-cancel').click();
		await expect(page).toHaveURL(/\/fitness\/workout$/);
		expect((await fakeState(page)).tracking).toBe(false);
	} finally {
		await request.delete('/api/fitness/workout/active');
	}
});

test('declining the recovery asks once more before deleting the route', async ({ page, request }) => {
	await installFakeApp(page, { seedWorkout: false, paused: true });
	try {
		await gotoHydrated(page, '/fitness/workout');

		// First dialog: "Discard" is the cancelling action…
		await page.locator('button.confirm-btn.cancel').click();
		// …which only leads to a second, destructive confirmation. The route is still there.
		await expect(page.locator('button.confirm-btn.confirm')).toBeVisible();
		expect((await fakeState(page)).points).toHaveLength(POINTS);

		await page.locator('button.confirm-btn.confirm').click();
		await expect.poll(async () => (await fakeState(page)).points.length).toBe(0);
		expect((await fakeState(page)).tracking).toBe(false);
	} finally {
		await request.delete('/api/fitness/workout/active');
	}
});
