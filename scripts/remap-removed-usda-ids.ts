/**
 * One-time migration: re-point nutrition references that aimed at USDA entries
 * which no longer exist in NUTRITION_DB.
 *
 * Why they vanished: the USDA importer used to filter FoodData Central by food
 * category only, never by `data_type`. The Foundation dataset's food.csv is
 * mostly laboratory bookkeeping (57k sub_sample_food / sample_food /
 * market_acquisition rows around just 387 real foundation_food entries), and
 * those lab rows reuse ordinary food names while carrying only the one or two
 * nutrients that sample was assayed for. They imported as near-empty foods, and
 * because their casual names ("Egg yolk") match an ingredient more literally
 * than USDA's canonical ones ("Egg, yolk, raw, fresh"), the matcher preferred
 * them — so every "Dotter" in the recipe book resolved to 0 kcal while the real
 * 322 kcal entry sat right beside it. Filtering by data_type drops those ~5.2k
 * junk entries, leaving the references that pointed at them dangling.
 *
 * Those references were already yielding wrong nutrition (0 kcal, while still
 * counting the ingredient's grams toward the recipe total and thereby diluting
 * every per-100g figure). This re-runs the normal matcher so they land on the
 * real entries instead.
 *
 * Run AFTER regenerating the data the matcher reads:
 *   pnpm exec vite-node scripts/import-usda-nutrition.ts
 *   pnpm exec vite-node scripts/embed-nutrition-db.ts
 *
 * Dry run (default — prints the plan, writes nothing):
 *   pnpm exec vite-node scripts/remap-removed-usda-ids.ts
 * Apply:
 *   pnpm exec vite-node scripts/remap-removed-usda-ids.ts --apply
 * Against production (from the server, or through an SSH tunnel):
 *   MONGO_URL='mongodb://…' pnpm exec vite-node scripts/remap-removed-usda-ids.ts --apply
 *
 * Idempotent: once every reference resolves, later runs find nothing to do.
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import mongoose from 'mongoose';
import { NUTRITION_DB } from '../src/lib/data/nutritionDb';
import {
	matchIngredient,
	parseAnchorRecipeRef,
	preloadEmbeddingIndexes,
	invalidateOverwriteCache,
	normalizeIngredientNameDe,
} from '../src/lib/server/nutritionMatcher';
import usdaEmbeddings from '../src/lib/data/nutritionEmbeddings.json';
import blsEmbeddings from '../src/lib/data/blsEmbeddings.json';

const APPLY = process.argv.includes('--apply');

function mongoUrl(): string {
	// An explicit env var wins, so the same script can be aimed at production
	// without editing the dev .env.
	if (process.env.MONGO_URL) return process.env.MONGO_URL;
	const envPath = resolve(import.meta.dirname ?? '.', '..', '.env');
	const m = readFileSync(envPath, 'utf-8').match(/^MONGO_URL="?([^"\n]+)"?/m);
	if (!m) {
		console.error('MONGO_URL not set and not found in .env');
		process.exit(1);
	}
	return m[1];
}

const VALID_FDC_IDS = new Set(NUTRITION_DB.map(e => e.fdcId));

type Target = { source: string; fdcId?: number; blsCode?: string; nutritionDbName?: string };

const describe = (t: Target) =>
	`${t.source === 'bls' ? `bls ${t.blsCode}` : `usda ${t.fdcId}`} "${t.nutritionDbName}"`;

/** A match is usable only if it actually resolves to a live entry. */
function isUsable(t: any): boolean {
	if (!t || t.matchMethod === 'none') return false;
	if (t.source === 'bls') return !!t.blsCode;
	return t.fdcId != null && VALID_FDC_IDS.has(Number(t.fdcId));
}

/**
 * A reference is broken only if it actually drives a nutrient lookup and its
 * target is gone. Three shapes look broken but aren't:
 *  - source 'bls' with a blsCode: resolvePer100g() reads the BLS entry and never
 *    touches fdcId, so a stale fdcId alongside it is vestigial.
 *  - anchor-tag ingredients ("<a href=digestive>Digestive</a>"): these reference
 *    another recipe and are resolved by resolveReferencedNutrition(). Some carry
 *    junk fdcIds (64/65/69 — far below the ~167512 floor of real FDC ids) that
 *    predate this migration and never resolved to anything.
 *  - excluded mappings: skipped during computation entirely.
 */
function isBrokenMapping(m: any): boolean {
	if (m?.fdcId == null) return false;
	if (VALID_FDC_IDS.has(Number(m.fdcId))) return false;
	if (m.source === 'bls' && m.blsCode) return false;
	if (m.excluded) return false;
	if (parseAnchorRecipeRef(m.ingredientNameDe || '')) return false;
	if (parseAnchorRecipeRef(m.ingredientName || '')) return false;
	return true;
}

/** Same exemptions, for the global overwrite documents. */
function isBrokenOverwrite(o: any): boolean {
	if (o?.fdcId == null) return false;
	if (VALID_FDC_IDS.has(Number(o.fdcId))) return false;
	if (o.source !== 'usda') return false;
	if (o.excluded) return false;
	if (parseAnchorRecipeRef(o.ingredientNameDe || '')) return false;
	return true;
}

async function main() {
	console.log(`=== Re-point removed USDA references ===`);
	console.log(APPLY ? 'MODE: APPLY (writing)\n' : 'MODE: dry run (pass --apply to write)\n');

	// matchIngredient() lazily loads its embedding indexes through SvelteKit's
	// read(), which only exists inside the app runtime — hand them over up front.
	preloadEmbeddingIndexes(usdaEmbeddings.entries as any, (blsEmbeddings as any).entries ?? []);

	// connect(), not createConnection(): the matcher's NutritionOverwrite model is
	// bound to mongoose's default connection, and its overwrite lookup swallows
	// errors — on a separate connection it would silently return "no overwrites"
	// and every re-match would quietly ignore them.
	await mongoose.connect(mongoUrl(), { serverSelectionTimeoutMS: 10000 });
	const db = mongoose.connection.db!;

	// --- Phase 1: global overwrites -----------------------------------------
	// These come first because matchIngredient() consults overwrites before doing
	// any matching of its own — a broken overwrite would otherwise feed the dead
	// fdcId straight back into every recipe re-match in phase 2.
	//
	// They are re-pointed, never deleted. An overwrite exists precisely because
	// auto-matching failed for that ingredient: "dotter" has no English
	// translation in some recipes, and German-only matching finds nothing. Its
	// replacement is derived by asking the matcher what the ingredient resolves to
	// with the broken overwrite bypassed — not by fuzzy-matching the old name,
	// which cheerfully turns "Egg yolk" into "Babyfood, cereal, egg yolks and
	// bacon, junior".
	const overwrites = await db.collection('nutritionoverwrites').find({}).toArray();
	const brokenOverwrites = overwrites.filter(isBrokenOverwrite);
	console.log(`Overwrites: ${brokenOverwrites.length} broken of ${overwrites.length}`);

	/** normalized German name -> repaired target, used to explain phase 2 in dry runs. */
	const repointed = new Map<string, Target>();
	const owManual: string[] = [];
	let owFixed = 0;

	for (const o of brokenOverwrites) {
		const fresh: any = await matchIngredient(
			o.ingredientNameDe || '', o.ingredientNameEn, '', '', 0, 0, { ignoreOverwrites: true },
		);
		if (!isUsable(fresh)) {
			owManual.push(`"${o.ingredientNameDe}" (was ${o.fdcId} "${o.nutritionDbName}") — no replacement found`);
			continue;
		}
		const target: Target = {
			source: fresh.source, fdcId: fresh.fdcId, blsCode: fresh.blsCode, nutritionDbName: fresh.nutritionDbName,
		};
		console.log(`  "${o.ingredientNameDe}": ${o.fdcId} "${o.nutritionDbName}" -> ${describe(target)}`);
		if (APPLY) {
			await db.collection('nutritionoverwrites').updateOne({ _id: o._id }, {
				$set: {
					source: target.source,
					nutritionDbName: target.nutritionDbName,
					...(target.source === 'bls'
						? { blsCode: target.blsCode, fdcId: null }
						: { fdcId: target.fdcId }),
				},
			});
		}
		repointed.set(normalizeIngredientNameDe(o.ingredientNameDe || ''), target);
		owFixed++;
	}
	if (owManual.length) {
		console.log('  NEEDS MANUAL REVIEW:');
		for (const x of owManual) console.log(`    - ${x}`);
	}
	// Phase 2 must see the repaired overwrites, not the cached broken ones.
	if (APPLY) invalidateOverwriteCache();

	// --- Phase 2: recipe nutrition mappings ---------------------------------
	const recipes = await db.collection('recipes').find({}).toArray();
	let recipesTouched = 0;
	let mappingsFixed = 0;
	let unresolved = 0;
	const review: string[] = [];

	for (const r of recipes) {
		const mappings: any[] = r.nutritionMappings || [];
		const broken = mappings.filter(isBrokenMapping);
		if (broken.length === 0) continue;

		const name = String(r.name || '').replace(/&shy;|­/g, '');
		const updated = [...mappings];
		let changed = 0;

		for (const m of broken) {
			const section = (r.ingredients || [])[m.sectionIndex];
			const item = (section?.list ?? [])[m.ingredientIndex];
			if (!item) {
				console.log(`  ! ${name}: mapping ${m.sectionIndex}-${m.ingredientIndex} has no ingredient — skipped`);
				unresolved++;
				continue;
			}
			const itemEn = r.translations?.en?.ingredients?.[m.sectionIndex]?.list?.[m.ingredientIndex];

			// A repaired overwrite governs this ingredient outright, and in a dry run
			// the DB still holds the broken one — so report the planned outcome rather
			// than let the matcher answer from stale data.
			const governing = repointed.get(normalizeIngredientNameDe(item.name || ''));
			if (governing && !APPLY) {
				console.log(`  ${name}: "${item.name}" ${m.fdcId} -> ${describe(governing)} (via repaired overwrite)`);
				mappingsFixed++;
				changed++;
				continue;
			}

			const fresh: any = await matchIngredient(
				item.name || '', itemEn?.name, item.unit || '', item.amount || '', m.sectionIndex, m.ingredientIndex,
			);

			if (!isUsable(fresh)) {
				console.log(`  ? ${name}: "${item.name}" (was ${m.fdcId}) -> no match found, left as-is`);
				unresolved++;
				continue;
			}

			const conf = typeof fresh.matchConfidence === 'number' ? ` ${fresh.matchConfidence.toFixed(2)}` : '';
			console.log(`  ${name}: "${item.name}" ${m.fdcId} -> ${describe(fresh)} [${fresh.matchMethod}${conf}]`);
			if (m.manuallyEdited) {
				review.push(`${name}: "${item.name}" was a hand-picked entry (fdcId ${m.fdcId}) that no longer exists — now ${describe(fresh)}`);
			} else if (fresh.matchMethod === 'embedding') {
				// Semantic guesses, not name equality — the one class of result here
				// that can be confidently wrong ("Salzspeck" -> "Bacon, turkey").
				review.push(`${name}: "${item.name}" -> ${describe(fresh)} (semantic match, confidence ${fresh.matchConfidence?.toFixed(2)})`);
			}

			updated[updated.indexOf(m)] = { ...m, ...fresh };
			changed++;
			mappingsFixed++;
		}

		if (changed > 0) {
			if (APPLY) {
				await db.collection('recipes').updateOne({ _id: r._id }, { $set: { nutritionMappings: updated } });
			}
			recipesTouched++;
		}
	}

	console.log(`\n--- Summary ---`);
	console.log(`Overwrites re-pointed:   ${owFixed}${owManual.length ? ` (${owManual.length} need manual review)` : ''}`);
	console.log(`Recipe mappings fixed:   ${mappingsFixed} across ${recipesTouched} recipes`);
	if (unresolved) console.log(`Left dangling (no match): ${unresolved}`);
	if (review.length) {
		console.log(`\nWorth a look (fix in the recipe's nutrition editor if wrong):`);
		for (const x of review) console.log(`  - ${x}`);
	}
	if (!APPLY) console.log(`\nNothing was written. Re-run with --apply to commit these changes.`);

	await mongoose.disconnect();
}

main().catch(err => {
	console.error('Migration failed:', err);
	process.exit(1);
});
