import { json, type RequestHandler } from '@sveltejs/kit';
import type { BriefRecipeType } from '../../../../types/types';
import { Recipe } from '../../../../models/Recipe';
import { dbConnect, dbDisconnect } from '../../../../utils/db';

export const GET: RequestHandler = async ({ url, locals }) => {
  await dbConnect();
  
  const query = url.searchParams.get('q')?.toLowerCase().trim() || '';
  const category = url.searchParams.get('category');
  const tag = url.searchParams.get('tag');
  const icon = url.searchParams.get('icon');
  const season = url.searchParams.get('season');
  const favoritesOnly = url.searchParams.get('favorites') === 'true';
  
  try {
    // Build base query
    let dbQuery: any = {};
    
    // Apply filters based on context
    if (category) {
      dbQuery.category = category;
    }
    
    if (tag) {
      dbQuery.tags = { $in: [tag] };
    }
    
    if (icon) {
      dbQuery.icon = icon;
    }
    
    if (season) {
      const seasonNum = parseInt(season);
      if (!isNaN(seasonNum)) {
        dbQuery.season = { $in: [seasonNum] };
      }
    }
    
    // Get all recipes matching base filters
    let recipes = await Recipe.find(dbQuery, 'name short_name tags category icon description season dateModified').lean() as BriefRecipeType[];
    
    // Handle favorites filter
    if (favoritesOnly && locals.session?.user) {
      const User = (await import('../../../../models/User')).User;
      const user = await User.findById(locals.session.user.id);
      if (user && user.favoriteRecipes) {
        const favoriteShortNames = user.favoriteRecipes;
        recipes = recipes.filter(recipe => favoriteShortNames.includes(recipe.short_name));
      } else {
        recipes = [];
      }
    }
    
    // Apply text search if query provided
    if (query) {
      const searchTerms = query.normalize('NFD').replace(/\p{Diacritic}/gu, "").split(" ");
      
      recipes = recipes.filter(recipe => {
        const searchString = `${recipe.name} ${recipe.description || ''} ${recipe.tags?.join(' ') || ''}`.toLowerCase()
          .normalize('NFD').replace(/\p{Diacritic}/gu, "").replace(/&shy;|­/g, '');
        
        return searchTerms.every(term => searchString.includes(term));
      });
    }
    
    await dbDisconnect();
    return json(JSON.parse(JSON.stringify(recipes)));
    
  } catch (error) {
    await dbDisconnect();
    return json({ error: 'Search failed' }, { status: 500 });
  }
};