import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/middleware/auth';
import { dbConnect } from '$utils/db';
import { WorkoutSession } from '$models/WorkoutSession';
import { BodyMeasurement } from '$models/BodyMeasurement';

export const GET: RequestHandler = async ({ locals }) => {
	console.time('[stats/profile] total');

	console.time('[stats/profile] auth');
	const user = await requireAuth(locals);
	console.timeEnd('[stats/profile] auth');

	console.time('[stats/profile] dbConnect');
	await dbConnect();
	console.timeEnd('[stats/profile] dbConnect');

	const tenWeeksAgo = new Date();
	tenWeeksAgo.setDate(tenWeeksAgo.getDate() - 70);

	console.time('[stats/profile] countDocuments');
	const totalWorkouts = await WorkoutSession.countDocuments({ createdBy: user.nickname });
	console.timeEnd('[stats/profile] countDocuments');

	console.time('[stats/profile] aggregate');
	const weeklyAgg = await WorkoutSession.aggregate([
		{
			$match: {
				createdBy: user.nickname,
				startTime: { $gte: tenWeeksAgo }
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
			$sort: { '_id.year': 1, '_id.week': 1 }
		}
	]);
	console.timeEnd('[stats/profile] aggregate');

	console.time('[stats/profile] measurements');
	const weightMeasurements = await BodyMeasurement.find(
		{ createdBy: user.nickname, weight: { $ne: null } },
		{ date: 1, weight: 1, _id: 0 }
	)
		.sort({ date: 1 })
		.limit(30)
		.lean();
	console.timeEnd('[stats/profile] measurements');

	// Build chart-ready workouts-per-week with filled gaps
	const weekMap = new Map<string, number>();
	for (const item of weeklyAgg) {
		weekMap.set(`${item._id.year}-${item._id.week}`, item.count);
	}

	const allLabels: string[] = [];
	const allData: number[] = [];
	const now = new Date();
	for (let i = 9; i >= 0; i--) {
		const d = new Date(now);
		d.setDate(d.getDate() - i * 7);
		const year = getISOWeekYear(d);
		const week = getISOWeek(d);
		const key = `${year}-${week}`;
		allLabels.push(`W${week}`);
		allData.push(weekMap.get(key) ?? 0);
	}

	// Trim leading empty weeks, but always keep from first week with data
	let firstNonZero = allData.findIndex((v) => v > 0);
	if (firstNonZero === -1) firstNonZero = allData.length - 1; // show at least current week
	const workoutsChart = {
		labels: allLabels.slice(firstNonZero),
		data: allData.slice(firstNonZero)
	};

	// Build chart-ready weight data with SMA ± 1 std dev confidence band
	const weightChart: {
		labels: string[];
		data: number[];
		sma: (number | null)[];
		upper: (number | null)[];
		lower: (number | null)[];
	} = { labels: [], data: [], sma: [], upper: [], lower: [] };
	const weights: number[] = [];
	for (const m of weightMeasurements) {
		const d = new Date(m.date);
		weightChart.labels.push(
			d.toLocaleDateString('en', { month: 'short', day: 'numeric' })
		);
		weightChart.data.push(m.weight!);
		weights.push(m.weight!);
	}

	// Adaptive window: 7 if enough data, otherwise half the data (min 2)
	const w = Math.min(7, Math.max(2, Math.floor(weights.length / 2)));
	for (let i = 0; i < weights.length; i++) {
		if (i < w - 1) {
			weightChart.sma.push(null);
			weightChart.upper.push(null);
			weightChart.lower.push(null);
		} else {
			let sum = 0;
			for (let j = i - w + 1; j <= i; j++) sum += weights[j];
			const mean = sum / w;

			let variance = 0;
			for (let j = i - w + 1; j <= i; j++) variance += (weights[j] - mean) ** 2;
			const std = Math.sqrt(variance / w);

			const round = (v: number) => Math.round(v * 100) / 100;
			weightChart.sma.push(round(mean));
			weightChart.upper.push(round(mean + std));
			weightChart.lower.push(round(mean - std));
		}
	}

	console.timeEnd('[stats/profile] total');
	return json({
		totalWorkouts,
		workoutsChart,
		weightChart
	});
};

function getISOWeek(date: Date): number {
	const d = new Date(date.getTime());
	d.setHours(0, 0, 0, 0);
	d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
	const week1 = new Date(d.getFullYear(), 0, 4);
	return 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
}

function getISOWeekYear(date: Date): number {
	const d = new Date(date.getTime());
	d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
	return d.getFullYear();
}
