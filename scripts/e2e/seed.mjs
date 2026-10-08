#!/usr/bin/env node
// Seed the throwaway test Mongo with deterministic fixtures. Inserts raw
// documents through the mongoose connection (no app-model import, so no
// $lib/$types alias or vite-node dependency) — the app reads them through its
// own models. Idempotent: each seeded collection is cleared then refilled.
//
// Usage: MONGO_URL=... node scripts/e2e/seed.mjs

import mongoose from 'mongoose';

const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27018/bocken_test?directConnection=true';

// Fixed cospend export API token seeded for the permissions matrix (valid-token
// happy path). Keep in sync with the same literal in
// tests/e2e/permissions/matrix.spec.ts.
const COSPEND_EXPORT_TOKEN = 'e2e-cospend-export-token';
const FINANCE_EXPORT_TOKEN = 'e2e-finance-export-token';

// A base recipe reference stores an ObjectId, so the recipe being pointed at
// needs a known one before either document is inserted.
const E2E_BASE_RECIPE_ID = new mongoose.Types.ObjectId('e2eba5e0000000000000ba5e');
// The base recipe recipes/delete.spec deletes, so the recipe using it can be
// checked for the copied-in content.
const E2E_DELETE_BASE_ID = new mongoose.Types.ObjectId('e2ede1e7e0000000000000de');

/** One German section with an English mirror. */
const section = (name, list) => ({ name, type: 'section', list });
const steps = (name, arr) => ({ name, type: 'section', steps: arr });

/** Build a recipe doc with an approved English translation so both
 *  /rezepte/<de> and /recipes/<en> resolve. */
function recipe(o) {
	return {
		// Only the fixtures another fixture has to point at set this — a base
		// recipe reference stores an ObjectId, so it must be known before insert.
		...(o._id && { _id: o._id }),
		short_name: o.short_name,
		name: o.name,
		category: o.category,
		icon: o.icon,
		description: o.description,
		tags: o.tags ?? [],
		portions: o.portions ?? '4',
		images: o.images ?? [],
		seasonRanges: o.seasonRanges ?? [],
		defaultForm: o.defaultForm,
		isBaseRecipe: o.isBaseRecipe ?? false,
		nutritionMappings: o.nutritionMappings ?? [],
		ingredients: o.ingredients ?? [section('', [{ name: 'Zutat', unit: 'g', amount: '100' }])],
		instructions: o.instructions ?? [steps('', ['Schritt eins.', 'Schritt zwei.'])],
		preparation: o.preparation ?? '',
		cooking: o.cooking ?? '',
		total_time: o.total_time ?? '',
		baking: o.baking ?? { temperature: '', length: '', mode: '' },
		fermentation: o.fermentation ?? { bulk: '', final: '' },
		dateCreated: new Date('2025-01-01T00:00:00Z'),
		dateModified: new Date('2025-01-01T00:00:00Z'),
		translations: {
			en: {
				short_name: o.en.short_name,
				name: o.en.name,
				description: o.en.description,
				category: o.en.category,
				tags: o.en.tags ?? [],
				portions: o.portions ?? '4',
				ingredients: o.en.ingredients ?? [section('', [{ name: 'Ingredient', unit: 'g', amount: '100' }])],
				instructions: o.en.instructions ?? [steps('', ['Step one.', 'Step two.'])],
				translationStatus: 'approved',
				lastTranslated: new Date('2025-01-02T00:00:00Z')
			}
		}
	};
}

const RECIPES = [
	// --- Deletion fixtures (tests/e2e/recipes/delete.spec.ts) ---
	// Deleted by that spec; the seed puts them back (replaceOne by short_name).
	recipe({
		short_name: 'e2e_loeschkuchen',
		name: 'E2E Loeschkuchen',
		category: 'Kuchen',
		icon: '🗑️',
		description: 'Fixture, die der Loesch-Test entfernt.',
		tags: ['e2e'],
		en: { short_name: 'e2e_deletecake', name: 'E2E Delete Cake', description: 'Fixture the delete spec removes.', category: 'Cake', tags: ['e2e'] }
	}),
	recipe({
		_id: E2E_DELETE_BASE_ID,
		short_name: 'e2e_loeschbasis',
		name: 'E2E Loeschbasis',
		category: 'Brot',
		icon: '🥖',
		description: 'Basisrezept, das der Loesch-Test entfernt.',
		tags: ['e2e'],
		isBaseRecipe: true,
		ingredients: [section('Vorteig', [{ name: 'Loeschhefe', unit: 'g', amount: '7' }])],
		en: { short_name: 'e2e_deletebase', name: 'E2E Delete Base', description: 'Base recipe the delete spec removes.', category: 'Bread', tags: ['e2e'] }
	}),
	recipe({
		short_name: 'e2e_loeschnutzer',
		name: 'E2E Loeschnutzer',
		category: 'Brot',
		icon: '🍞',
		description: 'Verwendet die Loeschbasis.',
		tags: ['e2e'],
		ingredients: [
			section('Teig', [{ name: 'Mehl', unit: 'g', amount: '500' }]),
			{ type: 'reference', baseRecipeRef: E2E_DELETE_BASE_ID, baseMultiplier: 1, includeIngredients: true, showLabel: true }
		],
		en: { short_name: 'e2e_deleteuser', name: 'E2E Delete User', description: 'Uses the delete base.', category: 'Bread', tags: ['e2e'] }
	}),

	// --- Related recipes (tests/e2e/recipes/related.spec.ts) ---
	// Three near-identical breads: same category, tags and mapped ingredients, so
	// each is the others' closest match whatever else the dev clone brought in.
	// C's translation is pending, so the English page must not suggest it.
	...['a', 'b', 'c'].map((x) => {
		const doc = recipe({
			short_name: `e2e_aehnlich_${x}`,
			name: `E2E Ähnlich ${x.toUpperCase()}`,
			category: 'Brot',
			icon: '🍞',
			description: 'Fixture für ähnliche Rezepte.',
			tags: ['e2e-aehnlich', 'Roggen'],
			ingredients: [section('Teig', [
				{ name: 'Weissmehl', unit: 'g', amount: '400' },
				{ name: 'Zucker', unit: 'g', amount: '40' },
				{ name: 'Butter', unit: 'g', amount: '60' }
			])],
			nutritionMappings: [
				['C214100', 'Weizen Weissmehl (Type 405)'],
				['S111000', 'Zucker weiss (Raffinadezucker/Weisszucker)'],
				['Q611000', 'Butter mild gesäuert']
			].map(([blsCode, nutritionDbName], i) => ({
				sectionIndex: 0, ingredientIndex: i, source: 'bls', blsCode, nutritionDbName,
				matchMethod: 'manual', matchConfidence: 1, gramsPerUnit: 1, excluded: false
			})),
			en: { short_name: `e2e_similar_${x}`, name: `E2E Similar ${x.toUpperCase()}`, description: 'Related recipes fixture.', category: 'Bread', tags: ['e2e-similar', 'rye'] }
		});
		if (x === 'c') doc.translations.en.translationStatus = 'pending';
		return doc;
	}),
	// --- Pantry search (tests/e2e/recipes/pantry.spec.ts) ---
	// Made-up ingredients no cloned recipe uses, so what the page reports for
	// them is deterministic. Salz is a default basic.
	recipe({
		short_name: 'e2e_vorrat',
		name: 'E2E Vorrat',
		category: 'Hauptspeise',
		icon: '🫘',
		description: 'Fixture für die Vorratssuche.',
		tags: ['e2e'],
		ingredients: [section('', [
			{ name: 'Zauberbohnen', unit: 'g', amount: '200' },
			{ name: 'Mondkraut, frisch', unit: 'Bund', amount: '1' },
			{ name: 'Salz', unit: 'Prise', amount: '1' }
		])],
		en: {
			short_name: 'e2e_pantry', name: 'E2E Pantry', description: 'Pantry search fixture.', category: 'Main course', tags: ['e2e'],
			ingredients: [section('', [
				{ name: 'Magic beans', unit: 'g', amount: '200' },
				{ name: 'Moonwort, fresh', unit: 'bunch', amount: '1' },
				{ name: 'Salt', unit: 'pinch', amount: '1' }
			])]
		}
	}),
	// A hand-picked link is set and removed by the spec; the seed resets it to none.
	recipe({
		short_name: 'e2e_verwandt',
		name: 'E2E Verwandt',
		category: 'Getränk',
		icon: '🥤',
		description: 'Fixture, der der Test ein verwandtes Rezept zuweist.',
		tags: ['e2e'],
		en: { short_name: 'e2e_related', name: 'E2E Related', description: 'Gets a hand-picked related recipe.', category: 'Drink', tags: ['e2e'] }
	}),
	recipe({
		short_name: 'e2e_verwandt_ziel',
		name: 'E2E Verwandt Ziel',
		category: 'Salat',
		icon: '🥗',
		description: 'Das handverlesene Ziel.',
		tags: ['e2e'],
		en: { short_name: 'e2e_related_target', name: 'E2E Related Target', description: 'The hand-picked target.', category: 'Salad', tags: ['e2e'] }
	}),

	recipe({
		short_name: 'schokokuchen',
		name: 'Schokokuchen',
		category: 'Kuchen',
		icon: '🍫',
		description: 'Saftiger Schokoladenkuchen für jede Gelegenheit.',
		tags: ['schokolade', 'dessert', 'vegetarisch'],
		portions: '12',
		ingredients: [section('Teig', [
			{ name: 'Mehl', unit: 'g', amount: '250' },
			{ name: 'Zucker', unit: 'g', amount: '200' },
			{ name: 'Kakao', unit: 'g', amount: '50' }
		])],
		instructions: [steps('', ['Alles vermengen.', 'Bei 180°C 40 Minuten backen.'])],
		en: {
			short_name: 'chocolate-cake',
			name: 'Chocolate Cake',
			description: 'Moist chocolate cake for any occasion.',
			category: 'Cake',
			tags: ['chocolate', 'dessert', 'vegetarian'],
			ingredients: [section('Batter', [
				{ name: 'Flour', unit: 'g', amount: '250' },
				{ name: 'Sugar', unit: 'g', amount: '200' },
				{ name: 'Cocoa', unit: 'g', amount: '50' }
			])],
			instructions: [steps('', ['Mix everything.', 'Bake at 180°C for 40 minutes.'])]
		}
	}),
	recipe({
		short_name: 'pfannkuchen',
		name: 'Pfannkuchen',
		category: 'Frühstück',
		icon: '🥞',
		description: 'Klassische dünne Pfannkuchen.',
		tags: ['süss', 'schnell'],
		en: { short_name: 'pancakes', name: 'Pancakes', description: 'Classic thin pancakes.', category: 'Breakfast', tags: ['sweet', 'quick'] }
	}),
	recipe({
		short_name: 'tomatensuppe',
		name: 'Tomatensuppe',
		category: 'Suppe',
		icon: '🍅',
		description: 'Frische Tomatensuppe aus Sommertomaten.',
		tags: ['vegan', 'sommer'],
		// In season across the summer (covers July, the test "today").
		seasonRanges: [{ start: { kind: 'fixed', m: 6, d: 1 }, end: { kind: 'fixed', m: 9, d: 30 } }],
		en: { short_name: 'tomato-soup', name: 'Tomato Soup', description: 'Fresh soup from summer tomatoes.', category: 'Soup', tags: ['vegan', 'summer'] }
	}),
	recipe({
		short_name: 'sauerteig',
		name: 'Sauerteig-Starter',
		category: 'Brot',
		icon: '🍞',
		description: 'Basis-Sauerteig als Grundlage für Brote.',
		tags: ['brot', 'basis'],
		isBaseRecipe: true,
		en: { short_name: 'sourdough-starter', name: 'Sourdough Starter', description: 'Base sourdough for breads.', category: 'Bread', tags: ['bread', 'base'] }
	}),
	recipe({
		short_name: 'gugelhupf',
		name: 'Gugelhupf',
		category: 'Kuchen',
		icon: '🍰',
		description: 'Traditioneller Gugelhupf.',
		tags: ['kuchen', 'klassiker'],
		portions: '16',
		defaultForm: { shape: 'gugelhupf', diameter: 22, innerDiameter: 8 },
		en: { short_name: 'bundt-cake', name: 'Bundt Cake', description: 'Traditional bundt cake.', category: 'Cake', tags: ['cake', 'classic'] }
	}),
	// Dedicated fixture for nutrition-recipe-image.spec: the ONLY seeded recipe
	// with an image + a working nutrition mapping (so it's loggable with real
	// calories). Kept unique to that spec so its log→delete round-trip doesn't
	// collide with the shared Älplermagronen the other nutrition specs log
	// concurrently on the same e2e_fitness user. The image mediapath needn't
	// resolve — the test asserts the URL is wired, not that the file loads.
	recipe({
		short_name: 'e2e_bildkuchen',
		name: 'E2E Bildkuchen',
		category: 'Kuchen',
		icon: '🎂',
		description: 'Fixture cake with an image for the food-log image test.',
		tags: ['e2e', 'kuchen'],
		portions: '8',
		images: [{ mediapath: 'e2e-bildkuchen.e2e0image.webp', caption: '' }],
		ingredients: [section('Teig', [{ name: 'Mehl', unit: 'g', amount: '400' }])],
		// fdcId must be a real USDA entry: nutrition resolves through resolvePer100g,
		// which reads fdcId/blsCode and ignores any inline per100g. 168894 is
		// "Wheat flour, white, all-purpose, enriched, bleached" (364 kcal).
		nutritionMappings: [{
			sectionIndex: 0,
			ingredientIndex: 0,
			ingredientName: 'Flour',
			ingredientNameDe: 'Mehl',
			source: 'usda',
			fdcId: 168894,
			matchMethod: 'exact',
			matchConfidence: 1,
			gramsPerUnit: 1,
		}],
		en: {
			short_name: 'e2e_imagecake',
			name: 'E2E Image Cake',
			description: 'Fixture cake with an image for the food-log image test.',
			category: 'Cake',
			tags: ['e2e', 'cake'],
			ingredients: [section('Batter', [{ name: 'Flour', unit: 'g', amount: '400' }])],
		}
	}),
	// --- Nutrition-mapping fixtures (tests/e2e/recipes/nutrition-mapping.spec.ts) ---
	//
	// Owned by that spec alone. The editor specs mutate what they touch, and
	// schokokuchen is already claimed by edit.spec, so the mapping flow gets its
	// own pair rather than sharing.
	//
	// Mappings are pre-baked because generating them runs two embedding models
	// through @huggingface/transformers — minutes of CPU and a model download,
	// which no CI run should carry. fdcId 168894 is "Wheat flour, white,
	// all-purpose, enriched, bleached" (364 kcal): it must be a real USDA row,
	// because nutrition resolves through the tables and ignores any inline
	// per100g. See e2e_bildkuchen above for the same constraint.
	recipe({
		_id: E2E_BASE_RECIPE_ID,
		short_name: 'e2e_mapping_basis',
		name: 'E2E Mapping Basis',
		category: 'Brot',
		icon: '🥖',
		description: 'Grundrezept-Fixture für den Zuordnungs-Flow.',
		tags: ['e2e'],
		portions: '4',
		isBaseRecipe: true,
		ingredients: [section('Teig', [{ name: 'Mehl', unit: 'g', amount: '300' }])],
		nutritionMappings: [{
			sectionIndex: 0, ingredientIndex: 0,
			ingredientName: 'Flour', ingredientNameDe: 'Mehl',
			source: 'usda', fdcId: 168894,
			matchMethod: 'exact', matchConfidence: 1,
			gramsPerUnit: 1, unitConversionSource: 'direct',
			manuallyEdited: false, excluded: false,
		}],
		en: {
			short_name: 'e2e_mapping_base', name: 'E2E Mapping Base',
			description: 'Base recipe fixture for the mapping flow.',
			category: 'Bread', tags: ['e2e'],
			ingredients: [section('Dough', [{ name: 'Flour', unit: 'g', amount: '300' }])],
		}
	}),
	// A second base recipe, so the fixture can carry both ways of naming one: a
	// reference section (resolved by id) and a link inside an ingredient name
	// (resolved by parsing the href). Pointing both at the same recipe would not
	// work — a recipe named twice is counted once.
	recipe({
		short_name: 'e2e_mapping_zweitbasis',
		name: 'E2E Mapping Zweitbasis',
		category: 'Sauce',
		icon: '🥣',
		description: 'Zweites Grundrezept, per Link in einer Zutat referenziert.',
		tags: ['e2e'],
		portions: '4',
		isBaseRecipe: true,
		ingredients: [section('Sauce', [{ name: 'Mehl', unit: 'g', amount: '120' }])],
		nutritionMappings: [{
			sectionIndex: 0, ingredientIndex: 0,
			ingredientName: 'Flour', ingredientNameDe: 'Mehl',
			source: 'usda', fdcId: 168894,
			matchMethod: 'exact', matchConfidence: 1,
			gramsPerUnit: 1, unitConversionSource: 'direct',
			manuallyEdited: false, excluded: false,
		}],
		en: {
			short_name: 'e2e_mapping_secondbase', name: 'E2E Mapping Second Base',
			description: 'Second base recipe, referenced by a link in an ingredient.',
			category: 'Sauce', tags: ['e2e'],
			ingredients: [section('Sauce', [{ name: 'Flour', unit: 'g', amount: '120' }])],
		}
	}),
	// One line per triage state, so the spec can assert each bucket without
	// having to first put the recipe into that state.
	recipe({
		short_name: 'e2e_mapping',
		name: 'E2E Zuordnung',
		category: 'Hauptspeise',
		icon: '🧪',
		description: 'Fixture für den Nährwert-Zuordnungs-Flow.',
		tags: ['e2e'],
		portions: '4',
		ingredients: [
			section('Zutaten', [
				{ name: 'Mehl', unit: 'g', amount: '500' },       // matched
				{ name: 'Rätselzutat', unit: 'g', amount: '250' }, // open
				{ name: 'Olivenöl', unit: 'EL', amount: '' },      // amount assumed → unsure
				{ name: 'Salz', unit: 'Prise', amount: '1' },      // skipped
				// A link to another recipe, with no recipeRef on its mapping — the
				// shape 74 of 77 real anchor ingredients are in, because the matcher's
				// anchor branch is newer than they are. The card has to read the href.
				{ name: '<a href=e2e_mapping_zweitbasis>Zweitbasis</a> mit mehr Senf', unit: 'g', amount: '100' },
				// A link naming a recipe that does not exist, so the spec can repoint it.
				{ name: '<a href=e2e_gibt_es_nicht>E2E Mapping Verweis</a>', unit: 'g', amount: '50' },
			]),
			// A base recipe section: no mapping of its own, invisible in the old table.
			{ type: 'reference', baseRecipeRef: E2E_BASE_RECIPE_ID, baseMultiplier: 1, includeIngredients: true, showLabel: true },
		],
		nutritionMappings: [
			{
				sectionIndex: 0, ingredientIndex: 0,
				ingredientName: 'Flour', ingredientNameDe: 'Mehl',
				source: 'usda', fdcId: 168894,
				matchMethod: 'exact', matchConfidence: 1,
				gramsPerUnit: 1, unitConversionSource: 'direct',
				manuallyEdited: false, excluded: false,
			},
			{
				sectionIndex: 0, ingredientIndex: 1,
				ingredientName: 'Mystery', ingredientNameDe: 'Rätselzutat',
				matchMethod: 'none', matchConfidence: 0,
				gramsPerUnit: 1, unitConversionSource: 'direct',
				manuallyEdited: false, excluded: false,
			},
			{
				sectionIndex: 0, ingredientIndex: 2,
				ingredientName: 'Olive oil', ingredientNameDe: 'Olivenöl',
				source: 'usda', fdcId: 168894,
				matchMethod: 'exact', matchConfidence: 1,
				gramsPerUnit: 15, unitConversionSource: 'direct',
				manuallyEdited: false, excluded: false,
			},
			{
				sectionIndex: 0, ingredientIndex: 3,
				ingredientName: 'Salt', ingredientNameDe: 'Salz',
				matchMethod: 'manual', matchConfidence: 0,
				gramsPerUnit: 1, unitConversionSource: 'estimate',
				manuallyEdited: true, excluded: true,
			},
			// Both linked lines carry a food match and no recipeRef — exactly what
			// the embedder left on the real ones.
			{
				sectionIndex: 0, ingredientIndex: 4,
				ingredientName: 'Second base', ingredientNameDe: 'Zweitbasis',
				source: 'usda', fdcId: 168894,
				matchMethod: 'embedding', matchConfidence: 0.5,
				gramsPerUnit: 1, unitConversionSource: 'direct',
				manuallyEdited: false, excluded: false,
			},
			{
				sectionIndex: 0, ingredientIndex: 5,
				ingredientName: 'Dangling ref', ingredientNameDe: 'E2E Mapping Verweis',
				source: 'usda', fdcId: 168894,
				matchMethod: 'embedding', matchConfidence: 0.5,
				gramsPerUnit: 1, unitConversionSource: 'direct',
				manuallyEdited: false, excluded: false,
			},
		],
		en: {
			short_name: 'e2e_mapping_en', name: 'E2E Mapping',
			description: 'Fixture for the nutrition mapping flow.',
			category: 'Main', tags: ['e2e'],
			ingredients: [section('Ingredients', [
				{ name: 'Flour', unit: 'g', amount: '500' },
				{ name: 'Mystery', unit: 'g', amount: '250' },
				{ name: 'Olive oil', unit: 'tbsp', amount: '' },
				{ name: 'Salt', unit: 'pinch', amount: '1' },
				{ name: '<a href=e2e_mapping_zweitbasis>Second base</a> with extra mustard', unit: 'g', amount: '100' },
				{ name: '<a href=e2e_gibt_es_nicht>E2E Mapping Verweis</a>', unit: 'g', amount: '50' },
			])],
		}
	}),
	recipe({
		short_name: 'hefezopf',
		name: 'Hefezopf',
		category: 'Brot',
		icon: '🍞',
		description: 'Süsser geflochtener Hefezopf.',
		tags: ['süss', 'brot'],
		ingredients: [section('Teig', [
			{ name: 'Mehl', unit: 'g', amount: '500' },
			{ name: 'Frischhefe', unit: 'g', amount: '42' },
			{ name: 'Milch', unit: 'mL', amount: '250' }
		])],
		en: {
			short_name: 'sweet-braid',
			name: 'Sweet Braid',
			description: 'Sweet braided yeast bread.',
			category: 'Bread',
			tags: ['sweet', 'bread'],
			ingredients: [section('Dough', [
				{ name: 'Flour', unit: 'g', amount: '500' },
				{ name: 'Fresh yeast', unit: 'g', amount: '42' },
				{ name: 'Milk', unit: 'mL', amount: '250' }
			])]
		}
	})
];

// The review queue's own copy of e2e_mapping (tests/e2e/recipes/nutrition-review.spec.ts).
// nutrition-mapping.spec.ts saves a mapping on the original and reverts it, and
// the two specs run in parallel, so sharing one recipe let the queue catch it
// mid-change.
{
	const mapping = RECIPES.find((r) => r.short_name === 'e2e_mapping');
	RECIPES.push({
		...mapping,
		short_name: 'e2e_pruefung',
		name: 'E2E Prüfung',
		translations: { en: { ...mapping.translations.en, short_name: 'e2e_review', name: 'E2E Review' } },
	});
}

// Cospend is a fixed 2-user shared pool (src/lib/config/users.ts). Split
// convention (from real data): one split per user; +amount owes, -amount is owed
// (the payer). These give the dashboard a non-zero balance and settle a debt.
const COSPEND_USERS = ['alexander', 'anna'];
const cospendPayment = (o) => {
	const id = new mongoose.Types.ObjectId();
	const half = Math.round((o.amount / 2) * 100) / 100;
	const other = COSPEND_USERS.find((u) => u !== o.paidBy);
	const payment = {
		_id: id,
		title: o.title,
		description: o.description ?? '',
		amount: o.amount,
		currency: 'CHF',
		paidBy: o.paidBy,
		date: new Date(o.date),
		category: o.category,
		splitMethod: 'equal',
		createdBy: o.paidBy,
		createdAt: new Date(o.date),
		updatedAt: new Date(o.date)
	};
	const splits = [
		{ paymentId: id, username: o.paidBy, amount: -half, settled: false },
		{ paymentId: id, username: other, amount: half, settled: false }
	];
	return { payment, splits };
};

const COSPEND = [
	cospendPayment({ title: 'Wocheneinkauf', amount: 100, paidBy: 'alexander', category: 'groceries', date: '2026-06-20' }),
	cospendPayment({ title: 'Restaurant', amount: 40, paidBy: 'alexander', category: 'restaurant', date: '2026-06-24' }),
	cospendPayment({ title: 'Kinoabend', amount: 30, paidBy: 'anna', category: 'fun', date: '2026-06-28' })
];

// Period tracker only renders for a female profile, so give the 'anna' test user
// a synthetic female FitnessGoal + past cycles. Synthetic on purpose — we don't
// clone anyone's real health data.
const FEMALE_PROFILE = {
	username: 'anna',
	weeklyWorkouts: 4,
	sex: 'female',
	heightCm: 168,
	birthYear: 1995,
	activityLevel: 'moderate'
};
// Deliberately varied so the analysis has real spread and known expected values
// (see tests/e2e/fitness/period.spec.ts + tests/unit/.../cycleProjection):
//   cycle gaps  [28, 30, 27, 29, 26]  → mean 28, sample-SD 1.6
//   period durs [ 5,  4,  6,  5,  4, 6] → mean 5,  sample-SD 0.9
//   min 26 / max 30 (span 4) → "regular" insight
const PERIOD_CYCLES = [
	{ createdBy: 'anna', startDate: new Date('2026-01-21'), endDate: new Date('2026-01-25') }, // 5d
	{ createdBy: 'anna', startDate: new Date('2026-02-18'), endDate: new Date('2026-02-21') }, // 4d, cycle 28
	{ createdBy: 'anna', startDate: new Date('2026-03-20'), endDate: new Date('2026-03-25') }, // 6d, cycle 30
	{ createdBy: 'anna', startDate: new Date('2026-04-16'), endDate: new Date('2026-04-20') }, // 5d, cycle 27
	{ createdBy: 'anna', startDate: new Date('2026-05-15'), endDate: new Date('2026-05-18') }, // 4d, cycle 29
	{ createdBy: 'anna', startDate: new Date('2026-06-10'), endDate: new Date('2026-06-15') } //  6d, cycle 26
];

// A second female profile (the e2e_full user) used by the period *logging* tests
// (start/end/add/edit/delete), so anna's analysis fixtures above stay pristine.
// Exact values don't matter here — the tests create + clean up their own entries.
const FULL_FEMALE_PROFILE = {
	username: 'e2e_full',
	weeklyWorkouts: 4,
	sex: 'female',
	heightCm: 170,
	birthYear: 1994,
	activityLevel: 'moderate'
};
const FULL_PERIOD_CYCLES = [
	{ createdBy: 'e2e_full', startDate: new Date('2026-05-08'), endDate: new Date('2026-05-13') },
	{ createdBy: 'e2e_full', startDate: new Date('2026-06-05'), endDate: new Date('2026-06-10') }
];

async function main() {
	await mongoose.connect(MONGO_URL, { serverSelectionTimeoutMS: 8000 });
	const db = mongoose.connection.db;

	// Overlay, not wipe: clone-dev.mjs may have loaded hundreds of real recipes
	// first. Upserting by short_name guarantees these known fixtures exist for
	// tests that key on them, without discarding the realistic cloned data.
	const upsertBy = async (name, key, docs) => {
		for (const doc of docs) {
			await db.collection(name).replaceOne({ [key]: doc[key] }, doc, { upsert: true });
		}
		console.log(`  ${name}: upserted ${docs.length}`);
	};

	console.log('🌱 Seeding test Mongo (deterministic overlay)...');
	await upsertBy('recipes', 'short_name', RECIPES);

	// Cospend: not cloned (personal), so own it fully here.
	await db.collection('payments').deleteMany({});
	await db.collection('paymentsplits').deleteMany({});
	await db.collection('payments').insertMany(COSPEND.map((c) => c.payment));
	await db.collection('paymentsplits').insertMany(COSPEND.flatMap((c) => c.splits));
	console.log(`  payments: ${COSPEND.length} (+ splits)`);

	// A fixed cospend export API token so the permissions matrix can assert the
	// token happy-path (valid token → 200) deterministically.
	await db.collection('cospendapitokens').deleteMany({ label: 'e2e-export' });
	await db.collection('cospendapitokens').insertOne({
		token: COSPEND_EXPORT_TOKEN,
		createdBy: 'e2e_cospend',
		label: 'e2e-export',
		lastUsedAt: null,
		createdAt: new Date(),
		updatedAt: new Date()
	});
	console.log('  cospend export token: seeded');

	// A fixed finance export API token so the permissions matrix can assert the
	// /api/finances/export happy-path (valid token → 200) deterministically.
	await db.collection('financeapitokens').deleteMany({ label: 'e2e-export' });
	await db.collection('financeapitokens').insertOne({
		token: FINANCE_EXPORT_TOKEN,
		createdBy: 'alexander',
		label: 'e2e-export',
		lastUsedAt: null,
		createdAt: new Date(),
		updatedAt: new Date()
	});
	console.log('  finance export token: seeded');

	// anna's female profile + period cycles (synthetic).
	await db.collection('fitnessgoals').replaceOne({ username: 'anna' }, FEMALE_PROFILE, { upsert: true });
	await db.collection('periodentries').deleteMany({ createdBy: 'anna' });
	await db.collection('periodentries').insertMany(PERIOD_CYCLES);
	await db.collection('periodcalendartokens').deleteMany({ createdBy: 'anna' }); // start with no shared links
	console.log(`  anna: female profile + ${PERIOD_CYCLES.length} period cycles`);

	// e2e_full female profile + a couple of cycles for the period logging tests.
	await db.collection('fitnessgoals').replaceOne({ username: 'e2e_full' }, FULL_FEMALE_PROFILE, { upsert: true });
	await db.collection('periodentries').deleteMany({ createdBy: 'e2e_full' });
	await db.collection('periodentries').insertMany(FULL_PERIOD_CYCLES);
	await db.collection('periodcalendartokens').deleteMany({ createdBy: 'e2e_full' });
	console.log(`  e2e_full: female profile + ${FULL_PERIOD_CYCLES.length} period cycles`);

	console.log('✅ Seed overlay complete.');
	await mongoose.disconnect();
}

main().catch((e) => {
	console.error('❌ Seed failed:', e.message);
	process.exit(1);
});
