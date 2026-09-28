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
	/** References only: whether their own items before/after the base recipe changed. */
	beforeChanged?: boolean;
	afterChanged?: boolean;
}

interface InstructionGroupChange {
	groupIndex: number;
	changed: boolean;
	nameChanged?: boolean;
	stepChanges?: boolean[];
	/** References only: whether their own steps before/after the base recipe changed. */
	beforeChanged?: boolean;
	afterChanged?: boolean;
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

/**
 * Matches `term` as a whole word. `\b` only knows ASCII letters, so it saw no
 * word start before the Ö of "Öl" and a word end inside "Olivenöl"; letter
 * lookarounds in Unicode mode get umlauts right.
 */
function wholeWord(term: string): RegExp {
	return new RegExp(`(?<![\\p{L}\\p{N}])${term}(?![\\p{L}\\p{N}])`, 'giu');
}

function replaceGermanCookingTerms(text: string): string {
	if (!text) return text;
	let result = text;
	Object.entries(INGREDIENT_TERMINOLOGY).forEach(([german, english]) => {
		result = result.replace(wholeWord(german), english);
	});
	return result;
}

function applyBritishEnglish(text: string): string {
	if (!text) return text;
	let result = text;
	Object.entries(US_TO_BRITISH_ENGLISH).forEach(([us, british]) => {
		result = result.replace(wholeWord(us), british);
	});
	return result;
}

interface DeepLResponse {
	translations: Array<{
		detected_source_language: string;
		text: string;
	}>;
}

// --- Collect texts for one batch, then read the translations back in order ---

/** Returns the translations one at a time, in the order the texts were collected. */
function reader(translated: string[]): () => string {
	let index = 0;
	return () => translated[index++];
}

function collectItems(texts: string[], items: IngredientListItem[] | undefined): void {
	(items || []).forEach((item) => {
		texts.push(item.name || '');
		texts.push(item.unit || '');
	});
}

function readItems(next: () => string, items: IngredientListItem[] | undefined): IngredientListItem[] {
	return (items || []).map((item) => ({
		name: next(),
		unit: next(),
		amount: item.amount,
	}));
}

function collectSteps(texts: string[], steps: string[] | undefined): void {
	(steps || []).forEach((step) => {
		texts.push(step || '');
	});
}

function readSteps(next: () => string, steps: string[] | undefined): string[] {
	return (steps || []).map(() => next());
}

function collectIngredientGroup(texts: string[], group: IngredientItem): void {
	if (group.type === 'reference') {
		texts.push(group.labelOverride || '');
		collectItems(texts, group.itemsBefore);
		collectItems(texts, group.itemsAfter);
	} else {
		texts.push(group.name || '');
		collectItems(texts, group.list);
	}
}

function readIngredientGroup(next: () => string, group: IngredientItem): IngredientItem {
	if (group.type === 'reference') {
		return {
			type: 'reference',
			name: group.name,
			baseRecipeRef: group.baseRecipeRef,
			includeIngredients: group.includeIngredients,
			showLabel: group.showLabel,
			labelOverride: next(),
			itemsBefore: readItems(next, group.itemsBefore) as IngredientReference['itemsBefore'],
			itemsAfter: readItems(next, group.itemsAfter) as IngredientReference['itemsAfter'],
		};
	}
	return {
		type: 'section',
		name: next(),
		list: readItems(next, group.list) as IngredientSection['list'],
	};
}

function collectInstructionGroup(texts: string[], group: InstructionItem): void {
	if (group.type === 'reference') {
		texts.push(group.labelOverride || '');
		collectSteps(texts, group.stepsBefore);
		collectSteps(texts, group.stepsAfter);
	} else {
		texts.push(group.name || '');
		collectSteps(texts, group.steps);
	}
}

function readInstructionGroup(next: () => string, group: InstructionItem): InstructionItem {
	if (group.type === 'reference') {
		return {
			type: 'reference',
			name: group.name,
			baseRecipeRef: group.baseRecipeRef,
			includeInstructions: group.includeInstructions,
			showLabel: group.showLabel,
			labelOverride: next(),
			stepsBefore: readSteps(next, group.stepsBefore) as InstructionReference['stepsBefore'],
			stepsAfter: readSteps(next, group.stepsAfter) as InstructionReference['stepsAfter'],
		};
	}
	return {
		type: 'section',
		name: next(),
		steps: readSteps(next, group.steps) as InstructionSection['steps'],
	};
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

	/** POSTs one request to DeepL and returns the translated texts, in order. */
	private async postDeepL(params: URLSearchParams): Promise<string[]> {
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
		return data.translations.map(t => t.text);
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
			const params = new URLSearchParams({
				text: replaceGermanCookingTerms(text),
				target_lang: targetLang,
				...(preserveFormatting && { tag_handling: 'xml' })
			});

			const [translatedText] = await this.postDeepL(params);
			return applyBritishEnglish(translatedText || '');
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

		const isNonEmpty = (text: string) => Boolean(text && text.trim());
		const nonEmptyTexts = texts.filter(isNonEmpty).map(replaceGermanCookingTerms);

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

			const processedTexts = (await this.postDeepL(params)).map(text => applyBritishEnglish(text));

			// Empty texts were not sent; they come back empty in their place.
			const next = reader(processedTexts);
			return texts.map(text => isNonEmpty(text) ? next() : '');
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
			ingredients.forEach((ing) => collectIngredientGroup(textsToTranslate, ing));

			const instructions: InstructionItem[] = recipe.instructions || [];
			instructions.forEach((inst) => collectInstructionGroup(textsToTranslate, inst));

			const images = Array.isArray(recipe.images) ? recipe.images : [];
			images.forEach((img) => {
				textsToTranslate.push(img.alt || '');
				textsToTranslate.push(img.caption || '');
			});

			const next = reader(await this.translateBatch(textsToTranslate));

			const translatedRecipe: TranslatedRecipeType = {
				short_name: this.generateEnglishSlug(recipe.name),
				name: next(),
				description: next(),
				preamble: next(),
				addendum: next(),
				note: next(),
				portions: next(),
				preparation: next(),
				cooking: next(),
				total_time: next(),
				baking: {
					temperature: next(),
					length: next(),
					mode: next(),
				},
				fermentation: {
					bulk: next(),
					final: next(),
				},
				category: translatedCategory,
				tags: tags.map(() => next()),
				ingredients: ingredients.map((ing) => readIngredientGroup(next, ing)),
				instructions: instructions.map((inst) => readInstructionGroup(next, inst)),
				images: images.map((img) => ({
					alt: next(),
					caption: next(),
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
			const oldValue = JSON.stringify(oldRecipe[field as keyof RecipeModelType] || '');
			const newValue = JSON.stringify(newRecipe[field as keyof RecipeModelType] || '');
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
					const nameChanged = oldGroup.labelOverride !== newGroup.labelOverride;
					const beforeChanged = JSON.stringify(oldGroup.itemsBefore || []) !== JSON.stringify(newGroup.itemsBefore || []);
					const afterChanged = JSON.stringify(oldGroup.itemsAfter || []) !== JSON.stringify(newGroup.itemsAfter || []);
					const referenceChanged =
						String(oldGroup.baseRecipeRef) !== String(newGroup.baseRecipeRef) ||
						oldGroup.includeIngredients !== newGroup.includeIngredients ||
						oldGroup.showLabel !== newGroup.showLabel ||
						nameChanged ||
						beforeChanged ||
						afterChanged;

					changes.push({ groupIndex: i, changed: referenceChanged, nameChanged, beforeChanged, afterChanged });
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
					const nameChanged = oldGroup.labelOverride !== newGroup.labelOverride;
					const beforeChanged = JSON.stringify(oldGroup.stepsBefore || []) !== JSON.stringify(newGroup.stepsBefore || []);
					const afterChanged = JSON.stringify(oldGroup.stepsAfter || []) !== JSON.stringify(newGroup.stepsAfter || []);
					const referenceChanged =
						String(oldGroup.baseRecipeRef) !== String(newGroup.baseRecipeRef) ||
						oldGroup.includeInstructions !== newGroup.includeInstructions ||
						oldGroup.showLabel !== newGroup.showLabel ||
						nameChanged ||
						beforeChanged ||
						afterChanged;

					changes.push({ groupIndex: i, changed: referenceChanged, nameChanged, beforeChanged, afterChanged });
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
				// A step only one side has is a change; an empty step on both is not.
				if (j >= oldSteps.length || j >= newSteps.length) {
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
			.replace(/ss/g, 'ss')
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
			if (ing.type === 'section') collectIngredientGroup(allTexts, ing);
		});

		const next = reader(await this.translateBatch(allTexts));

		return ingredients.map((ing): IngredientItem =>
			// references passed through
			ing.type === 'section' ? readIngredientGroup(next, ing) : ing
		);
	}

	/** Translates a whole group in one batch. */
	private async _translateIngredientGroup(group: IngredientItem): Promise<IngredientItem> {
		const texts: string[] = [];
		collectIngredientGroup(texts, group);
		return readIngredientGroup(reader(await this.translateBatch(texts)), group);
	}

	private async _translateItems(items: IngredientListItem[] | undefined): Promise<IngredientListItem[]> {
		const texts: string[] = [];
		collectItems(texts, items);
		return readItems(reader(await this.translateBatch(texts)), items);
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
					result.push(await this._translateIngredientGroup(ref));
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

				// Change detection compares against the old German source. Change info
				// without the per-list flags falls back to comparing with the existing
				// translation, which differs whenever the items have any text.
				if (changeInfo.beforeChanged ?? JSON.stringify(ref.itemsBefore) !== JSON.stringify(existingRef.itemsBefore)) {
					translatedRef.itemsBefore = await this._translateItems(ref.itemsBefore) as IngredientReference['itemsBefore'];
				}

				if (changeInfo.afterChanged ?? JSON.stringify(ref.itemsAfter) !== JSON.stringify(existingRef.itemsAfter)) {
					translatedRef.itemsAfter = await this._translateItems(ref.itemsAfter) as IngredientReference['itemsAfter'];
				}

				result.push(translatedRef);
				continue;
			}

			// Section type
			const section = group as IngredientSection;

			if (!changeInfo || !existingGroup) {
				result.push(await this._translateIngredientGroup(section));
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
					translatedList.push(...await this._translateItems([item]));
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
			if (inst.type === 'section') collectInstructionGroup(allTexts, inst);
		});

		const next = reader(await this.translateBatch(allTexts));

		return instructions.map((inst): InstructionItem =>
			inst.type === 'section' ? readInstructionGroup(next, inst) : inst
		);
	}

	/** Translates a whole group in one batch. */
	private async _translateInstructionGroup(group: InstructionItem): Promise<InstructionItem> {
		const texts: string[] = [];
		collectInstructionGroup(texts, group);
		return readInstructionGroup(reader(await this.translateBatch(texts)), group);
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
					result.push(await this._translateInstructionGroup(ref));
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

				// As for ingredient references: prefer the flags from comparing sources.
				if (changeInfo.beforeChanged ?? JSON.stringify(ref.stepsBefore) !== JSON.stringify(existingRef.stepsBefore)) {
					translatedRef.stepsBefore = await this.translateBatch(
						(ref.stepsBefore || []).map(s => s || '')
					) as InstructionReference['stepsBefore'];
				}

				if (changeInfo.afterChanged ?? JSON.stringify(ref.stepsAfter) !== JSON.stringify(existingRef.stepsAfter)) {
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
				result.push(await this._translateInstructionGroup(section));
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
