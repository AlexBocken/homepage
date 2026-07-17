/** Public URL of a recipe's thumbnail, from the `mediapath` stored on the recipe. */
export function recipeThumbUrl(mediapath: string): string {
	return `https://bocken.org/static/rezepte/thumb/${mediapath}`;
}
