import { json, type RequestHandler } from '@sveltejs/kit';
import type { BriefRecipeType } from '../../../../../types/types';
import { Recipe } from '../../../../../models/Recipe'
import { dbConnect } from '../../../../../utils/db';
import { rand_array } from '$lib/js/randomize';

export const GET: RequestHandler = async ({params}) => {
	await dbConnect();

	// Find all recipes that have approved English translations
	const recipes = await Recipe.find(
		{ 'translations.en.translationStatus': 'approved' },
		'_id translations.en short_name season dateModified icon'
	).lean();

	// Map to brief format with English data
	const found_brief = recipes.map((recipe: any) => ({
		_id: recipe._id,
		name: recipe.translations.en.name,
		short_name: recipe.translations.en.short_name,
		tags: recipe.translations.en.tags || [],
		category: recipe.translations.en.category,
		icon: recipe.icon,
		description: recipe.translations.en.description,
		season: recipe.season || [],
		dateModified: recipe.dateModified,
		germanShortName: recipe.short_name // For language switcher
	})) as BriefRecipeType[];

	return json(JSON.parse(JSON.stringify(rand_array(found_brief))));
};
