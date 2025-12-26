import { writable } from 'svelte/store';

interface RecipeTranslationData {
	germanShortName: string;
	englishShortName?: string;
	hasEnglishTranslation: boolean;
}

export const recipeTranslationStore = writable<RecipeTranslationData | null>(null);
