/**
 * One-time migration: $unset the legacy `avgPace` field on every SegmentEffort.
 *
 * Pace is now always derived from the segment's fixed distance at display time
 * (elapsedSeconds / segment.distance), never from each effort's own GPS-measured
 * length — which drifted run-to-run and let a slower time show a faster pace.
 * The stored per-effort `avgPace` is dead; drop it.
 *
 * Run after deploying the code that no longer reads/writes the field:
 *   pnpm exec vite-node scripts/drop-segmenteffort-avgpace.ts
 *
 * Idempotent: docs without an `avgPace` field are left untouched.
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import mongoose from 'mongoose';

const envPath = resolve(import.meta.dirname ?? '.', '..', '.env');
const envText = readFileSync(envPath, 'utf-8');
const mongoMatch = envText.match(/^MONGO_URL="?([^"\n]+)"?/m);
if (!mongoMatch) { console.error('MONGO_URL not found in .env'); process.exit(1); }
const MONGO_URL = mongoMatch[1];

async function main() {
	await mongoose.connect(MONGO_URL);
	const SegmentEffort = mongoose.connection.collection('segmentefforts');

	const res = await SegmentEffort.updateMany(
		{ avgPace: { $exists: true } },
		{ $unset: { avgPace: '' } }
	);

	console.log(`Done. Cleared avgPace on ${res.modifiedCount} effort(s).`);
	await mongoose.disconnect();
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
