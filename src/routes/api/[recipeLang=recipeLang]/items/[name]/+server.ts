import { json, type RequestHandler } from '@sveltejs/kit';
import { Recipe } from '$models/Recipe';
import { dbConnect } from '$utils/db';
import { error } from '@sveltejs/kit';
import type { RecipeModelType, IngredientItem, InstructionItem } from '$types/types';
import { isEnglish } from '$lib/server/recipeHelpers';
import { getNutritionEntryByFdcId, getBlsEntryByCode, resolveReferencedNutrition } from '$lib/server/nutritionMatcher';

/** Recursively map populated baseRecipeRef to resolvedRecipe field */
function mapBaseRecipeRefs(items: any[]): any[] {
  return items.map((item) => {
    if (item.type === 'reference' && item.baseRecipeRef) {
      const resolvedRecipe = { ...item.baseRecipeRef };
      if (resolvedRecipe.ingredients) {
        resolvedRecipe.ingredients = mapBaseRecipeRefs(resolvedRecipe.ingredients);
      }
      if (resolvedRecipe.instructions) {
        resolvedRecipe.instructions = mapBaseRecipeRefs(resolvedRecipe.instructions);
      }
      return { ...item, resolvedRecipe };
    }
    return item;
  });
}

/** Resolve per100g nutrition data into mappings so client doesn't need the full DB */
function resolveNutritionData(mappings: any[]): any[] {
  if (!mappings || mappings.length === 0) return [];
  return mappings.map((m: any) => {
    if (m.matchMethod === 'none') return m;
    // BLS source: look up by blsCode
    if (m.blsCode && m.source === 'bls') {
      const entry = getBlsEntryByCode(m.blsCode);
      if (entry) return { ...m, per100g: entry.per100g };
    }
    // USDA source: look up by fdcId
    if (m.fdcId) {
      const entry = getNutritionEntryByFdcId(m.fdcId);
      if (entry) return { ...m, per100g: entry.per100g };
    }
    return m;
  });
}

export const GET: RequestHandler = async ({ params, setHeaders }) => {
  await dbConnect();
  const en = isEnglish(params.recipeLang!);

  // Individual recipes change when the author edits them. 5 min browser + 1 h
  // edge cache with SWR lets proxies keep hot recipes fresh without blocking
  // on the DB; stale content beyond max-age is tolerable here.
  setHeaders({ 'Cache-Control': 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400' });

  const query = en
    ? { 'translations.en.short_name': params.name }
    : { short_name: params.name };

  const populatePaths = en
    ? [
        {
          path: 'translations.en.ingredients.baseRecipeRef',
          select: 'short_name name ingredients instructions translations nutritionMappings portions',
          populate: {
            path: 'ingredients.baseRecipeRef',
            select: 'short_name name ingredients instructions translations nutritionMappings portions',
            populate: {
              path: 'ingredients.baseRecipeRef',
              select: 'short_name name ingredients instructions translations nutritionMappings portions'
            }
          }
        },
        {
          path: 'translations.en.instructions.baseRecipeRef',
          select: 'short_name name ingredients instructions translations nutritionMappings portions',
          populate: {
            path: 'instructions.baseRecipeRef',
            select: 'short_name name ingredients instructions translations nutritionMappings portions',
            populate: {
              path: 'instructions.baseRecipeRef',
              select: 'short_name name ingredients instructions translations nutritionMappings portions'
            }
          }
        }
      ]
    : [
        {
          path: 'ingredients.baseRecipeRef',
          select: 'short_name name ingredients translations nutritionMappings portions',
          populate: {
            path: 'ingredients.baseRecipeRef',
            select: 'short_name name ingredients translations nutritionMappings portions',
            populate: {
              path: 'ingredients.baseRecipeRef',
              select: 'short_name name ingredients translations nutritionMappings portions'
            }
          }
        },
        {
          path: 'instructions.baseRecipeRef',
          select: 'short_name name instructions translations',
          populate: {
            path: 'instructions.baseRecipeRef',
            select: 'short_name name instructions translations',
            populate: {
              path: 'instructions.baseRecipeRef',
              select: 'short_name name instructions translations'
            }
          }
        }
      ];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- mongoose query builder requires chained .populate() calls
  let dbQuery: any = Recipe.findOne(query);
  for (const p of populatePaths) {
    dbQuery = dbQuery.populate(p);
  }
  const rawRecipe = await dbQuery.lean();

  if (!rawRecipe) {
    throw error(404, 'Recipe not found');
  }

  if (en) {
    if (!rawRecipe.translations?.en) {
      throw error(404, 'English translation not available for this recipe');
    }

    const t = rawRecipe.translations.en;
    let recipe: Record<string, unknown> = {
      _id: rawRecipe._id,
      short_name: t.short_name,
      name: t.name,
      description: t.description,
      preamble: t.preamble || '',
      addendum: t.addendum || '',
      note: t.note || '',
      category: t.category,
      tags: t.tags || [],
      ingredients: t.ingredients || [],
      instructions: t.instructions || [],
      images: rawRecipe.images || [],
      icon: rawRecipe.icon || '',
      dateCreated: rawRecipe.dateCreated,
      dateModified: rawRecipe.dateModified,
      seasonRanges: rawRecipe.seasonRanges || [],
      baking: t.baking || rawRecipe.baking || { temperature: '', length: '', mode: '' },
      preparation: t.preparation || rawRecipe.preparation || '',
      fermentation: t.fermentation || rawRecipe.fermentation || { bulk: '', final: '' },
      portions: t.portions || rawRecipe.portions || '',
      cooking: t.cooking || rawRecipe.cooking || '',
      total_time: t.total_time || rawRecipe.total_time || '',
      translationStatus: t.translationStatus,
      germanShortName: rawRecipe.short_name,
      nutritionMappings: resolveNutritionData(rawRecipe.nutritionMappings || []),
    };

    if (recipe.ingredients) {
      recipe.ingredients = mapBaseRecipeRefs(recipe.ingredients as any[]);
    }
    if (recipe.instructions) {
      recipe.instructions = mapBaseRecipeRefs(recipe.instructions as any[]);
    }

    // Resolve nutrition from referenced recipes (base refs + anchor tags)
    recipe.referencedNutrition = await resolveReferencedNutrition(rawRecipe.ingredients || [], rawRecipe.nutritionMappings);

    // Merge English alt/caption with original image paths
    const imagesArray = Array.isArray(rawRecipe.images) ? rawRecipe.images : (rawRecipe.images ? [rawRecipe.images] : []);
    if (imagesArray.length > 0) {
      const translatedImages = t.images || [];
      recipe.images = imagesArray.map((img: { mediapath: string; alt?: string; caption?: string; color?: string }, index: number) => ({
        mediapath: img.mediapath,
        alt: translatedImages[index]?.alt || img.alt || '',
        caption: translatedImages[index]?.caption || img.caption || '',
        color: img.color || '',
      }));
    }

    return json(recipe);
  }

  // German: pass through with base recipe ref mapping
  let recipe = JSON.parse(JSON.stringify(rawRecipe));
  recipe.nutritionMappings = resolveNutritionData(recipe.nutritionMappings || []);
  if (recipe.ingredients) {
    recipe.ingredients = mapBaseRecipeRefs(recipe.ingredients);
  }
  if (recipe.instructions) {
    recipe.instructions = mapBaseRecipeRefs(recipe.instructions);
  }
  // Resolve nutrition from referenced recipes (base refs + anchor tags)
  recipe.referencedNutrition = await resolveReferencedNutrition(rawRecipe.ingredients || [], rawRecipe.nutritionMappings);
  return json(recipe);
};
