import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/middleware/auth';
import { dbConnect } from '$utils/db';
import { FitnessGoal } from '$models/FitnessGoal';
import { WorkoutSession } from '$models/WorkoutSession';
import { isoWeekKey } from '$lib/fitness/dates';
import { applyCalorieGoalChange } from '$lib/server/dailyTargets';

export const GET: RequestHandler = async ({ locals }) => {
	const user = await requireAuth(locals);
	await dbConnect();

	const goal = await FitnessGoal.findOne({ username: user.nickname }).lean() as any;
	const weeklyWorkouts = goal?.weeklyWorkouts ?? null;
	const shareSegments = goal?.shareSegments ?? true;

	const bodyTargets = {
		targetWeightKg: goal?.targetWeightKg ?? null,
		targetBodyFatPercent: goal?.targetBodyFatPercent ?? null,
		targetFatMassKg: goal?.targetFatMassKg ?? null,
		// Date-only: the forecast compares whole days, and a stored midnight in one
		// timezone must not read as the previous day in another.
		targetDate: goal?.targetDate ? new Date(goal.targetDate).toISOString().slice(0, 10) : null,
	};

	const nutritionGoals = {
		activityLevel: goal?.activityLevel ?? 'light',
		dailyCalories: goal?.dailyCalories ?? null,
		proteinMode: goal?.proteinMode ?? null,
		proteinTarget: goal?.proteinTarget ?? null,
		fatPercent: goal?.fatPercent ?? null,
		carbPercent: goal?.carbPercent ?? null,
	};

	// If no goal set, return early
	if (weeklyWorkouts === null) {
		return json({ weeklyWorkouts: null, streak: 0, shareSegments, sex: goal?.sex ?? 'male', heightCm: goal?.heightCm ?? null, birthYear: goal?.birthYear ?? null, ...nutritionGoals, ...bodyTargets });
	}

	const streak = await computeStreak(user.nickname, weeklyWorkouts);
	return json({ weeklyWorkouts, streak, shareSegments, sex: goal?.sex ?? 'male', heightCm: goal?.heightCm ?? null, birthYear: goal?.birthYear ?? null, ...nutritionGoals, ...bodyTargets });
};

export const PUT: RequestHandler = async ({ request, locals }) => {
	const user = await requireAuth(locals);
	const body = await request.json();
	const { weeklyWorkouts, sex, heightCm } = body;

	// weeklyWorkouts is optional (so settings like the segment-leaderboard opt-in
	// can be toggled on their own), but validated when present.
	const hasWeekly = weeklyWorkouts !== undefined;
	if (hasWeekly && (typeof weeklyWorkouts !== 'number' || weeklyWorkouts < 1 || weeklyWorkouts > 14 || !Number.isInteger(weeklyWorkouts))) {
		return json({ error: 'weeklyWorkouts must be an integer between 1 and 14' }, { status: 400 });
	}

	const update: Record<string, unknown> = {};
	if (hasWeekly) update.weeklyWorkouts = weeklyWorkouts;
	if (typeof body.shareSegments === 'boolean') update.shareSegments = body.shareSegments;
	if (sex === 'male' || sex === 'female') update.sex = sex;
	if (typeof heightCm === 'number' && heightCm >= 100 && heightCm <= 250) update.heightCm = heightCm;
	if (typeof body.birthYear === 'number' && body.birthYear >= 1900 && body.birthYear <= 2020) update.birthYear = body.birthYear;
	const validActivity = ['sedentary', 'light', 'moderate', 'very_active'];
	if (validActivity.includes(body.activityLevel)) update.activityLevel = body.activityLevel;
	if (typeof body.dailyCalories === 'number' && body.dailyCalories >= 500 && body.dailyCalories <= 10000) update.dailyCalories = body.dailyCalories;
	if (body.proteinMode === 'fixed' || body.proteinMode === 'per_kg') update.proteinMode = body.proteinMode;
	if (typeof body.proteinTarget === 'number' && body.proteinTarget >= 0) update.proteinTarget = body.proteinTarget;
	if (typeof body.fatPercent === 'number' && body.fatPercent >= 0 && body.fatPercent <= 100) update.fatPercent = body.fatPercent;
	if (typeof body.carbPercent === 'number' && body.carbPercent >= 0 && body.carbPercent <= 100) update.carbPercent = body.carbPercent;

	// Body-composition targets. Explicit null clears one — dropping a goal has to
	// be as easy as setting it, and an absent key must keep meaning "unchanged"
	// so a partial PUT from any other settings form can't wipe them.
	const unset: Record<string, unknown> = {};
	const numericTarget = (key: string, min: number, max: number) => {
		const v = body[key];
		if (v === undefined) return;
		if (v === null || v === '') { unset[key] = ''; return; }
		if (typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max) update[key] = v;
	};
	numericTarget('targetWeightKg', 30, 300);
	numericTarget('targetBodyFatPercent', 3, 60);
	numericTarget('targetFatMassKg', 1, 150);
	if (body.targetDate !== undefined) {
		if (body.targetDate === null || body.targetDate === '') {
			unset.targetDate = '';
		} else if (typeof body.targetDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.targetDate)) {
			// Noon UTC: far enough from either midnight that no timezone reads the
			// stored instant as the day before or after.
			const ms = Date.parse(`${body.targetDate}T12:00:00Z`);
			if (Number.isFinite(ms)) update.targetDate = new Date(ms);
		}
	}

	await dbConnect();

	// Read the outgoing calorie goal before overwriting it: every logged day that
	// hasn't been stamped yet was eaten under *that* number, not the new one.
	const previous = update.dailyCalories !== undefined
		? ((await FitnessGoal.findOne({ username: user.nickname }, { dailyCalories: 1 }).lean() as any)?.dailyCalories ?? null)
		: null;

	// Mongo rejects an empty $set/$unset, so each half only appears when it carries
	// something; a PUT that validated to nothing stays the no-op it was before.
	const mongoUpdate: Record<string, unknown> = {};
	if (Object.keys(update).length) mongoUpdate.$set = update;
	if (Object.keys(unset).length) mongoUpdate.$unset = unset;

	const goal = await FitnessGoal.findOneAndUpdate(
		{ username: user.nickname },
		mongoUpdate,
		{ upsert: true, returnDocument: 'after' }
	).lean() as any;

	// Pin history to the old goal, then move today (and any already-logged future
	// day) to the new one — see $lib/server/dailyTargets.
	if (typeof update.dailyCalories === 'number') {
		await applyCalorieGoalChange(user.nickname, previous, update.dailyCalories);
	}

	const effectiveWeekly = goal?.weeklyWorkouts ?? weeklyWorkouts ?? 4;
	const streak = await computeStreak(user.nickname, effectiveWeekly);
	return json({
		weeklyWorkouts: effectiveWeekly, streak,
		shareSegments: goal?.shareSegments ?? true,
		sex: goal?.sex ?? 'male', heightCm: goal?.heightCm ?? null, birthYear: goal?.birthYear ?? null,
		activityLevel: goal?.activityLevel ?? 'light',
		dailyCalories: goal?.dailyCalories ?? null,
		proteinMode: goal?.proteinMode ?? null,
		proteinTarget: goal?.proteinTarget ?? null,
		fatPercent: goal?.fatPercent ?? null,
		carbPercent: goal?.carbPercent ?? null,
		targetWeightKg: goal?.targetWeightKg ?? null,
		targetBodyFatPercent: goal?.targetBodyFatPercent ?? null,
		targetFatMassKg: goal?.targetFatMassKg ?? null,
		targetDate: goal?.targetDate ? new Date(goal.targetDate).toISOString().slice(0, 10) : null,
	});
};

async function computeStreak(username: string, weeklyGoal: number): Promise<number> {
	// Get weekly workout counts — only scan back enough to find the streak break.
	// Start with 13 weeks; if the streak fills the entire window, widen the search.
	const now = new Date();

	for (let months = 3; months <= 24; months += 6) {
		const cutoff = new Date(now);
		cutoff.setMonth(cutoff.getMonth() - months);

		const weeklyAgg = await WorkoutSession.aggregate([
			{ $match: { createdBy: username, startTime: { $gte: cutoff } } },
			{ $group: { _id: { year: { $isoWeekYear: '$startTime' }, week: { $isoWeek: '$startTime' } }, count: { $sum: 1 } } },
			{ $sort: { '_id.year': -1, '_id.week': -1 } }
		]);

		const metGoal = new Set<string>();
		for (const item of weeklyAgg) {
			if (item.count >= weeklyGoal) metGoal.add(`${item._id.year}-${item._id.week}`);
		}

		let streak = 0;
		const currentKey = isoWeekKey(now);
		if (metGoal.has(currentKey)) streak = 1;

		const maxWeeks = Math.ceil(months * 4.35);
		let foundBreak = false;
		for (let i = 1; i <= maxWeeks; i++) {
			const weekDate = new Date(now);
			weekDate.setDate(weekDate.getDate() - i * 7);
			if (metGoal.has(isoWeekKey(weekDate))) {
				streak++;
			} else {
				foundBreak = true;
				break;
			}
		}

		// If we found where the streak broke, we're done
		if (foundBreak || streak < maxWeeks) return streak;
		// Otherwise widen the window and try again
	}

	return 104; // Max 2-year streak
}

