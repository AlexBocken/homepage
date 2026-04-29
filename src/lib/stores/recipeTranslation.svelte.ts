export interface RecipeTranslationData {
	germanShortName: string;
	englishShortName?: string;
	hasEnglishTranslation: boolean;
}

function createRecipeTranslation() {
	let value = $state<RecipeTranslationData | null>(null);

	return {
		get value() { return value; },
		set: (v: RecipeTranslationData | null) => { value = v; }
	};
}

export const recipeTranslationStore = createRecipeTranslation();
