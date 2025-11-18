import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { dbConnect } from '$utils/db';
import { MarioKartTournament } from '$models/MarioKartTournament';

export const load: PageServerLoad = async () => {
	try {
		await dbConnect();

		const tournaments = await MarioKartTournament.find()
			.sort({ createdAt: -1 })
			.lean({ flattenMaps: true });

		// Convert MongoDB documents to plain objects for serialization
		const serializedTournaments = JSON.parse(JSON.stringify(tournaments));

		return {
			tournaments: serializedTournaments
		};
	} catch (err) {
		console.error('Error loading tournaments:', err);
		throw error(500, 'Failed to load tournaments');
	}
};
