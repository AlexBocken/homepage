import { error } from "@sveltejs/kit";

export async function load({ fetch, params, url}) {
    const res = await fetch(`/api/rezepte/items/${params.name}`);
    let item = await res.json();
    if(!res.ok){
	    throw error(res.status, item.message)
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
                    
                    // Check if this is a yeast ingredient
                    if (ingredient.name === "Frischhefe" || ingredient.name === "Trockenhefe") {
                        // Check if this yeast should be toggled
                        const yeastParam = `y${yeastCounter}`;
                        const isToggled = url.searchParams.has(yeastParam);
                        
                        if (isToggled) {
                            // Perform yeast conversion from original recipe data
                            const originalName = ingredient.name;
                            const originalAmount = parseFloat(ingredient.amount);
                            const originalUnit = ingredient.unit;
                            
                            let newName: string, newAmount: string, newUnit: string;
                            
                            if (originalName === "Frischhefe") {
                                // Convert fresh yeast to dry yeast
                                newName = "Trockenhefe";
                                
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
                            } else if (originalName === "Trockenhefe") {
                                // Convert dry yeast to fresh yeast
                                newName = "Frischhefe";
                                
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
    
    return {
        ...item,
        isFavorite,
        multiplier
    };
}
