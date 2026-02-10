import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { dbConnect } from '$utils/db';
import { WorkoutTemplate } from '$models/WorkoutTemplate';

// POST /api/fitness/seed-example - Create the example workout template
export const POST: RequestHandler = async ({ locals }) => {
  const session = await locals.auth();
  if (!session || !session.user?.nickname) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await dbConnect();

    // Check if example template already exists for this user
    const existingTemplate = await WorkoutTemplate.findOne({
      name: 'Push Day (Example)',
      createdBy: session.user.nickname
    });

    if (existingTemplate) {
      return json({ message: 'Example template already exists', template: existingTemplate });
    }

    // Create the example template with barbell squats and barbell bench press
    const exampleTemplate = new WorkoutTemplate({
      name: 'Push Day (Example)',
      description: 'A sample push workout with squats and bench press - 3 sets of 10 reps each at 90kg',
      exercises: [
        {
          name: 'Barbell Squats',
          sets: [
            { reps: 10, weight: 90, rpe: 7 },
            { reps: 10, weight: 90, rpe: 8 },
            { reps: 10, weight: 90, rpe: 9 }
          ],
          restTime: 120 // 2 minutes
        },
        {
          name: 'Barbell Bench Press',
          sets: [
            { reps: 10, weight: 90, rpe: 7 },
            { reps: 10, weight: 90, rpe: 8 },
            { reps: 10, weight: 90, rpe: 9 }
          ],
          restTime: 120 // 2 minutes
        }
      ],
      isPublic: false,
      createdBy: session.user.nickname
    });

    await exampleTemplate.save();
    
    return json({ 
      message: 'Example template created successfully!', 
      template: exampleTemplate 
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating example template:', error);
    return json({ error: 'Failed to create example template' }, { status: 500 });
  }
};