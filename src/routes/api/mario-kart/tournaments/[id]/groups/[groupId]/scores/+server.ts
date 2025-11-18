import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { dbConnect } from '$utils/db';
import { MarioKartTournament } from '$models/MarioKartTournament';

// POST /api/mario-kart/tournaments/[id]/groups/[groupId]/scores - Add/update scores for a round
export const POST: RequestHandler = async ({ params, request }) => {
  try {
    await dbConnect();

    const data = await request.json();
    const { matchId, roundNumber, scores } = data;

    if (!matchId || !roundNumber || !scores) {
      return json({ error: 'matchId, roundNumber, and scores are required' }, { status: 400 });
    }

    const tournament = await MarioKartTournament.findById(params.id);

    if (!tournament) {
      return json({ error: 'Tournament not found' }, { status: 404 });
    }

    const group = tournament.groups.find(g => g._id?.toString() === params.groupId);
    if (!group) {
      return json({ error: 'Group not found' }, { status: 404 });
    }

    const match = group.matches.find(m => m._id?.toString() === matchId);
    if (!match) {
      return json({ error: 'Match not found' }, { status: 404 });
    }

    // Add or update round
    const existingRoundIndex = match.rounds.findIndex(r => r.roundNumber === roundNumber);
    const scoresMap = new Map(Object.entries(scores));

    if (existingRoundIndex >= 0) {
      match.rounds[existingRoundIndex].scores = scoresMap;
      match.rounds[existingRoundIndex].completedAt = new Date();
    } else {
      match.rounds.push({
        roundNumber,
        scores: scoresMap,
        completedAt: new Date()
      });
    }

    // Check if all rounds are complete for this match
    match.completed = match.rounds.length >= tournament.roundsPerMatch;

    // Calculate group standings
    const standings = new Map<string, number>();

    for (const m of group.matches) {
      for (const round of m.rounds) {
        for (const [contestantId, score] of round.scores) {
          standings.set(contestantId, (standings.get(contestantId) || 0) + score);
        }
      }
    }

    // Convert to sorted array
    group.standings = Array.from(standings.entries())
      .map(([contestantId, totalScore]) => ({ contestantId, totalScore, position: 0 }))
      .sort((a, b) => b.totalScore - a.totalScore)
      .map((entry, index) => ({ ...entry, position: index + 1 }));

    await tournament.save();

    return json({ tournament });
  } catch (error) {
    console.error('Error updating scores:', error);
    return json({ error: 'Failed to update scores' }, { status: 500 });
  }
};
