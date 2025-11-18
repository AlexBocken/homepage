import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { dbConnect } from '$utils/db';
import { MarioKartTournament } from '$models/MarioKartTournament';

// POST /api/mario-kart/tournaments/[id]/bracket/matches/[matchId]/scores - Update bracket match scores
export const POST: RequestHandler = async ({ params, request }) => {
  try {
    await dbConnect();

    const data = await request.json();
    const { roundNumber, scores } = data;

    if (!roundNumber || !scores) {
      return json({ error: 'roundNumber and scores are required' }, { status: 400 });
    }

    const tournament = await MarioKartTournament.findById(params.id);

    if (!tournament) {
      return json({ error: 'Tournament not found' }, { status: 404 });
    }

    if (!tournament.bracket) {
      return json({ error: 'Tournament has no bracket' }, { status: 404 });
    }

    // Find the match in either main or runners-up bracket
    let match: any = null;
    let matchRound: any = null;
    let matchRoundIndex = -1;
    let isRunnersUp = false;
    let bracket = tournament.bracket;

    console.log('Bracket structure:', JSON.stringify(bracket, null, 2));

    if (!bracket.rounds || !Array.isArray(bracket.rounds)) {
      return json({ error: 'Bracket has no rounds array' }, { status: 500 });
    }

    for (let i = 0; i < bracket.rounds.length; i++) {
      const round = bracket.rounds[i];
      if (!round.matches || !Array.isArray(round.matches)) {
        console.error(`Round ${i} has no matches array:`, round);
        continue;
      }
      const foundMatch = round.matches.find(m => m._id?.toString() === params.matchId);
      if (foundMatch) {
        match = foundMatch;
        matchRound = round;
        matchRoundIndex = i;
        break;
      }
    }

    // If not found in main bracket, check runners-up bracket
    if (!match && tournament.runnersUpBracket) {
      bracket = tournament.runnersUpBracket;
      isRunnersUp = true;
      for (let i = 0; i < bracket.rounds.length; i++) {
        const round = bracket.rounds[i];
        const foundMatch = round.matches.find(m => m._id?.toString() === params.matchId);
        if (foundMatch) {
          match = foundMatch;
          matchRound = round;
          matchRoundIndex = i;
          break;
        }
      }
    }

    if (!match) {
      return json({ error: 'Match not found' }, { status: 404 });
    }

    // Add or update round
    const existingRoundIndex = match.rounds.findIndex((r: any) => r.roundNumber === roundNumber);
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
    if (match.rounds.length >= tournament.roundsPerMatch) {
      match.completed = true;

      // Calculate winner (highest total score)
      const totalScores = new Map<string, number>();
      for (const round of match.rounds) {
        for (const [contestantId, score] of round.scores) {
          totalScores.set(contestantId, (totalScores.get(contestantId) || 0) + score);
        }
      }

      const sortedScores = Array.from(totalScores.entries())
        .sort((a, b) => b[1] - a[1]);

      if (sortedScores.length > 0) {
        match.winnerId = sortedScores[0][0];
        const matchSize = tournament.matchSize || 2;

        // Collect all non-winners for runners-up bracket (2nd place and below)
        const nonWinners = sortedScores.slice(1).map(([contestantId]) => contestantId);
        const secondPlace = sortedScores.length > 1 ? sortedScores[1][0] : null;

        // Advance winner to next round if not finals
        if (matchRoundIndex > 0) {
          console.log('Advancing winner to next round', { matchRoundIndex, bracketRoundsLength: bracket.rounds.length });
          const nextRound = bracket.rounds[matchRoundIndex - 1];
          console.log('Next round:', nextRound);
          const matchIndexInRound = matchRound.matches.findIndex((m: any) => m._id?.toString() === params.matchId);
          const nextMatchIndex = Math.floor(matchIndexInRound / matchSize);

          if (nextRound && nextMatchIndex < nextRound.matches.length) {
            const nextMatch = nextRound.matches[nextMatchIndex];

            // Add winner to the next match's contestant list
            if (!nextMatch.contestantIds.includes(match.winnerId)) {
              nextMatch.contestantIds.push(match.winnerId);
            }
          }
        }

        // Move second place to runners-up bracket (only from main bracket, not from runners-up)
        // Note: For matchSize > 2, we only send 2nd place to consolation bracket
        if (!isRunnersUp && secondPlace && tournament.runnersUpBracket) {
          const matchIndexInRound = matchRound.matches.findIndex((m: any) => m._id?.toString() === params.matchId);

          // For the first round of losers, they go to the last round of runners-up bracket
          if (matchRoundIndex === bracket.rounds.length - 1) {
            const runnersUpLastRound = tournament.runnersUpBracket.rounds[tournament.runnersUpBracket.rounds.length - 1];
            const targetMatchIndex = Math.floor(matchIndexInRound / matchSize);

            if (targetMatchIndex < runnersUpLastRound.matches.length) {
              const targetMatch = runnersUpLastRound.matches[targetMatchIndex];

              // Add second place to runners-up bracket
              if (!targetMatch.contestantIds.includes(secondPlace)) {
                targetMatch.contestantIds.push(secondPlace);
              }
            }
          }
        }
      }
    }

    // Check if tournament is completed (both finals and 3rd place match completed)
    const finals = tournament.bracket.rounds[0];
    const thirdPlaceMatch = tournament.runnersUpBracket?.rounds?.[0];

    const mainBracketComplete = finals?.matches?.length > 0 && finals.matches[0].completed;
    const runnersUpComplete = !thirdPlaceMatch || (thirdPlaceMatch?.matches?.length > 0 && thirdPlaceMatch.matches[0].completed);

    if (mainBracketComplete && runnersUpComplete) {
      tournament.status = 'completed';
    }

    await tournament.save();

    return json({ tournament });
  } catch (error) {
    console.error('Error updating bracket scores:', error);
    return json({ error: 'Failed to update bracket scores' }, { status: 500 });
  }
};
