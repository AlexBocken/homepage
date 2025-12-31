/**
 * Web Worker for recipe search
 * Handles text normalization and filtering off the main thread
 */

let recipes = [];

self.onmessage = (e) => {
  const { type, data } = e.data;

  if (type === 'init') {
    // Initialize worker with recipe data
    recipes = data.recipes || [];
    self.postMessage({ type: 'ready' });
  }

  if (type === 'search') {
    const query = data.query;

    // Empty query = show all recipes
    if (!query || query.trim().length === 0) {
      self.postMessage({
        type: 'results',
        matchedIds: recipes.map(r => r._id),
        matchedCategories: new Set(recipes.map(r => r.category))
      });
      return;
    }

    // Normalize and split search query
    const searchText = query.toLowerCase().trim()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, "");
    const searchTerms = searchText.split(" ").filter(term => term.length > 0);

    // Filter recipes
    const matched = recipes.filter(recipe => {
      // Build searchable string from recipe data
      const searchString = [
        recipe.name || '',
        recipe.description || '',
        ...(recipe.tags || [])
      ].join(' ')
        .toLowerCase()
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, "")
        .replace(/&shy;|­/g, ''); // Remove soft hyphens

      // All search terms must match
      return searchTerms.every(term => searchString.includes(term));
    });

    // Return matched recipe IDs and categories with results
    self.postMessage({
      type: 'results',
      matchedIds: matched.map(r => r._id),
      matchedCategories: new Set(matched.map(r => r.category))
    });
  }
};
