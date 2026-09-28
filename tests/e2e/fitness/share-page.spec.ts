import { test, expect, type APIRequestContext } from '@playwright/test';
import { storageStateFor } from '../helpers/auth';
import { gotoHydrated } from '../helpers/nav';

// The public run share page (/r/[id]). The owner copies the link from the
// session detail page's Share button (no share sheet headless, so it lands on
// the clipboard); a logged-out visitor then opens it. The run is injected via
// the API because a GPS run can't be recorded headless.

test.use({ storageState: storageStateFor('fitness') });

const NAME = 'E2E shared run';

async function injectRun(request: APIRequestContext): Promise<string> {
	const start = Date.now() - 3_600_000;
	const N = 200;
	const dur = 18 * 60_000;
	const gpsTrack = Array.from({ length: N }, (_, i) => {
		const f = i / (N - 1);
		return { lat: 47.4 + 0.02 * f, lng: 8.5 + 0.03 * f, altitude: 400 + 20 * f, timestamp: start + dur * f };
	});
	const res = await request.post('/api/fitness/sessions', {
		data: {
			name: NAME,
			activityType: 'running',
			startTime: new Date(start).toISOString(),
			endTime: new Date(start + dur).toISOString(),
			notes: 'Shared run note',
			exercises: [
				{
					exerciseId: 'running',
					name: 'Running',
					sets: [{ distance: 3, duration: 18, completed: true }],
					gpsTrack,
					totalDistance: 3
				}
			]
		}
	});
	expect(res.status()).toBe(201);
	return (await res.json()).session._id;
}

test('a shared run opens for a logged-out visitor, and only with its token', async ({ page, request, browser }) => {
	const sid = await injectRun(request);
	try {
		// No share sheet: the Share button falls back to copying the link.
		await page.addInitScript(() => {
			Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
			Object.defineProperty(navigator, 'canShare', { value: undefined, configurable: true });
			Object.defineProperty(navigator, 'clipboard', {
				value: { writeText: async (s: string) => { (window as any).__copied = s; } },
				configurable: true
			});
		});
		await gotoHydrated(page, `/fitness/history/${sid}`);
		await page.getByRole('button', { name: 'Share', exact: true }).click();
		await expect.poll(() => page.evaluate(() => (window as any).__copied ?? null)).not.toBeNull();
		const shareUrl = new URL(await page.evaluate(() => (window as any).__copied as string));
		expect(shareUrl.pathname).toBe(`/r/${sid}`);
		const token = shareUrl.searchParams.get('token');
		expect(token).toBeTruthy();

		// A fresh context carries no login.
		const ctx = await browser.newContext();
		try {
			const anon = await ctx.newPage();
			// The bare id heals to the canonical `<slug>-<id>` spelling, token kept.
			await gotoHydrated(anon, `${shareUrl.pathname}${shareUrl.search}`);
			await expect(anon).toHaveURL(new RegExp(`/r/[^/?]+-${sid}\\?token=`));
			await expect(anon.locator('main.share h1')).toHaveText(NAME);
			await expect(anon.locator('meta[property="og:image"]')).toHaveAttribute('content', new RegExp(`/api/fitness/sessions/${sid}/card\\.webp\\?token=`));

			// The read-only body: the exercise, its GPS stats, map, splits and notes.
			await expect(anon.locator('.exercise-block h3')).toHaveText(/Running/);
			await expect(anon.locator('.gps-stat.accent').first()).toHaveText(/3\.00 km/);
			await expect(anon.locator('.track-map')).toBeVisible();
			await expect(anon.locator('.best-efforts .be-row').first()).toBeVisible();
			await expect(anon.locator('.note-body')).toHaveText('Shared run note');
			// Nothing to edit, and no owner-only actions.
			await expect(anon.getByRole('button', { name: 'Edit session' })).toHaveCount(0);
			await expect(anon.getByRole('button', { name: /Delete session/ })).toHaveCount(0);

			// Clicking a best effort pins it (the map highlight follows).
			const row = anon.locator('.best-efforts .be-row').first();
			await row.click();
			await expect(row).toHaveClass(/pinned/);

			// A wrong or missing token is a plain 404.
			const bad = await anon.goto(`/r/${sid}?token=nope`);
			expect(bad?.status()).toBe(404);
			const none = await anon.goto(`/r/${sid}`);
			expect(none?.status()).toBe(404);
		} finally {
			await ctx.close();
		}
	} finally {
		await request.delete(`/api/fitness/sessions/${sid}`);
	}
});
