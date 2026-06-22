/**
 * Plain-text rendering of a workout session for copy/paste.
 *
 * Header: workout name + (date · duration). Then, per exercise, the exercise
 * name followed by one numbered row per set showing weight × reps, any cardio
 * metrics, and RPE. Designed to paste cleanly into notes/chats.
 */
import { getExerciseById } from '$lib/data/exercises';
import { formatPaceValue } from '$lib/data/cardioPrRanges';
import { prTypeLabel } from '$lib/data/prLabels';

type Lang = 'en' | 'de';

function formatDuration(mins: number): string {
	const h = Math.floor(mins / 60);
	const m = Math.round(mins % 60);
	return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

/** One set → "100 kg × 8@8" — RPE sits directly on the rep count (no space). */
function formatSet(set: Record<string, number | null | undefined>): string {
	const parts: string[] = [];
	let main = '';
	if (set.weight != null && set.reps != null) main = `${set.weight} kg × ${set.reps}`;
	else if (set.weight != null) main = `${set.weight} kg`;
	else if (set.reps != null) main = `${set.reps} reps`;
	if (main) parts.push(main);
	if (set.distance != null) parts.push(`${set.distance} km`);
	if (set.duration != null) parts.push(`${set.duration} min`);
	if (set.rpe != null) {
		if (parts.length) parts[0] = `${parts[0]}@${set.rpe}`;
		else parts.push(`@${set.rpe}`);
	}
	return parts.join('  ');
}

/** PR → "🏆 Bench press · Est. 1RM · 100 kg". */
function formatPr(pr: any, lang: Lang): string {
	const name = getExerciseById(pr.exerciseId, lang)?.localName ?? pr.exerciseId;
	let value: string;
	if (pr.type === 'longestDistance') value = `${pr.value} km`;
	else if (typeof pr.type === 'string' && pr.type.startsWith('fastestPace:')) value = formatPaceValue(pr.value);
	else value = `${pr.value} kg`;
	return `🏆 ${name} · ${prTypeLabel(pr)} · ${value}`;
}

export function formatWorkoutLog(session: any, lang: Lang = 'en'): string {
	const lines: string[] = [];
	lines.push(session?.name || 'Workout');

	const meta: string[] = [];
	if (session?.startTime) {
		const d = new Date(session.startTime);
		if (!Number.isNaN(d.getTime())) {
			meta.push(
				d.toLocaleDateString(lang === 'de' ? 'de-DE' : 'en-GB', {
					day: 'numeric',
					month: 'short',
					year: 'numeric'
				})
			);
		}
	}
	if (session?.duration) meta.push(formatDuration(session.duration));
	if (meta.length) lines.push(meta.join(' · '));

	for (const ex of session?.exercises ?? []) {
		lines.push('');
		const name = getExerciseById(ex.exerciseId, lang)?.localName ?? ex.name ?? ex.exerciseId;
		lines.push(name);
		// No row numbers — each row already is one set.
		for (const set of ex.sets ?? []) {
			lines.push(`  ${formatSet(set)}`.trimEnd());
		}
	}

	if (session?.prs?.length) {
		lines.push('');
		for (const pr of session.prs) lines.push(formatPr(pr, lang));
	}

	return lines.join('\n');
}
