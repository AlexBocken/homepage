import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { dbConnect } from '$utils/db';
import { WorkoutSession } from '$models/WorkoutSession';
import type { IGpsPoint } from '$models/WorkoutSession';
import { simplifyTrack } from '$lib/server/simplifyTrack';
import { computeSessionKcal } from '$lib/server/computeSessionKcal';
import { generateGpx, buildGpxFilename } from '$lib/server/gpxExport';
import mongoose from 'mongoose';

/** Haversine distance in km between two points */
function haversine(a: IGpsPoint, b: IGpsPoint): number {
	const R = 6371;
	const dLat = ((b.lat - a.lat) * Math.PI) / 180;
	const dLng = ((b.lng - a.lng) * Math.PI) / 180;
	const sinLat = Math.sin(dLat / 2);
	const sinLng = Math.sin(dLng / 2);
	const h =
		sinLat * sinLat +
		Math.cos((a.lat * Math.PI) / 180) *
			Math.cos((b.lat * Math.PI) / 180) *
			sinLng * sinLng;
	return 2 * R * Math.asin(Math.sqrt(h));
}

function trackDistance(track: IGpsPoint[]): number {
	let total = 0;
	for (let i = 1; i < track.length; i++) {
		total += haversine(track[i - 1], track[i]);
	}
	return total;
}

/** Parse a GPX XML string into an array of GpsPoints */
function parseGpx(xml: string): IGpsPoint[] {
	const points: IGpsPoint[] = [];
	// Match <trkpt> or <rtept> elements
	const trkptRegex = /<(?:trkpt|rtept)\s+lat="([^"]+)"\s+lon="([^"]+)"[^>]*>([\s\S]*?)<\/(?:trkpt|rtept)>/gi;
	let match;
	while ((match = trkptRegex.exec(xml)) !== null) {
		const lat = parseFloat(match[1]);
		const lng = parseFloat(match[2]);
		const body = match[3];

		let altitude: number | undefined;
		const eleMatch = body.match(/<ele>([^<]+)<\/ele>/);
		if (eleMatch) altitude = parseFloat(eleMatch[1]);

		let timestamp = Date.now();
		const timeMatch = body.match(/<time>([^<]+)<\/time>/);
		if (timeMatch) timestamp = new Date(timeMatch[1]).getTime();

		if (!isNaN(lat) && !isNaN(lng)) {
			points.push({ lat, lng, altitude, timestamp });
		}
	}
	return points;
}

// GET /api/fitness/sessions/[id]/gpx?exerciseIdx=N — download GPX export of the track
export const GET: RequestHandler = async ({ params, url, locals }) => {
	const session = await locals.auth();
	if (!session || !session.user?.nickname) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	if (!mongoose.Types.ObjectId.isValid(params.id)) {
		return json({ error: 'Invalid session ID' }, { status: 400 });
	}

	const exerciseIdx = parseInt(url.searchParams.get('exerciseIdx') ?? '', 10);
	if (isNaN(exerciseIdx) || exerciseIdx < 0) {
		return json({ error: 'Invalid exercise index' }, { status: 400 });
	}

	await dbConnect();

	const workoutSession = await WorkoutSession.findOne({
		_id: params.id,
		createdBy: session.user.nickname
	}).lean();

	if (!workoutSession) {
		return json({ error: 'Session not found' }, { status: 404 });
	}

	const ex = workoutSession.exercises[exerciseIdx];
	if (!ex) {
		return json({ error: 'Exercise index out of range' }, { status: 400 });
	}
	if (!ex.gpsTrack || ex.gpsTrack.length === 0) {
		return json({ error: 'No GPS track on this exercise' }, { status: 404 });
	}

	const trackName = `${workoutSession.name} — ${ex.name}`;
	const trackMs = ex.gpsTrack[ex.gpsTrack.length - 1].timestamp - ex.gpsTrack[0].timestamp;
	const durationMin = trackMs > 0 ? trackMs / 60000 : (workoutSession.duration ?? 0);
	const filename = buildGpxFilename({
		startTime: workoutSession.startTime,
		workoutName: workoutSession.name,
		durationMin,
		activityType: workoutSession.activityType,
		fallbackActivity: ex.name
	});
	const xml = generateGpx(ex.gpsTrack, trackName);

	return new Response(xml, {
		status: 200,
		headers: {
			'Content-Type': 'application/gpx+xml; charset=utf-8',
			'Content-Disposition': `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`
		}
	});
};

// POST /api/fitness/sessions/[id]/gpx — upload GPX file for an exercise
export const POST: RequestHandler = async ({ params, request, locals }) => {
	const session = await locals.auth();
	if (!session || !session.user?.nickname) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	if (!mongoose.Types.ObjectId.isValid(params.id)) {
		return json({ error: 'Invalid session ID' }, { status: 400 });
	}

	try {
		const formData = await request.formData();
		const file = formData.get('gpx');
		const exerciseIdx = parseInt(formData.get('exerciseIdx') as string ?? '', 10);

		if (!file || !(file instanceof File)) {
			return json({ error: 'No GPX file provided' }, { status: 400 });
		}
		if (isNaN(exerciseIdx) || exerciseIdx < 0) {
			return json({ error: 'Invalid exercise index' }, { status: 400 });
		}

		const gpxText = await file.text();
		const track = parseGpx(gpxText);

		if (track.length === 0) {
			return json({ error: 'No track points found in GPX file' }, { status: 400 });
		}

		await dbConnect();

		const workoutSession = await WorkoutSession.findOne({
			_id: params.id,
			createdBy: session.user.nickname
		});

		if (!workoutSession) {
			return json({ error: 'Session not found' }, { status: 404 });
		}

		if (exerciseIdx >= workoutSession.exercises.length) {
			return json({ error: 'Exercise index out of range' }, { status: 400 });
		}

		const distance = trackDistance(track);
		const durationMin = Math.round((track[track.length - 1].timestamp - track[0].timestamp) / 60000);

		workoutSession.exercises[exerciseIdx].gpsTrack = track;
		workoutSession.exercises[exerciseIdx].gpsPreview = simplifyTrack(track);
		workoutSession.exercises[exerciseIdx].totalDistance = Math.round(distance * 1000) / 1000;

		// Auto-fill distance and duration on a single set
		const sets = workoutSession.exercises[exerciseIdx].sets;
		if (sets.length === 1) {
			sets[0].distance = Math.round(distance * 100) / 100;
			sets[0].duration = durationMin;
		}

		// Recompute kcal with the new GPS data
		workoutSession.kcalEstimate = await computeSessionKcal(
			workoutSession.exercises,
			session.user.nickname
		) ?? undefined;

		await workoutSession.save();

		return json({
			points: track.length,
			distance: workoutSession.exercises[exerciseIdx].totalDistance,
			kcalEstimate: workoutSession.kcalEstimate
		});
	} catch (error) {
		console.error('Error processing GPX upload:', error);
		return json({ error: 'Failed to process GPX file' }, { status: 500 });
	}
};

// DELETE /api/fitness/sessions/[id]/gpx — remove GPS track from an exercise
export const DELETE: RequestHandler = async ({ params, request, locals }) => {
	const session = await locals.auth();
	if (!session || !session.user?.nickname) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	if (!mongoose.Types.ObjectId.isValid(params.id)) {
		return json({ error: 'Invalid session ID' }, { status: 400 });
	}

	try {
		const { exerciseIdx } = await request.json();

		await dbConnect();

		const workoutSession = await WorkoutSession.findOne({
			_id: params.id,
			createdBy: session.user.nickname
		});

		if (!workoutSession) {
			return json({ error: 'Session not found' }, { status: 404 });
		}

		if (exerciseIdx >= workoutSession.exercises.length) {
			return json({ error: 'Exercise index out of range' }, { status: 400 });
		}

		workoutSession.exercises[exerciseIdx].gpsTrack = undefined;
		workoutSession.exercises[exerciseIdx].gpsPreview = undefined;
		workoutSession.exercises[exerciseIdx].totalDistance = undefined;

		// Recompute kcal without the GPS data
		workoutSession.kcalEstimate = await computeSessionKcal(
			workoutSession.exercises,
			session.user.nickname
		) ?? undefined;

		await workoutSession.save();

		return json({ success: true, kcalEstimate: workoutSession.kcalEstimate });
	} catch (error) {
		console.error('Error removing GPS track:', error);
		return json({ error: 'Failed to remove GPS track' }, { status: 500 });
	}
};
