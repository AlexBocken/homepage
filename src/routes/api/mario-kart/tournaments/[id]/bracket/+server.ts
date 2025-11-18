import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { dbConnect } from '$utils/db';
import { MarioKartTournament } from '$models/MarioKartTournament';
import mongoose from 'mongoose';

// POST /api/mario-kart/tournaments/[id]/bracket - Generate tournament bracket
export const POST: RequestHandler = async ({ params, request }) => {
  try {
    await dbConnect();

    const data = await request.json();
    const { topNFromEachGroup = 2 } = data;

    const tournament = await MarioKartTournament.findById(params.id);

    if (!tournament) {
      return json({ error: 'Tournament not found' }, { status: 404 });
    }

    if (tournament.status !== 'group_stage') {
      return json({ error: 'Can only generate bracket from group stage' }, { status: 400 });
    }

    // Collect top contestants from each group for main bracket
    const qualifiedContestants: string[] = [];
    const nonQualifiedContestants: string[] = [];

    for (const group of tournament.groups) {
      if (!group.standings || group.standings.length === 0) {
        return json({ error: `Group ${group.name} has no standings yet` }, { status: 400 });
      }

      const sortedStandings = group.standings.sort((a, b) => a.position - b.position);

      // Top N qualify for main bracket
      const topContestants = sortedStandings
        .slice(0, topNFromEachGroup)
        .map(s => s.contestantId);
      qualifiedContestants.push(...topContestants);

      // Remaining contestants go to consolation bracket
      const remainingContestants = sortedStandings
        .slice(topNFromEachGroup)
        .map(s => s.contestantId);
      nonQualifiedContestants.push(...remainingContestants);
    }

    const matchSize = tournament.matchSize || 2;

    if (qualifiedContestants.length < matchSize) {
      return json({ error: `Need at least ${matchSize} qualified contestants for bracket` }, { status: 400 });
    }

    // Calculate bracket size based on matchSize
    // We need enough slots so that contestants can be evenly divided by matchSize at each round
    const bracketSize = Math.pow(matchSize, Math.ceil(Math.log(qualifiedContestants.length) / Math.log(matchSize)));

    // Generate bracket rounds
    const rounds = [];
    let currentContestants = bracketSize;
    let roundNumber = 1;

    // Calculate total number of rounds
    while (currentContestants > 1) {
      currentContestants = currentContestants / matchSize;
      roundNumber++;
    }

    // Build rounds from smallest (finals) to largest (first round)
    currentContestants = bracketSize;
    roundNumber = Math.ceil(Math.log(bracketSize) / Math.log(matchSize));
    const totalRounds = roundNumber;

    // Build from finals (roundNumber 1) to first round (highest roundNumber)
    for (let rn = 1; rn <= totalRounds; rn++) {
      const roundName = rn === 1 ? 'Finals' :
        rn === 2 ? 'Semi-Finals' :
          rn === 3 ? 'Quarter-Finals' :
            rn === 4 ? 'Round of 16' :
              rn === 5 ? 'Round of 32' :
                `Round ${rn}`;

      const matchesInRound = Math.pow(matchSize, rn - 1);

      rounds.push({
        roundNumber: rn,
        name: roundName,
        matches: []
      });
    }

    // Populate last round (highest roundNumber, most matches) with contestants
    const firstRound = rounds[rounds.length - 1];
    const matchesInFirstRound = bracketSize / matchSize;

    for (let i = 0; i < matchesInFirstRound; i++) {
      const contestantIds: string[] = [];

      for (let j = 0; j < matchSize; j++) {
        const contestantIndex = i * matchSize + j;
        if (contestantIndex < qualifiedContestants.length) {
          contestantIds.push(qualifiedContestants[contestantIndex]);
        }
      }

      firstRound.matches.push({
        _id: new mongoose.Types.ObjectId().toString(),
        contestantIds,
        rounds: [],
        completed: false
      });
    }

    // Create empty matches for other rounds (finals to second-to-last round)
    for (let i = 0; i < rounds.length - 1; i++) {
      const matchesInRound = Math.pow(matchSize, rounds[i].roundNumber - 1);
      for (let j = 0; j < matchesInRound; j++) {
        rounds[i].matches.push({
          _id: new mongoose.Types.ObjectId().toString(),
          contestantIds: [],
          rounds: [],
          completed: false
        });
      }
    }

    // Explicitly cast to ensure Mongoose properly saves the structure
    tournament.bracket = {
      rounds: rounds.map(round => ({
        roundNumber: round.roundNumber,
        name: round.name,
        matches: round.matches.map(match => ({
          _id: match._id,
          contestantIds: match.contestantIds || [],
          rounds: match.rounds || [],
          winnerId: match.winnerId,
          completed: match.completed || false
        }))
      }))
    };

    // Create consolation bracket for non-qualifiers
    const runnersUpRounds = [];
    if (nonQualifiedContestants.length >= matchSize) {
      // Calculate consolation bracket size
      const consolationBracketSize = Math.pow(matchSize, Math.ceil(Math.log(nonQualifiedContestants.length) / Math.log(matchSize)));
      const consolationTotalRounds = Math.ceil(Math.log(consolationBracketSize) / Math.log(matchSize));

      // Build consolation rounds from finals to first round
      for (let rn = 1; rn <= consolationTotalRounds; rn++) {
        const roundName = rn === 1 ? '3rd Place Match' :
          rn === 2 ? 'Consolation Semi-Finals' :
            rn === 3 ? 'Consolation Quarter-Finals' :
              `Consolation Round ${rn}`;

        runnersUpRounds.push({
          roundNumber: rn,
          name: roundName,
          matches: []
        });
      }

      // Populate last round (first round of competition) with non-qualified contestants
      const consolationFirstRound = runnersUpRounds[runnersUpRounds.length - 1];
      const consolationMatchesInFirstRound = consolationBracketSize / matchSize;

      for (let i = 0; i < consolationMatchesInFirstRound; i++) {
        const contestantIds: string[] = [];
        for (let j = 0; j < matchSize; j++) {
          const contestantIndex = i * matchSize + j;
          if (contestantIndex < nonQualifiedContestants.length) {
            contestantIds.push(nonQualifiedContestants[contestantIndex]);
          }
        }

        consolationFirstRound.matches.push({
          _id: new mongoose.Types.ObjectId().toString(),
          contestantIds,
          rounds: [],
          completed: false
        });
      }

      // Create empty matches for other consolation rounds
      for (let i = 0; i < runnersUpRounds.length - 1; i++) {
        const matchesInRound = Math.pow(matchSize, runnersUpRounds[i].roundNumber - 1);
        for (let j = 0; j < matchesInRound; j++) {
          runnersUpRounds[i].matches.push({
            _id: new mongoose.Types.ObjectId().toString(),
            contestantIds: [],
            rounds: [],
            completed: false
          });
        }
      }
    }

    tournament.runnersUpBracket = {
      rounds: runnersUpRounds.map(round => ({
        roundNumber: round.roundNumber,
        name: round.name,
        matches: round.matches.map(match => ({
          _id: match._id,
          contestantIds: match.contestantIds || [],
          rounds: match.rounds || [],
          winnerId: match.winnerId,
          completed: match.completed || false
        }))
      }))
    };

    tournament.status = 'bracket';

    // Mark as modified to ensure Mongoose saves nested objects
    tournament.markModified('bracket');
    tournament.markModified('runnersUpBracket');

    await tournament.save();

    return json({ tournament });
  } catch (error) {
    console.error('Error generating bracket:', error);
    return json({ error: 'Failed to generate bracket' }, { status: 500 });
  }
};
