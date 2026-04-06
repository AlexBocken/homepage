import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/middleware/auth';
import { dbConnect } from '$utils/db';
import { FitnessGoal } from '$models/FitnessGoal';
import { WorkoutSession } from '$models/WorkoutSession';

export const GET: RequestHandler = async ({ locals }) => {
	const user = await requireAuth(locals);
	await dbConnect();

	const goal = await FitnessGoal.findOne({ username: user.nickname }).lean() as any;
	const weeklyWorkouts = goal?.weeklyWorkouts ?? null;

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
		return json({ weeklyWorkouts: null, streak: 0, sex: goal?.sex ?? 'male', heightCm: goal?.heightCm ?? null, birthYear: goal?.birthYear ?? null, ...nutritionGoals });
	}

	const streak = await computeStreak(user.nickname, weeklyWorkouts);
	return json({ weeklyWorkouts, streak, sex: goal?.sex ?? 'male', heightCm: goal?.heightCm ?? null, birthYear: goal?.birthYear ?? null, ...nutritionGoals });
};

export const PUT: RequestHandler = async ({ request, locals }) => {
	const user = await requireAuth(locals);
	const body = await request.json();
	const { weeklyWorkouts, sex, heightCm } = body;

	if (typeof weeklyWorkouts !== 'number' || weeklyWorkouts < 1 || weeklyWorkouts > 14 || !Number.isInteger(weeklyWorkouts)) {
		return json({ error: 'weeklyWorkouts must be an integer between 1 and 14' }, { status: 400 });
	}

	const update: Record<string, unknown> = { weeklyWorkouts };
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

	await dbConnect();

	const goal = await FitnessGoal.findOneAndUpdate(
		{ username: user.nickname },
		update,
		{ upsert: true, returnDocument: 'after' }
	).lean() as any;

	const streak = await computeStreak(user.nickname, weeklyWorkouts);
	return json({
		weeklyWorkouts, streak,
		sex: goal?.sex ?? 'male', heightCm: goal?.heightCm ?? null, birthYear: goal?.birthYear ?? null,
		activityLevel: goal?.activityLevel ?? 'light',
		dailyCalories: goal?.dailyCalories ?? null,
		proteinMode: goal?.proteinMode ?? null,
		proteinTarget: goal?.proteinTarget ?? null,
		fatPercent: goal?.fatPercent ?? null,
		carbPercent: goal?.carbPercent ?? null,
	});
};

async function computeStreak(username: string, weeklyGoal: number): Promise<number> {
	// Get weekly workout counts going back up to 2 years
	const cutoff = new Date();
	cutoff.setFullYear(cutoff.getFullYear() - 2);

	const weeklyAgg = await WorkoutSession.aggregate([
		{
			$match: {
				createdBy: username,
				startTime: { $gte: cutoff }
			}
		},
		{
			$group: {
				_id: {
					year: { $isoWeekYear: '$startTime' },
					week: { $isoWeek: '$startTime' }
				},
				count: { $sum: 1 }
			}
		},
		{
			$sort: { '_id.year': -1, '_id.week': -1 }
		}
	]);

	// Build a set of weeks that met the goal
	const metGoal = new Set<string>();
	for (const item of weeklyAgg) {
		if (item.count >= weeklyGoal) {
			metGoal.add(`${item._id.year}-${item._id.week}`);
		}
	}

	// Walk backwards week-by-week counting consecutive weeks that met the goal.
	// Current (incomplete) week counts if it already meets the goal, otherwise skip it.
	const now = new Date();
	let streak = 0;

	const currentKey = isoWeekKey(now);
	const currentWeekMet = metGoal.has(currentKey);

	// If current week already met: count it, then check previous weeks.
	// If not: start checking from last week (current week still in progress).
	if (currentWeekMet) streak = 1;

	for (let i = 1; i <= 104; i++) {
		const weekDate = new Date(now);
		weekDate.setDate(weekDate.getDate() - i * 7);
		if (metGoal.has(isoWeekKey(weekDate))) {
			streak++;
		} else {
			break;
		}
	}

	return streak;
}

function isoWeekKey(date: Date): string {
	const d = new Date(date.getTime());
	d.setHours(0, 0, 0, 0);
	d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
	const year = d.getFullYear();
	const week1 = new Date(year, 0, 4);
	const week = 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
	return `${year}-${week}`;
}
