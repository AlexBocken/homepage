/**
 * What changing the amount arithmetic does to every recipe's nutrition.
 *
 * `computePer100g` is cached onto each recipe and read by the listing cards, the
 * offline database, all_brief and round-off-day, so a change to how an ingredient's
 * grams are counted quietly restates every one of those numbers. This prints the
 * damage before it is done.
 *
 * Read-only: it opens the database, recomputes each recipe two ways, and writes
 * nothing. Run it on the *new* code — the old rule is reimplemented here rather
 * than imported, so both answers come from one process and one set of recipes.
 *
 * The rule that changed: a line stating no amount used to contribute nothing
 * unless the matcher had resolved a default for it. It now counts as one
 * occurrence, because "Olivenöl" in an ingredient list means some olive oil, not
 * none. The lines to look at in the output are the ones whose unit is large —
 * an assumed 1 kg or 1 l is a real error, an assumed 1 g is noise.
 *
 * Usage:
 *   MONGO_URL='mongodb://…' pnpm exec vite-node scripts/diff-recipe-per100g.ts
 *   … --top 40     how many movers to list (default 20)
 *   … --all        list every recipe that moved, not just the top N
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import mongoose from 'mongoose';
import { computePer100g } from '../src/lib/server/recipePer100g';
import { parseAmount } from '../src/lib/js/ingredientAmount';
import { BLS_DB } from '../src/lib/data/blsDb';
import { NUTRITION_DB } from '../src/lib/data/nutritionDb';

// A stored mapping carries no per100g — it is resolved from the tables on read.
// Mirrors resolvePer100g in recipePer100g.ts, which is module-private.
const blsByCode = new Map(BLS_DB.map((e) => [e.blsCode, e]));
const usdaByFdcId = new Map(NUTRITION_DB.map((e) => [e.fdcId, e]));
function resolvePer100g(m: any): Record<string, number> | undefined {
	if (m.per100g) return m.per100g;
	if (m.source === 'bls' && m.blsCode) return blsByCode.get(m.blsCode)?.per100g as any;
	if (m.fdcId) return usdaByFdcId.get(m.fdcId)?.per100g as any;
	return undefined;
}

function mongoUrl(): string {
	if (process.env.MONGO_URL) return process.env.MONGO_URL;
	const envPath = resolve(process.cwd(), '.env');
	try {
		const m = readFileSync(envPath, 'utf-8').match(/^MONGO_URL="?([^"\n]+)"?/m);
		if (m) return m[1];
	} catch { /* fall through to the error below */ }
	console.error('MONGO_URL not set and not found in .env');
	process.exit(1);
}

/** The arithmetic as it stood before the change, for comparison only. */
function oldGrams(m: any, amount: string | undefined): number {
	if (m.excluded || !m.gramsPerUnit) return 0;
	const units = parseAmount(amount) || (m.defaultAmountUsed ? 1 : 0);
	return units * m.gramsPerUnit;
}

function oldComputePer100g(recipe: any): { per100g: Record<string, number>; totalGrams: number } | null {
	const mappings = recipe.nutritionMappings;
	if (!mappings?.length) return null;
	const totals: Record<string, number> = {};
	let totalGrams = 0;
	for (const m of mappings) {
		if (m.matchMethod === 'none' || m.excluded || !m.gramsPerUnit) continue;
		const per100g = resolvePer100g(m);
		if (!per100g) continue;
		const section = recipe.ingredients?.[m.sectionIndex];
		const items = section?.list ?? section?.ingredients ?? section?.items ?? [];
		const grams = oldGrams(m, items[m.ingredientIndex]?.amount);
		totalGrams += grams;
		const factor = grams / 100;
		for (const [k, v] of Object.entries(per100g as Record<string, unknown>)) {
			if (typeof v === 'number') totals[k] = (totals[k] ?? 0) + factor * v;
		}
	}
	if (totalGrams <= 0) return null;
	const per100g: Record<string, number> = {};
	for (const [k, v] of Object.entries(totals)) per100g[k] = (v / totalGrams) * 100;
	return { per100g, totalGrams };
}

/** The lines that gain grams under the new rule, named so they can be checked. */
function newlyCountedLines(recipe: any): string[] {
	const out: string[] = [];
	for (const m of recipe.nutritionMappings ?? []) {
		if (m.matchMethod === 'none' || m.excluded || !m.gramsPerUnit) continue;
		const section = recipe.ingredients?.[m.sectionIndex];
		const items = section?.list ?? section?.ingredients ?? section?.items ?? [];
		const ing = items[m.ingredientIndex];
		if (parseAmount(ing?.amount)) continue;
		if (m.defaultAmount || m.defaultAmountUsed) continue;
		out.push(`${ing?.name ?? m.ingredientNameDe ?? '?'} [${ing?.unit || 'ohne Einheit'}] → ${m.gramsPerUnit} g`);
	}
	return out;
}

const args = process.argv.slice(2);
const listAll = args.includes('--all');
const topN = (() => {
	const i = args.indexOf('--top');
	return i >= 0 ? Number(args[i + 1]) || 20 : 20;
})();

async function main() {
	await mongoose.connect(mongoUrl(), { serverSelectionTimeoutMS: 10000 });
	const db = mongoose.connection.db!;
	const recipes = await db
		.collection('recipes')
		.find({ nutritionMappings: { $exists: true, $ne: [] } })
		.project({ short_name: 1, name: 1, ingredients: 1, nutritionMappings: 1 })
		.toArray();

	type Row = {
		slug: string;
		oldKcal: number | null;
		newKcal: number | null;
		oldGrams: number | null;
		newGrams: number | null;
		pct: number;
		lines: string[];
	};
	const rows: Row[] = [];

	for (const r of recipes) {
		const before = oldComputePer100g(r);
		const after = computePer100g(r as any);
		const oldKcal = before?.per100g.calories ?? null;
		const newKcal = after?.per100g.calories ?? null;
		const same =
			oldKcal !== null && newKcal !== null
				? Math.abs(oldKcal - newKcal) < 0.005 && Math.abs((before!.totalGrams) - (after!.totalGrams)) < 0.005
				: oldKcal === newKcal;
		if (same) continue;
		const pct =
			oldKcal && newKcal ? ((newKcal - oldKcal) / oldKcal) * 100 : oldKcal === null ? Infinity : -100;
		rows.push({
			slug: r.short_name,
			oldKcal,
			newKcal,
			oldGrams: before?.totalGrams ?? null,
			newGrams: after?.totalGrams ?? null,
			pct,
			lines: newlyCountedLines(r),
		});
	}

	rows.sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct));

	console.log(`${recipes.length} recipes with mappings, ${rows.length} move.\n`);
	const shown = listAll ? rows : rows.slice(0, topN);
	for (const row of shown) {
		const kcal = `${row.oldKcal?.toFixed(1) ?? '—'} → ${row.newKcal?.toFixed(1) ?? '—'} kcal/100 g`;
		const grams = `${row.oldGrams?.toFixed(0) ?? '—'} → ${row.newGrams?.toFixed(0) ?? '—'} g`;
		const pct = Number.isFinite(row.pct) ? `${row.pct > 0 ? '+' : ''}${row.pct.toFixed(1)}%` : 'new';
		console.log(`${pct.padStart(8)}  ${row.slug}`);
		console.log(`          ${kcal} · ${grams}`);
		for (const line of row.lines) console.log(`          + ${line}`);
	}
	if (!listAll && rows.length > shown.length) {
		console.log(`\n… and ${rows.length - shown.length} more. Pass --all to see them.`);
	}

	// The lines worth a second look: an assumed occurrence measured in kilos or
	// litres is a real error, not a rounding difference.
	const heavy = rows.flatMap((r) =>
		r.lines.filter((l) => /\[(kg|l|Liter|liter)\]/.test(l)).map((l) => `${r.slug}: ${l}`)
	);
	if (heavy.length) {
		console.log(`\nAssumed one unit of a large measure — check these by hand:`);
		for (const h of heavy) console.log(`  ${h}`);
	}

	await mongoose.disconnect();
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
