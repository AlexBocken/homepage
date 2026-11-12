import { test, expect, request as pw, type APIRequestContext } from '@playwright/test';
import { storageStateFor } from '../helpers/auth';

// Fitness is open to every logged-in user, but custom meals and workout templates
// are private: another account can neither read, edit, nor log/reference them by
// id. Also covers the food-log sourceId operator injection ({"$gt": ""}).
//
// Pure API round trip: the owner (e2e_fitness) creates a meal and a template, a
// second account (anna) probes them, the owner deletes both.

const BASE = 'http://localhost:4173';
const DAY = '2026-01-15';

let owner: APIRequestContext;
let other: APIRequestContext;
let anon: APIRequestContext;
let mealId = '';
let templateId = '';

test.beforeAll(async () => {
	owner = await pw.newContext({ baseURL: BASE, storageState: storageStateFor('fitness') });
	other = await pw.newContext({ baseURL: BASE, storageState: storageStateFor('anna') });
	anon = await pw.newContext({ baseURL: BASE });

	const meal = await owner.post('/api/fitness/custom-meals', {
		data: {
			name: 'E2E Private Meal',
			ingredients: [{ name: 'Haferflocken', source: 'bls', sourceId: 'C133000', amountGrams: 50 }],
		},
	});
	expect(meal.status()).toBe(201);
	mealId = (await meal.json())._id;

	const tmpl = await owner.post('/api/fitness/templates', {
		data: {
			name: 'E2E Private Template',
			exercises: [{ exerciseId: 'bench-press-barbell', sets: [{ reps: 5, weight: 60 }] }],
			// Legacy flag: must no longer expose the template to anyone else.
			isPublic: true,
		},
	});
	expect(tmpl.status()).toBe(201);
	templateId = (await tmpl.json()).template._id;
});

test.afterAll(async () => {
	if (mealId) await owner.delete(`/api/fitness/custom-meals/${mealId}`);
	if (templateId) await owner.delete(`/api/fitness/templates/${templateId}`);
	await Promise.all([owner.dispose(), other.dispose(), anon.dispose()]);
});

test('custom meal: owner can look it up, nobody else can', async () => {
	const lookup = `/api/nutrition/lookup?source=custom&id=${mealId}`;
	expect((await owner.get(lookup)).status()).toBe(200);
	expect((await other.get(lookup)).status()).toBe(404);
	expect((await anon.get(lookup)).status()).toBe(401);
});

test('custom meal: another user cannot edit it or log it', async () => {
	const put = await other.put(`/api/fitness/custom-meals/${mealId}`, { data: { name: 'hijacked' } });
	expect(put.status()).toBe(404);

	const log = await other.post('/api/fitness/food-log', {
		data: { date: DAY, mealType: 'snack', name: 'probe', source: 'custom', sourceId: mealId, amountGrams: 50 },
	});
	expect(log.status()).toBe(400);

	// The owner's meal is untouched.
	const list = await (await owner.get('/api/fitness/custom-meals')).json();
	expect(list.meals.find((m: { _id: string }) => m._id === mealId)?.name).toBe('E2E Private Meal');
	expect((await other.get('/api/fitness/custom-meals')).ok()).toBe(true);
	const otherList = await (await other.get('/api/fitness/custom-meals')).json();
	expect(otherList.meals.some((m: { _id: string }) => m._id === mealId)).toBe(false);
});

test('custom meal: detail page 404s for another user', async () => {
	const res = await other.get(`/fitness/nutrition/food/custom/${mealId}`);
	expect(res.status()).toBe(404);
});

test('food-log rejects a non-string sourceId', async () => {
	for (const source of ['recipe', 'custom']) {
		const res = await other.post('/api/fitness/food-log', {
			data: { date: DAY, mealType: 'snack', name: 'probe', source, sourceId: { $gt: '' }, amountGrams: 50 },
		});
		expect(res.status()).toBe(400);
	}
});

test('workout template: invisible to another user, even flagged public', async () => {
	expect((await owner.get(`/api/fitness/templates/${templateId}`)).status()).toBe(200);
	expect((await other.get(`/api/fitness/templates/${templateId}`)).status()).toBe(404);

	const list = await (await other.get('/api/fitness/templates?include_public=true')).json();
	expect(list.templates.some((t: { _id: string }) => t._id === templateId)).toBe(false);
});
