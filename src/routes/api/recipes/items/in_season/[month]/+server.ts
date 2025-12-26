import { json, type RequestHandler } from '@sveltejs/kit';
import { Recipe } from '../../../../../../models/Recipe'
import { dbConnect } from '../../../../../../utils/db';
import { rand_array } from '$lib/js/randomize';

export const GET: RequestHandler = async ({params}) => {
	await dbConnect();

	// Find recipes in season that have English translations
	const recipes = await Recipe.find(
		{
			season: params.month,
			icon: {$ne: "🍽️"},
			'translations.en': { $exists: true }
		},
		'_id translations.en short_name images season dateModified icon'
	).lean();

	// Map to format with English data
	const found_in_season = recipes.map((recipe: any) => ({
		_id: recipe._id,
		name: recipe.translations.en.name,
		short_name: recipe.translations.en.short_name,
		images: recipe.images || [],
		tags: recipe.translations.en.tags || [],
		category: recipe.translations.en.category,
		icon: recipe.icon,
		description: recipe.translations.en.description,
		season: recipe.season || [],
		dateModified: recipe.dateModified,
		germanShortName: recipe.short_name // For language switcher
	}));

	return json(JSON.parse(JSON.stringify(rand_array(found_in_season))));
};
