#!/usr/bin/env node
// Seed the throwaway test Mongo with deterministic fixtures. Inserts raw
// documents through the mongoose connection (no app-model import, so no
// $lib/$types alias or vite-node dependency) — the app reads them through its
// own models. Idempotent: each seeded collection is cleared then refilled.
//
// Usage: MONGO_URL=... node scripts/e2e/seed.mjs

import mongoose from 'mongoose';

const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27018/bocken_test?directConnection=true';

/** One German section with an English mirror. */
const section = (name, list) => ({ name, type: 'section', list });
const steps = (name, arr) => ({ name, type: 'section', steps: arr });

/** Build a recipe doc with an approved English translation so both
 *  /rezepte/<de> and /recipes/<en> resolve. */
function recipe(o) {
	return {
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

	console.log('✅ Seed overlay complete.');
	await mongoose.disconnect();
}

main().catch((e) => {
	console.error('❌ Seed failed:', e.message);
	process.exit(1);
});
