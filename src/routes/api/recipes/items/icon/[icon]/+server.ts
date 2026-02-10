import { json, type RequestHandler } from '@sveltejs/kit';
import { Recipe } from '$models/Recipe';
import { dbConnect } from '$utils/db';
import type {BriefRecipeType} from '$types/types';
import { rand_array } from '$lib/js/randomize';

export const GET: RequestHandler = async ({params}) => {
	await dbConnect();

	// Find recipes with this icon that have approved English translations
	const recipes = await Recipe.find(
		{
			icon: params.icon,
			'translations.en.translationStatus': 'approved'
		},
		'_id translations.en short_name images season dateModified icon'
	).lean();

	// Map to brief format with English data
	const englishRecipes = recipes.map((recipe: any) => ({
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
		germanShortName: recipe.short_name
	})) as BriefRecipeType[];

	return json(JSON.parse(JSON.stringify(rand_array(englishRecipes))));
};
