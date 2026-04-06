import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/middleware/auth';
import { dbConnect } from '$utils/db';
import { WorkoutSession } from '$models/WorkoutSession';
import { getEnrichedExerciseById } from '$lib/data/exercisedb';
import { edbMuscleToSimple, MUSCLE_GROUPS } from '$lib/data/muscleMap';

/**
 * GET /api/fitness/stats/muscle-heatmap?weeks=8
 *
 * Returns weekly muscle usage data from workout history.
 * Primary muscles get 1× set count, secondary get 0.5×.
 */
export const GET: RequestHandler = async ({ url, locals }) => {
	const user = await requireAuth(locals);
	const weeks = Math.min(parseInt(url.searchParams.get('weeks') || '8'), 26);

	await dbConnect();

	const since = new Date();
	since.setDate(since.getDate() - weeks * 7);

	const sessions = await WorkoutSession.find({
		createdBy: user.nickname,
		startTime: { $gte: since }
	}).lean();

	// Build weekly buckets
	type MuscleData = { primary: number; secondary: number };
	const weeklyData: { weekStart: string; muscles: Record<string, MuscleData> }[] = [];

	// Initialize week buckets
	for (let w = 0; w < weeks; w++) {
		const d = new Date();
		d.setDate(d.getDate() - (weeks - 1 - w) * 7);
		// Find Monday of that week
		const day = d.getDay();
		const diff = d.getDate() - day + (day === 0 ? -6 : 1);
		d.setDate(diff);
		const weekStart = d.toISOString().slice(0, 10);

		const muscles: Record<string, MuscleData> = {};
		for (const g of MUSCLE_GROUPS) {
			muscles[g] = { primary: 0, secondary: 0 };
		}
		weeklyData.push({ weekStart, muscles });
	}

	// Aggregate muscle usage
	for (const session of sessions) {
		const sessionDate = new Date(session.startTime);
		// Find which week bucket
		const weekIdx = weeklyData.findIndex((w, i) => {
			const start = new Date(w.weekStart);
			const nextStart = i + 1 < weeklyData.length
				? new Date(weeklyData[i + 1].weekStart)
				: new Date(start.getTime() + 7 * 86400000);
			return sessionDate >= start && sessionDate < nextStart;
		});
		if (weekIdx === -1) continue;

		const bucket = weeklyData[weekIdx].muscles;

		for (const ex of session.exercises) {
			const enriched = getEnrichedExerciseById(ex.exerciseId);
			if (!enriched) continue;

			const setCount = ex.sets?.filter((s: any) => s.completed !== false).length ?? 0;
			if (setCount === 0) continue;

			// Primary muscles
			const primaryGroups = new Set<string>();
			if (enriched.targetMusclesDetailed?.length) {
				for (const m of enriched.targetMusclesDetailed) {
					const group = edbMuscleToSimple(m);
					primaryGroups.add(group);
					if (bucket[group]) bucket[group].primary += setCount;
				}
			} else if (enriched.target) {
				primaryGroups.add(enriched.target);
				if (bucket[enriched.target]) bucket[enriched.target].primary += setCount;
			}

			// Secondary muscles
			if (enriched.secondaryMusclesDetailed?.length) {
				for (const m of enriched.secondaryMusclesDetailed) {
					const group = edbMuscleToSimple(m);
					if (!primaryGroups.has(group) && bucket[group]) {
						bucket[group].secondary += setCount;
					}
				}
			} else if (enriched.secondaryMuscles) {
				for (const m of enriched.secondaryMuscles) {
					if (!primaryGroups.has(m) && bucket[m]) {
						bucket[m].secondary += setCount;
					}
				}
			}
		}
	}

	// Compute totals
	const totals: Record<string, { primary: number; secondary: number; total: number; weeklyAvg: number }> = {};
	for (const g of MUSCLE_GROUPS) {
		let primary = 0, secondary = 0;
		for (const w of weeklyData) {
			primary += w.muscles[g].primary;
			secondary += w.muscles[g].secondary;
		}
		const total = primary + secondary * 0.5;
		totals[g] = { primary, secondary, total, weeklyAvg: total / weeks };
	}

	return json({ weeks: weeklyData, totals, muscleGroups: [...MUSCLE_GROUPS] });
};
