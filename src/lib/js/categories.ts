/**
 * Get the list of recipe categories based on language
 */
export function getCategories(lang: string): string[] {
	const isEnglish = lang === 'en';
	return isEnglish
		? ["Main course", "Noodle", "Bread", "Dessert", "Soup", "Side dish", "Salad", "Cake", "Breakfast", "Sauce", "Ingredient", "Drink", "Spread", "Biscuits", "Snack"]
		: ["Hauptspeise", "Nudel", "Brot", "Dessert", "Suppe", "Beilage", "Salat", "Kuchen", "Frühstück", "Sauce", "Zutat", "Getränk", "Aufstrich", "Guetzli", "Snack"];
}
