import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/middleware/auth';
import { dbConnect } from '$utils/db';
import { WorkoutTemplate } from '$models/WorkoutTemplate';

const defaultTemplates = [
	{
		name: 'Day 1 - Pull',
		description: 'Back, biceps, and shoulders pull day',
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
				exerciseId: 'incline-row-dumbbell',
				sets: [
					{ reps: 12, weight: 16, rpe: 7 },
					{ reps: 12, weight: 16, rpe: 8 }
				],
				restTime: 90
			},
			{
				exerciseId: 'upright-row-barbell',
				sets: [
					{ reps: 12, weight: 30, rpe: 7 },
					{ reps: 12, weight: 30, rpe: 8 }
				],
				restTime: 90
			},
			{
				exerciseId: 'decline-crunch',
				sets: [
					{ reps: 15, rpe: 7 },
					{ reps: 15, rpe: 8 }
				],
				restTime: 60
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
		description: 'Chest, triceps, and biceps push day',
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
				exerciseId: 'bench-press-close-grip-barbell',
				sets: [
					{ reps: 10, weight: 60, rpe: 7 },
					{ reps: 10, weight: 60, rpe: 8 }
				],
				restTime: 120
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
		description: 'Quad, hamstring, and calf focused leg day',
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
					{ reps: 10, weight: 70, rpe: 8 },
					{ reps: 10, weight: 70, rpe: 9 }
				],
				restTime: 120
			},
			{
				exerciseId: 'bulgarian-split-squat-dumbbell',
				sets: [
					{ reps: 10, weight: 16, rpe: 7 },
					{ reps: 10, weight: 16, rpe: 8 }
				],
				restTime: 120
			},
			{
				exerciseId: 'calf-raise-standing',
				sets: [
					{ reps: 15, rpe: 7 },
					{ reps: 15, rpe: 8 },
					{ reps: 15, rpe: 9 }
				],
				restTime: 60
			}
		]
	},
	{
		name: 'Day 4 - Upper',
		description: 'Full upper body day — shoulders, chest, back, and core',
		exercises: [
			{
				exerciseId: 'overhead-press-barbell',
				sets: [
					{ reps: 8, weight: 40, rpe: 7 },
					{ reps: 8, weight: 40, rpe: 8 }
				],
				restTime: 120
			},
			{
				exerciseId: 'bench-press-dumbbell',
				sets: [
					{ reps: 10, weight: 28, rpe: 7 },
					{ reps: 10, weight: 28, rpe: 8 }
				],
				restTime: 120
			},
			{
				exerciseId: 'chin-up',
				sets: [
					{ reps: 6, rpe: 8 },
					{ reps: 6, rpe: 9 }
				],
				restTime: 120
			},
			{
				exerciseId: 'bench-press-close-grip-barbell',
				sets: [
					{ reps: 10, weight: 60, rpe: 7 },
					{ reps: 10, weight: 60, rpe: 8 }
				],
				restTime: 120
			},
			{
				exerciseId: 'decline-crunch',
				sets: [
					{ reps: 15, rpe: 7 },
					{ reps: 15, rpe: 8 }
				],
				restTime: 60
			},
			{
				exerciseId: 'flat-leg-raise',
				sets: [
					{ reps: 15, rpe: 7 },
					{ reps: 15, rpe: 8 }
				],
				restTime: 60
			}
		]
	},
	{
		name: 'Day 5 - Lower',
		description: 'Glute, quad, and hamstring focused lower day',
		exercises: [
			{
				exerciseId: 'front-squat-barbell',
				sets: [
					{ reps: 8, weight: 60, rpe: 7 },
					{ reps: 8, weight: 60, rpe: 8 },
					{ reps: 8, weight: 60, rpe: 9 }
				],
				restTime: 150
			},
			{
				exerciseId: 'romanian-deadlift-dumbbell',
				sets: [
					{ reps: 10, weight: 24, rpe: 7 },
					{ reps: 10, weight: 24, rpe: 8 }
				],
				restTime: 120
			},
			{
				exerciseId: 'hip-thrust-barbell',
				sets: [
					{ reps: 10, weight: 60, rpe: 7 },
					{ reps: 10, weight: 60, rpe: 8 }
				],
				restTime: 120
			},
			{
				exerciseId: 'goblet-squat-dumbbell',
				sets: [
					{ reps: 12, weight: 20, rpe: 7 },
					{ reps: 12, weight: 20, rpe: 8 }
				],
				restTime: 90
			},
			{
				exerciseId: 'calf-raise-standing',
				sets: [
					{ reps: 15, rpe: 7 },
					{ reps: 15, rpe: 8 }
				],
				restTime: 60
			}
		]
	},
	{
		name: 'Day 6 - Stretching',
		description: 'Full-body stretching — all muscle groups, no equipment (~30 min)',
		exercises: [
			{
				// Neck: sternocleidomastoid, levator scapulae, trapezius
				exerciseId: 'neck-circle-stretch',
				sets: [
					{ duration: 1.5 },
					{ duration: 1.5 }
				],
				restTime: 15
			},
			{
				// Neck/traps: lateral neck flexion
				exerciseId: 'side-push-neck-stretch',
				sets: [
					{ duration: 1 },
					{ duration: 1 }
				],
				restTime: 15
			},
			{
				// Chest & front delts
				exerciseId: 'seated-shoulder-flexor-stretch-bent-knee',
				sets: [
					{ duration: 1 },
					{ duration: 1 }
				],
				restTime: 15
			},
			{
				// Rear delts, triceps, traps
				exerciseId: 'shoulder-stretch-behind-back',
				sets: [
					{ duration: 1 },
					{ duration: 1 }
				],
				restTime: 15
			},
			{
				// Triceps
				exerciseId: 'elbows-back-stretch',
				sets: [
					{ duration: 1 },
					{ duration: 1 }
				],
				restTime: 15
			},
			{
				// Lats & back
				exerciseId: 'back-pec-stretch',
				sets: [
					{ duration: 1 },
					{ duration: 1 }
				],
				restTime: 15
			},
			{
				// Spine, erector spinae, levator scapulae
				exerciseId: 'cow-stretch',
				sets: [
					{ duration: 1.5 },
					{ duration: 1.5 }
				],
				restTime: 15
			},
			{
				// Thoracic spine, shoulders, glutes, calves (multi-target bridge)
				exerciseId: 'thoracic-bridge',
				sets: [
					{ duration: 1 },
					{ duration: 1 }
				],
				restTime: 15
			},
			{
				// Hip adductors & hip flexors
				exerciseId: 'butterfly-yoga-pose',
				sets: [
					{ duration: 1.5 },
					{ duration: 1.5 }
				],
				restTime: 15
			},
			{
				// Hamstrings
				exerciseId: 'seated-single-leg-hamstring-stretch',
				sets: [
					{ duration: 1 },
					{ duration: 1 }
				],
				restTime: 15
			},
			{
				// Hamstrings (toe-up variation)
				exerciseId: 'kneeling-toe-up-hamstring-stretch',
				sets: [
					{ duration: 1 },
					{ duration: 1 }
				],
				restTime: 15
			},
			{
				// Quads, glutes, hip flexors, calves
				exerciseId: 'side-lunge-stretch',
				sets: [
					{ duration: 1 },
					{ duration: 1 }
				],
				restTime: 15
			},
			{
				// Lower back & glutes
				exerciseId: 'lying-lower-back-stretch',
				sets: [
					{ duration: 1.5 },
					{ duration: 1.5 }
				],
				restTime: 15
			},
			{
				// Calves (soleus & gastrocnemius)
				exerciseId: 'calf-stretch-wall',
				sets: [
					{ duration: 1 },
					{ duration: 1 }
				],
				restTime: 15
			},
			{
				// Biceps & forearm flexors
				exerciseId: 'elbow-flexor-stretch',
				sets: [
					{ duration: 1 },
					{ duration: 1 }
				],
				restTime: 15
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
