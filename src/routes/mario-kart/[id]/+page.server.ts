import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { dbConnect } from '$utils/db';
import { MarioKartTournament } from '$models/MarioKartTournament';

export const load: PageServerLoad = async ({ params }) => {
	try {
		await dbConnect();

		// Use lean with flattenMaps option to convert Map objects to plain objects
		const tournament = await MarioKartTournament.findById(params.id).lean({ flattenMaps: true });

		if (!tournament) {
			throw error(404, 'Tournament not found');
		}

		console.log('=== SERVER LOAD DEBUG ===');
		console.log('Raw tournament bracket:', tournament.bracket);
		if (tournament.bracket?.rounds) {
			console.log('First bracket round matches:', tournament.bracket.rounds[0]?.matches);
		}
		console.log('=== END SERVER LOAD DEBUG ===');

		// Convert _id and other MongoDB ObjectIds to strings for serialization
		const serializedTournament = JSON.parse(JSON.stringify(tournament));

		console.log('=== SERIALIZED DEBUG ===');
		if (serializedTournament.bracket?.rounds) {
			console.log('Serialized first bracket round matches:', serializedTournament.bracket.rounds[0]?.matches);
		}
		console.log('=== END SERIALIZED DEBUG ===');

		return {
			tournament: serializedTournament
		};
	} catch (err: any) {
		if (err.status === 404) {
			throw err;
		}
		console.error('Error loading tournament:', err);
		throw error(500, 'Failed to load tournament');
	}
};
