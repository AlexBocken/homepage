import type { de } from './de';

export const en = {
	// Layout / nav
	all_recipes: 'All Recipes',
	favorites: 'Favorites',
	season_nav: 'Season',
	category_nav: 'Category',
	icon_nav: 'Icon',
	tags_nav: 'Tags',

	// Nutrition summary
	nutrition: 'Nutrition',
	per_portion: 'per portion',
	protein: 'Protein',
	fat: 'Fat',
	carbs: 'Carbs',
	fiber: 'Fiber',
	sugars: 'Sugars',
	saturated_fat: 'Sat. Fat',
	details: 'Details',
	vitamins: 'Vitamins',
	minerals: 'Minerals',
	coverage: 'coverage',
	not_tracked: 'Not tracked',
	amino_acids: 'Amino Acids',
	iron: 'Iron',
	zinc: 'Zinc',
	leucine: 'Leucine',
	isoleucine: 'Isoleucine',
	valine: 'Valine',
	lysine: 'Lysine',
	methionine: 'Methionine',
	phenylalanine: 'Phenylalanine',
	threonine: 'Threonine',
	histidine: 'Histidine',
	arginine: 'Arginine',
	alanine: 'Alanine',
	aspartic_acid: 'Aspartic Acid',
	cysteine: 'Cysteine',
	glutamic_acid: 'Glutamic Acid',
	glycine: 'Glycine',
	proline: 'Proline',
	serine: 'Serine',
	tyrosine: 'Tyrosine',

	// Ingredients page
	portions: 'Portions:',
	adjust_amount: 'Adjust Amount:',
	ingredients: 'Ingredients',
	cake_form: 'Cake form',
	adjust_cake_form: 'Adjust cake form',
	round_form: 'Round',
	rectangular_form: 'Rectangular',
	diameter: 'Diameter',
	outer_diameter: 'Outer Ø',
	inner_diameter: 'Inner Ø',
	width: 'Width',
	length: 'Length',
	factor: 'Factor',
	restore_default: 'Restore default',
	round_lowercase: 'round',

	// AddToFoodLogButton + meal labels
	add_to_food_log: 'Add to food log',
	added_to_food_log: 'Added to food log',
	add_failed: 'Failed to add',
	portions_label: 'Portions',
	grams_label: 'Grams',
	meal_label: 'Meal',
	breakfast: 'Breakfast',
	lunch: 'Lunch',
	dinner: 'Dinner',
	snack: 'Snack',
	log_action: 'Log',
	cancel: 'Cancel',
	save: 'Save',

	// To-try page
	to_try_title: 'To Try',
	to_try_page_title: 'Recipes To Try - Bocken Recipes',
	to_try_meta_description: 'Recipes we want to try from around the web.',
	to_try_nothing: 'Nothing here yet',
	to_try_empty_state: 'Add a recipe you want to try using the form below.',
	recipe_name: 'Recipe name',
	label_optional: 'Label (optional)',
	notes_optional: 'Notes (optional)',
	add_link: 'Add link',
	add_recipe_to_try: 'Add recipe to try',
	edit_recipe: 'Edit recipe',
	delete_recipe_confirm: 'Delete this recipe?',

	// Search page
	search_results_title: 'Search Results',
	search_meta_description: "Search results in Bocken's recipes.",
	filtered_by: 'Filtered by:',
	keywords_label: 'Keywords',
	seasons_label: 'Seasons',
	favorites_only: 'Favorites only',
	search_error: 'Search error:',
	results_for: 'results for',
	no_recipes_found: 'No recipes found.',
	try_other_search: 'Try different search terms.',

	// Common page titles + shared
	site_title: 'Bocken Recipes',
	all: 'All',

	// Index page
	index_title: 'Recipes',
	in_season_now: 'In Season',
	meta_alt_hero: 'Pasta al Ragu with Linguine',

	// Detail page
	season_label: 'Season:',
	keywords_colon: 'Keywords:',
	last_modified: 'Last modified:',

	// Favorites
	favorites_page_title: 'My Favorites - Bocken Recipes',
	no_favorites_yet: 'No favorites saved yet',
	error_loading_favorites: 'Error loading favorites:',
	recipe_singular_link: 'recipe',
	recipes_to_try_link: 'Recipes to try',
	no_matching_favorites: 'No matching favorites found.',

	// Error pages
	recipe_not_found: 'Recipe Not Found',
	recipe_not_found_desc: 'The requested recipe could not be found.',
	checking_german_version: 'Checking for German version…',
	recipes_link: 'Recipes',

	// Categories / tags / season / icon / tips index pages
	categories_title: 'Categories',
	keywords_title: 'Keywords',
	search_tags: 'Search tags…',
	in_season_title: 'In Season',
	icons_title: 'Icons',
	tips_title: 'Tips & Tricks',
	favorites_meta_description: "My favorite recipes from Bocken's kitchen.",
	empty_favorites_1: "You haven't saved any recipes as favorites yet.",
	empty_favorites_2: 'Visit a recipe and click the heart icon to add it to your favorites.'
} as const satisfies Record<keyof typeof de, string>;
