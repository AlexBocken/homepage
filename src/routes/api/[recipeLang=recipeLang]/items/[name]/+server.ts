import { json, type RequestHandler } from '@sveltejs/kit';
import { Recipe } from '$models/Recipe';
import { dbConnect } from '$utils/db';
import { error } from '@sveltejs/kit';
import type { RecipeModelType, IngredientItem, InstructionItem } from '$types/types';
import { isEnglish } from '$lib/server/recipeHelpers';
import { getNutritionEntryByFdcId, getBlsEntryByCode, computeRecipeNutritionTotals } from '$lib/server/nutritionMatcher';

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

/** Parse anchor href from ingredient name, return short_name or null */
function parseAnchorRecipeRef(ingredientName: string): string | null {
  const match = ingredientName.match(/<a\s+href=["']?([^"' >]+)["']?[^>]*>/i);
  if (!match) return null;
  let href = match[1].trim();
  // Strip query params (e.g., ?multiplier={{multiplier}})
  href = href.split('?')[0];
  // Skip external links
  if (href.startsWith('http') || href.includes('://')) return null;
  // Strip leading path components like /rezepte/ or ./
  href = href.replace(/^(\.?\/?rezepte\/|\.\/|\/)/, '');
  // Skip if contains a dot (file extensions, external domains)
  if (href.includes('.')) return null;
  return href || null;
}

/**
 * Build nutrition totals for referenced recipes:
 * 1. Base recipe references (type='reference' with populated baseRecipeRef)
 * 2. Anchor-tag references in ingredient names (<a href=...>)
 */
async function resolveReferencedNutrition(
  ingredients: any[],
): Promise<{ shortName: string; name: string; nutrition: Record<string, number>; baseMultiplier: number }[]> {
  const results: { shortName: string; name: string; nutrition: Record<string, number>; baseMultiplier: number }[] = [];
  const processedSlugs = new Set<string>();

  for (const section of ingredients) {
    // Type 1: Base recipe references
    if (section.type === 'reference' && section.baseRecipeRef) {
      const ref = section.baseRecipeRef;
      const slug = ref.short_name;
      if (processedSlugs.has(slug)) continue;
      processedSlugs.add(slug);

      if (ref.nutritionMappings?.length > 0) {
        const mult = section.baseMultiplier || 1;
        const nutrition = computeRecipeNutritionTotals(ref.ingredients || [], ref.nutritionMappings, 1);
        results.push({ shortName: slug, name: ref.name, nutrition, baseMultiplier: mult });
      }
    }

    // Type 2: Anchor-tag references in ingredient names
    if (section.list) {
      for (const item of section.list) {
        const refSlug = parseAnchorRecipeRef(item.name || '');
        if (!refSlug || processedSlugs.has(refSlug)) continue;
        processedSlugs.add(refSlug);

        // Look up the referenced recipe
        const refRecipe = await Recipe.findOne({ short_name: refSlug })
          .select('short_name name ingredients nutritionMappings portions')
          .lean();
        if (!refRecipe?.nutritionMappings?.length) continue;

        const nutrition = computeRecipeNutritionTotals(
          refRecipe.ingredients || [], refRecipe.nutritionMappings, 1
        );
        results.push({ shortName: refSlug, name: refRecipe.name, nutrition, baseMultiplier: 1 });
      }
    }
  }

  return results;
}

export const GET: RequestHandler = async ({ params }) => {
  await dbConnect();
  const en = isEnglish(params.recipeLang!);

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
      season: rawRecipe.season || [],
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
    recipe.referencedNutrition = await resolveReferencedNutrition(rawRecipe.ingredients || []);

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
  recipe.referencedNutrition = await resolveReferencedNutrition(rawRecipe.ingredients || []);
  return json(recipe);
};
