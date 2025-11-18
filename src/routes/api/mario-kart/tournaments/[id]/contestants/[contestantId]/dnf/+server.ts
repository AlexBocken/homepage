import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { dbConnect } from '$utils/db';
import { MarioKartTournament } from '$models/MarioKartTournament';

// PATCH /api/mario-kart/tournaments/[id]/contestants/[contestantId]/dnf - Toggle DNF status
export const PATCH: RequestHandler = async ({ params, request }) => {
  try {
    await dbConnect();

    const data = await request.json();
    const { dnf } = data;

    if (typeof dnf !== 'boolean') {
      return json({ error: 'DNF status must be a boolean' }, { status: 400 });
    }

    const tournament = await MarioKartTournament.findById(params.id);

    if (!tournament) {
      return json({ error: 'Tournament not found' }, { status: 404 });
    }

    // Find the contestant in the contestants array
    const contestant = tournament.contestants.find(
      c => c._id?.toString() === params.contestantId
    );

    if (!contestant) {
      return json({ error: 'Contestant not found' }, { status: 404 });
    }

    // Update the DNF status
    contestant.dnf = dnf;

    await tournament.save();

    return json({ tournament });
  } catch (error) {
    console.error('Error updating contestant DNF status:', error);
    return json({ error: 'Failed to update contestant status' }, { status: 500 });
  }
};
