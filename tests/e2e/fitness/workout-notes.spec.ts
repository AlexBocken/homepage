import { test, expect, type APIRequestContext } from '@playwright/test';
import { storageStateFor } from '../helpers/auth';
import { gotoHydrated } from '../helpers/nav';

/**
 * The workout note, from writing it to reading it back.
 *
 * A note can be written in three places — mid-session, on the completion screen, and in
 * the detail view's edit form — and all three end up on the same field of the same
 * session. A real workout can't be recorded headless, so the session is injected and the
 * two ends that *are* reachable in a browser are driven through the UI: the note renders
 * on the detail page, and editing it there persists.
 */

test.use({ storageState: storageStateFor('fitness') });

const NOTE = 'Left knee twinged on set 3.\nDropped to 60 kg and it settled.';

async function injectSession(request: APIRequestContext, notes?: string): Promise<string> {
	const start = Date.now() - 3_600_000;
	const res = await request.post('/api/fitness/sessions', {
		data: {
			name: 'E2E Note Session',
			startTime: new Date(start).toISOString(),
			endTime: new Date(start + 30 * 60_000).toISOString(),
			notes,
			exercises: [
				{
					exerciseId: 'squat-barbell',
					name: 'Squat',
					sets: [{ weight: 60, reps: 8, completed: true }],
				},
			],
		},
	});
	expect(res.status()).toBe(201);
	return (await res.json()).session._id;
}

test('a note written with the workout is kept on the session', async ({ request }) => {
	// This is the shape the active-workout screen POSTs: the note rides along with the
	// session rather than being saved separately.
	const id = await injectSession(request, NOTE);
	try {
		const res = await request.get(`/api/fitness/sessions/${id}`);
		expect(res.ok()).toBeTruthy();
		expect((await res.json()).session.notes).toBe(NOTE);
	} finally {
		await request.delete(`/api/fitness/sessions/${id}`);
	}
});

test('the note shows on the workout detail view, line breaks intact', async ({ page, request }) => {
	const id = await injectSession(request, NOTE);
	try {
		await gotoHydrated(page, `/fitness/history/${id}`);
		const note = page.locator('.notes-section .note-body');
		await expect(note).toBeVisible();
		await expect(note).toContainText('Left knee twinged on set 3.');
		// Typed as lines, read as lines — the note is rendered pre-wrap.
		await expect(note).toHaveCSS('white-space', 'pre-wrap');
	} finally {
		await request.delete(`/api/fitness/sessions/${id}`);
	}
});

test('a note can be added later from the detail view', async ({ page, request }) => {
	// A session saved without one: the edit form is the third way in.
	const id = await injectSession(request);
	try {
		await gotoHydrated(page, `/fitness/history/${id}`);
		await expect(page.locator('.notes-section')).toHaveCount(0);

		await page.getByRole('button', { name: 'Edit session' }).click();
		await page.locator('#edit-notes').fill('Felt strong. Add 2.5 kg next time.');
		await page.locator('.save-btn').click();

		await expect(page.locator('.notes-section .note-body')).toContainText('Add 2.5 kg next time.');

		// And it is the session that changed, not just the screen.
		const res = await request.get(`/api/fitness/sessions/${id}`);
		expect((await res.json()).session.notes).toBe('Felt strong. Add 2.5 kg next time.');
	} finally {
		await request.delete(`/api/fitness/sessions/${id}`);
	}
});
