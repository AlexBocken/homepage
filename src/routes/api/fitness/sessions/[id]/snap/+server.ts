import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { dbConnect } from '$utils/db';
import { WorkoutSession } from '$models/WorkoutSession';
import type { IGpsPoint } from '$models/WorkoutSession';
import { rateLimit, snapTrackToPaths, type RoutingProfile } from '$lib/server/hikesRouting';
import { simplifyTrack } from '$lib/server/simplifyTrack';
import { computeSessionKcal } from '$lib/server/computeSessionKcal';
import { matchSessionAgainstAllSegments, sessionBbox } from '$lib/server/segments';
import { addRunToGrid, removeRunFromGrid } from '$lib/server/segmentGrid';
import { computeBestEfforts, gatherSessionTrack } from '$lib/fitness/bestEfforts';
import { activityKind } from '$lib/server/bestEffortsBackfill';
import mongoose from 'mongoose';

const VALID_PROFILES: RoutingProfile[] = ['hiking-mountain', 'trekking', 'road'];

/** Haversine distance in km. */
function distKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
	const R = 6371;
	const dLat = ((b.lat - a.lat) * Math.PI) / 180;
	const dLng = ((b.lng - a.lng) * Math.PI) / 180;
	const sinLat = Math.sin(dLat / 2);
	const sinLng = Math.sin(dLng / 2);
	const h =
		sinLat * sinLat +
		Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * sinLng * sinLng;
	return 2 * R * Math.asin(Math.sqrt(h));
}

function trackDistanceKm(track: Array<{ lat: number; lng: number }>): number {
	let total = 0;
	for (let i = 1; i < track.length; i++) total += distKm(track[i - 1], track[i]);
	return total;
}

/**
 * Give each snapped point a timestamp (and cadence) by arc-length mapping: a
 * point F% of the way along the snapped track (by cumulative distance) inherits
 * the recorded time F% of the way along the recorded track, interpolated
 * between the two bracketing recorded fixes.
 *
 * Both tracks traverse the route in the same order, so this preserves ordering
 * even when a street is run in both directions — an out-and-back maps outbound
 * snapped points to outbound times and inbound to inbound, rather than a
 * spatial nearest-neighbour that can't tell the two passes apart. It also
 * preserves pace variation (time-vs-distance is exactly pace) and needs no
 * tunable time window. The forward-only cursor keeps it O(n + m).
 */
function assignTimestamps(
	snapped: Array<{ lat: number; lng: number; altitude?: number }>,
	original: IGpsPoint[]
): IGpsPoint[] {
	// Cumulative distance along each track.
	const recCum = [0];
	for (let i = 1; i < original.length; i++) recCum[i] = recCum[i - 1] + distKm(original[i - 1], original[i]);
	const recTotal = recCum[recCum.length - 1];

	const snapCum = [0];
	for (let i = 1; i < snapped.length; i++) snapCum[i] = snapCum[i - 1] + distKm(snapped[i - 1], snapped[i]);
	const snapTotal = snapCum[snapCum.length - 1];

	let j = 0; // forward-only cursor into the recorded track
	return snapped.map((sp, i) => {
		const target = (snapTotal > 0 ? snapCum[i] / snapTotal : 0) * recTotal;
		while (j < original.length - 2 && recCum[j + 1] < target) j++;
		const seg = recCum[j + 1] - recCum[j];
		const frac = seg > 0 ? (target - recCum[j]) / seg : 0;
		const a = original[j];
		const b = original[j + 1] ?? a;
		const ts = Math.round(a.timestamp + frac * (b.timestamp - a.timestamp));
		return { lat: sp.lat, lng: sp.lng, altitude: sp.altitude, cadence: a.cadence, timestamp: ts };
	});
}

// POST /api/fitness/sessions/[id]/snap — snap a GPS-tracked exercise's recorded
// track onto the path network via BRouter. `persist: false` returns a preview
// for the completion screen; `persist: true` replaces the stored track and
// recomputes distance / preview / kcal.
export const POST: RequestHandler = async ({ params, request, locals, getClientAddress }) => {
	const session = locals.session ?? (await locals.auth());
	if (!session || !session.user?.nickname) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const rateKey = session.user.nickname ?? session.user.email ?? getClientAddress();
	const { ok, retryAfter } = rateLimit(`snap:${rateKey}`);
	if (!ok) {
		return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
			status: 429,
			headers: { 'Content-Type': 'application/json', 'Retry-After': String(retryAfter ?? 60) }
		});
	}

	if (!mongoose.Types.ObjectId.isValid(params.id)) {
		return json({ error: 'Invalid session ID' }, { status: 400 });
	}

	let body: { exerciseIndex?: number; profile?: RoutingProfile; persist?: boolean };
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	const profile: RoutingProfile = VALID_PROFILES.includes(body.profile as RoutingProfile)
		? (body.profile as RoutingProfile)
		: 'trekking';

	try {
		await dbConnect();

		const ws = await WorkoutSession.findOne({
			_id: params.id,
			createdBy: session.user.nickname
		});
		if (!ws) return json({ error: 'Session not found' }, { status: 404 });

		// Pick the target exercise: an explicit index if it has a track, else the
		// first exercise carrying a GPS track.
		let idx = -1;
		if (
			typeof body.exerciseIndex === 'number' &&
			ws.exercises[body.exerciseIndex]?.gpsTrack &&
			(ws.exercises[body.exerciseIndex].gpsTrack?.length ?? 0) >= 2
		) {
			idx = body.exerciseIndex;
		} else {
			idx = ws.exercises.findIndex((e) => (e.gpsTrack?.length ?? 0) >= 2);
		}
		if (idx < 0) return json({ error: 'No GPS track to snap' }, { status: 400 });

		const original = ws.exercises[idx].gpsTrack as IGpsPoint[];
		const snapped = await snapTrackToPaths({
			track: original.map((p) => ({ lat: p.lat, lng: p.lng })),
			profile
		});
		if (!snapped) {
			return json({ error: 'Snapping failed' }, { status: 502 });
		}

		const snappedDistance = Math.round(trackDistanceKm(snapped.points) * 100) / 100;

		if (!body.persist) {
			return json({
				track: snapped.points,
				distance: snappedDistance,
				pointCount: snapped.points.length,
				source: snapped.source
			});
		}

		// Persist: replace the track (with timestamps carried over), rescale the
		// exercise's logged distance, and recompute derived fields.
		const newTrack = assignTimestamps(snapped.points, original);
		ws.exercises[idx].gpsTrack = newTrack;
		ws.exercises[idx].gpsPreview = simplifyTrack(newTrack);
		ws.exercises[idx].totalDistance = snappedDistance;

		const completedWithDist = ws.exercises[idx].sets.filter((s) => s.completed && (s.distance ?? 0) > 0);
		const recordedDist = completedWithDist.reduce((sum, s) => sum + (s.distance ?? 0), 0);
		if (completedWithDist.length === 1) {
			completedWithDist[0].distance = snappedDistance;
		} else if (recordedDist > 0) {
			const ratio = snappedDistance / recordedDist;
			for (const s of completedWithDist) s.distance = Math.round((s.distance ?? 0) * ratio * 100) / 100;
		} else if (completedWithDist.length === 0) {
			// No distance set logged (shouldn't happen for GPS runs) — nothing to scale.
		}

		// Recompute session-level distance from completed cardio sets.
		let totalDistance = 0;
		for (const ex of ws.exercises) {
			for (const s of ex.sets) {
				if (s.completed && (s.distance ?? 0) > 0) totalDistance += s.distance ?? 0;
			}
		}
		ws.totalDistance = totalDistance > 0 ? totalDistance : undefined;

		ws.kcalEstimate = (await computeSessionKcal(ws.exercises, session.user.nickname)) ?? undefined;

		// The track changed: refresh the bbox so segment-matching prefilters stay correct.
		ws.gpsBbox = sessionBbox({ gpsTrack: ws.gpsTrack, exercises: ws.exercises }) ?? undefined;

		// The snapped geometry/timing changes the fastest-Nk windows — recompute the
		// cached splits so the best-efforts dashboard / leaderboard stay accurate.
		ws.bestEfforts = activityKind(ws.activityType)
			? computeBestEfforts(gatherSessionTrack({ gpsTrack: ws.gpsTrack, exercises: ws.exercises }))
			: undefined;

		ws.markModified('exercises');
		await ws.save();

		// Re-match against segments (deletes the run's stale efforts first).
		try {
			await matchSessionAgainstAllSegments(ws);
		} catch (err) {
			console.error('Segment re-matching after snap failed:', err);
		}

		// Track changed → refresh its contribution to the auto-detect grid.
		try {
			await removeRunFromGrid(session.user.nickname, String(ws._id));
			await addRunToGrid(session.user.nickname, String(ws._id), {
				gpsTrack: ws.gpsTrack,
				exercises: ws.exercises
			});
		} catch (err) {
			console.error('Segment grid update after snap failed:', err);
		}

		return json({
			persisted: true,
			distance: snappedDistance,
			totalDistance: ws.totalDistance,
			kcalEstimate: ws.kcalEstimate,
			pointCount: newTrack.length,
			source: snapped.source
		});
	} catch (err) {
		console.error('Error snapping session track:', err);
		return json({ error: 'Failed to snap track' }, { status: 500 });
	}
};
