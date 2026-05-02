/**
 * One-time migration: convert legacy `season: number[]` (months 1–12) on every
 * Recipe document to the new `seasonRanges: SeasonRange[]` shape.
 *
 * Contiguous months are coalesced into a single range. A wrap across the year
 * boundary (e.g. months [11, 12, 1, 2]) merges into one wrapping range
 * Nov 1 → Feb 28; non-contiguous months stay as separate ranges.
 *
 * The legacy `season` field is then $unset.
 *
 * Run before deploying the new code path:
 *   pnpm exec vite-node scripts/migrate-season-to-ranges.ts
 *
 * Idempotent: a recipe with no `season` field is left untouched.
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import mongoose from 'mongoose';

const envPath = resolve(import.meta.dirname ?? '.', '..', '.env');
const envText = readFileSync(envPath, 'utf-8');
const mongoMatch = envText.match(/^MONGO_URL="?([^"\n]+)"?/m);
if (!mongoMatch) { console.error('MONGO_URL not found in .env'); process.exit(1); }
const MONGO_URL = mongoMatch[1];

const LAST_DAY = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

type FixedRange = { startM: number; endM: number };

/**
 * Coalesce a set of months (1–12) into contiguous ranges, merging the
 * year-boundary wrap if both Jan and Dec runs are present.
 */
function coalesceMonths(months: number[]): FixedRange[] {
	const sorted = [...new Set(months.filter(m => Number.isInteger(m) && m >= 1 && m <= 12))].sort((a, b) => a - b);
	if (sorted.length === 0) return [];

	const runs: FixedRange[] = [];
	let runStart = sorted[0];
	let runEnd = sorted[0];
	for (let i = 1; i < sorted.length; i++) {
		if (sorted[i] === runEnd + 1) {
			runEnd = sorted[i];
		} else {
			runs.push({ startM: runStart, endM: runEnd });
			runStart = sorted[i];
			runEnd = sorted[i];
		}
	}
	runs.push({ startM: runStart, endM: runEnd });

	// Merge the trailing-Dec run into the leading-Jan run so a winter span
	// like [11,12,1,2] becomes one wrapping Nov→Feb range instead of two.
	if (runs.length >= 2 && runs[0].startM === 1 && runs[runs.length - 1].endM === 12) {
		const wrapped = { startM: runs[runs.length - 1].startM, endM: runs[0].endM };
		return [wrapped, ...runs.slice(1, -1)];
	}
	return runs;
}

function rangeFromRun(run: FixedRange) {
	return {
		start: { kind: 'fixed', m: run.startM, d: 1 },
		end: { kind: 'fixed', m: run.endM, d: LAST_DAY[run.endM - 1] }
	};
}

async function main() {
	await mongoose.connect(MONGO_URL);
	const Recipe = mongoose.connection.collection('recipes');

	const cursor = Recipe.find({ season: { $exists: true } });
	let migrated = 0;
	let skipped = 0;

	while (await cursor.hasNext()) {
		const doc = await cursor.next() as any;
		if (!doc) break;

		const months: number[] = Array.isArray(doc.season) ? doc.season : [];
		const runs = coalesceMonths(months);

		if (runs.length === 0) {
			await Recipe.updateOne({ _id: doc._id }, { $unset: { season: '' } });
			skipped++;
			continue;
		}

		const seasonRanges = runs.map(rangeFromRun);

		await Recipe.updateOne(
			{ _id: doc._id },
			{ $set: { seasonRanges }, $unset: { season: '' } }
		);
		migrated++;
		if (migrated % 25 === 0) console.log(`  migrated ${migrated}…`);
	}

	console.log(`\nDone. Migrated: ${migrated}. Skipped (empty season): ${skipped}.`);
	await mongoose.disconnect();
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
