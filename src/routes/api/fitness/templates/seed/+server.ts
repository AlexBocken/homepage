import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/middleware/auth';
import { dbConnect } from '$utils/db';
import { WorkoutTemplate } from '$models/WorkoutTemplate';

const defaultTemplates = [
	{
		name: 'Day 1 - Pull',
		description: 'Back and biceps focused pull day',
		exercises: [
			{
				exerciseId: 'bent-over-row-barbell',
				sets: [
					{ reps: 10, weight: 60, rpe: 7 },
					{ reps: 10, weight: 60, rpe: 8 },
					{ reps: 10, weight: 60, rpe: 9 }
				],
				restTime: 120
			},
			{
				exerciseId: 'pull-up',
				sets: [
					{ reps: 6, rpe: 8 },
					{ reps: 6, rpe: 8 },
					{ reps: 6, rpe: 9 }
				],
				restTime: 120
			},
			{
				exerciseId: 'lateral-raise-dumbbell',
				sets: [
					{ reps: 15, weight: 10, rpe: 7 },
					{ reps: 15, weight: 10, rpe: 8 }
				],
				restTime: 90
			},
			{
				exerciseId: 'front-raise-dumbbell',
				sets: [
					{ reps: 10, weight: 10, rpe: 7 },
					{ reps: 10, weight: 10, rpe: 8 }
				],
				restTime: 90
			}
		]
	},
	{
		name: 'Day 2 - Push',
		description: 'Chest, shoulders, and triceps push day',
		exercises: [
			{
				exerciseId: 'bench-press-barbell',
				sets: [
					{ reps: 8, weight: 80, rpe: 7 },
					{ reps: 8, weight: 80, rpe: 8 },
					{ reps: 8, weight: 80, rpe: 9 }
				],
				restTime: 120
			},
			{
				exerciseId: 'incline-bench-press-barbell',
				sets: [
					{ reps: 10, weight: 60, rpe: 7 },
					{ reps: 10, weight: 60, rpe: 8 }
				],
				restTime: 120
			},
			{
				exerciseId: 'skullcrusher-dumbbell',
				sets: [
					{ reps: 15, weight: 15, rpe: 7 },
					{ reps: 15, weight: 15, rpe: 8 }
				],
				restTime: 90
			},
			{
				exerciseId: 'hammer-curl-dumbbell',
				sets: [
					{ reps: 15, weight: 12, rpe: 7 },
					{ reps: 15, weight: 12, rpe: 8 }
				],
				restTime: 90
			},
			{
				exerciseId: 'bicep-curl-dumbbell',
				sets: [
					{ reps: 15, weight: 10, rpe: 7 },
					{ reps: 15, weight: 10, rpe: 8 }
				],
				restTime: 90
			}
		]
	},
	{
		name: 'Day 3 - Legs',
		description: 'Lower body leg day',
		exercises: [
			{
				exerciseId: 'squat-barbell',
				sets: [
					{ reps: 8, weight: 80, rpe: 7 },
					{ reps: 8, weight: 80, rpe: 8 },
					{ reps: 8, weight: 80, rpe: 9 }
				],
				restTime: 150
			},
			{
				exerciseId: 'romanian-deadlift-barbell',
				sets: [
					{ reps: 10, weight: 70, rpe: 7 },
					{ reps: 10, weight: 70, rpe: 8 }
				],
				restTime: 120
			},
			{
				exerciseId: 'leg-press-machine',
				sets: [
					{ reps: 12, weight: 100, rpe: 7 },
					{ reps: 12, weight: 100, rpe: 8 }
				],
				restTime: 120
			},
			{
				exerciseId: 'leg-curl-machine',
				sets: [
					{ reps: 12, weight: 40, rpe: 7 },
					{ reps: 12, weight: 40, rpe: 8 }
				],
				restTime: 90
			},
			{
				exerciseId: 'calf-raise-machine',
				sets: [
					{ reps: 15, weight: 60, rpe: 7 },
					{ reps: 15, weight: 60, rpe: 8 }
				],
				restTime: 60
			}
		]
	}
];

export const POST: RequestHandler = async ({ locals }) => {
	const user = await requireAuth(locals);
	await dbConnect();

	// Check if user already has templates (don't re-seed)
	const existingCount = await WorkoutTemplate.countDocuments({ createdBy: user.nickname });
	if (existingCount > 0) {
		return json({ message: 'Templates already exist', seeded: false });
	}

	const templates = await WorkoutTemplate.insertMany(
		defaultTemplates.map((t) => ({
			...t,
			createdBy: user.nickname,
			isDefault: true
		}))
	);

	return json({ message: 'Default templates created', templates, seeded: true }, { status: 201 });
};
