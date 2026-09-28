import { test, expect } from '@playwright/test';
import { storageStateFor } from '../helpers/auth';
import { gotoHydrated } from '../helpers/nav';

// The measurement edit page (/fitness/check-in/edit/[id]): the form is filled
// from the stored measurement, and saving PUTs exactly what is in the form —
// the byte-for-byte body is pinned, key order included, so a rewrite of the form
// can't quietly change what reaches the API.

test.use({ storageState: storageStateFor('fitness') });

const ALL_PARTS = {
	neck: 38, shoulders: 120, chest: 100,
	leftBicep: 35, rightBicep: 35.5, leftForearm: 29, rightForearm: 29.5,
	waist: 82, hips: 96,
	leftThigh: 58, rightThigh: 58.5, leftCalf: 38, rightCalf: 38.2
};

test('edit a measurement: the form is prefilled and the PUT body is exact', async ({ page, request }) => {
	const created = await request.post('/api/fitness/measurements', {
		data: { date: '2019-03-14', weight: 80.4, bodyFatPercent: 15.2, measurements: ALL_PARTS }
	});
	expect(created.ok()).toBe(true);
	const json = await created.json();
	const id = (json.measurement ?? json)._id;
	try {
		await gotoHydrated(page, `/fitness/check-in/edit/${id}`);
		await expect(page.getByRole('heading', { name: 'Edit Measurement' })).toBeVisible();

		// Prefilled from the stored record, one input per body part and side.
		await expect(page.locator('#m-weight')).toHaveValue('80.4');
		await expect(page.locator('#m-bf')).toHaveValue('15.2');
		await expect(page.locator('#m-neck')).toHaveValue('38');
		await expect(page.locator('#m-bl')).toHaveValue('35');
		await expect(page.locator('#m-br')).toHaveValue('35.5');
		await expect(page.locator('#m-cr')).toHaveValue('38.2');
		const labels = await page.locator('form .form-group label').allTextContents();
		expect(labels.map((l) => l.trim())).toEqual([
			'Date', 'Weight (kg)', 'Body Fat (%)',
			'Neck', 'Shoulders', 'Chest',
			'L Bicep', 'R Bicep', 'L Forearm', 'R Forearm',
			'Waist', 'Hips',
			'L Thigh', 'R Thigh', 'L Calf', 'R Calf'
		]);

		// Change one part, clear another and the body fat.
		await page.locator('#m-neck').fill('38.5');
		await page.locator('#m-hips').fill('');
		await page.locator('#m-bf').fill('');

		const put = page.waitForRequest((r) => r.url().includes(`/api/fitness/measurements/${id}`) && r.method() === 'PUT');
		await page.getByRole('button', { name: 'Update Measurement' }).click();
		const body = (await put).postData();
		expect(body).toBe(
			JSON.stringify({
				date: '2019-03-14',
				weight: 80.4,
				bodyFatPercent: null,
				measurements: {
					neck: 38.5, shoulders: 120, chest: 100,
					leftBicep: 35, rightBicep: 35.5, leftForearm: 29, rightForearm: 29.5,
					waist: 82,
					leftThigh: 58, rightThigh: 58.5, leftCalf: 38, rightCalf: 38.2
				}
			})
		);
		await expect(page).toHaveURL(/\/fitness\/check-in$/);

		// Clearing every part sends `measurements: null`.
		await gotoHydrated(page, `/fitness/check-in/edit/${id}`);
		for (const input of await page.locator('form input[type="number"]').all()) await input.fill('');
		const put2 = page.waitForRequest((r) => r.url().includes(`/api/fitness/measurements/${id}`) && r.method() === 'PUT');
		await page.getByRole('button', { name: 'Update Measurement' }).click();
		expect((await put2).postData()).toBe(
			JSON.stringify({ date: '2019-03-14', weight: null, bodyFatPercent: null, measurements: null })
		);
	} finally {
		await request.delete(`/api/fitness/measurements/${id}`);
	}
});
