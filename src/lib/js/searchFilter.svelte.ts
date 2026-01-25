/**
 * Shared search filter composable for recipe list pages.
 * Extracts duplicated search state logic from multiple pages.
 */

type Recipe = { _id: string; [key: string]: any };

export function createSearchFilter<T extends Recipe>(getRecipes: () => T[]) {
	let matchedRecipeIds = $state(new Set<string>());
	let hasActiveSearch = $state(false);

	function handleSearchResults(ids: Set<string>, _categories?: Set<string>) {
		matchedRecipeIds = ids;
		hasActiveSearch = ids.size < getRecipes().length;
	}

	const filtered = $derived.by(() => {
		if (!hasActiveSearch) return getRecipes();
		return getRecipes().filter(r => matchedRecipeIds.has(r._id));
	});

	return {
		get filtered() { return filtered; },
		get hasActiveSearch() { return hasActiveSearch; },
		handleSearchResults
	};
}
