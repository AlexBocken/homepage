/**
 * One-time migration: remove the segments that predate the running/cycling-only
 * rule, and everything hanging off them.
 *
 * Segments used to be created with whatever activity the source run carried, so
 * a walk or a hike could become one. Both fold into the *running* board on the
 * segments page (`activityKindOf` treats everything non-cycling as running), so
 * those segments sat among the runs with leaderboards of times nobody raced.
 * Segments are now running + cycling only — see `$lib/fitness/segmentActivities`
 * — and the code refuses to create, match or suggest anything else. This clears
 * what the old rule already wrote.
 *
 * What goes:
 *   - `Segment`s whose activityType is not running/cycling
 *   - every `SegmentEffort` on them (matching the cascade in DELETE /segments/[id])
 *   - every `SegmentEffort` recorded from a walk/hike on a *surviving* segment
 *   - the `segmentPrs` those efforts earned, on the runs that carry them
 *
 * Dry run by default — prints what it would touch and changes nothing:
 *   pnpm exec vite-node scripts/prune-nonrunning-segments.ts
 * Add --apply to actually write:
 *   pnpm exec vite-node scripts/prune-nonrunning-segments.ts --apply
 *
 * Idempotent: a second run finds nothing to do.
 *
 * The auto-detect grid is not touched here — walks and hikes are filtered out of
 * it now, and each user can fold that in with the "rebuild grid" button on the
 * segments page (POST /api/fitness/segments/grid/rebuild).
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import mongoose from 'mongoose';

const SEGMENT_ACTIVITIES = ['running', 'cycling'];

const apply = process.argv.includes('--apply');

const envPath = resolve(import.meta.dirname ?? '.', '..', '.env');
const envText = readFileSync(envPath, 'utf-8');
const mongoMatch = envText.match(/^MONGO_URL="?([^"\n]+)"?/m);
if (!mongoMatch) {
	console.error('MONGO_URL not found in .env');
	process.exit(1);
}
const MONGO_URL = mongoMatch[1];

async function main() {
	await mongoose.connect(MONGO_URL);
	const db = mongoose.connection;
	const Segments = db.collection('segments');
	const Efforts = db.collection('segmentefforts');
	const Sessions = db.collection('workoutsessions');

	const doomed = await Segments.find({ activityType: { $nin: SEGMENT_ACTIVITIES } })
		.project({ _id: 1, name: 1, activityType: 1, createdBy: 1 })
		.toArray();
	const doomedIds = doomed.map((s) => s._id);

	for (const s of doomed) {
		console.log(`  segment "${s.name}" (${s.activityType}, ${s.createdBy})`);
	}

	// Efforts to drop: everything on a doomed segment, plus anything a walk or a
	// hike recorded on a segment that survives (possible before the activity
	// filter existed, and for runs whose type was later corrected).
	const effortFilter = {
		$or: [
			{ segmentId: { $in: doomedIds } },
			{ activityType: { $nin: SEGMENT_ACTIVITIES } }
		]
	};
	const effortCount = await Efforts.countDocuments(effortFilter);
	const prCount = await Sessions.countDocuments({
		'segmentPrs.segmentId': { $in: doomedIds.map((id) => String(id)) }
	});

	console.log(
		`\n${doomed.length} segment(s), ${effortCount} effort(s), ` +
			`${prCount} run(s) carrying a PR on one of them.`
	);

	if (!apply) {
		console.log('\nDry run — nothing written. Re-run with --apply to delete.');
		await mongoose.disconnect();
		return;
	}

	// Efforts first: if this dies half way, the segments are still there and the
	// script can simply be run again.
	const delEfforts = await Efforts.deleteMany(effortFilter);
	const delPrs = await Sessions.updateMany(
		{ 'segmentPrs.segmentId': { $in: doomedIds.map((id) => String(id)) } },
		{ $pull: { segmentPrs: { segmentId: { $in: doomedIds.map((id) => String(id)) } } } }
	);
	const delSegments = await Segments.deleteMany({ _id: { $in: doomedIds } });

	console.log(
		`\nDone. Removed ${delSegments.deletedCount} segment(s), ` +
			`${delEfforts.deletedCount} effort(s), and cleared PRs on ${delPrs.modifiedCount} run(s).`
	);
	await mongoose.disconnect();
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
