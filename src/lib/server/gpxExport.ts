import type { IGpsPoint } from '$models/WorkoutSession';

function escapeXml(s: string): string {
	return s
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&apos;');
}

/** Generate a GPX 1.1 document from an array of GPS points.
 *  Cadence is emitted via Garmin's TrackPointExtension v1 (<gpxtpx:cad>). */
export function generateGpx(track: IGpsPoint[], name: string): string {
	const hasCadence = track.some(p => typeof p.cadence === 'number');
	const nsExt = hasCadence
		? ' xmlns:gpxtpx="http://www.garmin.com/xmlschemas/TrackPointExtension/v1"'
		: '';

	const pts = track.map(p => {
		const ele = typeof p.altitude === 'number' ? `        <ele>${p.altitude}</ele>\n` : '';
		const time = `        <time>${new Date(p.timestamp).toISOString()}</time>\n`;
		const cad = typeof p.cadence === 'number'
			? `        <extensions><gpxtpx:TrackPointExtension><gpxtpx:cad>${Math.round(p.cadence)}</gpxtpx:cad></gpxtpx:TrackPointExtension></extensions>\n`
			: '';
		return `      <trkpt lat="${p.lat}" lon="${p.lng}">\n${ele}${time}${cad}      </trkpt>`;
	}).join('\n');

	return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Bocken Homepage" xmlns="http://www.topografix.com/GPX/1/1"${nsExt}>
  <trk>
    <name>${escapeXml(name)}</name>
    <trkseg>
${pts}
    </trkseg>
  </trk>
</gpx>
`;
}

/** Sanitize a string for use as a filename. Preserves spaces; strips path/control chars. */
export function safeFilename(s: string): string {
	return s.replace(/[\\/\x00-\x1f:*?"<>|]+/g, '').replace(/\s+/g, ' ').trim().slice(0, 120);
}

const ACTIVITY_LABEL: Record<string, string> = {
	running: 'Run',
	walking: 'Walk',
	cycling: 'Cycle',
	hiking: 'Hike'
};

/** Build a GPX filename: "YYYY-MM-DD-<workout> <duration>min <Activity>.gpx". */
export function buildGpxFilename(opts: {
	startTime: Date | string | number;
	workoutName: string;
	durationMin: number;
	activityType?: string;
	fallbackActivity?: string;
}): string {
	const date = new Date(opts.startTime).toISOString().slice(0, 10);
	const name = safeFilename(opts.workoutName) || 'Workout';
	const mins = Math.max(0, Math.round(opts.durationMin));
	const activity = opts.activityType && ACTIVITY_LABEL[opts.activityType]
		? ACTIVITY_LABEL[opts.activityType]
		: safeFilename(opts.fallbackActivity ?? '') || 'Cardio';
	return `${date}-${name} ${mins}min ${activity}.gpx`;
}
