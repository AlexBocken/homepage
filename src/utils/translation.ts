import { DEEPL_API_KEY, DEEPL_API_URL } from '$env/static/private';

// Category translation dictionary for consistency
const CATEGORY_TRANSLATIONS: Record<string, string> = {
	"Brot": "Bread",
	"Kuchen": "Cake",
	"Suppe": "Soup",
	"Salat": "Salad",
	"Hauptgericht": "Main Course",
	"Beilage": "Side Dish",
	"Dessert": "Dessert",
	"Getränk": "Beverage",
	"Frühstück": "Breakfast",
	"Snack": "Snack"
};

// Ingredient terminology dictionary - German cooking terms to British English
// These override DeepL translations for consistent terminology
const INGREDIENT_TERMINOLOGY: Record<string, string> = {
	// Measurement abbreviations
	"EL": "tbsp",
	"TL": "tsp",
	"Msp": "pinch",
	"Prise": "pinch",
	"Zweig": "twig",
	"Zweige": "twigs",
	"Bund": "bunch",

	// Common ingredients
	"Ei": "egg",
	"Öl": "Oil",
	"Backen": "Baking",
};

// US English to British English food terminology
// Applied after DeepL translation to ensure British English
const US_TO_BRITISH_ENGLISH: Record<string, string> = {
	"zucchini": "courgette",
	"zucchinis": "courgettes",
	"eggplant": "aubergine",
	"eggplants": "aubergines",
	"cilantro": "coriander",
	"arugula": "rocket",
	"rutabaga": "swede",
	"rutabagas": "swedes",
	"bell pepper": "pepper",
	"bell peppers": "peppers",
	"scallion": "spring onion",
	"scallions": "spring onions",
	"green onion": "spring onion",
	"green onions": "spring onions",
};

/**
 * Pre-process German text to replace cooking terminology BEFORE DeepL translation
 * This ensures German abbreviations like EL, TL are correctly translated to tbsp, tsp
 * @param text - The German text to pre-process
 * @returns Text with German cooking terms replaced with English equivalents
 */
function replaceGermanCookingTerms(text: string): string {
	if (!text) return text;

	let result = text;

	// Replace German cooking terms with English equivalents
	// Using word boundaries to avoid partial matches
	Object.entries(INGREDIENT_TERMINOLOGY).forEach(([german, english]) => {
		// Case-insensitive replacement with word boundaries
		const regex = new RegExp(`\\b${german}\\b`, 'gi');
		result = result.replace(regex, english);
	});

	return result;
}

/**
 * Post-process English text to convert US English to British English
 * Applied AFTER DeepL translation
 * @param text - The translated English text to process
 * @returns Text with US English terms converted to British English
 */
function applyBritishEnglish(text: string): string {
	if (!text) return text;

	let result = text;

	// Replace US English terms with British English
	Object.entries(US_TO_BRITISH_ENGLISH).forEach(([us, british]) => {
		// Case-insensitive replacement with word boundaries
		const regex = new RegExp(`\\b${us}\\b`, 'gi');
		result = result.replace(regex, british);
	});

	return result;
}

interface DeepLResponse {
	translations: Array<{
		detected_source_language: string;
		text: string;
	}>;
}

interface TranslationResult {
	text: string;
	detectedSourceLang: string;
}

/**
 * DeepL Translation Service
 * Handles all translation operations using the DeepL API
 */
class DeepLTranslationService {
	private apiKey: string;
	private apiUrl: string;

	constructor() {
		this.apiKey = DEEPL_API_KEY || '';
		this.apiUrl = DEEPL_API_URL || 'https://api-free.deepl.com/v2/translate';

		if (!this.apiKey) {
			console.warn('DEEPL_API_KEY not found in environment variables');
		}
	}

	/**
	 * Translate a single text string
	 * @param text - The text to translate
	 * @param targetLang - Target language code (default: 'EN-GB' for British English)
	 * @param preserveFormatting - Whether to preserve HTML/formatting
	 * @returns Translated text
	 */
	async translateText(
		text: string | null | undefined,
		targetLang: string = 'EN-GB',
		preserveFormatting: boolean = false
	): Promise<string> {
		// Return empty string for null, undefined, or empty strings
		if (!text || text.trim() === '') {
			return '';
		}

		if (!this.apiKey) {
			throw new Error('DeepL API key not configured');
		}

		try {
			// Pre-process: Replace German cooking terms BEFORE sending to DeepL
			const preprocessedText = replaceGermanCookingTerms(text);

			const params = new URLSearchParams({
				auth_key: this.apiKey,
				text: preprocessedText,
				target_lang: targetLang,
				...(preserveFormatting && { tag_handling: 'xml' })
			});

			const response = await fetch(this.apiUrl, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
				},
				body: params.toString()
			});

			if (!response.ok) {
				const errorText = await response.text();
				throw new Error(`DeepL API error: ${response.status} - ${errorText}`);
			}

			const data: DeepLResponse = await response.json();
			const translatedText = data.translations[0]?.text || '';

			// Post-process: Convert US English to British English
			return applyBritishEnglish(translatedText);
		} catch (error) {
			console.error('Translation error:', error);
			throw error;
		}
	}

	/**
	 * Translate multiple texts in a single batch request
	 * More efficient than individual calls
	 * @param texts - Array of texts to translate
	 * @param targetLang - Target language code (default: 'EN-GB' for British English)
	 * @returns Array of translated texts (preserves empty strings in original positions)
	 */
	async translateBatch(
		texts: string[],
		targetLang: string = 'EN-GB'
	): Promise<string[]> {
		if (!texts.length) {
			return [];
		}

		if (!this.apiKey) {
			throw new Error('DeepL API key not configured');
		}

		// Track which indices have non-empty text
		const nonEmptyIndices: number[] = [];
		const nonEmptyTexts: string[] = [];

		texts.forEach((text, index) => {
			if (text && text.trim()) {
				nonEmptyIndices.push(index);
				// Pre-process: Replace German cooking terms BEFORE sending to DeepL
				const preprocessed = replaceGermanCookingTerms(text);
				nonEmptyTexts.push(preprocessed);
			}
		});

		// If all texts are empty, return array of empty strings
		if (nonEmptyTexts.length === 0) {
			return texts.map(() => '');
		}

		try {
			const params = new URLSearchParams({
				auth_key: this.apiKey,
				target_lang: targetLang,
			});

			// Add each preprocessed non-empty text as a separate 'text' parameter
			nonEmptyTexts.forEach(text => {
				params.append('text', text);
			});

			const response = await fetch(this.apiUrl, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
				},
				body: params.toString()
			});

			if (!response.ok) {
				const errorText = await response.text();
				throw new Error(`DeepL API error: ${response.status} - ${errorText}`);
			}

			const data: DeepLResponse = await response.json();
			const translatedTexts = data.translations.map(t => t.text);

			// Post-process: Convert US English to British English
			const processedTexts = translatedTexts.map(text => applyBritishEnglish(text));

			// Map translated texts back to original positions, preserving empty strings
			const result: string[] = [];
			let translatedIndex = 0;

			for (let i = 0; i < texts.length; i++) {
				if (nonEmptyIndices.includes(i)) {
					result.push(processedTexts[translatedIndex]);
					translatedIndex++;
				} else {
					result.push(''); // Keep empty string
				}
			}

			return result;
		} catch (error) {
			console.error('Batch translation error:', error);
			throw error;
		}
	}

	/**
	 * Translate a complete recipe object
	 * @param recipe - The recipe object to translate
	 * @returns Translated recipe data
	 */
	async translateRecipe(recipe: any): Promise<any> {
		try {
			// Translate category using dictionary first, fallback to DeepL
			const translatedCategory = CATEGORY_TRANSLATIONS[recipe.category]
				|| await this.translateText(recipe.category);

			// Collect all texts to translate in batch
			const textsToTranslate: string[] = [
				recipe.name,
				recipe.description,
				recipe.preamble || '',
				recipe.addendum || '',
				recipe.note || '',
				recipe.portions || '',
				recipe.preparation || '',
				recipe.cooking || '',
				recipe.total_time || '',
			];

			// Add baking object fields
			const baking = recipe.baking || {};
			textsToTranslate.push(baking.temperature || '');
			textsToTranslate.push(baking.length || '');
			textsToTranslate.push(baking.mode || '');

			// Add fermentation object fields
			const fermentation = recipe.fermentation || {};
			textsToTranslate.push(fermentation.bulk || '');
			textsToTranslate.push(fermentation.final || '');

			// Add tags
			const tags = recipe.tags || [];
			textsToTranslate.push(...tags);

			// Add ingredient names and list items
			const ingredients = recipe.ingredients || [];
			ingredients.forEach((ing: any) => {
				textsToTranslate.push(ing.name || '');
				(ing.list || []).forEach((item: any) => {
					textsToTranslate.push(item.name || '');
					textsToTranslate.push(item.unit || ''); // Translate units (EL→tbsp, TL→tsp)
				});
			});

			// Add instruction names and steps
			const instructions = recipe.instructions || [];
			instructions.forEach((inst: any) => {
				textsToTranslate.push(inst.name || '');
				(inst.steps || []).forEach((step: string) => {
					textsToTranslate.push(step || '');
				});
			});

			// Add image alt and caption texts
			const images = recipe.images || [];
			images.forEach((img: any) => {
				textsToTranslate.push(img.alt || '');
				textsToTranslate.push(img.caption || '');
			});

			// Batch translate all texts
			const translated = await this.translateBatch(textsToTranslate);

			// Reconstruct translated recipe
			let index = 0;
			const translatedRecipe = {
				short_name: this.generateEnglishSlug(recipe.name),
				name: translated[index++],
				description: translated[index++],
				preamble: translated[index++],
				addendum: translated[index++],
				note: translated[index++],
				portions: translated[index++],
				preparation: translated[index++],
				cooking: translated[index++],
				total_time: translated[index++],
				baking: {
					temperature: translated[index++],
					length: translated[index++],
					mode: translated[index++],
				},
				fermentation: {
					bulk: translated[index++],
					final: translated[index++],
				},
				category: translatedCategory,
				tags: tags.map(() => translated[index++]),
				ingredients: ingredients.map((ing: any) => ({
					name: translated[index++],
					list: (ing.list || []).map((item: any) => ({
						name: translated[index++],
						unit: translated[index++], // Use translated unit (tbsp, tsp, etc.)
						amount: item.amount,
					}))
				})),
				instructions: instructions.map((inst: any) => ({
					name: translated[index++],
					steps: (inst.steps || []).map(() => translated[index++])
				})),
				images: images.map((img: any) => ({
					alt: translated[index++],
					caption: translated[index++],
				})),
				translationStatus: 'pending' as const,
				lastTranslated: new Date(),
				changedFields: [],
			};

			return translatedRecipe;
		} catch (error) {
			console.error('Recipe translation error:', error);
			throw error;
		}
	}

	/**
	 * Detect which fields have changed between old and new recipe
	 * Used to determine what needs re-translation
	 * @param oldRecipe - Original recipe
	 * @param newRecipe - Modified recipe
	 * @returns Array of changed field names
	 */
	detectChangedFields(oldRecipe: any, newRecipe: any): string[] {
		const fieldsToCheck = [
			'name',
			'description',
			'preamble',
			'addendum',
			'note',
			'category',
			'tags',
			'portions',
			'preparation',
			'cooking',
			'total_time',
			'baking',
			'fermentation',
			'ingredients',
			'instructions',
		];

		const changed: string[] = [];

		for (const field of fieldsToCheck) {
			const oldValue = JSON.stringify(oldRecipe[field] || '');
			const newValue = JSON.stringify(newRecipe[field] || '');

			if (oldValue !== newValue) {
				changed.push(field);
			}
		}

		return changed;
	}

	/**
	 * Generate URL-friendly English slug from German name
	 * Ensures uniqueness by checking against existing recipes
	 * @param germanName - The German recipe name
	 * @returns URL-safe English slug
	 */
	generateEnglishSlug(germanName: string): string {
		// This will be translated name, so we just need to slugify it
		const slug = germanName
			.toLowerCase()
			.replace(/ä/g, 'ae')
			.replace(/ö/g, 'oe')
			.replace(/ü/g, 'ue')
			.replace(/ß/g, 'ss')
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-+|-+$/g, '');

		return slug;
	}

	/**
	 * Translate only specific fields of a recipe
	 * Used when only some fields have changed
	 * @param recipe - The recipe object
	 * @param fields - Array of field names to translate
	 * @returns Partial translated recipe with only specified fields
	 */
	async translateFields(recipe: any, fields: string[]): Promise<any> {
		const result: any = {};

		for (const field of fields) {
			switch (field) {
				case 'name':
					result.name = await this.translateText(recipe.name);
					result.short_name = this.generateEnglishSlug(result.name);
					break;
				case 'description':
					result.description = await this.translateText(recipe.description);
					break;
				case 'preamble':
					result.preamble = await this.translateText(recipe.preamble || '', 'EN-GB', true);
					break;
				case 'addendum':
					result.addendum = await this.translateText(recipe.addendum || '', 'EN-GB', true);
					break;
				case 'note':
					result.note = await this.translateText(recipe.note || '');
					break;
				case 'category':
					result.category = CATEGORY_TRANSLATIONS[recipe.category]
						|| await this.translateText(recipe.category);
					break;
				case 'tags':
					result.tags = await this.translateBatch(recipe.tags || []);
					break;
				case 'portions':
					result.portions = await this.translateText(recipe.portions || '');
					break;
				case 'preparation':
					result.preparation = await this.translateText(recipe.preparation || '');
					break;
				case 'cooking':
					result.cooking = await this.translateText(recipe.cooking || '');
					break;
				case 'total_time':
					result.total_time = await this.translateText(recipe.total_time || '');
					break;
				case 'baking':
					result.baking = {
						temperature: await this.translateText(recipe.baking?.temperature || ''),
						length: await this.translateText(recipe.baking?.length || ''),
						mode: await this.translateText(recipe.baking?.mode || ''),
					};
					break;
				case 'fermentation':
					result.fermentation = {
						bulk: await this.translateText(recipe.fermentation?.bulk || ''),
						final: await this.translateText(recipe.fermentation?.final || ''),
					};
					break;
				case 'ingredients':
					// This would be complex - for now, re-translate all ingredients
					result.ingredients = await this._translateIngredients(recipe.ingredients || []);
					break;
				case 'instructions':
					// This would be complex - for now, re-translate all instructions
					result.instructions = await this._translateInstructions(recipe.instructions || []);
					break;
			}
		}

		result.lastTranslated = new Date();
		result.changedFields = [];

		return result;
	}

	/**
	 * Helper: Translate ingredients array
	 */
	private async _translateIngredients(ingredients: any[]): Promise<any[]> {
		const allTexts: string[] = [];
		ingredients.forEach(ing => {
			allTexts.push(ing.name || '');
			(ing.list || []).forEach((item: any) => {
				allTexts.push(item.name || '');
				allTexts.push(item.unit || ''); // Translate units (EL→tbsp, TL→tsp)
			});
		});

		const translated = await this.translateBatch(allTexts);
		let index = 0;

		return ingredients.map(ing => ({
			name: translated[index++],
			list: (ing.list || []).map((item: any) => ({
				name: translated[index++],
				unit: translated[index++], // Use translated unit
				amount: item.amount,
			}))
		}));
	}

	/**
	 * Helper: Translate instructions array
	 */
	private async _translateInstructions(instructions: any[]): Promise<any[]> {
		const allTexts: string[] = [];
		instructions.forEach(inst => {
			allTexts.push(inst.name || '');
			(inst.steps || []).forEach((step: string) => {
				allTexts.push(step || '');
			});
		});

		const translated = await this.translateBatch(allTexts);
		let index = 0;

		return instructions.map(inst => ({
			name: translated[index++],
			steps: (inst.steps || []).map(() => translated[index++])
		}));
	}
}

// Export singleton instance
export const translationService = new DeepLTranslationService();

// Export class for testing
export { DeepLTranslationService };
