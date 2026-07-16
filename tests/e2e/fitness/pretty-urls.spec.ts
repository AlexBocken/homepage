import { test, expect, type APIRequestContext } from '@playwright/test';
import { storageStateFor } from '../helpers/auth';
import { gotoHydrated } from '../helpers/nav';

// Human-readable detail URLs, and the healing that makes the slug optional: the
// id alone always resolves, then redirects to the canonical spelling. Serial —
// each test owns the session/segment it creates and deletes it again.

test.use({ storageState: storageStateFor('fitness') });
test.describe.configure({ mode: 'serial' });

const OID = /[0-9a-f]{24}/;

async function createRun(request: APIRequestContext, name: string): Promise<string> {
	const start = Date.now() - 30 * 60_000;
	const res = await request.post('/api/fitness/sessions', {
		data: {
			name,
			startTime: new Date(start).toISOString(),
			endTime: new Date().toISOString(),
			exercises: [{ exerciseId: 'squat-barbell', name: 'Squat', sets: [{ weight: 60, reps: 5, completed: true }] }]
		}
	});
	expect(res.status()).toBe(201);
	return (await res.json()).session._id;
}

test('a run detail URL carries the weekday and workout name', async ({ page, request }) => {
	const sid = await createRun(request, 'Push Day');
	try {
		await gotoHydrated(page, '/fitness/history');
		await page.getByText('Push Day').first().click();
		// e.g. /fitness/history/thursday-push-day-507f1f77bcf86cd799439011
		await expect(page).toHaveURL(/\/fitness\/history\/[a-z]+day-push-day-[0-9a-f]{24}$/);
	} finally {
		await request.delete(`/api/fitness/sessions/${sid}`);
	}
});

test('a bare id heals to the pretty URL, keeping the query string', async ({ page, request }) => {
	const sid = await createRun(request, 'Push Day');
	try {
		await gotoHydrated(page, `/fitness/history/${sid}?highlight=1k`);
		await expect(page).toHaveURL(new RegExp(`push-day-${sid}\\?highlight=1k$`));
		await expect(page.getByText('Push Day').first()).toBeVisible();
	} finally {
		await request.delete(`/api/fitness/sessions/${sid}`);
	}
});

test('a stale slug heals rather than 404ing', async ({ page, request }) => {
	const sid = await createRun(request, 'Push Day');
	try {
		// The URL someone bookmarked before the workout was renamed.
		await gotoHydrated(page, `/fitness/history/monday-totally-old-name-${sid}`);
		await expect(page).toHaveURL(new RegExp(`push-day-${sid}$`));
		await expect(page.getByText('Push Day').first()).toBeVisible();
	} finally {
		await request.delete(`/api/fitness/sessions/${sid}`);
	}
});

test('an unknown id still 404s instead of redirecting to a prettier 404', async ({ page }) => {
	const res = await page.goto('/fitness/history/507f1f77bcf86cd799439011');
	expect(res?.status()).toBe(404);
});

test('a segment URL carries its name and heals from a bare id', async ({ page, request }) => {
	await gotoHydrated(page, '/fitness/segments');
	const first = page.locator('.segment-card').first();
	test.skip(!(await first.count()), 'no segments seeded for this user');

	const href = await first.getAttribute('href');
	const segId = href?.match(OID)?.[0];
	expect(segId).toBeTruthy();
	// The list link is already canonical: <name>-<id>, not a bare id.
	expect(href).not.toMatch(new RegExp(`/segments/${segId}$`));

	await gotoHydrated(page, `/fitness/segments/${segId}`);
	await expect(page).toHaveURL(new RegExp(`/fitness/segments/.+-${segId}$`));
});
