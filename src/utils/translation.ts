import { DEEPL_API_KEY, DEEPL_API_URL } from '$env/static/private';
import type {
	RecipeModelType,
	TranslatedRecipeType,
	IngredientItem,
	IngredientSection,
	IngredientReference,
	InstructionItem,
	InstructionSection,
	InstructionReference,
} from '$types/types';

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
const INGREDIENT_TERMINOLOGY: Record<string, string> = {
	"EL": "tbsp",
	"TL": "tsp",
	"Msp": "pinch",
	"Prise": "pinch",
	"Zweig": "twig",
	"Zweige": "twigs",
	"Bund": "bunch",
	"Ei": "egg",
	"Öl": "Oil",
	"Backen": "Baking",
};

// US English to British English food terminology
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

// --- Internal types for change detection ---

interface IngredientListItem {
	name: string;
	unit: string;
	amount: string;
}

interface IngredientGroupChange {
	groupIndex: number;
	changed: boolean;
	nameChanged?: boolean;
	itemChanges?: boolean[];
}

interface InstructionGroupChange {
	groupIndex: number;
	changed: boolean;
	nameChanged?: boolean;
	stepChanges?: boolean[];
}

interface ChangeDetectionResult {
	fields: string[];
	ingredientChanges?: IngredientGroupChange[];
	instructionChanges?: InstructionGroupChange[];
}

interface TranslationFieldsInput {
	fields: string[];
	ingredientChanges?: IngredientGroupChange[];
	instructionChanges?: InstructionGroupChange[];
}

interface IngredientTranslationMeta {
	groupIndex: number;
	nameTranslated: boolean;
	itemsTranslated: boolean[];
}

interface InstructionTranslationMeta {
	groupIndex: number;
	nameTranslated: boolean;
	stepsTranslated: boolean[];
}

interface FieldTranslationMetadata {
	translatedFields: string[];
	ingredientTranslations: IngredientTranslationMeta[];
	instructionTranslations: InstructionTranslationMeta[];
}

interface TranslateFieldsResult {
	translatedRecipe: Partial<TranslatedRecipeType>;
	translationMetadata: FieldTranslationMetadata;
}

// --- Helper functions ---

function replaceGermanCookingTerms(text: string): string {
	if (!text) return text;
	let result = text;
	Object.entries(INGREDIENT_TERMINOLOGY).forEach(([german, english]) => {
		const regex = new RegExp(`\\b${german}\\b`, 'gi');
		result = result.replace(regex, english);
	});
	return result;
}

function applyBritishEnglish(text: string): string {
	if (!text) return text;
	let result = text;
	Object.entries(US_TO_BRITISH_ENGLISH).forEach(([us, british]) => {
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

/**
 * DeepL Translation Service
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

	async translateText(
		text: string | null | undefined,
		targetLang: string = 'EN-GB',
		preserveFormatting: boolean = false
	): Promise<string> {
		if (!text || text.trim() === '') {
			return '';
		}

		if (!this.apiKey) {
			throw new Error('DeepL API key not configured');
		}

		try {
			const preprocessedText = replaceGermanCookingTerms(text);

			const params = new URLSearchParams({
				text: preprocessedText,
				target_lang: targetLang,
				...(preserveFormatting && { tag_handling: 'xml' })
			});

			const response = await fetch(this.apiUrl, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
					'Authorization': `DeepL-Auth-Key ${this.apiKey}`,
				},
				body: params.toString()
			});

			if (!response.ok) {
				const errorText = await response.text();
				throw new Error(`DeepL API error: ${response.status} - ${errorText}`);
			}

			const data: DeepLResponse = await response.json();
			const translatedText = data.translations[0]?.text || '';

			return applyBritishEnglish(translatedText);
		} catch (error) {
			console.error('Translation error:', error);
			throw error;
		}
	}

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

		const nonEmptyIndices: number[] = [];
		const nonEmptyTexts: string[] = [];

		texts.forEach((text, index) => {
			if (text && text.trim()) {
				nonEmptyIndices.push(index);
				nonEmptyTexts.push(replaceGermanCookingTerms(text));
			}
		});

		if (nonEmptyTexts.length === 0) {
			return texts.map(() => '');
		}

		try {
			const params = new URLSearchParams({
				target_lang: targetLang,
			});

			nonEmptyTexts.forEach(text => {
				params.append('text', text);
			});

			const response = await fetch(this.apiUrl, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
					'Authorization': `DeepL-Auth-Key ${this.apiKey}`,
				},
				body: params.toString()
			});

			if (!response.ok) {
				const errorText = await response.text();
				throw new Error(`DeepL API error: ${response.status} - ${errorText}`);
			}

			const data: DeepLResponse = await response.json();
			const translatedTexts = data.translations.map(t => t.text);
			const processedTexts = translatedTexts.map(text => applyBritishEnglish(text));

			const result: string[] = [];
			let translatedIndex = 0;

			for (let i = 0; i < texts.length; i++) {
				if (nonEmptyIndices.includes(i)) {
					result.push(processedTexts[translatedIndex]);
					translatedIndex++;
				} else {
					result.push('');
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
	 */
	async translateRecipe(recipe: RecipeModelType): Promise<TranslatedRecipeType> {
		try {
			const translatedCategory = CATEGORY_TRANSLATIONS[recipe.category]
				|| await this.translateText(recipe.category);

			const textsToTranslate: string[] = [
				recipe.name,
				recipe.description,
				recipe.preamble?.toString() || '',
				recipe.addendum || '',
				recipe.note || '',
				recipe.portions || '',
				recipe.preparation || '',
				recipe.cooking || '',
				recipe.total_time || '',
			];

			const baking = recipe.baking || { temperature: '', length: '', mode: '' };
			textsToTranslate.push(baking.temperature || '');
			textsToTranslate.push(baking.length || '');
			textsToTranslate.push(baking.mode || '');

			const fermentation = recipe.fermentation || { bulk: '', final: '' };
			textsToTranslate.push(fermentation.bulk || '');
			textsToTranslate.push(fermentation.final || '');

			const tags = recipe.tags || [];
			textsToTranslate.push(...tags);

			const ingredients: IngredientItem[] = recipe.ingredients || [];
			ingredients.forEach((ing) => {
				if (ing.type === 'reference') {
					textsToTranslate.push(ing.labelOverride || '');
					(ing.itemsBefore || []).forEach((item: IngredientListItem) => {
						textsToTranslate.push(item.name || '');
						textsToTranslate.push(item.unit || '');
					});
					(ing.itemsAfter || []).forEach((item: IngredientListItem) => {
						textsToTranslate.push(item.name || '');
						textsToTranslate.push(item.unit || '');
					});
				} else {
					textsToTranslate.push(ing.name || '');
					(ing.list || []).forEach((item: IngredientListItem) => {
						textsToTranslate.push(item.name || '');
						textsToTranslate.push(item.unit || '');
					});
				}
			});

			const instructions: InstructionItem[] = recipe.instructions || [];
			instructions.forEach((inst) => {
				if (inst.type === 'reference') {
					textsToTranslate.push(inst.labelOverride || '');
					(inst.stepsBefore || []).forEach((step: string) => {
						textsToTranslate.push(step || '');
					});
					(inst.stepsAfter || []).forEach((step: string) => {
						textsToTranslate.push(step || '');
					});
				} else {
					textsToTranslate.push(inst.name || '');
					(inst.steps || []).forEach((step: string) => {
						textsToTranslate.push(step || '');
					});
				}
			});

			const images = Array.isArray(recipe.images) ? recipe.images : [];
			images.forEach((img) => {
				textsToTranslate.push(img.alt || '');
				textsToTranslate.push(img.caption || '');
			});

			const translated = await this.translateBatch(textsToTranslate);

			let index = 0;
			const translatedRecipe: TranslatedRecipeType = {
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
				ingredients: ingredients.map((ing): IngredientItem => {
					if (ing.type === 'reference') {
						return {
							type: 'reference',
							name: ing.name,
							baseRecipeRef: ing.baseRecipeRef,
							includeIngredients: ing.includeIngredients,
							showLabel: ing.showLabel,
							labelOverride: translated[index++],
							itemsBefore: (ing.itemsBefore || []).map((item: IngredientListItem) => ({
								name: translated[index++],
								unit: translated[index++],
								amount: item.amount,
							})) as IngredientReference['itemsBefore'],
							itemsAfter: (ing.itemsAfter || []).map((item: IngredientListItem) => ({
								name: translated[index++],
								unit: translated[index++],
								amount: item.amount,
							})) as IngredientReference['itemsAfter'],
						};
					} else {
						return {
							type: 'section',
							name: translated[index++],
							list: (ing.list || []).map((item: IngredientListItem) => ({
								name: translated[index++],
								unit: translated[index++],
								amount: item.amount,
							})) as IngredientSection['list'],
						};
					}
				}),
				instructions: instructions.map((inst): InstructionItem => {
					if (inst.type === 'reference') {
						return {
							type: 'reference',
							name: inst.name,
							baseRecipeRef: inst.baseRecipeRef,
							includeInstructions: inst.includeInstructions,
							showLabel: inst.showLabel,
							labelOverride: translated[index++],
							stepsBefore: (inst.stepsBefore || []).map(() => translated[index++]) as InstructionReference['stepsBefore'],
							stepsAfter: (inst.stepsAfter || []).map(() => translated[index++]) as InstructionReference['stepsAfter'],
						};
					} else {
						return {
							type: 'section',
							name: translated[index++],
							steps: (inst.steps || []).map(() => translated[index++]) as InstructionSection['steps'],
						};
					}
				}),
				images: images.map((img) => ({
					alt: translated[index++],
					caption: translated[index++],
				})) as TranslatedRecipeType['images'],
				translationStatus: 'pending',
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
	 */
	detectChangedFields(oldRecipe: RecipeModelType, newRecipe: RecipeModelType): ChangeDetectionResult {
		const fieldsToCheck = [
			'name', 'description', 'preamble', 'addendum', 'note',
			'category', 'tags', 'portions', 'preparation', 'cooking',
			'total_time', 'baking', 'fermentation',
		] as const;

		const changed: string[] = [];

		for (const field of fieldsToCheck) {
			const oldValue = JSON.stringify(oldRecipe[field] || '');
			const newValue = JSON.stringify(newRecipe[field] || '');
			if (oldValue !== newValue) {
				changed.push(field);
			}
		}

		const ingredientChanges = this._detectIngredientChanges(
			oldRecipe.ingredients || [],
			newRecipe.ingredients || []
		);
		if (ingredientChanges.some(c => c.changed)) {
			changed.push('ingredients');
		}

		const instructionChanges = this._detectInstructionChanges(
			oldRecipe.instructions || [],
			newRecipe.instructions || []
		);
		if (instructionChanges.some(c => c.changed)) {
			changed.push('instructions');
		}

		return { fields: changed, ingredientChanges, instructionChanges };
	}

	private _detectIngredientChanges(
		oldIngredients: IngredientItem[],
		newIngredients: IngredientItem[]
	): IngredientGroupChange[] {
		const maxLength = Math.max(oldIngredients.length, newIngredients.length);
		const changes: IngredientGroupChange[] = [];

		for (let i = 0; i < maxLength; i++) {
			const oldGroup = oldIngredients[i];
			const newGroup = newIngredients[i];

			if (!oldGroup || !newGroup) {
				changes.push({ groupIndex: i, changed: true });
				continue;
			}

			if (oldGroup.type === 'reference' || newGroup.type === 'reference') {
				if (oldGroup.type !== newGroup.type) {
					changes.push({ groupIndex: i, changed: true });
					continue;
				}

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

			// Both are sections
			const oldSection = oldGroup as IngredientSection;
			const newSection = newGroup as IngredientSection;

			const nameChanged = oldSection.name !== newSection.name;
			const oldList = oldSection.list || [];
			const newList = newSection.list || [];
			const maxItems = Math.max(oldList.length, newList.length);
			const itemChanges: boolean[] = [];

			for (let j = 0; j < maxItems; j++) {
				const oldItem = oldList[j];
				const newItem = newList[j];

				if (!oldItem || !newItem) {
					itemChanges.push(true);
					continue;
				}

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

			changes.push({
				groupIndex: i,
				changed: nameChanged || itemChanges.some(c => c),
				nameChanged,
				itemChanges
			});
		}

		return changes;
	}

	private _detectInstructionChanges(
		oldInstructions: InstructionItem[],
		newInstructions: InstructionItem[]
	): InstructionGroupChange[] {
		const maxLength = Math.max(oldInstructions.length, newInstructions.length);
		const changes: InstructionGroupChange[] = [];

		for (let i = 0; i < maxLength; i++) {
			const oldGroup = oldInstructions[i];
			const newGroup = newInstructions[i];

			if (!oldGroup || !newGroup) {
				changes.push({ groupIndex: i, changed: true });
				continue;
			}

			if (oldGroup.type === 'reference' || newGroup.type === 'reference') {
				if (oldGroup.type !== newGroup.type) {
					changes.push({ groupIndex: i, changed: true });
					continue;
				}

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

			// Both are sections
			const oldSection = oldGroup as InstructionSection;
			const newSection = newGroup as InstructionSection;

			const nameChanged = oldSection.name !== newSection.name;
			const oldSteps = oldSection.steps || [];
			const newSteps = newSection.steps || [];
			const maxSteps = Math.max(oldSteps.length, newSteps.length);
			const stepChanges: boolean[] = [];

			for (let j = 0; j < maxSteps; j++) {
				if (!oldSteps[j] || !newSteps[j]) {
					stepChanges.push(true);
					continue;
				}
				stepChanges.push(oldSteps[j] !== newSteps[j]);
			}

			changes.push({
				groupIndex: i,
				changed: nameChanged || stepChanges.some(c => c),
				nameChanged,
				stepChanges
			});
		}

		return changes;
	}

	generateEnglishSlug(germanName: string): string {
		return germanName
			.toLowerCase()
			.replace(/ä/g, 'ae')
			.replace(/ö/g, 'oe')
			.replace(/ü/g, 'ue')
			.replace(/ß/g, 'ss')
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-+|-+$/g, '');
	}

	/**
	 * Translate only specific fields of a recipe
	 */
	async translateFields(
		recipe: RecipeModelType,
		fields: string[] | TranslationFieldsInput,
		oldRecipe?: RecipeModelType,
		existingTranslation?: TranslatedRecipeType
	): Promise<TranslateFieldsResult> {
		const result: Partial<TranslatedRecipeType> = {};
		const metadata: FieldTranslationMetadata = {
			translatedFields: [],
			ingredientTranslations: [],
			instructionTranslations: []
		};

		let fieldsToTranslate: string[];
		let ingredientChanges: IngredientGroupChange[] | undefined;
		let instructionChanges: InstructionGroupChange[] | undefined;

		if (Array.isArray(fields)) {
			fieldsToTranslate = fields;
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
					result.preamble = await this.translateText(recipe.preamble?.toString() || '', 'EN-GB', true);
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
				case 'ingredients': {
					const ingResult = await this._translateIngredientsPartialWithMetadata(
						recipe.ingredients || [],
						existingTranslation?.ingredients || [],
						ingredientChanges
					);
					result.ingredients = ingResult.translated;
					metadata.ingredientTranslations = ingResult.metadata;
					metadata.translatedFields.push('ingredients');
					break;
				}
				case 'instructions': {
					const instResult = await this._translateInstructionsPartialWithMetadata(
						recipe.instructions || [],
						existingTranslation?.instructions || [],
						instructionChanges
					);
					result.instructions = instResult.translated;
					metadata.instructionTranslations = instResult.metadata;
					metadata.translatedFields.push('instructions');
					break;
				}
			}
		}

		result.lastTranslated = new Date();
		result.changedFields = [];

		return { translatedRecipe: result, translationMetadata: metadata };
	}

	private async _translateIngredients(ingredients: IngredientItem[]): Promise<IngredientItem[]> {
		const allTexts: string[] = [];
		ingredients.forEach(ing => {
			if (ing.type === 'section') {
				allTexts.push(ing.name || '');
				(ing.list || []).forEach((item: IngredientListItem) => {
					allTexts.push(item.name || '');
					allTexts.push(item.unit || '');
				});
			}
		});

		const translated = await this.translateBatch(allTexts);
		let index = 0;

		return ingredients.map((ing): IngredientItem => {
			if (ing.type === 'section') {
				return {
					type: 'section',
					name: translated[index++],
					list: (ing.list || []).map((item: IngredientListItem) => ({
						name: translated[index++],
						unit: translated[index++],
						amount: item.amount,
					})) as IngredientSection['list'],
				};
			}
			return ing; // references passed through
		});
	}

	private async _translateIngredientsPartialWithMetadata(
		newIngredients: IngredientItem[],
		existingTranslatedIngredients: IngredientItem[],
		changes?: IngredientGroupChange[]
	): Promise<{ translated: IngredientItem[], metadata: IngredientTranslationMeta[] }> {
		const result = await this._translateIngredientsPartial(newIngredients, existingTranslatedIngredients, changes);

		const metadata: IngredientTranslationMeta[] = newIngredients.map((group, groupIndex) => {
			const changeInfo = changes?.find(c => c.groupIndex === groupIndex);
			if (!changeInfo || !changes) {
				const listLength = group.type === 'section' ? (group.list || []).length : 0;
				return {
					groupIndex,
					nameTranslated: true,
					itemsTranslated: Array(listLength).fill(true)
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

	private async _translateIngredientsPartial(
		newIngredients: IngredientItem[],
		existingTranslatedIngredients: IngredientItem[],
		changes?: IngredientGroupChange[]
	): Promise<IngredientItem[]> {
		if (!changes) {
			return this._translateIngredients(newIngredients);
		}

		const result: IngredientItem[] = [];

		for (let i = 0; i < newIngredients.length; i++) {
			const changeInfo = changes.find(c => c.groupIndex === i);
			const group = newIngredients[i];
			const existingGroup = existingTranslatedIngredients[i];

			if (group.type === 'reference') {
				const ref = group as IngredientReference;

				if (!changeInfo || !existingGroup) {
					const textsToTranslate: string[] = [ref.labelOverride || ''];
					(ref.itemsBefore || []).forEach((item: IngredientListItem) => {
						textsToTranslate.push(item.name || '');
						textsToTranslate.push(item.unit || '');
					});
					(ref.itemsAfter || []).forEach((item: IngredientListItem) => {
						textsToTranslate.push(item.name || '');
						textsToTranslate.push(item.unit || '');
					});

					const translated = await this.translateBatch(textsToTranslate);
					let idx = 0;

					result.push({
						type: 'reference',
						name: ref.name,
						baseRecipeRef: ref.baseRecipeRef,
						includeIngredients: ref.includeIngredients,
						showLabel: ref.showLabel,
						labelOverride: translated[idx++],
						itemsBefore: (ref.itemsBefore || []).map((item: IngredientListItem) => ({
							name: translated[idx++],
							unit: translated[idx++],
							amount: item.amount,
						})) as IngredientReference['itemsBefore'],
						itemsAfter: (ref.itemsAfter || []).map((item: IngredientListItem) => ({
							name: translated[idx++],
							unit: translated[idx++],
							amount: item.amount,
						})) as IngredientReference['itemsAfter'],
					});
					continue;
				}

				const existingRef = existingGroup as IngredientReference;
				const translatedRef: IngredientReference = {
					type: 'reference',
					name: ref.name,
					baseRecipeRef: ref.baseRecipeRef,
					includeIngredients: ref.includeIngredients,
					showLabel: ref.showLabel,
					labelOverride: existingRef.labelOverride,
					itemsBefore: existingRef.itemsBefore || [],
					itemsAfter: existingRef.itemsAfter || []
				};

				if (changeInfo.nameChanged) {
					translatedRef.labelOverride = await this.translateText(ref.labelOverride || '');
				}

				if (JSON.stringify(ref.itemsBefore) !== JSON.stringify(existingRef.itemsBefore)) {
					const textsToTranslate: string[] = [];
					(ref.itemsBefore || []).forEach((item: IngredientListItem) => {
						textsToTranslate.push(item.name || '');
						textsToTranslate.push(item.unit || '');
					});
					const translated = await this.translateBatch(textsToTranslate);
					let idx = 0;
					translatedRef.itemsBefore = (ref.itemsBefore || []).map((item: IngredientListItem) => ({
						name: translated[idx++],
						unit: translated[idx++],
						amount: item.amount,
					})) as IngredientReference['itemsBefore'];
				}

				if (JSON.stringify(ref.itemsAfter) !== JSON.stringify(existingRef.itemsAfter)) {
					const textsToTranslate: string[] = [];
					(ref.itemsAfter || []).forEach((item: IngredientListItem) => {
						textsToTranslate.push(item.name || '');
						textsToTranslate.push(item.unit || '');
					});
					const translated = await this.translateBatch(textsToTranslate);
					let idx = 0;
					translatedRef.itemsAfter = (ref.itemsAfter || []).map((item: IngredientListItem) => ({
						name: translated[idx++],
						unit: translated[idx++],
						amount: item.amount,
					})) as IngredientReference['itemsAfter'];
				}

				result.push(translatedRef);
				continue;
			}

			// Section type
			const section = group as IngredientSection;

			if (!changeInfo || !existingGroup) {
				const textsToTranslate: string[] = [section.name || ''];
				(section.list || []).forEach((item: IngredientListItem) => {
					textsToTranslate.push(item.name || '');
					textsToTranslate.push(item.unit || '');
				});

				const translated = await this.translateBatch(textsToTranslate);
				let idx = 0;

				result.push({
					type: 'section',
					name: translated[idx++],
					list: (section.list || []).map((item: IngredientListItem) => ({
						name: translated[idx++],
						unit: translated[idx++],
						amount: item.amount,
					})) as IngredientSection['list'],
				});
				continue;
			}

			const existingSection = existingGroup as IngredientSection;
			const translatedGroup: IngredientSection = {
				type: 'section',
				name: existingSection.name,
				list: [] as unknown as IngredientSection['list'],
			};

			if (changeInfo.nameChanged) {
				translatedGroup.name = await this.translateText(section.name || '');
			}

			const itemChanges = changeInfo.itemChanges || [];
			const translatedList: IngredientListItem[] = [];

			for (let j = 0; j < (section.list || []).length; j++) {
				const item = section.list[j];
				const existingItem = existingSection.list?.[j];
				const itemChanged = itemChanges[j] ?? true;

				if (itemChanged || !existingItem) {
					const translated = await this.translateBatch([item.name || '', item.unit || '']);
					translatedList.push({
						name: translated[0],
						unit: translated[1],
						amount: item.amount,
					});
				} else {
					translatedList.push(existingItem);
				}
			}

			translatedGroup.list = translatedList as unknown as IngredientSection['list'];
			result.push(translatedGroup);
		}

		return result;
	}

	private async _translateInstructions(instructions: InstructionItem[]): Promise<InstructionItem[]> {
		const allTexts: string[] = [];
		instructions.forEach(inst => {
			if (inst.type === 'section') {
				allTexts.push(inst.name || '');
				(inst.steps || []).forEach((step: string) => {
					allTexts.push(step || '');
				});
			}
		});

		const translated = await this.translateBatch(allTexts);
		let index = 0;

		return instructions.map((inst): InstructionItem => {
			if (inst.type === 'section') {
				return {
					type: 'section',
					name: translated[index++],
					steps: (inst.steps || []).map(() => translated[index++]) as InstructionSection['steps'],
				};
			}
			return inst;
		});
	}

	private async _translateInstructionsPartialWithMetadata(
		newInstructions: InstructionItem[],
		existingTranslatedInstructions: InstructionItem[],
		changes?: InstructionGroupChange[]
	): Promise<{ translated: InstructionItem[], metadata: InstructionTranslationMeta[] }> {
		const result = await this._translateInstructionsPartial(newInstructions, existingTranslatedInstructions, changes);

		const metadata: InstructionTranslationMeta[] = newInstructions.map((group, groupIndex) => {
			const changeInfo = changes?.find(c => c.groupIndex === groupIndex);
			if (!changeInfo || !changes) {
				const stepsLength = group.type === 'section' ? (group.steps || []).length : 0;
				return {
					groupIndex,
					nameTranslated: true,
					stepsTranslated: Array(stepsLength).fill(true)
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

	private async _translateInstructionsPartial(
		newInstructions: InstructionItem[],
		existingTranslatedInstructions: InstructionItem[],
		changes?: InstructionGroupChange[]
	): Promise<InstructionItem[]> {
		if (!changes) {
			return this._translateInstructions(newInstructions);
		}

		const result: InstructionItem[] = [];

		for (let i = 0; i < newInstructions.length; i++) {
			const changeInfo = changes.find(c => c.groupIndex === i);
			const group = newInstructions[i];
			const existingGroup = existingTranslatedInstructions[i];

			if (group.type === 'reference') {
				const ref = group as InstructionReference;

				if (!changeInfo || !existingGroup) {
					const textsToTranslate: string[] = [ref.labelOverride || ''];
					(ref.stepsBefore || []).forEach((step: string) => {
						textsToTranslate.push(step || '');
					});
					(ref.stepsAfter || []).forEach((step: string) => {
						textsToTranslate.push(step || '');
					});

					const translated = await this.translateBatch(textsToTranslate);
					let idx = 0;

					result.push({
						type: 'reference',
						name: ref.name,
						baseRecipeRef: ref.baseRecipeRef,
						includeInstructions: ref.includeInstructions,
						showLabel: ref.showLabel,
						labelOverride: translated[idx++],
						stepsBefore: (ref.stepsBefore || []).map(() => translated[idx++]) as InstructionReference['stepsBefore'],
						stepsAfter: (ref.stepsAfter || []).map(() => translated[idx++]) as InstructionReference['stepsAfter'],
					});
					continue;
				}

				const existingRef = existingGroup as InstructionReference;
				const translatedRef: InstructionReference = {
					type: 'reference',
					name: ref.name,
					baseRecipeRef: ref.baseRecipeRef,
					includeInstructions: ref.includeInstructions,
					showLabel: ref.showLabel,
					labelOverride: existingRef.labelOverride,
					stepsBefore: existingRef.stepsBefore || [],
					stepsAfter: existingRef.stepsAfter || []
				};

				if (changeInfo.nameChanged) {
					translatedRef.labelOverride = await this.translateText(ref.labelOverride || '');
				}

				if (JSON.stringify(ref.stepsBefore) !== JSON.stringify(existingRef.stepsBefore)) {
					translatedRef.stepsBefore = await this.translateBatch(
						(ref.stepsBefore || []).map(s => s || '')
					) as InstructionReference['stepsBefore'];
				}

				if (JSON.stringify(ref.stepsAfter) !== JSON.stringify(existingRef.stepsAfter)) {
					translatedRef.stepsAfter = await this.translateBatch(
						(ref.stepsAfter || []).map(s => s || '')
					) as InstructionReference['stepsAfter'];
				}

				result.push(translatedRef);
				continue;
			}

			// Section type
			const section = group as InstructionSection;

			if (!changeInfo || !existingGroup) {
				const textsToTranslate: string[] = [section.name || ''];
				(section.steps || []).forEach((step: string) => {
					textsToTranslate.push(step || '');
				});

				const translated = await this.translateBatch(textsToTranslate);
				let idx = 0;

				result.push({
					type: 'section',
					name: translated[idx++],
					steps: (section.steps || []).map(() => translated[idx++]) as InstructionSection['steps'],
				});
				continue;
			}

			const existingSection = existingGroup as InstructionSection;
			const translatedGroup: InstructionSection = {
				type: 'section',
				name: existingSection.name,
				steps: [] as unknown as InstructionSection['steps'],
			};

			if (changeInfo.nameChanged) {
				translatedGroup.name = await this.translateText(section.name || '');
			}

			const stepChanges = changeInfo.stepChanges || [];
			const translatedSteps: string[] = [];

			for (let j = 0; j < (section.steps || []).length; j++) {
				const step = section.steps[j];
				const existingStep = existingSection.steps?.[j];
				const stepChanged = stepChanges[j] ?? true;

				if (stepChanged || !existingStep) {
					translatedSteps.push(await this.translateText(step || ''));
				} else {
					translatedSteps.push(existingStep);
				}
			}

			translatedGroup.steps = translatedSteps as unknown as InstructionSection['steps'];
			result.push(translatedGroup);
		}

		return result;
	}
}

// Export singleton instance
export const translationService = new DeepLTranslationService();

// Export class for testing
export { DeepLTranslationService };

// Export types for consumers
export type {
	ChangeDetectionResult,
	TranslationFieldsInput,
	TranslateFieldsResult,
	FieldTranslationMetadata,
	IngredientGroupChange,
	InstructionGroupChange,
};
