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
				// Handle base recipe references differently
				if (ing.type === 'reference') {
					// Only translate labelOverride if present
					textsToTranslate.push(ing.labelOverride || '');
					// Translate items before and after
					(ing.itemsBefore || []).forEach((item: any) => {
						textsToTranslate.push(item.name || '');
						textsToTranslate.push(item.unit || '');
					});
					(ing.itemsAfter || []).forEach((item: any) => {
						textsToTranslate.push(item.name || '');
						textsToTranslate.push(item.unit || '');
					});
				} else {
					// Regular ingredient section
					textsToTranslate.push(ing.name || '');
					(ing.list || []).forEach((item: any) => {
						textsToTranslate.push(item.name || '');
						textsToTranslate.push(item.unit || ''); // Translate units (EL→tbsp, TL→tsp)
					});
				}
			});

			// Add instruction names and steps
			const instructions = recipe.instructions || [];
			instructions.forEach((inst: any) => {
				// Handle base recipe references differently
				if (inst.type === 'reference') {
					// Only translate labelOverride if present
					textsToTranslate.push(inst.labelOverride || '');
					// Translate steps before and after
					(inst.stepsBefore || []).forEach((step: string) => {
						textsToTranslate.push(step || '');
					});
					(inst.stepsAfter || []).forEach((step: string) => {
						textsToTranslate.push(step || '');
					});
				} else {
					// Regular instruction section
					textsToTranslate.push(inst.name || '');
					(inst.steps || []).forEach((step: string) => {
						textsToTranslate.push(step || '');
					});
				}
			});

			// Add image alt and caption texts
			const images = Array.isArray(recipe.images) ? recipe.images : [];
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
				ingredients: ingredients.map((ing: any) => {
					if (ing.type === 'reference') {
						return {
							type: 'reference',
							name: ing.name,
							baseRecipeRef: ing.baseRecipeRef,
							includeIngredients: ing.includeIngredients,
							showLabel: ing.showLabel,
							labelOverride: translated[index++],
							itemsBefore: (ing.itemsBefore || []).map((item: any) => ({
								name: translated[index++],
								unit: translated[index++],
								amount: item.amount,
							})),
							itemsAfter: (ing.itemsAfter || []).map((item: any) => ({
								name: translated[index++],
								unit: translated[index++],
								amount: item.amount,
							})),
						};
					} else {
						return {
							name: translated[index++],
							list: (ing.list || []).map((item: any) => ({
								name: translated[index++],
								unit: translated[index++],
								amount: item.amount,
							}))
						};
					}
				}),
				instructions: instructions.map((inst: any) => {
					if (inst.type === 'reference') {
						return {
							type: 'reference',
							name: inst.name,
							baseRecipeRef: inst.baseRecipeRef,
							includeInstructions: inst.includeInstructions,
							showLabel: inst.showLabel,
							labelOverride: translated[index++],
							stepsBefore: (inst.stepsBefore || []).map(() => translated[index++]),
							stepsAfter: (inst.stepsAfter || []).map(() => translated[index++]),
						};
					} else {
						return {
							name: translated[index++],
							steps: (inst.steps || []).map(() => translated[index++])
						};
					}
				}),
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
	 * Includes granular detection for ingredients and instructions sublists
	 * @param oldRecipe - Original recipe
	 * @param newRecipe - Modified recipe
	 * @returns Object with changed field names and granular subfield changes
	 */
	detectChangedFields(oldRecipe: any, newRecipe: any): {
		fields: string[],
		ingredientChanges?: { groupIndex: number, changed: boolean }[],
		instructionChanges?: { groupIndex: number, changed: boolean }[]
	} {
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
		];

		const changed: string[] = [];

		// Check simple fields
		for (const field of fieldsToCheck) {
			const oldValue = JSON.stringify(oldRecipe[field] || '');
			const newValue = JSON.stringify(newRecipe[field] || '');

			if (oldValue !== newValue) {
				changed.push(field);
			}
		}

		// Granular detection for ingredients
		const ingredientChanges = this._detectIngredientChanges(
			oldRecipe.ingredients || [],
			newRecipe.ingredients || []
		);
		if (ingredientChanges.some(c => c.changed)) {
			changed.push('ingredients');
		}

		// Granular detection for instructions
		const instructionChanges = this._detectInstructionChanges(
			oldRecipe.instructions || [],
			newRecipe.instructions || []
		);
		if (instructionChanges.some(c => c.changed)) {
			changed.push('instructions');
		}

		return {
			fields: changed,
			ingredientChanges,
			instructionChanges
		};
	}

	/**
	 * Detect which ingredient groups have changed (granular - detects individual item changes)
	 * @private
	 */
	private _detectIngredientChanges(
		oldIngredients: any[],
		newIngredients: any[]
	): { groupIndex: number, changed: boolean, nameChanged?: boolean, itemChanges?: boolean[] }[] {
		const maxLength = Math.max(oldIngredients.length, newIngredients.length);
		const changes: { groupIndex: number, changed: boolean, nameChanged?: boolean, itemChanges?: boolean[] }[] = [];

		for (let i = 0; i < maxLength; i++) {
			const oldGroup = oldIngredients[i];
			const newGroup = newIngredients[i];

			// If group doesn't exist in one version, it's changed
			if (!oldGroup || !newGroup) {
				changes.push({ groupIndex: i, changed: true });
				continue;
			}

			// Handle base recipe references
			if (oldGroup.type === 'reference' || newGroup.type === 'reference') {
				// If type changed (reference <-> section), it's definitely changed
				if (oldGroup.type !== newGroup.type) {
					changes.push({ groupIndex: i, changed: true });
					continue;
				}

				// Both are references - check reference-specific fields
				if (oldGroup.type === 'reference' && newGroup.type === 'reference') {
					const referenceChanged =
						String(oldGroup.baseRecipeRef) !== String(newGroup.baseRecipeRef) ||
						oldGroup.includeIngredients !== newGroup.includeIngredients ||
						oldGroup.showLabel !== newGroup.showLabel ||
						oldGroup.labelOverride !== newGroup.labelOverride ||
						JSON.stringify(oldGroup.itemsBefore || []) !== JSON.stringify(newGroup.itemsBefore || []) ||
						JSON.stringify(oldGroup.itemsAfter || []) !== JSON.stringify(newGroup.itemsAfter || []);

					changes.push({ groupIndex: i, changed: referenceChanged });
					continue;
				}
			}

			// Regular section handling
			// Check if group name changed
			const nameChanged = oldGroup.name !== newGroup.name;

			// Check each item in the list
			const oldList = oldGroup.list || [];
			const newList = newGroup.list || [];
			const maxItems = Math.max(oldList.length, newList.length);
			const itemChanges: boolean[] = [];

			for (let j = 0; j < maxItems; j++) {
				const oldItem = oldList[j];
				const newItem = newList[j];

				// If item doesn't exist in one version, it's changed
				if (!oldItem || !newItem) {
					itemChanges.push(true);
					continue;
				}

				// Compare item properties
				const itemChanged = JSON.stringify({
					name: oldItem.name,
					unit: oldItem.unit,
					amount: oldItem.amount
				}) !== JSON.stringify({
					name: newItem.name,
					unit: newItem.unit,
					amount: newItem.amount
				});

				itemChanges.push(itemChanged);
			}

			const anyChanged = nameChanged || itemChanges.some(c => c);

			changes.push({
				groupIndex: i,
				changed: anyChanged,
				nameChanged,
				itemChanges
			});
		}

		return changes;
	}

	/**
	 * Detect which instruction groups have changed (granular - detects individual step changes)
	 * @private
	 */
	private _detectInstructionChanges(
		oldInstructions: any[],
		newInstructions: any[]
	): { groupIndex: number, changed: boolean, nameChanged?: boolean, stepChanges?: boolean[] }[] {
		const maxLength = Math.max(oldInstructions.length, newInstructions.length);
		const changes: { groupIndex: number, changed: boolean, nameChanged?: boolean, stepChanges?: boolean[] }[] = [];

		for (let i = 0; i < maxLength; i++) {
			const oldGroup = oldInstructions[i];
			const newGroup = newInstructions[i];

			// If group doesn't exist in one version, it's changed
			if (!oldGroup || !newGroup) {
				changes.push({ groupIndex: i, changed: true });
				continue;
			}

			// Handle base recipe references
			if (oldGroup.type === 'reference' || newGroup.type === 'reference') {
				// If type changed (reference <-> section), it's definitely changed
				if (oldGroup.type !== newGroup.type) {
					changes.push({ groupIndex: i, changed: true });
					continue;
				}

				// Both are references - check reference-specific fields
				if (oldGroup.type === 'reference' && newGroup.type === 'reference') {
					const referenceChanged =
						String(oldGroup.baseRecipeRef) !== String(newGroup.baseRecipeRef) ||
						oldGroup.includeInstructions !== newGroup.includeInstructions ||
						oldGroup.showLabel !== newGroup.showLabel ||
						oldGroup.labelOverride !== newGroup.labelOverride ||
						JSON.stringify(oldGroup.stepsBefore || []) !== JSON.stringify(newGroup.stepsBefore || []) ||
						JSON.stringify(oldGroup.stepsAfter || []) !== JSON.stringify(newGroup.stepsAfter || []);

					changes.push({ groupIndex: i, changed: referenceChanged });
					continue;
				}
			}

			// Regular section handling
			// Check if group name changed
			const nameChanged = oldGroup.name !== newGroup.name;

			// Check each step in the list
			const oldSteps = oldGroup.steps || [];
			const newSteps = newGroup.steps || [];
			const maxSteps = Math.max(oldSteps.length, newSteps.length);
			const stepChanges: boolean[] = [];

			for (let j = 0; j < maxSteps; j++) {
				const oldStep = oldSteps[j];
				const newStep = newSteps[j];

				// If step doesn't exist in one version, it's changed
				if (!oldStep || !newStep) {
					stepChanges.push(true);
					continue;
				}

				// Compare step text
				stepChanges.push(oldStep !== newStep);
			}

			const anyChanged = nameChanged || stepChanges.some(c => c);

			changes.push({
				groupIndex: i,
				changed: anyChanged,
				nameChanged,
				stepChanges
			});
		}

		return changes;
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
	 * Supports granular translation of ingredients/instructions sublists
	 * @param recipe - The recipe object
	 * @param fields - Array of field names to translate OR change detection result
	 * @param oldRecipe - Optional old recipe for granular change detection
	 * @param existingTranslation - Optional existing translation to merge with
	 * @returns Object with translated recipe and metadata about what was re-translated
	 */
	async translateFields(
		recipe: any,
		fields: string[] | { fields: string[], ingredientChanges?: any[], instructionChanges?: any[] },
		oldRecipe?: any,
		existingTranslation?: any
	): Promise<{ translatedRecipe: any, translationMetadata: any }> {
		const result: any = {};
		const metadata: any = {
			translatedFields: [],
			ingredientTranslations: [],
			instructionTranslations: []
		};

		// Support both old array format and new granular format
		let fieldsToTranslate: string[];
		let ingredientChanges: any[] | undefined;
		let instructionChanges: any[] | undefined;

		if (Array.isArray(fields)) {
			fieldsToTranslate = fields;
			// If oldRecipe provided, do granular detection
			if (oldRecipe) {
				const changes = this.detectChangedFields(oldRecipe, recipe);
				ingredientChanges = changes.ingredientChanges;
				instructionChanges = changes.instructionChanges;
			}
		} else {
			fieldsToTranslate = fields.fields;
			ingredientChanges = fields.ingredientChanges;
			instructionChanges = fields.instructionChanges;
		}

		for (const field of fieldsToTranslate) {
			switch (field) {
				case 'name':
					result.name = await this.translateText(recipe.name);
					result.short_name = this.generateEnglishSlug(result.name);
					metadata.translatedFields.push('name');
					break;
				case 'description':
					result.description = await this.translateText(recipe.description);
					metadata.translatedFields.push('description');
					break;
				case 'preamble':
					result.preamble = await this.translateText(recipe.preamble || '', 'EN-GB', true);
					metadata.translatedFields.push('preamble');
					break;
				case 'addendum':
					result.addendum = await this.translateText(recipe.addendum || '', 'EN-GB', true);
					metadata.translatedFields.push('addendum');
					break;
				case 'note':
					result.note = await this.translateText(recipe.note || '');
					metadata.translatedFields.push('note');
					break;
				case 'category':
					result.category = CATEGORY_TRANSLATIONS[recipe.category]
						|| await this.translateText(recipe.category);
					metadata.translatedFields.push('category');
					break;
				case 'tags':
					result.tags = await this.translateBatch(recipe.tags || []);
					metadata.translatedFields.push('tags');
					break;
				case 'portions':
					result.portions = await this.translateText(recipe.portions || '');
					metadata.translatedFields.push('portions');
					break;
				case 'preparation':
					result.preparation = await this.translateText(recipe.preparation || '');
					metadata.translatedFields.push('preparation');
					break;
				case 'cooking':
					result.cooking = await this.translateText(recipe.cooking || '');
					metadata.translatedFields.push('cooking');
					break;
				case 'total_time':
					result.total_time = await this.translateText(recipe.total_time || '');
					metadata.translatedFields.push('total_time');
					break;
				case 'baking':
					result.baking = {
						temperature: await this.translateText(recipe.baking?.temperature || ''),
						length: await this.translateText(recipe.baking?.length || ''),
						mode: await this.translateText(recipe.baking?.mode || ''),
					};
					metadata.translatedFields.push('baking');
					break;
				case 'fermentation':
					result.fermentation = {
						bulk: await this.translateText(recipe.fermentation?.bulk || ''),
						final: await this.translateText(recipe.fermentation?.final || ''),
					};
					metadata.translatedFields.push('fermentation');
					break;
				case 'ingredients':
					// Granular translation: only translate changed groups/items
					const ingredientResult = await this._translateIngredientsPartialWithMetadata(
						recipe.ingredients || [],
						existingTranslation?.ingredients || [],
						ingredientChanges
					);
					result.ingredients = ingredientResult.translated;
					metadata.ingredientTranslations = ingredientResult.metadata;
					metadata.translatedFields.push('ingredients');
					break;
				case 'instructions':
					// Granular translation: only translate changed groups/steps
					const instructionResult = await this._translateInstructionsPartialWithMetadata(
						recipe.instructions || [],
						existingTranslation?.instructions || [],
						instructionChanges
					);
					result.instructions = instructionResult.translated;
					metadata.instructionTranslations = instructionResult.metadata;
					metadata.translatedFields.push('instructions');
					break;
			}
		}

		result.lastTranslated = new Date();
		result.changedFields = [];

		return {
			translatedRecipe: result,
			translationMetadata: metadata
		};
	}

	/**
	 * Helper: Translate ingredients array (all groups)
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
	 * Helper: Translate ingredients partially with metadata tracking
	 * Tracks which specific items were re-translated
	 */
	private async _translateIngredientsPartialWithMetadata(
		newIngredients: any[],
		existingTranslatedIngredients: any[],
		changes?: { groupIndex: number, changed: boolean, nameChanged?: boolean, itemChanges?: boolean[] }[]
	): Promise<{ translated: any[], metadata: any[] }> {
		const result = await this._translateIngredientsPartial(newIngredients, existingTranslatedIngredients, changes);

		// Build metadata about what was translated
		const metadata = newIngredients.map((group, groupIndex) => {
			const changeInfo = changes?.find(c => c.groupIndex === groupIndex);
			if (!changeInfo || !changes) {
				// Entire group was translated
				return {
					groupIndex,
					nameTranslated: true,
					itemsTranslated: (group.list || []).map(() => true)
				};
			}

			return {
				groupIndex,
				nameTranslated: changeInfo.nameChanged ?? false,
				itemsTranslated: changeInfo.itemChanges || []
			};
		});

		return { translated: result, metadata };
	}

	/**
	 * Helper: Translate ingredients partially (item-level granularity)
	 * Only translates changed items within groups, merges with existing translation
	 */
	private async _translateIngredientsPartial(
		newIngredients: any[],
		existingTranslatedIngredients: any[],
		changes?: { groupIndex: number, changed: boolean, nameChanged?: boolean, itemChanges?: boolean[] }[]
	): Promise<any[]> {
		// If no change info, translate all
		if (!changes) {
			return this._translateIngredients(newIngredients);
		}

		const result: any[] = [];

		for (let i = 0; i < newIngredients.length; i++) {
			const changeInfo = changes.find(c => c.groupIndex === i);
			const group = newIngredients[i];
			const existingGroup = existingTranslatedIngredients[i];

			// If entire group doesn't exist in old version or no change info, translate everything
			if (!changeInfo || !existingGroup) {
				const textsToTranslate: string[] = [group.name || ''];
				(group.list || []).forEach((item: any) => {
					textsToTranslate.push(item.name || '');
					textsToTranslate.push(item.unit || '');
				});

				const translated = await this.translateBatch(textsToTranslate);
				let index = 0;

				result.push({
					name: translated[index++],
					list: (group.list || []).map((item: any) => ({
						name: translated[index++],
						unit: translated[index++],
						amount: item.amount,
					}))
				});
				continue;
			}

			// Item-level granularity
			const translatedGroup: any = {
				name: existingGroup.name,
				list: []
			};

			// Translate group name if changed
			if (changeInfo.nameChanged) {
				translatedGroup.name = await this.translateText(group.name || '');
			}

			// Process each item
			const itemChanges = changeInfo.itemChanges || [];
			for (let j = 0; j < (group.list || []).length; j++) {
				const item = group.list[j];
				const existingItem = existingGroup.list?.[j];
				const itemChanged = itemChanges[j] ?? true;

				if (itemChanged || !existingItem) {
					// Translate this item
					const textsToTranslate = [item.name || '', item.unit || ''];
					const translated = await this.translateBatch(textsToTranslate);

					translatedGroup.list.push({
						name: translated[0],
						unit: translated[1],
						amount: item.amount,
					});
				} else {
					// Keep existing translation
					translatedGroup.list.push(existingItem);
				}
			}

			result.push(translatedGroup);
		}

		return result;
	}

	/**
	 * Helper: Translate instructions array (all groups)
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

	/**
	 * Helper: Translate instructions partially with metadata tracking
	 * Tracks which specific steps were re-translated
	 */
	private async _translateInstructionsPartialWithMetadata(
		newInstructions: any[],
		existingTranslatedInstructions: any[],
		changes?: { groupIndex: number, changed: boolean, nameChanged?: boolean, stepChanges?: boolean[] }[]
	): Promise<{ translated: any[], metadata: any[] }> {
		const result = await this._translateInstructionsPartial(newInstructions, existingTranslatedInstructions, changes);

		// Build metadata about what was translated
		const metadata = newInstructions.map((group, groupIndex) => {
			const changeInfo = changes?.find(c => c.groupIndex === groupIndex);
			if (!changeInfo || !changes) {
				// Entire group was translated
				return {
					groupIndex,
					nameTranslated: true,
					stepsTranslated: (group.steps || []).map(() => true)
				};
			}

			return {
				groupIndex,
				nameTranslated: changeInfo.nameChanged ?? false,
				stepsTranslated: changeInfo.stepChanges || []
			};
		});

		return { translated: result, metadata };
	}

	/**
	 * Helper: Translate instructions partially (step-level granularity)
	 * Only translates changed steps within groups, merges with existing translation
	 */
	private async _translateInstructionsPartial(
		newInstructions: any[],
		existingTranslatedInstructions: any[],
		changes?: { groupIndex: number, changed: boolean, nameChanged?: boolean, stepChanges?: boolean[] }[]
	): Promise<any[]> {
		// If no change info, translate all
		if (!changes) {
			return this._translateInstructions(newInstructions);
		}

		const result: any[] = [];

		for (let i = 0; i < newInstructions.length; i++) {
			const changeInfo = changes.find(c => c.groupIndex === i);
			const group = newInstructions[i];
			const existingGroup = existingTranslatedInstructions[i];

			// If entire group doesn't exist in old version or no change info, translate everything
			if (!changeInfo || !existingGroup) {
				const textsToTranslate: string[] = [group.name || ''];
				(group.steps || []).forEach((step: string) => {
					textsToTranslate.push(step || '');
				});

				const translated = await this.translateBatch(textsToTranslate);
				let index = 0;

				result.push({
					name: translated[index++],
					steps: (group.steps || []).map(() => translated[index++])
				});
				continue;
			}

			// Step-level granularity
			const translatedGroup: any = {
				name: existingGroup.name,
				steps: []
			};

			// Translate group name if changed
			if (changeInfo.nameChanged) {
				translatedGroup.name = await this.translateText(group.name || '');
			}

			// Process each step
			const stepChanges = changeInfo.stepChanges || [];
			for (let j = 0; j < (group.steps || []).length; j++) {
				const step = group.steps[j];
				const existingStep = existingGroup.steps?.[j];
				const stepChanged = stepChanges[j] ?? true;

				if (stepChanged || !existingStep) {
					// Translate this step
					const translated = await this.translateText(step || '');
					translatedGroup.steps.push(translated);
				} else {
					// Keep existing translation
					translatedGroup.steps.push(existingStep);
				}
			}

			result.push(translatedGroup);
		}

		return result;
	}
}

// Export singleton instance
export const translationService = new DeepLTranslationService();

// Export class for testing
export { DeepLTranslationService };
