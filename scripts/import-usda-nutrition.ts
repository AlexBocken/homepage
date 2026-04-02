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

	for (const row of nutrientRows) {
		const fdcId = parseInt(row['fdc_id']);
		if (!foods.has(fdcId)) continue;

		const nutrientId = parseInt(row['nutrient_id']);
		const fieldName = NUTRIENT_IDS[nutrientId];
		if (!fieldName) continue;

		if (!nutrients.has(fdcId)) nutrients.set(fdcId, {});
		const amount = parseFloat(row['amount'] || '0');
		if (!isNaN(amount)) {
			nutrients.get(fdcId)![fieldName] = amount;
		}
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

	return { foods, nutrients, portions };
}

function buildNutrientRecord(data: NutrientData | undefined): Record<string, number> {
	const allFields = Object.values(NUTRIENT_IDS);
	const result: Record<string, number> = {};
	for (const field of allFields) {
		result[field] = Math.round((data?.[field] || 0) * 100) / 100;
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

	// Merge: Foundation Foods takes priority (more detailed), SR Legacy fills gaps
	const merged = new Map<string, {
		fdcId: number;
		name: string;
		category: string;
		per100g: Record<string, number>;
		portions: Portion[];
	}>();

	// Add SR Legacy first
	for (const [fdcId, food] of sr.foods) {
		const nutrientData = buildNutrientRecord(sr.nutrients.get(fdcId));
		// Skip entries with no nutrient data at all
		if (!sr.nutrients.has(fdcId)) continue;

		merged.set(food.description.toLowerCase(), {
			fdcId,
			name: food.description,
			category: food.category,
			per100g: nutrientData,
			portions: sr.portions.get(fdcId) || [],
		});
	}

	// Override with Foundation Foods where available
	for (const [fdcId, food] of foundation.foods) {
		const nutrientData = buildNutrientRecord(foundation.nutrients.get(fdcId));
		if (!foundation.nutrients.has(fdcId)) continue;

		merged.set(food.description.toLowerCase(), {
			fdcId,
			name: food.description,
			category: food.category,
			per100g: nutrientData,
			portions: foundation.portions.get(fdcId) || [],
		});
	}

	console.log(`\nMerged total: ${merged.size} unique foods`);

	// Sort by name for stable output
	const entries = [...merged.values()].sort((a, b) => a.name.localeCompare(b.name));

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

export const NUTRITION_DB: NutritionEntry[] = ${JSON.stringify(entries, null, '\t')};
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
