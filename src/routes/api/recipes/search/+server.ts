import { json, type RequestHandler } from '@sveltejs/kit';
import type { BriefRecipeType } from '../../../../types/types';
import { Recipe } from '../../../../models/Recipe';
import { dbConnect } from '../../../../utils/db';

export const GET: RequestHandler = async ({ url, locals }) => {
  await dbConnect();

  const query = url.searchParams.get('q')?.toLowerCase().trim() || '';
  const category = url.searchParams.get('category');
  const tag = url.searchParams.get('tag');
  const icon = url.searchParams.get('icon');
  const season = url.searchParams.get('season');
  const favoritesOnly = url.searchParams.get('favorites') === 'true';

  try {
    // Build base query - only recipes with English translations
    let dbQuery: any = {
      'translations.en': { $exists: true }
    };

    // Apply filters based on context
    if (category) {
      dbQuery['translations.en.category'] = category;
    }

    if (tag) {
      dbQuery['translations.en.tags'] = { $in: [tag] };
    }

    if (icon) {
      dbQuery.icon = icon;  // Icon is the same for both languages
    }

    if (season) {
      const seasonNum = parseInt(season);
      if (!isNaN(seasonNum)) {
        dbQuery.season = { $in: [seasonNum] };  // Season is the same for both languages
      }
    }

    // Get all recipes matching base filters
    let recipes = await Recipe.find(dbQuery).lean();

    // Handle favorites filter
    if (favoritesOnly && locals.session?.user) {
      const { UserFavorites } = await import('../../../../models/UserFavorites');
      const userFavorites = await UserFavorites.findOne({ username: locals.session.user.username });
      if (userFavorites && userFavorites.favorites) {
        const favoriteIds = userFavorites.favorites;
        recipes = recipes.filter(recipe => favoriteIds.some(id => id.toString() === recipe._id?.toString()));
      } else {
        recipes = [];
      }
    }

    // Transform to English brief format
    let briefRecipes: BriefRecipeType[] = recipes.map(recipe => ({
      _id: recipe._id,
      name: recipe.translations.en.name,
      short_name: recipe.translations.en.short_name,
      tags: recipe.translations.en.tags || [],
      category: recipe.translations.en.category,
      icon: recipe.icon,
      description: recipe.translations.en.description,
      season: recipe.season,
      dateModified: recipe.dateModified,
      germanShortName: recipe.short_name
    }));

    // Apply text search if query provided
    if (query) {
      const searchTerms = query.normalize('NFD').replace(/\p{Diacritic}/gu, "").split(" ");

      briefRecipes = briefRecipes.filter(recipe => {
        const searchString = `${recipe.name} ${recipe.description || ''} ${recipe.tags?.join(' ') || ''}`.toLowerCase()
          .normalize('NFD').replace(/\p{Diacritic}/gu, "").replace(/&shy;|­/g, '');

        return searchTerms.every(term => searchString.includes(term));
      });
    }

    return json(JSON.parse(JSON.stringify(briefRecipes)));

  } catch (error) {
    return json({ error: 'Search failed' }, { status: 500 });
  }
};
