import { error } from "@sveltejs/kit";
import { generateRecipeJsonLd } from '$lib/js/recipeJsonLd';

export async function load({ fetch, params, url}) {
    const res = await fetch(`/api/recipes/items/${params.name}`);
    let item = await res.json();
    if(!res.ok){
	    throw error(res.status, item.message)
    }

    // Check if this recipe is favorited by the user
    let isFavorite = false;
    try {
        const favRes = await fetch(`/api/rezepte/favorites/check/${item.germanShortName}`);
        if (favRes.ok) {
            const favData = await favRes.json();
            isFavorite = favData.isFavorite;
        }
    } catch (e) {
        // Silently fail if not authenticated or other error
    }

    // Get multiplier from URL parameters
    const multiplier = parseFloat(url.searchParams.get('multiplier') || '1');

    // Handle yeast swapping from URL parameters
    if (item.ingredients) {
        let yeastCounter = 0;

        for (let listIndex = 0; listIndex < item.ingredients.length; listIndex++) {
            const list = item.ingredients[listIndex];
            if (list.list) {
                for (let ingredientIndex = 0; ingredientIndex < list.list.length; ingredientIndex++) {
                    const ingredient = list.list[ingredientIndex];

                    // Check for English yeast names
                    if (ingredient.name === "Fresh Yeast" || ingredient.name === "Dry Yeast") {
                        const yeastParam = `y${yeastCounter}`;
                        const isToggled = url.searchParams.has(yeastParam);

                        if (isToggled) {
                            const originalName = ingredient.name;
                            const originalAmount = parseFloat(ingredient.amount);
                            const originalUnit = ingredient.unit;

                            let newName: string, newAmount: string, newUnit: string;

                            if (originalName === "Fresh Yeast") {
                                newName = "Dry Yeast";

                                if (originalUnit === "Pinch") {
                                    newAmount = ingredient.amount;
                                    newUnit = "Pinch";
                                } else if (originalUnit === "g" && originalAmount === 1) {
                                    newAmount = "1";
                                    newUnit = "Pinch";
                                } else {
                                    newAmount = (originalAmount / 3).toString();
                                    newUnit = "g";
                                }
                            } else if (originalName === "Dry Yeast") {
                                newName = "Fresh Yeast";

                                if (originalUnit === "Pinch") {
                                    newAmount = "1";
                                    newUnit = "g";
                                } else {
                                    newAmount = (originalAmount * 3).toString();
                                    newUnit = "g";
                                }
                            } else {
                                newName = originalName;
                                newAmount = ingredient.amount;
                                newUnit = originalUnit;
                            }

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

    // Generate JSON-LD with English data and language tag
    const recipeJsonLd = generateRecipeJsonLd({ ...item, inLanguage: 'en' });

    return {
        ...item,
        isFavorite,
        multiplier,
        recipeJsonLd,
        lang: 'en', // Mark as English page
    };
}
