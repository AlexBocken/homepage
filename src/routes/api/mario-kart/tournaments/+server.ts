import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { dbConnect } from '$utils/db';
import { MarioKartTournament } from '$models/MarioKartTournament';

// GET /api/mario-kart/tournaments - Get all tournaments
export const GET: RequestHandler = async () => {
  try {
    await dbConnect();

    const tournaments = await MarioKartTournament.find()
      .sort({ createdAt: -1 });

    return json({ tournaments });
  } catch (error) {
    console.error('Error fetching tournaments:', error);
    return json({ error: 'Failed to fetch tournaments' }, { status: 500 });
  }
};

// POST /api/mario-kart/tournaments - Create a new tournament
export const POST: RequestHandler = async ({ request }) => {
  try {
    await dbConnect();

    const data = await request.json();
    const { name, roundsPerMatch = 3, matchSize = 2 } = data;

    if (!name) {
      return json({ error: 'Tournament name is required' }, { status: 400 });
    }

    const tournament = new MarioKartTournament({
      name,
      roundsPerMatch,
      matchSize,
      status: 'setup',
      createdBy: 'anonymous'
    });

    await tournament.save();

    return json({ tournament }, { status: 201 });
  } catch (error) {
    console.error('Error creating tournament:', error);
    return json({ error: 'Failed to create tournament' }, { status: 500 });
  }
};
