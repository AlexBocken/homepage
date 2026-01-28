import { browser } from '$app/environment';
import { generateRecipeJsonLd } from '$lib/js/recipeJsonLd';
import { isOffline, canUseOfflineData } from '$lib/offline/helpers';
import { getFullRecipe, isOfflineDataAvailable } from '$lib/offline/db';
import { stripHtmlTags } from '$lib/js/stripHtmlTags';

export async function load({ fetch, params, url, data }) {
    const isEnglish = params.recipeLang === 'recipes';

    // Check if we need to load from IndexedDB (offline mode)
    // Only check on the client side
    let item: any;
    let isOfflineMode = false;

    // On the client, check if we need to load from IndexedDB
    const shouldUseOfflineData = browser && (isOffline() || data?.isOffline || !data?.item) && canUseOfflineData();

    if (shouldUseOfflineData) {
        try {
            const hasOfflineData = await isOfflineDataAvailable();
            if (hasOfflineData) {
                // For English routes, the name param is the English short_name
                // We need to find the recipe by its translations.en.short_name or short_name
                let recipe = await getFullRecipe(params.name);

                if (recipe) {
                    // Apply English translation if needed
                    if (isEnglish && recipe.translations?.en) {
                        const enTrans = recipe.translations.en;
                        // Use type assertion to avoid tuple/array type mismatch
                        const recipeAny = recipe as any;
                        item = {
                            ...recipeAny,
                            name: enTrans.name || recipe.name,
                            description: enTrans.description || recipe.description,
                            preamble: enTrans.preamble || recipe.preamble,
                            addendum: enTrans.addendum || recipe.addendum,
                            note: enTrans.note,
                            category: enTrans.category || recipe.category,
                            tags: enTrans.tags || recipe.tags,
                            portions: enTrans.portions || recipe.portions,
                            preparation: enTrans.preparation || recipe.preparation,
                            cooking: enTrans.cooking || recipe.cooking,
                            total_time: enTrans.total_time || recipe.total_time,
                            baking: enTrans.baking || recipe.baking,
                            fermentation: enTrans.fermentation || recipe.fermentation,
                            ingredients: enTrans.ingredients || recipe.ingredients,
                            instructions: enTrans.instructions || recipe.instructions,
                            germanShortName: recipe.short_name
                        };
                    } else {
                        item = recipe;
                    }
                    isOfflineMode = true;
                }
            }
        } catch (error) {
            console.error('Failed to load offline recipe:', error);
        }
    }

    // Use server data if not offline or offline load failed
    if (!item && data?.item) {
        item = { ...data.item };
    }

    // If still no item, we're offline without cached data - return error state
    if (!item) {
        return {
            ...data,
            isOffline: true,
            error: 'Recipe not available offline'
        };
    }

    // Check if this recipe is favorited by the user
    let isFavorite = false;
    try {
        const favRes = await fetch(`/api/rezepte/favorites/check/${params.name}`);
        if (favRes.ok) {
            const favData = await favRes.json();
            isFavorite = favData.isFavorite;
        }
    } catch (e) {
        // Silently fail if not authenticated or other error
    }
    
    // Get multiplier from URL parameters
    const multiplier = parseFloat(url.searchParams.get('multiplier') || '1');
    
    // Handle yeast swapping from URL parameters based on toggle flags
    // Look for parameters like y0=1, y1=1 (yeast #0 and #1 are toggled)
    if (item.ingredients) {
        let yeastCounter = 0;
        
        // Iterate through all ingredients to find yeast and apply conversions
        for (let listIndex = 0; listIndex < item.ingredients.length; listIndex++) {
            const list = item.ingredients[listIndex];
            if (list.list) {
                for (let ingredientIndex = 0; ingredientIndex < list.list.length; ingredientIndex++) {
                    const ingredient = list.list[ingredientIndex];
                    
                    // Check if this is a yeast ingredient (both German and English names, case-insensitive)
                    const nameLower = ingredient.name.toLowerCase();
                    const isFreshYeast = nameLower === "frischhefe" || nameLower === "fresh yeast";
                    const isDryYeast = nameLower === "trockenhefe" || nameLower === "dry yeast";

                    if (isFreshYeast || isDryYeast) {
                        // Check if this yeast should be toggled
                        const yeastParam = `y${yeastCounter}`;
                        const isToggled = url.searchParams.has(yeastParam);

                        if (isToggled) {
                            // Perform yeast conversion from original recipe data
                            const originalName = ingredient.name;
                            const originalAmount = parseFloat(ingredient.amount);
                            const originalUnit = ingredient.unit;

                            let newName: string, newAmount: string, newUnit: string;

                            if (isFreshYeast) {
                                // Convert fresh yeast to dry yeast
                                newName = isEnglish ? "Dry yeast" : "Trockenhefe";
                                
                                if (originalUnit === "Prise") {
                                    // "1 Prise Frischhefe" → "1 Prise Trockenhefe"
                                    newAmount = ingredient.amount;
                                    newUnit = "Prise";
                                } else if (originalUnit === "g" && originalAmount === 1) {
                                    // "1 g Frischhefe" → "1 Prise Trockenhefe"
                                    newAmount = "1";
                                    newUnit = "Prise";
                                } else {
                                    // Normal conversion: "9 g Frischhefe" → "3 g Trockenhefe" (divide by 3)
                                    newAmount = (originalAmount / 3).toString();
                                    newUnit = "g";
                                }
                            } else if (isDryYeast) {
                                // Convert dry yeast to fresh yeast
                                newName = isEnglish ? "Fresh yeast" : "Frischhefe";
                                
                                if (originalUnit === "Prise") {
                                    // "1 Prise Trockenhefe" → "1 g Frischhefe"
                                    newAmount = "1";
                                    newUnit = "g";
                                } else {
                                    // Normal conversion: "1 g Trockenhefe" → "3 g Frischhefe" (multiply by 3)
                                    newAmount = (originalAmount * 3).toString();
                                    newUnit = "g";
                                }
                            } else {
                                // Fallback
                                newName = originalName;
                                newAmount = ingredient.amount;
                                newUnit = originalUnit;
                            }
                            
                            // Apply the conversion
                            item.ingredients[listIndex].list[ingredientIndex] = {
                                ...item.ingredients[listIndex].list[ingredientIndex],
                                name: newName,
                                amount: newAmount,
                                unit: newUnit
                            };
                        }
                        
                        yeastCounter++;
                    }
                }
            }
        }
    }
    
    // Generate JSON-LD server-side
    const recipeJsonLd = generateRecipeJsonLd(item);

    // For German page: check if English translation exists
    // For English page: germanShortName is already in item (from API)
    const hasEnglishTranslation = !isEnglish && !!(item.translations?.en?.short_name);
    const englishShortName = !isEnglish ? (item.translations?.en?.short_name || '') : '';
    const germanShortName = isEnglish ? (item.germanShortName || '') : item.short_name;

    // Destructure to exclude item (already spread below)
    const { item: _, ...serverData } = data || {};

    // For offline mode, generate stripped versions locally
    const strippedName = isOfflineMode ? stripHtmlTags(item.name) : (serverData as any)?.strippedName;
    const strippedDescription = isOfflineMode ? stripHtmlTags(item.description) : (serverData as any)?.strippedDescription;

    return {
        ...serverData,  // Include server load data (strippedName, strippedDescription)
        ...item,
        isFavorite,
        multiplier,
        recipeJsonLd,
        hasEnglishTranslation,
        englishShortName,
        germanShortName,
        strippedName,
        strippedDescription,
        isOffline: isOfflineMode,
    };
}
