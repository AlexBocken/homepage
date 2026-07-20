/**
 * Enrich the existing `openfoodfacts` collection with micronutrients from the
 * USDA FoodData Central "Branded Foods" JSON export.
 *
 * No new collection: this matches USDA products to our OFF docs by GTIN/UPC and
 * fills gaps in `per100g` in place. By default it only fills fields that are
 * MISSING — existing OFF values are never touched unless --overwrite is passed.
 *
 * Why foodNutrients and not labelNutrients: in the USDA export `foodNutrients`
 * amounts are per 100 g, while `labelNutrients` are per *serving*. Using the
 * label block would silently scale every value by servingSize/100.
 *
 * Reads MONGO_URL from .env unless --uri is given (use --uri for prod).
 *
 * Usage:
 *   # dry run against .env database (writes nothing, prints what it would do)
 *   pnpm exec vite-node scripts/enrich-off-from-usda-branded.ts <path-to-zip-or-json>
 *
 *   # small sample first
 *   pnpm exec vite-node scripts/enrich-off-from-usda-branded.ts <file> --limit 50000
 *
 *   # actually write
 *   pnpm exec vite-node scripts/enrich-off-from-usda-branded.ts <file> --apply
 *
 *   # against prod
 *   pnpm exec vite-node scripts/enrich-off-from-usda-branded.ts <file> --apply --uri "mongodb://…"
 *
 * Flags:
 *   --apply          perform writes (default: dry run)
 *   --uri <uri>      MongoDB connection string (default: MONGO_URL from .env)
 *   --limit <n>      stop after n USDA records (for testing)
 *   --overwrite      also replace per100g values we already have
 *   --fix-implausible
 *                    additionally replace stored values that are provably
 *                    impossible (negative, or >100 g per 100 g). Narrower than
 *                    --overwrite: it can only touch values that are already
 *                    wrong, never good ones. Logged separately to
 *                    <report>.repairs.jsonl.
 *   --report <path>  write a JSONL log of every change made/planned
 *   --zeros <mode>   how to treat USDA zeros (default: mandatory)
 *                      mandatory — only trust 0 for nutrients the US label
 *                                  requires (vit D, calcium, iron, potassium,
 *                                  sodium, macros). A 0 on a *voluntary*
 *                                  nutrient means "not declared", not "none",
 *                                  so those are skipped.
 *                      all       — write every 0 USDA reports
 *                      none      — never write a 0
 */

import { createReadStream, existsSync, writeFileSync } from 'fs';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { spawn } from 'child_process';
import { createInterface } from 'readline';
import mongoose from 'mongoose';

// ---------------------------------------------------------------- CLI
const argv = process.argv.slice(2);
function flag(name: string): boolean {
	return argv.includes(`--${name}`);
}
function opt(name: string): string | undefined {
	const i = argv.indexOf(`--${name}`);
	return i >= 0 ? argv[i + 1] : undefined;
}

const APPLY = flag('apply');
const OVERWRITE = flag('overwrite');
const LIMIT = Number(opt('limit') || 0) || Infinity;
const REPORT_PATH = opt('report');
const inputPath = resolve(argv.find((a) => !a.startsWith('--') && !isOptValue(a)) || '');

function isOptValue(arg: string): boolean {
	const i = argv.indexOf(arg);
	return i > 0 && ['--uri', '--limit', '--report', '--zeros'].includes(argv[i - 1]);
}

if (!inputPath || !existsSync(inputPath)) {
	console.error('Usage: enrich-off-from-usda-branded.ts <FoodData_Central_branded_food_json_*.zip|.json> [flags]');
	process.exit(1);
}

let MONGO_URL = opt('uri');
if (!MONGO_URL) {
	const envPath = resolve(import.meta.dirname ?? '.', '..', '.env');
	const m = readFileSync(envPath, 'utf-8').match(/^MONGO_URL="?([^"\n]+)"?/m);
	if (!m) {
		console.error('MONGO_URL not found in .env and no --uri given');
		process.exit(1);
	}
	MONGO_URL = m[1];
}

// ------------------------------------------------- nutrient id → our fields
// Values are converted to OFF's convention: grams per 100 g for everything
// except `calories` (kcal per 100 g).
const MG = 1e-3;
const UG = 1e-6;

type NutrientDef = { field: string; factor: number };

const NUTRIENTS: Record<number, NutrientDef> = {
	1008: { field: 'calories', factor: 1 }, // kcal
	1003: { field: 'protein', factor: 1 },
	1004: { field: 'fat', factor: 1 },
	1258: { field: 'saturatedFat', factor: 1 },
	1005: { field: 'carbs', factor: 1 },
	1079: { field: 'fiber', factor: 1 },
	2000: { field: 'sugars', factor: 1 },
	1087: { field: 'calcium', factor: MG },
	1089: { field: 'iron', factor: MG },
	1090: { field: 'magnesium', factor: MG },
	1091: { field: 'phosphorus', factor: MG },
	1092: { field: 'potassium', factor: MG },
	1093: { field: 'sodium', factor: MG },
	1095: { field: 'zinc', factor: MG },
	1162: { field: 'vitaminC', factor: MG },
	1165: { field: 'thiamin', factor: MG },
	1166: { field: 'riboflavin', factor: MG },
	1167: { field: 'niacin', factor: MG },
	1175: { field: 'vitaminB6', factor: MG },
	1178: { field: 'vitaminB12', factor: UG },
	1177: { field: 'folate', factor: UG },
	1253: { field: 'cholesterol', factor: MG },
	1185: { field: 'vitaminK', factor: UG },
	// IU-denominated entries. These conversions are label conventions and are
	// approximations — see README note below.
	1104: { field: 'vitaminA', factor: 0.3 * UG }, // 1 IU retinol = 0.3 µg RAE
	1110: { field: 'vitaminD', factor: 0.025 * UG }, // 1 IU = 0.025 µg
	1124: { field: 'vitaminE', factor: 0.67 * MG }, // 1 IU ≈ 0.67 mg α-tocopherol
	// Preferred non-IU forms when present; these override the IU entries above.
	1106: { field: 'vitaminA', factor: UG }, // Vitamin A, RAE (µg)
	1114: { field: 'vitaminD', factor: UG }, // Vitamin D (D2+D3) (µg)
	1109: { field: 'vitaminE', factor: MG }, // Vitamin E (alpha-tocopherol) (mg)
};

// Nutrient ids whose value should win over an IU-derived value for the same field.
const PREFERRED_IDS = new Set([1106, 1114, 1109]);

// -------------------------------------------------------------- sanity rules
// Upper bounds per 100 g, in the units we store (grams, except calories).
//
// These are deliberately generous — set well above the most extreme real food
// (beef liver, kelp, fortified cereal, spirulina) so that legitimate outliers
// survive, while values that are physically impossible do not. A plain "must be
// under 100 g" rule is useless for micronutrients: 3.3 g of iron per 100 g is
// nonsense but would pass it. Comments give the cap in display units and the
// real-world benchmark it clears.
const MAX: Record<string, number> = {
	calories: 900,
	protein: 100,
	fat: 100,
	saturatedFat: 100,
	carbs: 100,
	fiber: 100,
	sugars: 100,
	sodium: 40, // g/100 g — pure salt is ~39 g Na
	cholesterol: 10, // 10 g — egg yolk ~1.1 g

	calcium: 5, // 5 g — hard cheese ~1.2 g
	iron: 0.1, // 100 mg — fortified cereal ~30-60 mg
	magnesium: 2, // 2 g — kelp ~120 mg
	phosphorus: 5, // 5 g — parmesan ~700 mg
	potassium: 10, // 10 g — dried herbs ~3 g
	zinc: 0.1, // 100 mg — oysters ~40 mg
	vitaminA: 0.1, // 100,000 µg — beef liver ~9,000 µg
	vitaminC: 5, // 5 g — acerola powder ~4 g
	vitaminD: 0.001, // 1,000 µg — fortified/supplemented foods
	vitaminE: 1, // 1,000 mg — wheat germ oil ~150 mg
	vitaminK: 0.05, // 50,000 µg — dried parsley ~1,600 µg
	thiamin: 0.1, // 100 mg
	riboflavin: 0.1, // 100 mg
	niacin: 1, // 1,000 mg
	vitaminB6: 0.1, // 100 mg
	vitaminB12: 0.001, // 1,000 µg — spirulina labels ~250 µg
	folate: 0.01, // 10,000 µg — fortified yeast ~4,000 µg
};

// Nutrients the post-2016 US Nutrition Facts panel *requires*. A declared 0 on
// these is a real measurement. Everything else is voluntary, so a 0 there is
// far more likely to mean "not declared" than "contains none" — writing it
// would turn an honest gap into a false claim of absence.
const ZERO_TRUSTED = new Set([
	'calories',
	'protein',
	'fat',
	'saturatedFat',
	'carbs',
	'fiber',
	'sugars',
	'sodium',
	'cholesterol',
	'vitaminD',
	'calcium',
	'iron',
	'potassium',
]);

const ZERO_MODE = (opt('zeros') || 'mandatory') as 'mandatory' | 'all' | 'none';
if (!['mandatory', 'all', 'none'].includes(ZERO_MODE)) {
	console.error(`--zeros must be one of: mandatory, all, none`);
	process.exit(1);
}

function acceptZero(field: string): boolean {
	if (ZERO_MODE === 'all') return true;
	if (ZERO_MODE === 'none') return false;
	return ZERO_TRUSTED.has(field);
}

const FIX_IMPLAUSIBLE = flag('fix-implausible');

/**
 * How far past the cap a stored value must sit before --fix-implausible will
 * replace it.
 *
 * A value just over the cap (e.g. 917 kcal against a 900 limit) is roughly
 * right — probably a rounding or serving-size artifact — so the USDA figure is
 * not clearly better, and USDA has its own bad records. A value far past the
 * cap (43,000 kcal, or a micronutrient stored in mg instead of g) is garbage,
 * and almost anything is an improvement.
 *
 * Between those, we cannot tell which source is wrong, so we leave the stored
 * value alone rather than risk replacing it with something worse.
 *
 * Set to 1.0 (repair anything impossible) on the evidence of a full prod dry
 * run. A 1.05 margin was tried and rejected: it blocked 2 bad repairs (a
 * shortening stored at 917 kcal whose USDA record wrongly says 110) at the cost
 * of ~1,256 good ones (Swiss cheese fat 102 g → 28.6, white bread 931 kcal →
 * 250). Barely-over-cap values turn out to be overwhelmingly genuine
 * corruption, not rounding artifacts, so the margin cost far more than it
 * saved. Raise it only if the repairs log starts showing the opposite.
 */
const REPAIR_MARGIN = 1.0;

function repairable(field: string, v: unknown): boolean {
	if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) return true;
	const cap = MAX[field] !== undefined ? MAX[field] : 100;
	return v > cap * REPAIR_MARGIN;
}

/**
 * Is a single value provably wrong on its own terms?
 *
 * Checked against the per-nutrient caps in MAX, which sit well above the most
 * extreme real food. This is deliberately a *provably wrong* test, not a "looks
 * odd" test: it is the only thing standing between --fix-implausible and
 * overwriting legitimate data. Values that are merely suspicious (e.g. µg
 * stored as g, which stays under the cap) are left alone.
 */
function implausibleValue(field: string, v: unknown): boolean {
	if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) return true;
	const cap = MAX[field] !== undefined ? MAX[field] : 100;
	return v > cap;
}

// A bad macro or energy means the record itself is broken, so the whole product
// is skipped. A bad micronutrient is usually one stray label figure, so only
// that field is dropped and the rest of the record is still used.
const CORE = new Set(['calories', 'protein', 'fat', 'saturatedFat', 'carbs', 'fiber', 'sugars']);

type Sanitised = { per100g: Record<string, number>; ok: boolean; dropped: string[] };

function sanitise(per100g: Record<string, number>): Sanitised {
	const out: Record<string, number> = {};
	const dropped: string[] = [];

	for (const [k, v] of Object.entries(per100g)) {
		if (implausibleValue(k, v)) {
			if (CORE.has(k)) return { per100g: {}, ok: false, dropped: [k] };
			dropped.push(k);
			continue;
		}
		out[k] = v;
	}

	// Macros must not exceed the mass of the food itself.
	const mass = (out.protein || 0) + (out.fat || 0) + (out.carbs || 0);
	if (mass > 105) return { per100g: {}, ok: false, dropped: ['mass'] };

	return { per100g: out, ok: true, dropped };
}

/** Candidate barcode spellings for a GTIN, matching how OFF stores codes. */
function barcodeCandidates(gtin: string): string[] {
	const digits = gtin.replace(/\D/g, '');
	if (!digits) return [];
	const stripped = digits.replace(/^0+/, '') || '0';
	const out = new Set<string>([digits, stripped]);
	for (const len of [12, 13, 14]) {
		if (stripped.length <= len) out.add(stripped.padStart(len, '0'));
	}
	return [...out];
}

/** Stream USDA records. Each product sits on its own line in the export. */
async function* usdaRecords(path: string): AsyncGenerator<any> {
	let stream: NodeJS.ReadableStream;
	let child: ReturnType<typeof spawn> | undefined;

	if (path.endsWith('.zip')) {
		// `unzip -p` streams the member without extracting 3.3 GB to disk.
		child = spawn('unzip', ['-p', path], { stdio: ['ignore', 'pipe', 'inherit'] });
		stream = child.stdout!;
	} else {
		stream = createReadStream(path);
	}

	const rl = createInterface({ input: stream, crlfDelay: Infinity });
	try {
		for await (const raw of rl) {
			const line = raw.trim().replace(/,$/, '');
			if (!line.startsWith('{"foodClass"')) continue; // skips the wrapper lines
			try {
				yield JSON.parse(line);
			} catch {
				/* malformed line — skip */
			}
		}
	} finally {
		rl.close();
		child?.kill();
	}
}

/** Extract a per-100 g map from a USDA product's foodNutrients. */
function extractPer100g(rec: any): Record<string, number> {
	const out: Record<string, number> = {};
	const fromPreferred = new Set<string>();

	for (const fn of rec.foodNutrients || []) {
		const id = fn?.nutrient?.id;
		const def = NUTRIENTS[id];
		if (!def) continue;
		const amount = Number(fn.amount);
		if (!Number.isFinite(amount)) continue;

		// A preferred (non-IU) entry always wins; never let an IU value clobber it.
		if (out[def.field] !== undefined && !PREFERRED_IDS.has(id) && fromPreferred.has(def.field)) {
			continue;
		}
		out[def.field] = amount * def.factor;
		if (PREFERRED_IDS.has(id)) fromPreferred.add(def.field);
	}
	return out;
}

// ------------------------------------------------------------------- main
async function main() {
	console.log(`\nUSDA branded → OFF enrichment`);
	console.log(`  input     : ${inputPath}`);
	console.log(`  database  : ${MONGO_URL!.replace(/\/\/[^@]*@/, '//***@')}`);
	console.log(`  mode      : ${APPLY ? 'APPLY (writes)' : 'DRY RUN (no writes)'}`);
	console.log(`  fields    : ${OVERWRITE ? 'overwrite existing + fill missing' : 'fill missing only'}`);
	console.log(`  zeros     : ${ZERO_MODE}`);
	if (FIX_IMPLAUSIBLE) console.log(`  repair    : impossible stored values will be replaced`);
	if (LIMIT !== Infinity) console.log(`  limit     : ${LIMIT} records`);
	console.log('');

	await mongoose.connect(MONGO_URL!);
	const coll = mongoose.connection.db!.collection('openfoodfacts');

	const stats = {
		read: 0,
		noGtin: 0,
		noNutrients: 0,
		implausible: 0,
		unmatched: 0,
		matched: 0,
		updated: 0,
		energyMismatch: 0,
		zerosSkipped: 0,
		repaired: 0,
		fieldsDropped: 0,
	};
	const droppedFields: Record<string, number> = {};
	const fieldFills: Record<string, number> = {};
	const repairFills: Record<string, number> = {};
	const reportLines: string[] = [];
	const repairLines: string[] = [];

	let ops: any[] = [];
	const BATCH = 1000;

	async function flush() {
		if (!ops.length) return;
		if (APPLY) await coll.bulkWrite(ops, { ordered: false });
		ops = [];
	}

	for await (const rec of usdaRecords(inputPath)) {
		if (stats.read >= LIMIT) break;
		stats.read++;
		if (stats.read % 100000 === 0) {
			console.log(
				`  …${stats.read.toLocaleString()} read, ${stats.matched.toLocaleString()} matched, ${stats.updated.toLocaleString()} updated`
			);
		}

		const gtin = String(rec.gtinUpc || '').trim();
		if (!gtin) {
			stats.noGtin++;
			continue;
		}

		const raw = extractPer100g(rec);
		if (!Object.keys(raw).length) {
			stats.noNutrients++;
			continue;
		}
		const clean = sanitise(raw);
		if (!clean.ok) {
			stats.implausible++;
			continue;
		}
		const usda = clean.per100g;
		if (clean.dropped.length) {
			stats.fieldsDropped += clean.dropped.length;
			for (const f of clean.dropped) droppedFields[f] = (droppedFields[f] || 0) + 1;
		}
		if (!Object.keys(usda).length) continue;

		const doc = await coll.findOne(
			{ barcode: { $in: barcodeCandidates(gtin) } },
			{ projection: { barcode: 1, per100g: 1, name: 1 } }
		);
		if (!doc) {
			stats.unmatched++;
			continue;
		}
		stats.matched++;

		const existing = doc.per100g || {};

		// Guard against a GTIN collision or a different formulation: if both
		// sides state energy and they disagree badly, trust neither and skip.
		// …but only when the stored energy is not itself decisive garbage. A
		// merely borderline value (917 kcal) is still a useful sanity anchor and
		// catches USDA's own bad records; only a wildly broken one (43,000 kcal)
		// is useless, and skipping the comparison there is what lets the repair
		// path reach the products that need it.
		const storedEnergyUsable = !repairable('calories', existing.calories);
		if (
			storedEnergyUsable &&
			Number.isFinite(usda.calories) &&
			Math.abs(existing.calories - usda.calories) > 0.25 * Math.max(existing.calories, usda.calories) + 20
		) {
			stats.energyMismatch++;
			continue;
		}

		const set: Record<string, number> = {};
		for (const [field, value] of Object.entries(usda)) {
			if (value === 0 && !acceptZero(field)) {
				stats.zerosSkipped++;
				continue;
			}
			const have = existing[field];
			const missing = have === undefined || have === null;
			// A stored value that is provably impossible is worse than no value,
			// so it may be replaced even without --overwrite.
			const isRepair = !missing && FIX_IMPLAUSIBLE && repairable(field, have);

			if (missing || OVERWRITE || isRepair) {
				// Don't rewrite a value that is already identical.
				if (!missing && Math.abs(have - value) < 1e-9) continue;
				set[`per100g.${field}`] = value;
				fieldFills[field] = (fieldFills[field] || 0) + 1;
				if (isRepair) {
					stats.repaired++;
					repairFills[field] = (repairFills[field] || 0) + 1;
					if (REPORT_PATH) {
						repairLines.push(
							JSON.stringify({ barcode: doc.barcode, name: doc.name, field, was: have, now: value })
						);
					}
				}
			}
		}

		if (!Object.keys(set).length) continue;
		stats.updated++;

		if (REPORT_PATH) {
			reportLines.push(
				JSON.stringify({ barcode: doc.barcode, name: doc.name, gtin, set })
			);
		}

		ops.push({ updateOne: { filter: { _id: doc._id }, update: { $set: set } } });
		if (ops.length >= BATCH) await flush();
	}
	await flush();

	console.log(`\n--- summary ---`);
	console.log(`  USDA records read      : ${stats.read.toLocaleString()}`);
	console.log(`    no GTIN              : ${stats.noGtin.toLocaleString()}`);
	console.log(`    no usable nutrients  : ${stats.noNutrients.toLocaleString()}`);
	console.log(`    failed sanity check  : ${stats.implausible.toLocaleString()} (whole record rejected)`);
	if (stats.fieldsDropped) {
		const detail = Object.entries(droppedFields)
			.sort((a, b) => b[1] - a[1])
			.map(([f, n]) => `${f} ${n}`)
			.join(', ');
		console.log(`    out-of-range fields dropped: ${stats.fieldsDropped.toLocaleString()} (${detail})`);
	}
	console.log(`    no OFF match         : ${stats.unmatched.toLocaleString()}`);
	console.log(`    energy mismatch skip : ${stats.energyMismatch.toLocaleString()}`);
	console.log(`  matched OFF products   : ${stats.matched.toLocaleString()}`);
	console.log(`  products ${APPLY ? 'updated' : 'that would update'}: ${stats.updated.toLocaleString()}`);
	console.log(`  undeclared zeros skipped: ${stats.zerosSkipped.toLocaleString()} (--zeros ${ZERO_MODE})`);

	console.log(`\n--- field fills ---`);
	for (const [f, n] of Object.entries(fieldFills).sort((a, b) => b[1] - a[1])) {
		console.log(`  ${f.padEnd(14)} ${n.toLocaleString()}`);
	}

	if (FIX_IMPLAUSIBLE) {
		console.log(`\n--- repairs of impossible stored values (--fix-implausible) ---`);
		if (!stats.repaired) {
			console.log('  none');
		} else {
			for (const [f, n] of Object.entries(repairFills).sort((a, b) => b[1] - a[1])) {
				console.log(`  ${f.padEnd(14)} ${n.toLocaleString()}`);
			}
			console.log(`  total: ${stats.repaired.toLocaleString()}`);
		}
	}

	if (REPORT_PATH) {
		writeFileSync(REPORT_PATH, reportLines.join('\n') + '\n');
		console.log(`\n  change log written to ${REPORT_PATH} (${reportLines.length.toLocaleString()} lines)`);
		if (FIX_IMPLAUSIBLE && repairLines.length) {
			const repairPath = REPORT_PATH.replace(/(\.jsonl?)?$/, '.repairs.jsonl');
			writeFileSync(repairPath, repairLines.join('\n') + '\n');
			console.log(`  repair log written to ${repairPath} (${repairLines.length.toLocaleString()} lines)`);
		}
	}

	if (!APPLY) console.log(`\n  DRY RUN — nothing was written. Re-run with --apply to commit.`);

	await mongoose.disconnect();
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
