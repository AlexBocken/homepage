/**
 * Builds the title/subtitle/stats for a run's share card from a session doc.
 * Kept separate so the card image endpoint and the public share page format
 * the run identically.
 */
import type { RunCard } from './runMapImage';
import { getExerciseById } from '$lib/data/exercises';
import { formatPaceValue } from '$lib/data/cardioPrRanges';
import { prTypeLabel } from '$lib/data/prLabels';

type CardSession = {
	name?: string;
	startTime?: string | Date;
	totalDistance?: number; // km
	duration?: number; // minutes (whole-workout, rounded)
	gpsTrack?: Array<{ timestamp?: number }>;
	exercises?: Array<{ gpsTrack?: Array<{ timestamp?: number }>; sets?: any[] }>;
};

type StrengthSession = CardSession & {
	totalVolume?: number; // kg
	exercises?: Array<{ exerciseId: string; name?: string; sets?: any[] }>;
	prs?: Array<{ exerciseId: string; type: string; value: number; reps?: number }>;
};

function formatDuration(mins: number): string {
	const h = Math.floor(mins / 60);
	const m = Math.round(mins % 60);
	return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

/** Elapsed time as `M:SS` (or `H:MM:SS` past an hour). */
function formatClock(totalSec: number): string {
	const s = Math.max(0, Math.round(totalSec));
	const h = Math.floor(s / 3600);
	const m = Math.floor((s % 3600) / 60);
	const sec = s % 60;
	const pad = (n: number) => n.toString().padStart(2, '0');
	return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}

/** First GPS track on the session (top-level, then per-exercise). */
function pickTrack(session: CardSession): Array<{ timestamp?: number }> | null {
	if ((session.gpsTrack?.length ?? 0) >= 2) return session.gpsTrack as Array<{ timestamp?: number }>;
	for (const ex of session.exercises ?? []) {
		if ((ex.gpsTrack?.length ?? 0) >= 2) return ex.gpsTrack as Array<{ timestamp?: number }>;
	}
	return null;
}

/**
 * Cardio elapsed time in seconds, pulled from the GPX track (last − first
 * timestamp) when available, else the sum of logged set durations. Falls back
 * to the rounded whole-workout `duration` only as a last resort.
 */
function cardioElapsedSec(session: CardSession): number {
	const track = pickTrack(session);
	if (track) {
		const a = track[0]?.timestamp;
		const b = track[track.length - 1]?.timestamp;
		if (typeof a === 'number' && typeof b === 'number' && b > a) return (b - a) / 1000;
	}
	let sec = 0;
	for (const ex of session.exercises ?? []) {
		for (const s of ex.sets ?? []) {
			if (s?.completed && typeof s.duration === 'number' && s.duration > 0) sec += s.duration * 60;
		}
	}
	if (sec > 0) return sec;
	return (session.duration ?? 0) * 60;
}

function formatPace(minPerKm: number): string {
	const m = Math.floor(minPerKm);
	const s = Math.round((minPerKm - m) * 60);
	// 60s rounds up into the next minute.
	const mm = s === 60 ? m + 1 : m;
	const ss = s === 60 ? 0 : s;
	return `${mm}:${ss.toString().padStart(2, '0')} /km`;
}

function formatDate(value?: string | Date): string {
	if (!value) return '';
	const d = new Date(value);
	if (Number.isNaN(d.getTime())) return '';
	return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function buildRunCard(session: CardSession): RunCard {
	const dist = session.totalDistance ?? 0;
	const sec = cardioElapsedSec(session);

	const stats = [];
	if (dist > 0) stats.push({ value: `${dist.toFixed(1)} km`, label: 'Distance' });
	if (sec > 0) stats.push({ value: formatClock(sec), label: 'Time' });
	if (dist > 0 && sec > 0) stats.push({ value: formatPace(sec / 60 / dist), label: 'Pace' });

	return {
		title: session.name?.trim() || 'Workout',
		subtitle: formatDate(session.startTime),
		stats
	};
}

/**
 * Cardio share card for a GPS-less / manually logged run or ride: distance,
 * time and pace, plus any distance/pace PRs. Rendered on the footprints
 * backdrop (no map available).
 */
export function buildCardioCard(session: StrengthSession, lang: 'en' | 'de' = 'en'): RunCard {
	const dist = session.totalDistance ?? 0;
	const sec = cardioElapsedSec(session);

	const stats = [];
	if (dist > 0) stats.push({ value: `${dist.toFixed(1)} km`, label: 'Distance' });
	if (sec > 0) stats.push({ value: formatClock(sec), label: 'Time' });
	if (dist > 0 && sec > 0) stats.push({ value: formatPace(sec / 60 / dist), label: 'Pace' });

	const prs = (session.prs ?? [])
		.filter((p) => p.type === 'longestDistance' || p.type?.startsWith('fastestPace:'))
		.slice(0, 3)
		.map((p) => {
			const ex = getExerciseById(p.exerciseId, lang);
			const name = ex?.localName ?? p.exerciseId;
			const value = p.type === 'longestDistance' ? `${p.value} km` : formatPaceValue(p.value);
			return `${name} · ${prTypeLabel(p)} · ${value}`;
		});

	return {
		title: session.name?.trim() || 'Workout',
		subtitle: formatDate(session.startTime),
		stats,
		prs
	};
}

/** Compact tonnage: tonnes once past 1 t, else kg. */
function formatTonnage(kg: number): string {
	return kg >= 1000 ? `${(kg / 1000).toFixed(1)} t` : `${Math.round(kg)} kg`;
}

/** Strength share card: tonnage, time, sets, heaviest set + PR badges. */
export function buildStrengthCard(session: StrengthSession, lang: 'en' | 'de' = 'en'): RunCard {
	const dur = session.duration ?? 0;
	let sets = 0;
	let reps = 0;
	let topSet = 0;
	let topSetExercise = '';
	for (const ex of session.exercises ?? []) {
		const exName = getExerciseById(ex.exerciseId, lang)?.localName ?? ex.name ?? ex.exerciseId;
		for (const s of ex.sets ?? []) {
			sets++;
			if (typeof s.reps === 'number') reps += s.reps;
			if (typeof s.weight === 'number' && s.weight > topSet) {
				topSet = s.weight;
				topSetExercise = exName;
			}
		}
	}

	const stats = [
		{ value: formatTonnage(session.totalVolume ?? 0), label: 'Tonnage' },
		{ value: formatDuration(dur), label: 'Time' },
		{ value: `${sets}`, label: 'Sets' },
		topSet > 0
			? { value: `${topSet} kg`, label: `Top · ${topSetExercise}` }
			: { value: '—', label: 'Top set' }
	];

	const prs = (session.prs ?? [])
		.filter((p) => typeof p.value === 'number' && !p.type?.startsWith('fastestPace:'))
		.slice(0, 3)
		.map((p) => {
			const ex = getExerciseById(p.exerciseId, lang);
			const name = ex?.localName ?? p.exerciseId;
			const val = p.type === 'longestDistance' ? `${p.value} km` : `${p.value} kg`;
			return `${name} · ${prTypeLabel(p)} · ${val}`;
		});

	const subtitleParts = [formatDate(session.startTime)];
	if (reps > 0) subtitleParts.push(`${reps} reps`);

	return {
		title: session.name?.trim() || 'Workout',
		subtitle: subtitleParts.filter(Boolean).join(' · '),
		stats,
		prs
	};
}
