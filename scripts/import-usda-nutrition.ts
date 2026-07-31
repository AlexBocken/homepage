/**
 * Imports USDA FoodData Central data (SR Legacy + Foundation Foods) and generates
 * a typed nutrition database for the recipe calorie calculator.
 *
 * Run with: pnpm exec vite-node scripts/import-usda-nutrition.ts
 *
 * Downloads bulk CSV data from USDA FDC, filters to relevant food categories,
 * extracts macro/micronutrient data per 100g, and outputs src/lib/data/nutritionDb.ts
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const DATA_DIR = resolve('data/usda');
const OUTPUT_PATH = resolve('src/lib/data/nutritionDb.ts');

// USDA FDC bulk download URLs
const USDA_URLS = {
	srLegacy: 'https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_sr_legacy_food_csv_2018-04.zip',
	foundation: 'https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_foundation_food_csv_2024-10-31.zip',
};

// Only real, consumable food records. The Foundation dataset's food.csv is mostly
// laboratory bookkeeping — 57k sub_sample_food, 7k market_acquisition and 3.5k
// sample_food rows around just 387 actual foundation_food entries. Those lab rows
// reuse ordinary food names ("peppers, bell, green, raw") but carry only the one
// or two nutrients that sample happened to be assayed for, so importing them
// yields near-empty entries that shadow the real ones in search.
const ALLOWED_DATA_TYPES = new Set(['foundation_food', 'sr_legacy_food']);

// Energy is reported inconsistently between the datasets. SR Legacy always carries
// 1008 (Energy, kcal), but most Foundation foods omit 1008 and report Atwater
// factors instead: 2048 (specific — per-food coefficients) or 2047 (general).
// Prefer 1008, then the more accurate specific factors, then general. Without this
// fallback 205 of the 387 Foundation foods import as 0 kcal.
const ENERGY_PRIORITY: Record<number, number> = { 1008: 3, 2048: 2, 2047: 1 };

// Ethanol (g/100 g). Kept out of NUTRIENT_IDS because that map zero-fills every
// field for every food; alcohol is written only where a food has some, so an absent
// key reads as "none" rather than "unmeasured". USDA reports 1018 for the drinks and
// the dishes cooked with them, which is exactly the set that matters.
const ALCOHOL_ID = 1018;

// Nutrients USDA measures for only part of the table, written where measured and
// left absent otherwise — the same rule the trace minerals and fatty acids follow.
// Zero-filling these would claim, from a food nobody analysed for it, that it
// contains none: no starch in bread, no caffeine in coffee.
const SPARSE_IDS: Record<number, string> = {
	1176: 'biotin',   // 977 foods (BLS carries it for nearly all of its own)
	1057: 'caffeine', // 5215
	1009: 'starch',   // 2623
	1012: 'fructose', // 3039
	1013: 'lactose',  // 3008
};

// Nutrient IDs we care about
const NUTRIENT_IDS: Record<number, string> = {
	1008: 'calories',
	1003: 'protein',
	1004: 'fat',
	1258: 'saturatedFat',
	1005: 'carbs',
	1079: 'fiber',
	1063: 'sugars',
	// Minerals
	1087: 'calcium',
	1089: 'iron',
	1090: 'magnesium',
	1091: 'phosphorus',
	1092: 'potassium',
	1093: 'sodium',
	1095: 'zinc',
	// Vitamins
	1106: 'vitaminA',    // RAE (mcg)
	1162: 'vitaminC',
	1114: 'vitaminD',    // D2+D3 (mcg)
	1109: 'vitaminE',
	1185: 'vitaminK',
	1165: 'thiamin',
	1166: 'riboflavin',
	1167: 'niacin',
	1175: 'vitaminB6',
	1178: 'vitaminB12',
	1177: 'folate',
	1170: 'pantothenicAcid', // B5 — 6750 of the imported foods carry it
	// Preformed vitamin A, the share the upper intake level applies to. Total
	// vitamin A above (1106) is RAE and includes carotenoids, which are not capped.
	1105: 'retinol',
	// Other
	1253: 'cholesterol',
	// Amino acids (g/100g)
	1212: 'isoleucine',
	1213: 'leucine',
	1214: 'lysine',
	1215: 'methionine',
	1217: 'phenylalanine',
	1211: 'threonine',
	1210: 'tryptophan',
	1219: 'valine',
	1221: 'histidine',
	1222: 'alanine',
	1220: 'arginine',
	1223: 'asparticAcid',
	1216: 'cysteine',
	1224: 'glutamicAcid',
	1225: 'glycine',
	1226: 'proline',
	1227: 'serine',
	1218: 'tyrosine',
};

// Trace minerals, written only when the food actually reports them — same rule as
// the fatty acids below, and for the same reason. USDA measures selenium for 88% of
// the foods imported here and copper and manganese for ~91% / ~82%, but iodine for
// 0.5% of them and chromium and molybdenum for none at all. Forcing those to 0
// would tell a food log that a meal contained no iodine when USDA never tested for
// it; BLS carries iodine, chromium and molybdenum and fills that gap instead.
// Units are USDA's own: copper and manganese in mg, the rest in µg.
const TRACE_MINERAL_IDS: Record<number, string> = {
	1098: 'copper',     // mg
	1101: 'manganese',  // mg
	1100: 'iodine',     // µg
	1103: 'selenium',   // µg
	1096: 'chromium',   // µg
	1102: 'molybdenum', // µg
};

// Fatty acids, written only when the food actually reports them. Every nutrient
// above is forced to 0 when absent, because BLS and USDA measure the full panel and
// a zero there means "measured, none present". That does not hold for fats:
// coverage across SR Legacy runs from 96% (saturated) down to 16% (arachidonic), so
// a blanket 0 would claim a measurement nobody made and would quietly drag down the
// omega-3/omega-6 sums derived in $lib/fitness/fattyAcids.
const FATTY_ACID_IDS: Record<number, string> = {
	1292: 'monounsaturatedFat',
	1293: 'polyunsaturatedFat',
	1257: 'transFat',
	1321: 'gammaLinolenicAcid', // 18:3 n-6
	1406: 'arachidonicAcid',    // 20:4 n-6
	1278: 'epa',                // 20:5 n-3
	1280: 'dpa',                // 22:5 n-3
	1272: 'dha',                // 22:6 n-3
	// 18:4 is undifferentiated in USDA but is stearidonic (n-3) in practically all
	// food. There is no n-6-specific 20:3 id — only undifferentiated, n-3 and n-9 —
	// so dihomo-γ-linolenic is left to BLS rather than guessed at from the total.
	1276: 'stearidonicAcid',    // 18:4
	1313: 'eicosadienoicAcid',  // 20:2 n-6 c,c
};

// Isomer-resolved figures are preferred but far sparser than the undifferentiated
// ones — 18:2 n-6 c,c covers 1,842 SR Legacy foods where plain 18:2 covers 7,031.
// Falling back keeps the common case populated, and in food the undifferentiated
// value is overwhelmingly the named isomer, so the error is small.
const FATTY_ACID_PRIORITY: Record<number, { field: string; rank: number }> = {
	1316: { field: 'linoleicAcid', rank: 2 },       // 18:2 n-6 c,c
	1269: { field: 'linoleicAcid', rank: 1 },       // 18:2, undifferentiated
	1404: { field: 'alphaLinolenicAcid', rank: 2 }, // 18:3 n-3 c,c,c (ALA)
	1270: { field: 'alphaLinolenicAcid', rank: 1 }, // 18:3, undifferentiated
};

// Food categories to include (SR Legacy food_category_id descriptions)
const INCLUDED_CATEGORIES = new Set([
	'Dairy and Egg Products',
	'Spices and Herbs',
	'Baby Foods',
	'Fats and Oils',
	'Poultry Products',
	'Soups, Sauces, and Gravies',
	'Sausages and Luncheon Meats',
	'Breakfast Cereals',
	'Fruits and Fruit Juices',
	'Pork Products',
	'Vegetables and Vegetable Products',
	'Nut and Seed Products',
	'Beef Products',
	'Beverages',
	'Finfish and Shellfish Products',
	'Legumes and Legume Products',
	'Lamb, Veal, and Game Products',
	'Baked Products',
	'Sweets',
	'Cereal Grains and Pasta',
	'Snacks',
	'Restaurant Foods',
]);

type NutrientData = Record<string, number>;

interface RawFood {
	fdcId: number;
	description: string;
	categoryId: number;
	category: string;
}

interface Portion {
	description: string;
	grams: number;
}

// Simple CSV line parser that handles quoted fields
function parseCSVLine(line: string): string[] {
	const fields: string[] = [];
	let current = '';
	let inQuotes = false;

	for (let i = 0; i < line.length; i++) {
		const ch = line[i];
		if (ch === '"') {
			if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
				current += '"';
				i++;
			} else {
				inQuotes = !inQuotes;
			}
		} else if (ch === ',' && !inQuotes) {
			fields.push(current);
			current = '';
		} else {
			current += ch;
		}
	}
	fields.push(current);
	return fields;
}

async function readCSV(filePath: string): Promise<Record<string, string>[]> {
	if (!existsSync(filePath)) {
		console.warn(`  File not found: ${filePath}`);
		return [];
	}

	const content = readFileSync(filePath, 'utf-8');
	const lines = content.split('\n').filter(l => l.trim());
	if (lines.length === 0) return [];

	const headers = parseCSVLine(lines[0]);
	const rows: Record<string, string>[] = [];

	for (let i = 1; i < lines.length; i++) {
		const fields = parseCSVLine(lines[i]);
		const row: Record<string, string> = {};
		for (let j = 0; j < headers.length; j++) {
			row[headers[j]] = fields[j] || '';
		}
		rows.push(row);
	}

	return rows;
}

async function downloadAndExtract(url: string, targetDir: string): Promise<void> {
	const zipName = url.split('/').pop()!;
	const zipPath = resolve(DATA_DIR, zipName);

	if (existsSync(targetDir) && readFileSync(resolve(targetDir, '.done'), 'utf-8').trim() === 'ok') {
		console.log(`  Already extracted: ${targetDir}`);
		return;
	}

	mkdirSync(targetDir, { recursive: true });

	if (!existsSync(zipPath)) {
		console.log(`  Downloading ${zipName}...`);
		const response = await fetch(url);
		if (!response.ok) throw new Error(`Download failed: ${response.status} ${response.statusText}`);

		const buffer = Buffer.from(await response.arrayBuffer());
		writeFileSync(zipPath, buffer);
		console.log(`  Downloaded ${(buffer.length / 1024 / 1024).toFixed(1)}MB`);
	}

	console.log(`  Extracting to ${targetDir}...`);
	const { execSync } = await import('child_process');
	execSync(`unzip -o -j "${zipPath}" -d "${targetDir}"`, { stdio: 'pipe' });
	writeFileSync(resolve(targetDir, '.done'), 'ok');
}

async function importDataset(datasetDir: string, label: string) {
	console.log(`\nProcessing ${label}...`);

	// Read category mapping
	const categoryRows = await readCSV(resolve(datasetDir, 'food_category.csv'));
	const categoryMap = new Map<string, string>();
	for (const row of categoryRows) {
		categoryMap.set(row['id'], row['description']);
	}

	// Read foods
	const foodRows = await readCSV(resolve(datasetDir, 'food.csv'));
	const foods = new Map<number, RawFood>();

	for (const row of foodRows) {
		const catId = parseInt(row['food_category_id'] || '0');
		const category = categoryMap.get(row['food_category_id']) || '';

		if (!ALLOWED_DATA_TYPES.has(row['data_type'])) continue;
		if (!INCLUDED_CATEGORIES.has(category)) continue;

		const fdcId = parseInt(row['fdc_id']);
		foods.set(fdcId, {
			fdcId,
			description: row['description'],
			categoryId: catId,
			category,
		});
	}
	console.log(`  Found ${foods.size} foods in included categories`);

	// Read nutrients
	const nutrientRows = await readCSV(resolve(datasetDir, 'food_nutrient.csv'));
	const nutrients = new Map<number, NutrientData>();
	// Which energy nutrient won for each food, so a lower-priority one can't clobber it.
	const energyRank = new Map<number, number>();
	// Same idea per fatty acid field, so an undifferentiated figure can't overwrite
	// the isomer-resolved one regardless of row order.
	const faRank = new Map<number, Record<string, number>>();

	for (const row of nutrientRows) {
		const fdcId = parseInt(row['fdc_id']);
		if (!foods.has(fdcId)) continue;

		const nutrientId = parseInt(row['nutrient_id']);
		const amount = parseFloat(row['amount'] || '0');
		if (isNaN(amount)) continue;

		const rank = ENERGY_PRIORITY[nutrientId];
		if (rank) {
			if (rank <= (energyRank.get(fdcId) ?? 0)) continue;
			energyRank.set(fdcId, rank);
			if (!nutrients.has(fdcId)) nutrients.set(fdcId, {});
			nutrients.get(fdcId)!['calories'] = amount;
			continue;
		}

		const fa = FATTY_ACID_PRIORITY[nutrientId];
		if (fa) {
			let ranks = faRank.get(fdcId);
			if (!ranks) { ranks = {}; faRank.set(fdcId, ranks); }
			if (fa.rank <= (ranks[fa.field] ?? 0)) continue;
			ranks[fa.field] = fa.rank;
			if (!nutrients.has(fdcId)) nutrients.set(fdcId, {});
			nutrients.get(fdcId)![fa.field] = amount;
			continue;
		}

		const traceField = TRACE_MINERAL_IDS[nutrientId];
		if (traceField) {
			if (!nutrients.has(fdcId)) nutrients.set(fdcId, {});
			nutrients.get(fdcId)![traceField] = amount;
			continue;
		}

		const faField = FATTY_ACID_IDS[nutrientId];
		if (faField) {
			if (!nutrients.has(fdcId)) nutrients.set(fdcId, {});
			nutrients.get(fdcId)![faField] = amount;
			continue;
		}

		const sparseField = SPARSE_IDS[nutrientId];
		if (sparseField) {
			if (!nutrients.has(fdcId)) nutrients.set(fdcId, {});
			nutrients.get(fdcId)![sparseField] = amount;
			continue;
		}

		if (nutrientId === ALCOHOL_ID) {
			if (!nutrients.has(fdcId)) nutrients.set(fdcId, {});
			nutrients.get(fdcId)!['alcohol'] = amount;
			continue;
		}

		const fieldName = NUTRIENT_IDS[nutrientId];
		if (!fieldName) continue;

		if (!nutrients.has(fdcId)) nutrients.set(fdcId, {});
		nutrients.get(fdcId)![fieldName] = amount;
	}

	// Undifferentiated 18:3 is the sum of the n-3 (ALA) and n-6 (GLA) isomers. Where
	// ALA had to fall back to it and GLA was measured separately, leaving both in
	// would count GLA once as omega-3 and again as omega-6.
	for (const [fdcId, data] of nutrients) {
		if (faRank.get(fdcId)?.alphaLinolenicAcid !== 1) continue;
		const gla = data['gammaLinolenicAcid'];
		if (typeof gla !== 'number') continue;
		data['alphaLinolenicAcid'] = Math.max(0, (data['alphaLinolenicAcid'] ?? 0) - gla);
	}

	console.log(`  Loaded nutrients for ${nutrients.size} foods`);

	// Read portions
	const portionRows = await readCSV(resolve(datasetDir, 'food_portion.csv'));
	const portions = new Map<number, Portion[]>();

	for (const row of portionRows) {
		const fdcId = parseInt(row['fdc_id']);
		if (!foods.has(fdcId)) continue;

		const gramWeight = parseFloat(row['gram_weight'] || '0');
		if (!gramWeight || isNaN(gramWeight)) continue;

		// Build description from amount + modifier/description
		const amount = parseFloat(row['amount'] || '1');
		const modifier = row['modifier'] || row['portion_description'] || '';
		const desc = modifier
			? (amount !== 1 ? `${amount} ${modifier}` : modifier)
			: `${amount} unit`;

		if (!portions.has(fdcId)) portions.set(fdcId, []);
		portions.get(fdcId)!.push({ description: desc, grams: Math.round(gramWeight * 100) / 100 });
	}
	console.log(`  Loaded portions for ${portions.size} foods`);

	return { foods, nutrients, portions, hasEnergy: new Set(energyRank.keys()) };
}

function buildNutrientRecord(data: NutrientData | undefined): Record<string, number> {
	const allFields = Object.values(NUTRIENT_IDS);
	const result: Record<string, number> = {};
	for (const field of allFields) {
		result[field] = Math.round((data?.[field] || 0) * 100) / 100;
	}
	// Trace minerals are omitted rather than zeroed when unmeasured — see
	// TRACE_MINERAL_IDS. Three decimals: copper in most foods sits in the hundredths
	// of a milligram, where two would round a real figure down to nothing.
	for (const field of Object.values(TRACE_MINERAL_IDS)) {
		const v = data?.[field];
		if (typeof v === 'number') result[field] = Math.round(v * 1000) / 1000;
	}
	// Fatty acids are omitted rather than zeroed when unmeasured — see FATTY_ACID_IDS.
	// Rounded to 3 decimals instead of 2: EPA and DHA in a lean meat sit in the
	// hundredths of a gram, where 2 decimals would flatten real values to zero.
	const faFields = [...Object.values(FATTY_ACID_IDS), ...new Set(Object.values(FATTY_ACID_PRIORITY).map(f => f.field))];
	for (const field of faFields) {
		const v = data?.[field];
		if (typeof v === 'number') result[field] = Math.round(v * 1000) / 1000;
	}
	// Ethanol: written only where there is some — see ALCOHOL_ID.
	const alcohol = data?.['alcohol'];
	if (typeof alcohol === 'number' && alcohol > 0) result['alcohol'] = Math.round(alcohol * 100) / 100;
	// Partly-covered nutrients keep a measured 0 and stay absent otherwise — see
	// SPARSE_IDS. Three decimals because caffeine in decaf and lactose in cheese
	// both sit in the hundredths.
	for (const field of Object.values(SPARSE_IDS)) {
		const v = data?.[field];
		if (typeof v === 'number') result[field] = Math.round(v * 1000) / 1000;
	}
	return result;
}

async function main() {
	console.log('=== USDA Nutrition Database Import ===\n');

	mkdirSync(DATA_DIR, { recursive: true });

	// Download and extract datasets
	const srDir = resolve(DATA_DIR, 'sr_legacy');
	const foundationDir = resolve(DATA_DIR, 'foundation');

	await downloadAndExtract(USDA_URLS.srLegacy, srDir);
	await downloadAndExtract(USDA_URLS.foundation, foundationDir);

	// Import both datasets
	const sr = await importDataset(srDir, 'SR Legacy');
	const foundation = await importDataset(foundationDir, 'Foundation Foods');

	// Merge: Foundation Foods takes priority (more detailed), SR Legacy fills gaps.
	//
	// Merged per nutrient rather than per record. Foundation is the better source
	// where it has a figure, but it is not uniformly richer: for 281 foods it carries
	// total fat and no fat panel at all, and replacing the record wholesale threw away
	// SR Legacy's. That is how farmed Atlantic salmon ended up with 13 g of fat, no
	// EPA or DHA, and 0 g saturated fat, and raw avocado with 20 g of fat and 0 g
	// saturated. Keeping the raw measurements until the end means an absent nutrient
	// falls back instead of overwriting.
	const merged = new Map<string, {
		fdcId: number;
		name: string;
		category: string;
		/** Raw measurements — only keys the source actually reported. */
		raw: NutrientData;
		portions: Portion[];
	}>();

	// A food with an energy row of 0 (bottled water) really is 0 kcal, but a food
	// with no energy row at all has unknown energy — 47 Foundation foods are in that
	// state, and USDA gives them no carbs either, so it can't be derived via Atwater.
	// Surfacing them as "0 kcal" in a calorie tracker is worse than not listing them.
	const skipped = { sr: 0, foundation: 0 };

	// Add SR Legacy first
	for (const [fdcId, food] of sr.foods) {
		// Skip entries with no nutrient data at all
		if (!sr.nutrients.has(fdcId)) continue;
		if (!sr.hasEnergy.has(fdcId)) { skipped.sr++; continue; }

		merged.set(food.description.toLowerCase(), {
			fdcId,
			name: food.description,
			category: food.category,
			raw: sr.nutrients.get(fdcId)!,
			portions: sr.portions.get(fdcId) || [],
		});
	}

	// Override with Foundation Foods where available
	let gapFilled = 0;
	for (const [fdcId, food] of foundation.foods) {
		if (!foundation.nutrients.has(fdcId)) continue;
		if (!foundation.hasEnergy.has(fdcId)) { skipped.foundation++; continue; }

		const key = food.description.toLowerCase();
		const prev = merged.get(key);
		const foundationRaw = foundation.nutrients.get(fdcId)!;
		// Foundation wins per nutrient; anything it does not report keeps SR Legacy's.
		const raw = prev ? { ...prev.raw, ...foundationRaw } : foundationRaw;
		if (prev && Object.keys(raw).length > Object.keys(foundationRaw).length) gapFilled++;

		merged.set(key, {
			fdcId,
			name: food.description,
			category: food.category,
			raw,
			portions: foundation.portions.get(fdcId) || [],
		});
	}
	console.log(`Foundation records gap-filled from SR Legacy: ${gapFilled}`);

	console.log(`\nSkipped (no energy data): ${skipped.sr} SR Legacy, ${skipped.foundation} Foundation`);
	console.log(`Merged total: ${merged.size} unique foods`);

	// Sort by name for stable output. The per-100 g record is built here, once the
	// two sources have been reconciled.
	const entries = [...merged.values()]
		.map(e => ({
			fdcId: e.fdcId,
			name: e.name,
			category: e.category,
			per100g: buildNutrientRecord(e.raw),
			portions: e.portions,
		}))
		.sort((a, b) => a.name.localeCompare(b.name));

	// Emitted in chunks rather than as one array literal. TypeScript infers the type
	// of an array literal as a union over its elements before checking it against the
	// annotation, and at ~7,400 entries of this width that union exceeds the
	// checker's limit — `tsc` fails the whole file with TS2590 (union too complex).
	// Splitting the literal keeps each inference inside the limit; 1,500 leaves room
	// for the table to grow, since 3,000 already trips it.
	const CHUNK_SIZE = 1500;
	const chunkNames: string[] = [];
	let chunkDecls = '';
	for (let i = 0; i < entries.length; i += CHUNK_SIZE) {
		const name = `CHUNK_${chunkNames.length}`;
		chunkNames.push(name);
		chunkDecls += `const ${name}: NutritionEntry[] = ${JSON.stringify(entries.slice(i, i + CHUNK_SIZE), null, '\t')};\n\n`;
	}

	// Generate TypeScript output
	const tsContent = `// Auto-generated from USDA FoodData Central (SR Legacy + Foundation Foods)
// Generated: ${new Date().toISOString().split('T')[0]}
// Do not edit manually — regenerate with: pnpm exec vite-node scripts/import-usda-nutrition.ts

import type { NutritionPer100g } from '$types/types';

export type NutritionEntry = {
	fdcId: number;
	name: string;
	category: string;
	per100g: NutritionPer100g;
	portions: { description: string; grams: number }[];
};

${chunkDecls}export const NUTRITION_DB: NutritionEntry[] = [${chunkNames.map(n => `...${n}`).join(', ')}];
`;

	writeFileSync(OUTPUT_PATH, tsContent, 'utf-8');
	console.log(`\nWritten ${entries.length} entries to ${OUTPUT_PATH}`);

	// Print category breakdown
	const categoryCounts = new Map<string, number>();
	for (const entry of entries) {
		categoryCounts.set(entry.category, (categoryCounts.get(entry.category) || 0) + 1);
	}
	console.log('\nCategory breakdown:');
	for (const [cat, count] of [...categoryCounts.entries()].sort((a, b) => b[1] - a[1])) {
		console.log(`  ${cat}: ${count}`);
	}
}

main().catch(err => {
	console.error('Import failed:', err);
	process.exit(1);
});
