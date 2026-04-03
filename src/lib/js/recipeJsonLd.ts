function parseTimeToISO8601(timeString: string | undefined): string | undefined {
  if (!timeString) return undefined;
  
  // Handle common German time formats
  const cleanTime = timeString.toLowerCase().trim();
  
  // Match patterns like "30 min", "2 h", "1.5 h", "90 min"
  const minMatch = cleanTime.match(/(\d+(?:[.,]\d+)?)\s*(?:min|minuten?)/);
  const hourMatch = cleanTime.match(/(\d+(?:[.,]\d+)?)\s*(?:h|stunden?|std)/);
  
  if (minMatch) {
    const minutes = Math.round(parseFloat(minMatch[1].replace(',', '.')));
    return `PT${minutes}M`;
  }
  
  if (hourMatch) {
    const hours = parseFloat(hourMatch[1].replace(',', '.'));
    if (hours % 1 === 0) {
      return `PT${Math.round(hours)}H`;
    } else {
      const totalMinutes = Math.round(hours * 60);
      return `PT${totalMinutes}M`;
    }
  }
  
  return undefined;
}

import type { RecipeModelType, NutritionMapping } from '$types/types';

interface HowToStep {
  "@type": "HowToStep";
  name: string;
  text: string;
}

interface RecipeJsonLd {
  "@context": string;
  "@type": string;
  name: string;
  description: string;
  author: { "@type": string; name: string };
  datePublished?: string;
  dateModified?: string;
  recipeCategory: string;
  keywords?: string;
  image: { "@type": string; url: string; width: number; height: number };
  recipeIngredient: string[];
  recipeInstructions: HowToStep[];
  url: string;
  recipeYield?: string;
  prepTime?: string;
  cookTime?: string;
  totalTime?: string;
  [key: string]: unknown;
}

export function generateRecipeJsonLd(data: RecipeModelType) {
  const jsonLd: RecipeJsonLd = {
    "@context": "https://schema.org",
    "@type": "Recipe",
    "name": data.name?.replace(/<[^>]*>/g, ''), // Strip HTML tags
    "description": data.description,
    "author": {
      "@type": "Person",
      "name": "Alexander Bocken"
    },
    "datePublished": data.dateCreated ? new Date(data.dateCreated).toISOString() : undefined,
    "dateModified": data.dateModified ? new Date(data.dateModified).toISOString() : undefined,
    "recipeCategory": data.category,
    "keywords": data.tags?.join(', '),
    "image": {
      "@type": "ImageObject",
      "url": `https://bocken.org/static/rezepte/full/${data.images?.[0]?.mediapath || `${data.short_name}.webp`}`,
      "width": 1200,
      "height": 800
    },
    "recipeIngredient": [] as string[],
    "recipeInstructions": [] as HowToStep[],
    "url": `https://bocken.org/rezepte/${data.short_name}`
  };

  // Add optional fields if they exist
  if (data.portions) {
    jsonLd.recipeYield = data.portions;
  }

  // Parse times properly for ISO 8601
  const prepTime = parseTimeToISO8601(data.preparation);
  if (prepTime) jsonLd.prepTime = prepTime;

  const cookTime = parseTimeToISO8601(data.cooking);
  if (cookTime) jsonLd.cookTime = cookTime;

  const totalTime = parseTimeToISO8601(data.total_time);
  if (totalTime) jsonLd.totalTime = totalTime;

  // Extract ingredients
  if (data.ingredients) {
    for (const ingredientGroup of data.ingredients) {
      if ('list' in ingredientGroup && ingredientGroup.list) {
        for (const ingredient of ingredientGroup.list) {
          if (ingredient.name) {
            let ingredientText = ingredient.name;
            if (ingredient.amount) {
              ingredientText = `${ingredient.amount} ${ingredient.unit || ''} ${ingredient.name}`.trim();
            }
            jsonLd.recipeIngredient.push(ingredientText);
          }
        }
      }
    }
  }

  // Extract instructions
  if (data.instructions) {
    for (const instructionGroup of data.instructions) {
      if ('steps' in instructionGroup && instructionGroup.steps) {
        for (let i = 0; i < instructionGroup.steps.length; i++) {
          jsonLd.recipeInstructions.push({
            "@type": "HowToStep",
            "name": `Schritt ${i + 1}`,
            "text": instructionGroup.steps[i]
          });
        }
      }
    }
  }

  // Add baking instructions if available
  if (data.baking?.temperature || data.baking?.length) {
    const bakingText = [
      data.baking.temperature ? `bei ${data.baking.temperature}` : '',
      data.baking.length ? `für ${data.baking.length}` : '',
      data.baking.mode || ''
    ].filter(Boolean).join(' ');
    
    if (bakingText) {
      jsonLd.recipeInstructions.push({
        "@type": "HowToStep",
        "name": "Backen",
        "text": `Backen ${bakingText}`
      });
    }
  }

  // Add nutrition information from stored mappings
  const nutritionInfo = computeNutritionInfo(data.ingredients || [], data.nutritionMappings, data.portions);
  if (nutritionInfo) {
    jsonLd.nutrition = nutritionInfo;
  }

  // Clean up undefined values
  Object.keys(jsonLd).forEach(key => {
    if (jsonLd[key] === undefined) {
      delete jsonLd[key];
    }
  });

  return jsonLd;
}

function parseAmount(amount: string): number {
  if (!amount?.trim()) return 0;
  const s = amount.trim().replace(',', '.');
  const rangeMatch = s.match(/^(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)$/);
  if (rangeMatch) return (parseFloat(rangeMatch[1]) + parseFloat(rangeMatch[2])) / 2;
  const fractionMatch = s.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (fractionMatch) return parseInt(fractionMatch[1]) / parseInt(fractionMatch[2]);
  const mixedMatch = s.match(/^(\d+)\s+(\d+)\s*\/\s*(\d+)$/);
  if (mixedMatch) return parseInt(mixedMatch[1]) + parseInt(mixedMatch[2]) / parseInt(mixedMatch[3]);
  const parsed = parseFloat(s);
  return isNaN(parsed) ? 0 : parsed;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '');
}

function computeNutritionInfo(
  ingredients: any[],
  mappings: NutritionMapping[] | undefined,
  portions: string | undefined,
): Record<string, string> | null {
  if (!mappings || mappings.length === 0) return null;

  const index = new Map(
    mappings.map(m => [`${m.sectionIndex}-${m.ingredientIndex}`, m])
  );

  const totals = { calories: 0, protein: 0, fat: 0, saturatedFat: 0, carbs: 0, fiber: 0, sugars: 0, sodium: 0, cholesterol: 0 };

  // Collect section names for dedup
  const sectionNames = new Set<string>();
  for (const section of ingredients) {
    if (section.name) sectionNames.add(stripHtml(section.name).toLowerCase().trim());
  }

  for (let si = 0; si < ingredients.length; si++) {
    const section = ingredients[si];
    if (section.type === 'reference' || !section.list) continue;
    const currentSectionName = section.name ? stripHtml(section.name).toLowerCase().trim() : '';

    for (let ii = 0; ii < section.list.length; ii++) {
      const item = section.list[ii];
      const rawName = item.name || '';
      const itemName = stripHtml(rawName).toLowerCase().trim();
      if (/<a\s/i.test(rawName)) continue;
      if (itemName && sectionNames.has(itemName) && itemName !== currentSectionName) continue;

      const m = index.get(`${si}-${ii}`);
      if (!m || m.matchMethod === 'none' || m.excluded || !m.per100g) continue;

      const amount = parseAmount(item.amount || '') || (m.defaultAmountUsed ? 1 : 0);
      const grams = amount * (m.gramsPerUnit || 0);
      const factor = grams / 100;

      totals.calories += factor * m.per100g.calories;
      totals.protein += factor * m.per100g.protein;
      totals.fat += factor * m.per100g.fat;
      totals.saturatedFat += factor * m.per100g.saturatedFat;
      totals.carbs += factor * m.per100g.carbs;
      totals.fiber += factor * m.per100g.fiber;
      totals.sugars += factor * m.per100g.sugars;
      totals.sodium += factor * m.per100g.sodium;
      totals.cholesterol += factor * m.per100g.cholesterol;
    }
  }

  if (totals.calories === 0) return null;

  // Parse portion count for per-serving values
  const portionMatch = portions?.match(/^(\d+(?:[.,]\d+)?)/);
  const portionCount = portionMatch ? parseFloat(portionMatch[1].replace(',', '.')) : 0;
  const div = portionCount > 0 ? portionCount : 1;

  const fmt = (val: number, unit: string) => `${Math.round(val / div)} ${unit}`;

  const info: Record<string, string> = {
    '@type': 'NutritionInformation',
    calories: `${Math.round(totals.calories / div)} calories`,
    proteinContent: fmt(totals.protein, 'g'),
    fatContent: fmt(totals.fat, 'g'),
    saturatedFatContent: fmt(totals.saturatedFat, 'g'),
    carbohydrateContent: fmt(totals.carbs, 'g'),
    fiberContent: fmt(totals.fiber, 'g'),
    sugarContent: fmt(totals.sugars, 'g'),
    sodiumContent: fmt(totals.sodium, 'mg'),
    cholesterolContent: fmt(totals.cholesterol, 'mg'),
  };

  if (portionCount > 0) {
    info.servingSize = `1 portion (${portionCount} total)`;
  }

  return info;
}