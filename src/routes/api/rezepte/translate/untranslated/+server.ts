import { json, type RequestHandler, error } from '@sveltejs/kit';
import { Recipe } from '../../../../../models/Recipe';
import { dbConnect } from '../../../../../utils/db';

export const GET: RequestHandler = async ({ locals }) => {
	const session = await locals.auth();

	if (!session?.user?.nickname) {
		throw error(401, 'Anmeldung erforderlich');
	}

	if (!session.user.groups?.includes('rezepte_users')) {
		throw error(403, 'Zugriff verweigert');
	}

	await dbConnect();

	try {
		// Find recipes without approved English translation
		const untranslated = await Recipe.find({
			$or: [
				{ 'translations.en': { $exists: false } },
				{ 'translations.en.translationStatus': { $ne: 'approved' } }
			]
		}, 'name short_name category icon description tags season dateModified translations.en.translationStatus')
		.sort({ dateModified: 1 }) // Oldest first - highest priority
		.lean();

		// Transform to include translationStatus at top level for easier UI handling
		const result = untranslated.map(recipe => ({
			_id: recipe._id,
			name: recipe.name,
			short_name: recipe.short_name,
			category: recipe.category,
			icon: recipe.icon,
			description: recipe.description,
			tags: recipe.tags || [],
			season: recipe.season || [],
			dateModified: recipe.dateModified,
			translationStatus: recipe.translations?.en?.translationStatus || undefined
		}));

		return json(JSON.parse(JSON.stringify(result)));
	} catch (e) {
		console.error('Error fetching untranslated recipes:', e);
		throw error(500, 'Fehler beim Laden der unübersetzten Rezepte');
	}
};
