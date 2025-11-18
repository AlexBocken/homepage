import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { dbConnect } from '$utils/db';
import { MarioKartTournament } from '$models/MarioKartTournament';
import mongoose from 'mongoose';

// POST /api/mario-kart/tournaments/[id]/contestants - Add a contestant
export const POST: RequestHandler = async ({ params, request }) => {
  try {
    await dbConnect();

    const data = await request.json();
    const { name } = data;

    if (!name) {
      return json({ error: 'Contestant name is required' }, { status: 400 });
    }

    const tournament = await MarioKartTournament.findById(params.id);

    if (!tournament) {
      return json({ error: 'Tournament not found' }, { status: 404 });
    }

    // Check for duplicate names
    if (tournament.contestants.some(c => c.name === name)) {
      return json({ error: 'Contestant with this name already exists' }, { status: 400 });
    }

    const newContestantId = new mongoose.Types.ObjectId().toString();

    tournament.contestants.push({
      _id: newContestantId,
      name
    });

    // If tournament is in group stage, add contestant to all group matches with 0 scores
    if (tournament.status === 'group_stage' && tournament.groups.length > 0) {
      for (const group of tournament.groups) {
        // Add contestant to group's contestant list
        group.contestantIds.push(newContestantId);

        // Add contestant to all matches in this group with 0 scores for completed rounds
        for (const match of group.matches) {
          match.contestantIds.push(newContestantId);

          // Add 0 score for all completed rounds
          for (const round of match.rounds) {
            if (!round.scores) {
              round.scores = new Map();
            }
            round.scores.set(newContestantId, 0);
          }
        }

        // Update group standings to include new contestant with 0 score
        if (group.standings) {
          group.standings.push({
            contestantId: newContestantId,
            totalScore: 0,
            position: group.standings.length + 1
          });
        }
      }
    }

    await tournament.save();

    return json({ tournament }, { status: 201 });
  } catch (error) {
    console.error('Error adding contestant:', error);
    return json({ error: 'Failed to add contestant' }, { status: 500 });
  }
};

// DELETE /api/mario-kart/tournaments/[id]/contestants - Remove a contestant
export const DELETE: RequestHandler = async ({ params, url }) => {
  try {
    await dbConnect();

    const contestantId = url.searchParams.get('contestantId');
    if (!contestantId) {
      return json({ error: 'Contestant ID is required' }, { status: 400 });
    }

    const tournament = await MarioKartTournament.findById(params.id);

    if (!tournament) {
      return json({ error: 'Tournament not found' }, { status: 404 });
    }

    if (tournament.status !== 'setup') {
      return json({ error: 'Cannot remove contestants after setup phase' }, { status: 400 });
    }

    tournament.contestants = tournament.contestants.filter(
      c => c._id?.toString() !== contestantId
    );

    await tournament.save();

    return json({ tournament });
  } catch (error) {
    console.error('Error removing contestant:', error);
    return json({ error: 'Failed to remove contestant' }, { status: 500 });
  }
};
