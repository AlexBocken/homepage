import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { dbConnect } from '$utils/db';
import { MarioKartTournament } from '$models/MarioKartTournament';
import mongoose from 'mongoose';

// POST /api/mario-kart/tournaments/[id]/groups - Create groups for tournament
export const POST: RequestHandler = async ({ params, request }) => {
  try {
    await dbConnect();

    const data = await request.json();
    const { numberOfGroups, maxUsersPerGroup, groupConfigs } = data;

    const tournament = await MarioKartTournament.findById(params.id);

    if (!tournament) {
      return json({ error: 'Tournament not found' }, { status: 404 });
    }

    if (tournament.contestants.length < 2) {
      return json({ error: 'Need at least 2 contestants to create groups' }, { status: 400 });
    }

    // If groupConfigs are provided, use them. Otherwise, auto-assign
    if (groupConfigs && Array.isArray(groupConfigs)) {
      tournament.groups = groupConfigs.map((config: any) => ({
        _id: new mongoose.Types.ObjectId().toString(),
        name: config.name,
        contestantIds: config.contestantIds,
        matches: [],
        standings: []
      }));
    } else if (numberOfGroups) {
      // Auto-assign contestants to groups based on number of groups
      // Shuffle contestants for random assignment
      const contestants = [...tournament.contestants].sort(() => Math.random() - 0.5);
      const groupSize = Math.ceil(contestants.length / numberOfGroups);

      tournament.groups = [];
      for (let i = 0; i < numberOfGroups; i++) {
        const groupContestants = contestants.slice(i * groupSize, (i + 1) * groupSize);
        if (groupContestants.length > 0) {
          tournament.groups.push({
            _id: new mongoose.Types.ObjectId().toString(),
            name: `Group ${String.fromCharCode(65 + i)}`, // A, B, C, etc.
            contestantIds: groupContestants.map(c => c._id!.toString()),
            matches: [],
            standings: []
          });
        }
      }
    } else if (maxUsersPerGroup) {
      // Auto-assign contestants to groups based on max users per group
      // Shuffle contestants for random assignment
      const contestants = [...tournament.contestants].sort(() => Math.random() - 0.5);
      const numberOfGroupsNeeded = Math.ceil(contestants.length / maxUsersPerGroup);

      tournament.groups = [];
      for (let i = 0; i < numberOfGroupsNeeded; i++) {
        const groupContestants = contestants.slice(i * maxUsersPerGroup, (i + 1) * maxUsersPerGroup);
        if (groupContestants.length > 0) {
          tournament.groups.push({
            _id: new mongoose.Types.ObjectId().toString(),
            name: `Group ${String.fromCharCode(65 + i)}`, // A, B, C, etc.
            contestantIds: groupContestants.map(c => c._id!.toString()),
            matches: [],
            standings: []
          });
        }
      }
    } else {
      return json({ error: 'Either numberOfGroups, maxUsersPerGroup, or groupConfigs is required' }, { status: 400 });
    }

    // Create matches for each group (round-robin style where everyone plays together)
    for (const group of tournament.groups) {
      if (group.contestantIds.length >= 2) {
        // Create one match with all contestants
        group.matches.push({
          _id: new mongoose.Types.ObjectId().toString(),
          contestantIds: group.contestantIds,
          rounds: [],
          completed: false
        });
      }
    }

    tournament.status = 'group_stage';
    await tournament.save();

    return json({ tournament });
  } catch (error) {
    console.error('Error creating groups:', error);
    return json({ error: 'Failed to create groups' }, { status: 500 });
  }
};
