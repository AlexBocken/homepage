import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { dbConnect } from '$utils/db';
import { MarioKartTournament } from '$models/MarioKartTournament';

// GET /api/mario-kart/tournaments/[id] - Get a specific tournament
export const GET: RequestHandler = async ({ params }) => {
  try {
    await dbConnect();

    const tournament = await MarioKartTournament.findById(params.id);

    if (!tournament) {
      return json({ error: 'Tournament not found' }, { status: 404 });
    }

    return json({ tournament });
  } catch (error) {
    console.error('Error fetching tournament:', error);
    return json({ error: 'Failed to fetch tournament' }, { status: 500 });
  }
};

// PUT /api/mario-kart/tournaments/[id] - Update tournament
export const PUT: RequestHandler = async ({ params, request }) => {
  try {
    await dbConnect();

    const data = await request.json();
    const { name, roundsPerMatch, status } = data;

    const tournament = await MarioKartTournament.findById(params.id);

    if (!tournament) {
      return json({ error: 'Tournament not found' }, { status: 404 });
    }

    if (name) tournament.name = name;
    if (roundsPerMatch) tournament.roundsPerMatch = roundsPerMatch;
    if (status) tournament.status = status;

    await tournament.save();

    return json({ tournament });
  } catch (error) {
    console.error('Error updating tournament:', error);
    return json({ error: 'Failed to update tournament' }, { status: 500 });
  }
};

// DELETE /api/mario-kart/tournaments/[id] - Delete tournament
export const DELETE: RequestHandler = async ({ params }) => {
  try {
    await dbConnect();

    const result = await MarioKartTournament.deleteOne({ _id: params.id });

    if (result.deletedCount === 0) {
      return json({ error: 'Tournament not found' }, { status: 404 });
    }

    return json({ success: true });
  } catch (error) {
    console.error('Error deleting tournament:', error);
    return json({ error: 'Failed to delete tournament' }, { status: 500 });
  }
};
