import { test, expect, type APIRequestContext } from '@playwright/test';
import { storageStateFor } from '../helpers/auth';

// PR calculation + save on workout completion. All checks POST a real session
// (what "finish workout" does) and assert the computed PRs, then delete the
// session. Serial so the shared e2e_fitness history doesn't race between checks.
// (The completion-summary UI PR section is covered by workout.spec, which is the
// only fitness UI workout, to avoid active-workout collisions.)

test.use({ storageState: storageStateFor('fitness') });
test.describe.configure({ mode: 'serial' });

const hourAgo = () => Date.now() - 3_600_000;

/** A dead-straight, absurdly fast run of ~`km` kilometres (guaranteed to beat any
 *  real effort → fresh best-effort PRs). Constant latitude, increasing longitude. */
function fastRun(startMs: number, km: number) {
	const n = 250;
	const lat = 47.4;
	const lngSpan = km / 75.9; // ~75.9 km per ° lng at lat 47
	const durMs = km * 40_000; // 40 s/km — far faster than any human, still positive splits
	const gpsTrack = Array.from({ length: n }, (_, i) => ({
		lat,
		lng: 8.5 + (lngSpan * i) / (n - 1),
		timestamp: startMs + (durMs * i) / (n - 1)
	}));
	return { gpsTrack, endMs: startMs + durMs };
}

async function createSession(request: APIRequestContext, data: object) {
	const res = await request.post('/api/fitness/sessions', { data });
	expect(res.status()).toBe(201);
	return res.json();
}

test('strength PRs: maxWeight, est1rm (Epley) and bestSetVolume are computed + saved', async ({ request }) => {
	// bench-press-barbell has prior history (best 105 kg); 500 kg beats it on every
	// axis. (Uses a different exercise than workout.spec's squat so their PR
	// detection can't interfere when both run.)
	const start = hourAgo();
	const body = await createSession(request, {
		name: 'E2E strength PR',
		mode: 'manual',
		startTime: new Date(start).toISOString(),
		endTime: new Date().toISOString(),
		exercises: [{ exerciseId: 'bench-press-barbell', name: 'Bench Press (Barbell)', sets: [{ weight: 500, reps: 5, completed: true }] }],
		totalVolume: 2500
	});
	const prs: { type: string; value: number }[] = body.session.prs ?? [];
	const byType = Object.fromEntries(prs.map((p) => [p.type, p.value]));

	expect(byType.maxWeight).toBe(500);
	expect(byType.est1rm).toBe(Math.round(500 * (1 + 5 / 30))); // Epley = 583
	expect(byType.bestSetVolume).toBe(2500);

	// Persisted on the saved session.
	const detail = await (await request.get(`/api/fitness/sessions/${body.session._id}`)).json();
	expect((detail.session ?? detail).prs.map((p: { type: string }) => p.type).sort()).toEqual(['bestSetVolume', 'est1rm', 'maxWeight']);

	await request.delete(`/api/fitness/sessions/${body.session._id}`);
});

test('running PRs: best efforts + all-time fastest-Nk records from GPS', async ({ request }) => {
	const start = hourAgo();
	const { gpsTrack, endMs } = fastRun(start, 5.3);
	const body = await createSession(request, {
		name: 'E2E run PR',
		mode: 'gps',
		activityType: 'running',
		startTime: new Date(start).toISOString(),
		endTime: new Date(endMs).toISOString(),
		gpsTrack,
		totalDistance: 5.3
	});

	// Best efforts cached on the run for 1..5 km.
	const efforts: { km: number; seconds: number }[] = body.session.bestEfforts ?? [];
	expect(efforts.map((e) => e.km).sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5]);

	// New all-time fastest records, each beating the previous best.
	const beprs: { km: number; seconds: number; prevSeconds: number }[] = body.bestEffortPrs ?? [];
	expect(beprs.length).toBeGreaterThanOrEqual(5);
	for (const pr of beprs) expect(pr.seconds).toBeLessThan(pr.prevSeconds);

	await request.delete(`/api/fitness/sessions/${body.session._id}`);
});

test('segment PRs: running a seeded segment records a PB/KOM achievement', async ({ request }) => {
	// Fetch a real segment's geometry and run exactly along it.
	const list = await (await request.get('/api/fitness/segments?activity=running')).json();
	const segId = list.segments[0]._id;
	const { segment } = await (await request.get(`/api/fitness/segments/${segId}`)).json();
	const points: number[][] = segment.points;

	const start = hourAgo();
	const gpsTrack = points.map((p, i) => ({ lat: p[0], lng: p[1], timestamp: start + i * 800 }));
	const body = await createSession(request, {
		name: 'E2E segment PR',
		mode: 'gps',
		activityType: 'running',
		startTime: new Date(start).toISOString(),
		endTime: new Date(start + points.length * 800).toISOString(),
		gpsTrack,
		totalDistance: segment.distance
	});

	const achievements: { segmentId: string; isPB: boolean }[] = body.segmentAchievements ?? [];
	expect(achievements.length).toBeGreaterThan(0);
	expect(achievements.some((a) => a.segmentId === segId)).toBe(true);
	expect(achievements.every((a) => a.isPB)).toBe(true); // first fast effort → personal best

	await request.delete(`/api/fitness/sessions/${body.session._id}`);
});
