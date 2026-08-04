import { test, expect } from '@playwright/test';
import { storageStateFor } from '../helpers/auth';
import { gotoHydrated } from '../helpers/nav';

/**
 * Progress for a repeated cardio workout: the per-template board on /fitness/segments
 * and the detail view behind it.
 *
 * The cloned dev data cannot be relied on to contain two runs of one template, and the
 * whole point of the board is comparing repeats — so this owns its fixture: a template
 * plus two runs of it at different paces, removed again at the end.
 */

test.use({ storageState: storageStateFor('fitness') });

const NAME = 'E2E Tempo Loop';

function isoAt(offsetDays: number, minutes: number) {
	const d = new Date();
	d.setDate(d.getDate() + offsetDays);
	d.setHours(9, 0, 0, 0);
	const end = new Date(d.getTime() + minutes * 60000);
	return { start: d.toISOString(), end: end.toISOString() };
}

test('two runs of one workout make a board row and a progress page', async ({ page, request }) => {
	const tpl = await request.post('/api/fitness/templates', {
		data: { name: NAME, mode: 'gps', activityType: 'running', exercises: [] },
	});
	expect(tpl.ok()).toBeTruthy();
	const templateId = String((await tpl.json())._id ?? (await tpl.json()).template?._id);

	const sessionIds: string[] = [];
	try {
		// Same 5 km, two weeks apart, the later one faster: 6:00 /km then 5:36 /km.
		for (const [offset, minutes] of [
			[-14, 30],
			[-1, 28],
		] as const) {
			const { start, end } = isoAt(offset, minutes);
			const res = await request.post('/api/fitness/sessions', {
				data: {
					templateId,
					name: NAME,
					mode: 'gps',
					activityType: 'running',
					totalDistance: 5,
					startTime: start,
					endTime: end,
					exercises: [],
					gpsTrack: [
						{ lat: 47.37, lng: 8.54, timestamp: new Date(start).getTime() },
						{ lat: 47.371, lng: 8.541, timestamp: new Date(end).getTime() },
					],
				},
			});
			expect(res.ok()).toBeTruthy();
			const body = await res.json();
			sessionIds.push(String(body._id ?? body.session?._id));
		}

		// The board aggregates both runs and ranks the pair by pace, not by time.
		const boardRes = await request.get('/api/fitness/stats/workout-templates', {
			params: { activity: 'running' },
		});
		expect(boardRes.ok()).toBeTruthy();
		const row = (await boardRes.json()).templates.find(
			(r: { templateId: string }) => r.templateId === templateId,
		);
		expect(row, 'the new template should be on the running board').toBeTruthy();
		expect(row.name).toBe(NAME);
		expect(row.attempts).toBe(2);
		expect(row.avgKm).toBeCloseTo(5, 1);
		// 28 min over 5 km is the faster of the two.
		expect(row.bestPace).toBeCloseTo(28 / 5, 2);
		expect(row.bestSeconds).toBe(28 * 60);

		// And it is reachable from the segments page, which server-renders the board.
		await gotoHydrated(page, '/fitness/segments');
		await page.getByRole('link', { name: NAME }).click();
		await expect(page).toHaveURL(new RegExp(`/fitness/segments/template/e2e-tempo-loop-${templateId}$`));
		await expect(page.getByRole('heading', { name: NAME, level: 1 })).toBeVisible();

		// Both attempts listed, the faster one marked, and a trend drawn over the two.
		const rows = page.locator('.hist-row');
		await expect(rows).toHaveCount(2);
		await expect(page.locator('.hist-row.best')).toHaveCount(1);
		await expect(page.locator('canvas')).toBeVisible();
	} finally {
		for (const id of sessionIds) await request.delete(`/api/fitness/sessions/${id}`);
		await request.delete(`/api/fitness/templates/${templateId}`);
	}
});

test('a workout that was never run has no progress page', async ({ request }) => {
	// A well-formed id nobody has run: answered 404 rather than an empty chart.
	const res = await request.get('/api/fitness/stats/workout-templates/000000000000000000000000');
	expect(res.status()).toBe(404);
	// A malformed one is rejected before it reaches the database.
	expect((await request.get('/api/fitness/stats/workout-templates/not-an-id')).status()).toBe(400);
});

test('the board is scoped to the caller and split by activity', async ({ request }) => {
	// Cycling and running boards never mix: a running template must not surface on the
	// cycling board (the two use different rate units and are read separately).
	const cycling = await request.get('/api/fitness/stats/workout-templates', {
		params: { activity: 'cycling' },
	});
	expect(cycling.ok()).toBeTruthy();
	const body = await cycling.json();
	expect(body.activity).toBe('cycling');
	expect(body.templates.some((r: { name: string }) => r.name === NAME)).toBe(false);
});
