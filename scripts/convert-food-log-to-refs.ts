/**
 * One-time migration: convert the food log from snapshot form to reference
 * (component) form. See $lib/server/foodLogMigration for what changes and why.
 *
 * The admin UI exposes the same conversion at
 *   POST /<lang>/administration/convert-food-log[?apply=true]
 * This CLI wrapper is for running it against production from the server or an SSH
 * tunnel, where reaching the endpoint is awkward.
 *
 * Dry run (default — prints the plan, writes nothing):
 *   pnpm exec vite-node scripts/convert-food-log-to-refs.ts
 * Apply:
 *   pnpm exec vite-node scripts/convert-food-log-to-refs.ts --apply
 * Against production:
 *   MONGO_URL='mongodb://…' pnpm exec vite-node scripts/convert-food-log-to-refs.ts --apply
 *
 * Idempotent and orphan-safe: re-running after an apply is harmless.
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import mongoose from 'mongoose';
import { migrateFoodLogToReferences } from '../src/lib/server/foodLogMigration';

const APPLY = process.argv.includes('--apply');

function mongoUrl(): string {
	if (process.env.MONGO_URL) return process.env.MONGO_URL;
	const envPath = resolve(import.meta.dirname ?? '.', '..', '.env');
	const m = readFileSync(envPath, 'utf-8').match(/^MONGO_URL="?([^"\n]+)"?/m);
	if (!m) {
		console.error('MONGO_URL not set and not found in .env');
		process.exit(1);
	}
	return m[1];
}

async function main() {
	console.log('=== Convert food log to references ===');
	console.log(APPLY ? 'MODE: APPLY (writing)\n' : 'MODE: dry run (pass --apply to write)\n');

	await mongoose.connect(mongoUrl(), { serverSelectionTimeoutMS: 10000 });
	const report = await migrateFoodLogToReferences(APPLY);

	const { entries, meals } = report;
	console.log('--- Custom meals ---');
	console.log(`  ${meals.converted} converted, ${meals.alreadyConverted} already done, of ${meals.total}`);
	for (const f of meals.flagged) console.log(`  ! ${f.name} (${f.id}): ${f.reason}`);

	console.log('\n--- Food log entries ---');
	console.log(`  ${entries.converted} converted, ${entries.alreadyConverted} already done, of ${entries.total}`);
	if (entries.frozen) {
		console.log(`  ${entries.frozen} kept a frozen snapshot (meal/recipe edited since logging):`);
		for (const f of entries.frozenDetail.slice(0, 40)) {
			console.log(`    - "${f.name}": logged ${f.oldCal} kcal, current recipe would give ${f.newCal}`);
		}
	}
	if (entries.failures.length) {
		console.log(`  ${entries.failures.length} could not be converted (left untouched):`);
		for (const f of entries.failures.slice(0, 40)) {
			console.log(`    - "${f.name}" [${f.source}] ${f.id}: ${f.reason}`);
		}
	}

	await mongoose.disconnect();
	if (!APPLY) console.log('\nDry run — nothing was written. Re-run with --apply.');
}

main().catch(err => {
	console.error('Conversion failed:', err);
	process.exit(1);
});
