import type { Page } from '@playwright/test';

/**
 * A fake native app for GPS workouts: `window.__TAURI__` plus an `AndroidBridge`
 * whose location service already holds a 20-point run. It keeps its state in
 * sessionStorage, which survives `page.reload()` the way the real service
 * survives the WebView. With `seedWorkout` a GPS running workout is already in
 * progress in localStorage, so /fitness/workout/active opens straight on it.
 */

/** How many fixes the fake service holds. */
export const POINTS = 20;

export type FakeOptions = { seedWorkout: boolean; paused: boolean };

export async function installFakeApp(page: Page, opts: FakeOptions) {
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

export const fakeState = (page: Page) =>
	page.evaluate(() => JSON.parse(sessionStorage.getItem('e2e_fake_gps') ?? 'null'));
