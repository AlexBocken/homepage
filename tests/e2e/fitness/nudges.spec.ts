import { test, expect } from '@playwright/test';
import { storageStateFor } from '../helpers/auth';

test.use({ storageState: storageStateFor('fitness') });

/**
 * These exercise the API rather than the card, because the card only appears when a
 * day is genuinely short on macros — a state that takes several fixtures to stage and
 * would make the spec brittle. The reversibility guarantee is the part worth pinning:
 * a suggestion that cannot be undone cleanly is worse than no suggestion.
 */
const CHICKEN = { calories: 165, protein: 31, fat: 3.6, carbs: 0 };

function isoDay(offsetDays: number) {
	const d = new Date();
	d.setDate(d.getDate() + offsetDays);
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

test('a bump is an exact inverse when undone', async ({ request }) => {
	const date = isoDay(0);
	const res = await request.post('/api/fitness/food-log', {
		data: { date, mealType: 'lunch', name: 'E2E Bump Fixture', source: 'bls', sourceId: 'E2E-BUMP', amountGrams: 150, per100g: CHICKEN },
	});
	expect(res.ok()).toBeTruthy();
	const { _id: id } = await res.json();

	try {
		// Apply, as the card does.
		const bump = await request.put(`/api/fitness/food-log/${id}`, { data: { amountGrams: 275 } });
		expect(bump.ok()).toBeTruthy();
		expect((await bump.json()).amountGrams).toBe(275);

		// Undo restores the original weight exactly, not an approximation.
		const undo = await request.put(`/api/fitness/food-log/${id}`, { data: { amountGrams: 150 } });
		expect(undo.ok()).toBeTruthy();
		expect((await undo.json()).amountGrams).toBe(150);
	} finally {
		await request.delete(`/api/fitness/food-log/${id}`);
	}
});

test('nudges never suggest less than the 50 g floor', async ({ request }) => {
	const res = await request.get('/api/fitness/nudges', {
		params: { remainingKcal: 600, remainingProtein: 40, remainingFat: 10, remainingCarbs: 40, date: isoDay(0) },
	});
	expect(res.ok()).toBeTruthy();
	const { nudges } = await res.json();
	for (const n of nudges) {
		expect(n.deltaGrams).toBeGreaterThanOrEqual(50);
		expect(n.deltaGrams % 5).toBe(0);
	}
});

test('a day with nothing left to close returns no nudges', async ({ request }) => {
	const res = await request.get('/api/fitness/nudges', {
		params: { remainingKcal: 0, remainingProtein: 0, remainingFat: 0, remainingCarbs: 0, date: isoDay(0) },
	});
	expect(res.ok()).toBeTruthy();
	expect((await res.json()).nudges).toEqual([]);
});

test('the endpoint works out what is left when it is not told', async ({ request }) => {
	// This is the form the nutrition page's server load uses, so it can request the
	// card's data in parallel with the goal and the food log rather than after them.
	const res = await request.get('/api/fitness/nudges', { params: { date: isoDay(0) } });
	expect(res.ok()).toBeTruthy();
	const body = await res.json();
	expect(Array.isArray(body.nudges)).toBe(true);
	// Either it derived the remainders, or it said it had nothing to derive them from
	// (no calorie goal). A silent 0-for-everything would quietly disable the card.
	if (body.nudges.length > 0) {
		expect(body.remaining).not.toBeNull();
		expect(body.remaining.kcal).toBeGreaterThan(0);
	}
	// Past days cannot be added to, so they are answered without suggestions.
	const past = await request.get('/api/fitness/nudges', { params: { date: isoDay(-3) } });
	expect(past.ok()).toBeTruthy();
	expect((await past.json()).nudges).toEqual([]);
});

test('the card is server-rendered, not fetched after hydration', async ({ request }) => {
	// The whole point of deriving the remainders server-side: whatever the card shows
	// has to be in the HTML the browser first receives. This asserts on the raw
	// document, so a client-side fetch could not satisfy it.
	const res = await request.get('/fitness/nutrition');
	expect(res.ok()).toBeTruthy();
	const html = await res.text();
	// The load's payload carries the suggestions, whether or not today has any.
	expect(html).toContain('nudgesRemaining');
	// When there are suggestions, the card itself is already in that HTML.
	const nudges = await request.get('/api/fitness/nudges', { params: { date: isoDay(0) } });
	if (((await nudges.json()).nudges ?? []).length > 0) {
		expect(html).toContain('Finish your day');
	}
});

test('a recipe that fits what is left is offered, with a way to cook it', async ({ request }) => {
	// Seeded recipes have no cached nutrition until something asks for the listing —
	// that endpoint fills the cache, and the nudge query only considers recipes that
	// have it, because the cached figure is the one that includes any base recipes.
	expect((await request.get('/api/rezepte/items/all_brief')).ok()).toBeTruthy();

	// Read the fixture's own per-100 g rather than hardcoding a USDA row's macros, so
	// this stays true when the table is re-imported.
	const search = await request.get('/api/nutrition/search', {
		params: { q: 'E2E Bildkuchen', full: 'true', sources: 'recipe' },
	});
	expect(search.ok()).toBeTruthy();
	const cake = (await search.json()).find((r: any) => r.shortName === 'e2e_bildkuchen');
	expect(cake, 'the image-cake fixture must be searchable with nutrition').toBeTruthy();

	// A day whose remaining macros are exactly 100 g of that cake. Nothing else can
	// fit better, so if recipes are offered at all this one has to be among them.
	// Unrounded: the cake is plain flour, and rounded targets let a cloned bread
	// land closer than the cake itself and take the dish slots.
	const per = cake.per100g;
	const res = await request.get('/api/fitness/nudges', {
		params: {
			date: isoDay(0),
			remainingKcal: per.calories,
			remainingProtein: per.protein,
			remainingFat: per.fat,
			remainingCarbs: per.carbs,
		},
	});
	expect(res.ok()).toBeTruthy();
	const { nudges } = await res.json();

	const row = nudges.find((n: any) => n.dish?.slug === 'e2e_bildkuchen');
	expect(row, 'a recipe that lands every macro should be offered').toBeTruthy();
	expect(row.source).toBe('recipe');
	// Pinned above the adjustments — that is the whole point of the recipe slot. Which
	// dish leads is not asserted: the cloned dev recipes are real data and one of them
	// may fit this particular day just as well.
	const lastDish = nudges.map((n: any) => !!n.dish).lastIndexOf(true);
	const firstOther = nudges.findIndex((n: any) => !n.dish);
	if (firstOther !== -1) expect(lastDish).toBeLessThan(firstOther);
	// Everything the card needs to render the row: the page in either language, the
	// thumbnail, and what one of the eight stated portions weighs.
	expect(row.dish.kind).toBe('recipe');
	expect(row.dish.slugEn).toBe('e2e_imagecake');
	expect(row.dish.image).toContain('e2e-bildkuchen');
	expect(row.dish.portionGrams).toBeGreaterThan(0);

	// The row is loggable exactly as the card sends it: a recipe logs by reference,
	// so the server decomposes it into ingredients rather than trusting per100g.
	const log = await request.post('/api/fitness/food-log', {
		data: {
			date: isoDay(0), mealType: 'dinner', name: row.name,
			source: row.source, sourceId: row.sourceId, amountGrams: row.deltaGrams,
		},
	});
	expect(log.ok()).toBeTruthy();
	const created = await log.json();
	try {
		expect(created.source).toBe('recipe');
	} finally {
		await request.delete(`/api/fitness/food-log/${created._id}`);
	}
});

test('a saved meal that fits what is left is offered too', async ({ request }) => {
	// A meal is built here rather than seeded: it has to reference real base-table rows,
	// because a meal's nutrition is resolved live from them rather than stored.
	const search = await request.get('/api/nutrition/search', {
		params: { q: 'Quark', full: 'true', sources: 'bls' },
	});
	expect(search.ok()).toBeTruthy();
	const foods = (await search.json()).filter((f: any) => f.per100g?.calories > 0);
	expect(foods.length, 'the BLS table must be loaded').toBeGreaterThan(0);
	// The most protein-dense match, so the day this stages is a shape almost no recipe
	// can fit — the assertion below is then about the meal, not about what else exists.
	const food = foods.sort((a: any, b: any) => b.per100g.protein / b.per100g.calories - a.per100g.protein / a.per100g.calories)[0];

	const create = await request.post('/api/fitness/custom-meals', {
		data: {
			name: 'E2E Nudge Meal',
			ingredients: [{ name: food.name, source: 'bls', sourceId: food.id, amountGrams: 200 }],
		},
	});
	expect(create.ok()).toBeTruthy();
	const mealId = String((await create.json())._id);

	try {
		// Exactly 200 g of that meal is what the day has room for.
		const per = food.per100g;
		const res = await request.get('/api/fitness/nudges', {
			params: {
				date: isoDay(0),
				remainingKcal: Math.round(per.calories * 2),
				remainingProtein: Math.round(per.protein * 2),
				remainingFat: Math.round((per.fat ?? 0) * 2),
				remainingCarbs: Math.round((per.carbs ?? 0) * 2),
			},
		});
		expect(res.ok()).toBeTruthy();
		const { nudges } = await res.json();

		const row = nudges.find((n: any) => n.sourceId === mealId);
		expect(row, 'a saved meal that lands every macro should be offered').toBeTruthy();
		expect(row.source).toBe('custom');
		expect(row.dish.kind).toBe('custom');
		// A meal has one serving — itself — so the card can read it in servings.
		expect(row.dish.portionGrams).toBe(200);
		// No recipe page to link to; the row points at the meal's own entry instead.
		expect(row.dish.slug).toBeUndefined();
	} finally {
		await request.delete(`/api/fitness/custom-meals/${mealId}`);
	}
});

test('copy-day duplicates a day and the copies can be removed again', async ({ request }) => {
	const from = isoDay(-1);
	const to = isoDay(0);

	const seed = await request.post('/api/fitness/food-log', {
		data: { date: from, mealType: 'breakfast', name: 'E2E Copy Fixture', source: 'bls', sourceId: 'E2E-COPY', amountGrams: 120, per100g: CHICKEN },
	});
	expect(seed.ok()).toBeTruthy();
	const { _id: seedId } = await seed.json();

	let copiedIds: string[] = [];
	try {
		const res = await request.post('/api/fitness/food-log/copy-day', { data: { from, to } });
		expect(res.ok()).toBeTruthy();
		const body = await res.json();
		copiedIds = body.ids;
		expect(body.copied).toBeGreaterThanOrEqual(1);

		// The copy is a snapshot: it must be its own entry, not a reference.
		expect(copiedIds).not.toContain(seedId);
	} finally {
		for (const id of copiedIds) await request.delete(`/api/fitness/food-log/${id}`);
		await request.delete(`/api/fitness/food-log/${seedId}`);
	}
});

test('copy-day refuses a same-day or malformed request', async ({ request }) => {
	const day = isoDay(0);
	expect((await request.post('/api/fitness/food-log/copy-day', { data: { from: day, to: day } })).status()).toBe(400);
	expect((await request.post('/api/fitness/food-log/copy-day', { data: { from: 'yesterday', to: day } })).status()).toBe(400);
});
