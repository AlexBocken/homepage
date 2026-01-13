/**
 * Recipe form serialization and validation helpers
 *
 * Utilities for converting between complex recipe data structures and FormData
 * for SvelteKit form actions with progressive enhancement support.
 */

export interface RecipeFormData {
	// Basic fields
	name: string;
	short_name: string;
	description: string;
	category: string;
	icon: string;
	tags: string[];
	portions: string;
	season: number[];

	// Optional text fields
	preamble?: string;
	addendum?: string;
	note?: string;

	// Complex nested structures
	ingredients: any[];
	instructions: any[];

	// Additional info
	add_info: {
		preparation?: string;
		fermentation?: {
			bulk?: string;
			final?: string;
		};
		baking?: {
			length?: string;
			temperature?: string;
			mode?: string;
		};
		total_time?: string;
		cooking?: string;
	};

	// Images
	images?: Array<{
		mediapath: string;
		alt: string;
		caption: string;
	}>;

	// Metadata
	isBaseRecipe?: boolean;
	datecreated?: Date;
	datemodified?: Date;

	// Translation data (optional)
	translations?: {
		en?: any;
	};
	translationMetadata?: any;
}

/**
 * Extracts recipe data from FormData
 * Handles both simple fields and complex JSON-encoded nested structures
 */
export function extractRecipeFromFormData(formData: FormData): RecipeFormData {
	// Simple fields
	const name = formData.get('name')?.toString() || '';
	const short_name = formData.get('short_name')?.toString().trim() || '';
	const description = formData.get('description')?.toString() || '';
	const category = formData.get('category')?.toString() || '';
	const icon = formData.get('icon')?.toString() || '';
	const portions = formData.get('portions')?.toString() || '';

	// Tags (comma-separated string or JSON array)
	let tags: string[] = [];
	const tagsData = formData.get('tags')?.toString();
	if (tagsData) {
		try {
			tags = JSON.parse(tagsData);
		} catch {
			// Fallback: split by comma
			tags = tagsData.split(',').map(t => t.trim()).filter(t => t);
		}
	}

	// Season (JSON array of month numbers)
	let season: number[] = [];
	const seasonData = formData.get('season')?.toString();
	if (seasonData) {
		try {
			season = JSON.parse(seasonData);
		} catch {
			// Ignore invalid season data
		}
	}

	// Optional text fields
	const preamble = formData.get('preamble')?.toString();
	const addendum = formData.get('addendum')?.toString();
	const note = formData.get('note')?.toString();

	// Complex nested structures (JSON-encoded)
	let ingredients: any[] = [];
	const ingredientsData = formData.get('ingredients_json')?.toString();
	if (ingredientsData) {
		try {
			ingredients = JSON.parse(ingredientsData);
		} catch (error) {
			console.error('Failed to parse ingredients:', error);
		}
	}

	let instructions: any[] = [];
	const instructionsData = formData.get('instructions_json')?.toString();
	if (instructionsData) {
		try {
			instructions = JSON.parse(instructionsData);
		} catch (error) {
			console.error('Failed to parse instructions:', error);
		}
	}

	// Additional info (JSON-encoded)
	let add_info: RecipeFormData['add_info'] = {};
	const addInfoData = formData.get('add_info_json')?.toString();
	if (addInfoData) {
		try {
			add_info = JSON.parse(addInfoData);
		} catch (error) {
			console.error('Failed to parse add_info:', error);
		}
	}

	// Images
	let images: Array<{ mediapath: string; alt: string; caption: string }> = [];
	const imagesData = formData.get('images_json')?.toString();
	if (imagesData) {
		try {
			images = JSON.parse(imagesData);
		} catch (error) {
			console.error('Failed to parse images:', error);
		}
	}

	// Metadata
	const isBaseRecipe = formData.get('isBaseRecipe') === 'true';
	const datecreated = formData.get('datecreated')
		? new Date(formData.get('datecreated')!.toString())
		: new Date();
	const datemodified = new Date();

	// Translation data (optional)
	let translations = undefined;
	const translationData = formData.get('translation_json')?.toString();
	if (translationData) {
		try {
			const translatedRecipe = JSON.parse(translationData);
			translations = { en: translatedRecipe };
		} catch (error) {
			console.error('Failed to parse translation:', error);
		}
	}

	let translationMetadata = undefined;
	const translationMetadataData = formData.get('translation_metadata_json')?.toString();
	if (translationMetadataData) {
		try {
			translationMetadata = JSON.parse(translationMetadataData);
		} catch (error) {
			console.error('Failed to parse translation metadata:', error);
		}
	}

	return {
		name,
		short_name,
		description,
		category,
		icon,
		tags,
		portions,
		season,
		preamble,
		addendum,
		note,
		ingredients,
		instructions,
		add_info,
		images,
		isBaseRecipe,
		datecreated,
		datemodified,
		translations,
		translationMetadata
	};
}

/**
 * Validates required recipe fields
 * Returns array of error messages (empty if valid)
 */
export function validateRecipeData(data: RecipeFormData): string[] {
	const errors: string[] = [];

	if (!data.name || data.name.trim() === '') {
		errors.push('Recipe name is required');
	}

	if (!data.short_name || data.short_name.trim() === '') {
		errors.push('Short name (URL slug) is required');
	}

	// Validate short_name format (URL-safe)
	if (data.short_name && !/^[a-z0-9_-]+$/i.test(data.short_name)) {
		errors.push('Short name must contain only letters, numbers, hyphens, and underscores');
	}

	if (!data.description || data.description.trim() === '') {
		errors.push('Description is required');
	}

	if (!data.category || data.category.trim() === '') {
		errors.push('Category is required');
	}

	if (!data.ingredients || data.ingredients.length === 0) {
		errors.push('At least one ingredient is required');
	}

	if (!data.instructions || data.instructions.length === 0) {
		errors.push('At least one instruction is required');
	}

	return errors;
}

/**
 * Detects which fields have changed between two recipe objects
 * Used for edit forms to enable partial translation updates
 */
export function detectChangedFields(original: any, current: any): string[] {
	const changedFields: string[] = [];

	// Simple field comparison
	const simpleFields = [
		'name',
		'short_name',
		'description',
		'category',
		'icon',
		'portions',
		'preamble',
		'addendum',
		'note'
	];

	for (const field of simpleFields) {
		if (original[field] !== current[field]) {
			changedFields.push(field);
		}
	}

	// Array field comparison (deep compare)
	if (JSON.stringify(original.tags) !== JSON.stringify(current.tags)) {
		changedFields.push('tags');
	}

	if (JSON.stringify(original.season) !== JSON.stringify(current.season)) {
		changedFields.push('season');
	}

	if (JSON.stringify(original.ingredients) !== JSON.stringify(current.ingredients)) {
		changedFields.push('ingredients');
	}

	if (JSON.stringify(original.instructions) !== JSON.stringify(current.instructions)) {
		changedFields.push('instructions');
	}

	// Nested object comparison
	if (JSON.stringify(original.add_info) !== JSON.stringify(current.add_info)) {
		changedFields.push('add_info');
	}

	if (JSON.stringify(original.images) !== JSON.stringify(current.images)) {
		changedFields.push('images');
	}

	return changedFields;
}

/**
 * Parses season data from form input
 * Handles both checkbox-based input and JSON arrays
 */
export function parseSeasonData(formData: FormData): number[] {
	const season: number[] = [];

	// Try JSON format first
	const seasonJson = formData.get('season')?.toString();
	if (seasonJson) {
		try {
			return JSON.parse(seasonJson);
		} catch {
			// Fall through to checkbox parsing
		}
	}

	// Parse individual checkbox inputs (season_1, season_2, etc.)
	for (let month = 1; month <= 12; month++) {
		if (formData.get(`season_${month}`) === 'true') {
			season.push(month);
		}
	}

	return season;
}

/**
 * Serializes complex recipe data for storage
 * Ensures all required fields are present and properly typed
 */
export function serializeRecipeForDatabase(data: RecipeFormData): any {
	const recipe: any = {
		name: data.name,
		short_name: data.short_name,
		description: data.description,
		category: data.category,
		icon: data.icon || '',
		tags: data.tags || [],
		portions: data.portions || '',
		season: data.season || [],
		ingredients: data.ingredients || [],
		instructions: data.instructions || [],
		isBaseRecipe: data.isBaseRecipe || false,
		datecreated: data.datecreated || new Date(),
		datemodified: data.datemodified || new Date()
	};

	// Optional fields
	if (data.preamble) recipe.preamble = data.preamble;
	if (data.addendum) recipe.addendum = data.addendum;
	if (data.note) recipe.note = data.note;

	// Additional info
	if (data.add_info && Object.keys(data.add_info).length > 0) {
		recipe.preparation = data.add_info.preparation;
		recipe.fermentation = data.add_info.fermentation;
		recipe.baking = data.add_info.baking;
		recipe.total_time = data.add_info.total_time;
		recipe.cooking = data.add_info.cooking;
	}

	// Images
	if (data.images && data.images.length > 0) {
		recipe.images = data.images;
	}

	// Translations
	if (data.translations) {
		recipe.translations = data.translations;
	}

	if (data.translationMetadata) {
		recipe.translationMetadata = data.translationMetadata;
	}

	return recipe;
}
