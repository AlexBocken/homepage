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

	// Browse-page meta descriptions (for SEO discovery via category-level queries)
	categories_meta_description: "Browse recipes by category — mains, starters, desserts, breads, soups and more from Bocken's collection.",
	keywords_meta_description: 'Filter recipes by keyword — from yeast doughs to Italian, from cheese to pumpkin.',
	in_season_meta_description: 'Seasonal recipes for what is in season right now, from spring to winter.',
	icons_meta_description: "Browse recipes by symbol — a visual overview of Bocken's collection.",
	category_meta_prefix: 'Recipes in category',
	tag_meta_prefix: 'Recipes tagged',
	icon_meta_prefix: 'Recipes with symbol',
	season_meta_prefix: 'Recipes for',
	empty_favorites_1: "You haven't saved any recipes as favorites yet.",
	empty_favorites_2: 'Visit a recipe and click the heart icon to add it to your favorites.',

	// Filters
	filter_mode: 'Filter Mode',
	and_label: 'AND',
	or_label: 'OR',
	select_category_placeholder: 'Select category…',
	select_season_placeholder: 'Select season…',

	// Search component
	search_placeholder_short: 'Search…',
	search_title: 'Search',
	clear_search_title: 'Clear search',

	// Tag / Category landing
	recipes_with_keyword: 'Recipes with Keyword',
	recipes_in_category: 'Recipes in Category',

	// Card actions
	edit: 'Edit',
	delete: 'Delete',

	// Administration page
	administration_title: 'Administration',
	untranslated_recipes: 'Untranslated Recipes',
	alt_text_generator: 'Alt-Text Generator',
	image_colors: 'Image Colors',
	nutrition_mappings: 'Nutrition Mappings',

	// Recipe detail page
	site_title_long: 'Bocken Recipes',

	// InstructionsPage section labels
	preparation_section: 'Preparation:',
	bulk_fermentation: 'Bulk Fermentation:',
	final_proof: 'Final Proof:',
	baking_section: 'Baking:',
	cooking_section: 'Cooking:',
	on_the_plate: 'On the Plate:',
	instructions_label: 'Instructions',
	at_temp: 'at',

	// JSON-LD recipe schema labels (HowToStep names, baking instruction text)
	jsonld_step: 'Step',
	jsonld_bake: 'Bake',
	jsonld_for_duration: 'for',

	// CreateStepList baking
	not_set: 'Not set',
	duration: 'Duration',
	temperature: 'Temperature',
	mode_label: 'Mode',
	custom_mode_placeholder: 'or enter custom mode…',

	// Administration page descriptions
	administration_description: 'Manage recipes and content',
	untranslated_description: 'View and manage recipes that need translation',
	alt_text_description: 'Generate alternative text for recipe images using AI',
	image_colors_description: 'Extract dominant colors from recipe images for loading placeholders',
	nutrition_mappings_description: 'Generate or regenerate calorie and nutrition data for all recipes',

	// Smaller filters / pages
	loading_offline: 'Loading offline content…',
	hide_filters: 'Hide Filters',
	show_filters: 'Show Filters',
	select_icon_placeholder: 'Select icon…',
	add_tag_placeholder: 'Type or select tag…',

	// Index / tips / yeast
	recipes_growing_suffix: 'recipes and constantly growing…',
	recipes_collection_meta: "A constantly growing collection of recipes from Bocken's kitchen.",
	tips_description: "A constantly growing collection of recipes from Bocken's kitchen.",
	yeast_toggle_title: 'Switch between fresh yeast and dry yeast',

	// Search results pageTitle
	search_results_for_word: 'for',

	// Favorites count label
	favorites_count_label: 'favorite recipes',
	favorite_recipe_singular: 'favorite recipe',
	favorite_recipes_plural: 'favorite recipes'
} as const satisfies Record<keyof typeof de, string>;
