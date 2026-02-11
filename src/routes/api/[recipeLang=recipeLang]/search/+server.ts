import { json, type RequestHandler } from '@sveltejs/kit';
import type { BriefRecipeType } from '$types/types';
import { Recipe } from '$models/Recipe';
import { dbConnect } from '$utils/db';
import { isEnglish, briefQueryConfig, toBrief } from '$lib/server/recipeHelpers';

export const GET: RequestHandler = async ({ url, params, locals }) => {
  await dbConnect();

  const { approvalFilter, prefix, projection } = briefQueryConfig(params.recipeLang);
  const en = isEnglish(params.recipeLang);

  const query = url.searchParams.get('q')?.toLowerCase().trim() || '';
  const category = url.searchParams.get('category');

  const singleTag = url.searchParams.get('tag');
  const multipleTags = url.searchParams.get('tags');
  const tags = multipleTags
    ? multipleTags.split(',').map(t => t.trim()).filter(Boolean)
    : (singleTag ? [singleTag] : []);

  const icon = url.searchParams.get('icon');

  const singleSeason = url.searchParams.get('season');
  const multipleSeasons = url.searchParams.get('seasons');
  const seasons = multipleSeasons
    ? multipleSeasons.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n))
    : (singleSeason ? [parseInt(singleSeason)].filter(n => !isNaN(n)) : []);

  const favoritesOnly = url.searchParams.get('favorites') === 'true';

  try {
    let dbQuery: any = { ...approvalFilter };

    if (category) {
      dbQuery[`${prefix}category`] = category;
    }
    if (tags.length > 0) {
      dbQuery[`${prefix}tags`] = { $all: tags };
    }
    if (icon) {
      dbQuery.icon = icon;
    }
    if (seasons.length > 0) {
      dbQuery.season = { $in: seasons };
    }

    const dbRecipes = await Recipe.find(dbQuery, projection).lean();
    let recipes: BriefRecipeType[] = dbRecipes.map(r => toBrief(r, params.recipeLang));

    // Handle favorites filter
    if (favoritesOnly && locals.session?.user) {
      const { UserFavorites } = await import('$models/UserFavorites');
      const userFavorites = await UserFavorites.findOne({ username: locals.session.user.username });
      if (userFavorites?.favorites) {
        const favoriteIds = userFavorites.favorites;
        recipes = recipes.filter(recipe => favoriteIds.some(id => id.toString() === recipe._id?.toString()));
      } else {
        recipes = [];
      }
    }

    // Apply text search
    if (query) {
      const searchTerms = query.normalize('NFD').replace(/\p{Diacritic}/gu, "").split(" ");
      recipes = recipes.filter(recipe => {
        const searchString = `${recipe.name} ${recipe.description || ''} ${recipe.tags?.join(' ') || ''}`.toLowerCase()
          .normalize('NFD').replace(/\p{Diacritic}/gu, "").replace(/&shy;|­/g, '');
        return searchTerms.every(term => searchString.includes(term));
      });
    }

    return json(JSON.parse(JSON.stringify(recipes)));
  } catch (e) {
    return json({ error: 'Search failed' }, { status: 500 });
  }
};
