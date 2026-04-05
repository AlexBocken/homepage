/**
 * Import OpenFoodFacts MongoDB dump into a lean `openfoodfacts` collection.
 *
 * This script:
 *   0. Downloads the OFF MongoDB dump if not present locally
 *   1. Runs `mongorestore` to load the raw dump into a temporary `off_products` collection
 *   2. Transforms each document, extracting only the fields we need
 *   3. Inserts into the `openfoodfacts` collection with proper indexes
 *   4. Drops the temporary `off_products` collection
 *
 * Reads MONGO_URL from .env (via dotenv).
 *
 * Usage:
 *   pnpm exec vite-node scripts/import-openfoodfacts.ts [path-to-dump.gz]
 *
 * Default dump path: ./openfoodfacts-mongodbdump.gz
 */

import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import mongoose from 'mongoose';

const OFF_DUMP_URL = 'https://static.openfoodfacts.org/data/openfoodfacts-mongodbdump.gz';

// --- Load MONGO_URL from .env ---
const envPath = resolve(import.meta.dirname ?? '.', '..', '.env');
const envText = readFileSync(envPath, 'utf-8');
const mongoMatch = envText.match(/^MONGO_URL="?([^"\n]+)"?/m);
if (!mongoMatch) { console.error('MONGO_URL not found in .env'); process.exit(1); }
const MONGO_URL = mongoMatch[1];

// Parse components for mongorestore URI (needs root DB, not /recipes)
const parsed = new URL(MONGO_URL);
const RESTORE_URI = `mongodb://${parsed.username}:${parsed.password}@${parsed.host}/?authSource=${new URLSearchParams(parsed.search).get('authSource') || 'admin'}`;
const DB_NAME = parsed.pathname.replace(/^\//, '') || 'recipes';

const BATCH_SIZE = 5000;

// --- Resolve dump file path, download if missing ---
const dumpPath = resolve(process.argv[2] || './openfoodfacts-mongodbdump.gz');
if (!existsSync(dumpPath)) {
	console.log(`\nDump file not found at ${dumpPath}`);
	console.log(`Downloading from ${OFF_DUMP_URL} (~13 GB)…\n`);
	try {
		execSync(`curl -L -o "${dumpPath}" --progress-bar "${OFF_DUMP_URL}"`, { stdio: 'inherit' });
	} catch (err: any) {
		console.error('Download failed:', err.message);
		process.exit(1);
	}
	console.log('Download complete.\n');
}

// Map OFF nutriment keys → our per100g field names
const NUTRIENT_MAP: Record<string, string> = {
	'energy-kcal_100g': 'calories',
	'proteins_100g': 'protein',
	'fat_100g': 'fat',
	'saturated-fat_100g': 'saturatedFat',
	'carbohydrates_100g': 'carbs',
	'fiber_100g': 'fiber',
	'sugars_100g': 'sugars',
	'calcium_100g': 'calcium',
	'iron_100g': 'iron',
	'magnesium_100g': 'magnesium',
	'phosphorus_100g': 'phosphorus',
	'potassium_100g': 'potassium',
	'sodium_100g': 'sodium',
	'zinc_100g': 'zinc',
	'vitamin-a_100g': 'vitaminA',
	'vitamin-c_100g': 'vitaminC',
	'vitamin-d_100g': 'vitaminD',
	'vitamin-e_100g': 'vitaminE',
	'vitamin-k_100g': 'vitaminK',
	'vitamin-b1_100g': 'thiamin',
	'vitamin-b2_100g': 'riboflavin',
	'vitamin-pp_100g': 'niacin',
	'vitamin-b6_100g': 'vitaminB6',
	'vitamin-b12_100g': 'vitaminB12',
	'folates_100g': 'folate',
	'cholesterol_100g': 'cholesterol',
};

function extractPer100g(nutriments: any): Record<string, number> | null {
	if (!nutriments) return null;
	const out: Record<string, number> = {};
	let hasAny = false;
	for (const [offKey, ourKey] of Object.entries(NUTRIENT_MAP)) {
		const v = Number(nutriments[offKey]);
		if (!isNaN(v) && v >= 0) {
			out[ourKey] = v;
			if (ourKey === 'calories' || ourKey === 'protein' || ourKey === 'fat' || ourKey === 'carbs') {
				hasAny = true;
			}
		}
	}
	// Fall back to kJ → kcal if energy-kcal_100g was missing
	if (!out.calories) {
		const kj = Number(nutriments['energy_100g']);
		if (!isNaN(kj) && kj > 0) {
			out.calories = Math.round(kj / 4.184 * 10) / 10;
			hasAny = true;
		}
	}
	return hasAny ? out : null;
}

function pickName(doc: any): { name: string; nameDe?: string } | null {
	const en = doc.product_name_en?.trim();
	const de = doc.product_name_de?.trim();
	const generic = doc.product_name?.trim();
	const fr = doc.product_name_fr?.trim();

	const name = en || generic || fr;
	if (!name) return null;

	return { name, ...(de && de !== name ? { nameDe: de } : {}) };
}

async function main() {
	// --- Step 1: mongorestore (skip if off_products already has data) ---
	await mongoose.connect(MONGO_URL);
	let existingCount = await mongoose.connection.db!.collection('off_products').estimatedDocumentCount();

	if (existingCount > 100000) {
		console.log(`\n=== Step 1: SKIPPED — off_products already has ~${existingCount.toLocaleString()} documents ===\n`);
	} else {
		console.log(`\n=== Step 1: mongorestore from ${dumpPath} ===\n`);
		await mongoose.disconnect();
		const restoreCmd = [
			'mongorestore', '--gzip',
			`--archive=${dumpPath}`,
			`--uri="${RESTORE_URI}"`,
			`--nsFrom='off.products'`,
			`--nsTo='${DB_NAME}.off_products'`,
			'--drop', '--noIndexRestore',
		].join(' ');
		console.log(`Running: ${restoreCmd.replace(parsed.password, '***')}\n`);
		try {
			execSync(restoreCmd, { stdio: 'inherit', shell: '/bin/sh' });
		} catch (err: any) {
			console.error('mongorestore failed:', err.message);
			process.exit(1);
		}
		await mongoose.connect(MONGO_URL);
	}

	const db = mongoose.connection.db!;

	// --- Step 2: Transform ---
	console.log('\n=== Step 2: Transform off_products → openfoodfacts ===\n');

	const src = db.collection('off_products');
	const dst = db.collection('openfoodfacts');

	const srcCount = await src.estimatedDocumentCount();
	console.log(`Source off_products: ~${srcCount.toLocaleString()} documents`);

	try { await dst.drop(); } catch {}

	console.log('Transforming…');
	let processed = 0;
	let inserted = 0;
	let skipped = 0;
	let batch: any[] = [];

	const cursor = src.find(
		{ code: { $exists: true, $ne: '' }, $or: [{ 'nutriments.energy-kcal_100g': { $gt: 0 } }, { 'nutriments.energy_100g': { $gt: 0 } }] },
		{
			projection: {
				code: 1, product_name: 1, product_name_en: 1, product_name_de: 1,
				product_name_fr: 1, brands: 1, quantity: 1, serving_size: 1,
				serving_quantity: 1, nutriments: 1, nutriscore_grade: 1,
				categories_tags: 1, product_quantity: 1,
			}
		}
	).batchSize(BATCH_SIZE);

	for await (const doc of cursor) {
		processed++;

		const names = pickName(doc);
		if (!names) { skipped++; continue; }

		const per100g = extractPer100g(doc.nutriments);
		if (!per100g) { skipped++; continue; }

		const barcode = String(doc.code).trim();
		if (!barcode || barcode.length < 4) { skipped++; continue; }

		const entry: any = { barcode, name: names.name, per100g };

		if (names.nameDe) entry.nameDe = names.nameDe;

		const brands = typeof doc.brands === 'string' ? doc.brands.trim() : '';
		if (brands) entry.brands = brands;

		const servingG = Number(doc.serving_quantity);
		const servingDesc = typeof doc.serving_size === 'string' ? doc.serving_size.trim() : '';
		if (servingG > 0 && servingDesc) {
			entry.serving = { description: servingDesc, grams: servingG };
		}

		const pq = Number(doc.product_quantity);
		if (pq > 0) entry.productQuantityG = pq;

		if (typeof doc.nutriscore_grade === 'string' && /^[a-e]$/.test(doc.nutriscore_grade)) {
			entry.nutriscore = doc.nutriscore_grade;
		}

		if (Array.isArray(doc.categories_tags) && doc.categories_tags.length > 0) {
			const cat = String(doc.categories_tags[doc.categories_tags.length - 1])
				.replace(/^en:/, '').replace(/-/g, ' ');
			entry.category = cat;
		}

		batch.push(entry);

		if (batch.length >= BATCH_SIZE) {
			try {
				await dst.insertMany(batch, { ordered: false });
				inserted += batch.length;
			} catch (bulkErr: any) {
				// Duplicate key errors are expected (duplicate barcodes in OFF data)
				inserted += bulkErr.insertedCount ?? 0;
			}
			batch = [];
			if (processed % 100000 === 0) {
				console.log(`  ${processed.toLocaleString()} processed, ${inserted.toLocaleString()} inserted, ${skipped.toLocaleString()} skipped`);
			}
		}
	}

	if (batch.length > 0) {
		try {
			await dst.insertMany(batch, { ordered: false });
			inserted += batch.length;
		} catch (bulkErr: any) {
			inserted += bulkErr.insertedCount ?? 0;
		}
	}

	console.log(`\nTransform complete: ${processed.toLocaleString()} processed → ${inserted.toLocaleString()} inserted, ${skipped.toLocaleString()} skipped`);

	// --- Step 3: Deduplicate & create indexes ---
	console.log('\n=== Step 3: Deduplicate & create indexes ===\n');

	// Remove duplicate barcodes (keep first inserted)
	const dupes = await dst.aggregate([
		{ $group: { _id: '$barcode', ids: { $push: '$_id' }, count: { $sum: 1 } } },
		{ $match: { count: { $gt: 1 } } },
	]).toArray();
	if (dupes.length > 0) {
		const idsToRemove = dupes.flatMap(d => d.ids.slice(1));
		await dst.deleteMany({ _id: { $in: idsToRemove } });
		console.log(`  ✓ removed ${idsToRemove.length} duplicate barcodes`);
	}

	await dst.createIndex({ barcode: 1 }, { unique: true });
	console.log('  ✓ barcode (unique)');
	await dst.createIndex({ name: 'text', nameDe: 'text', brands: 'text' });
	console.log('  ✓ text (name, nameDe, brands)');

	// --- Step 4: Cleanup (manual) ---
	// To drop the large off_products temp collection after verifying results:
	//   db.off_products.drop()
	console.log('\n=== Step 4: Skipping off_products cleanup (run manually when satisfied) ===');

	const finalCount = await dst.countDocuments();
	console.log(`\n=== Done: openfoodfacts collection has ${finalCount.toLocaleString()} documents ===\n`);

	await mongoose.disconnect();
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
