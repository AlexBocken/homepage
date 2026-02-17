import type { BriefRecipeType } from '$types/types';

/**
 * Check whether a recipeLang param refers to the English version.
 */
export function isEnglish(recipeLang: string): boolean {
	return recipeLang === 'recipes';
}

/**
 * Build a MongoDB query filter and field selection for brief recipe lists,
 * handling German (root fields) vs English (translations.en.*) transparently.
 */
export function briefQueryConfig(recipeLang: string) {
	const en = isEnglish(recipeLang);
	return {
		/** Extra filter to merge into every query (approval check for English) */
		approvalFilter: en ? { 'translations.en.translationStatus': 'approved' } : {},
		/** Field path prefix for translated fields (category, tags, name, etc.) */
		prefix: en ? 'translations.en.' : '',
		/** Projection for brief list queries */
		projection: en
			? '_id translations.en short_name images season dateModified icon'
			: 'name short_name images tags category icon description season dateModified',
	};
}

/**
 * Map a raw DB recipe document to the brief format used by the frontend.
 * For English, extracts from translations.en and adds germanShortName.
 * For German, passes through root-level fields.
 */
export function toBrief(recipe: any, recipeLang: string): BriefRecipeType {
	if (isEnglish(recipeLang)) {
		return {
			_id: recipe._id,
			name: recipe.translations.en.name,
			short_name: recipe.translations.en.short_name,
			images: recipe.images?.[0]
				? [{ alt: recipe.images[0].alt, mediapath: recipe.images[0].mediapath, color: recipe.images[0].color }]
				: [],
			tags: recipe.translations.en.tags || [],
			category: recipe.translations.en.category,
			icon: recipe.icon,
			description: recipe.translations.en.description,
			season: recipe.season || [],
			dateModified: recipe.dateModified,
			germanShortName: recipe.short_name,
		} as BriefRecipeType;
	}
	return {
		...recipe,
		images: recipe.images?.[0]
			? [{ alt: recipe.images[0].alt, mediapath: recipe.images[0].mediapath, color: recipe.images[0].color }]
			: [],
	} as BriefRecipeType;
}
