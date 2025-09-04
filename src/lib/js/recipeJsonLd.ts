function parseTimeToISO8601(timeString: string): string | undefined {
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

export function generateRecipeJsonLd(data: any) {
  const jsonLd: any = {
    "@context": "https://schema.org",
    "@type": "Recipe",
    "name": data.name?.replace(/<[^>]*>/g, ''), // Strip HTML tags
    "description": data.description,
    "author": {
      "@type": "Person",
      "name": "Alexander Bocken"
    },
    "datePublished": data.dateCreated ? new Date(data.dateCreated).toISOString() : undefined,
    "dateModified": data.dateModified || data.updatedAt ? new Date(data.dateModified || data.updatedAt).toISOString() : undefined,
    "recipeCategory": data.category,
    "keywords": data.tags?.join(', '),
    "image": {
      "@type": "ImageObject",
      "url": `https://bocken.org/static/rezepte/full/${data.short_name}.webp`,
      "width": 1200,
      "height": 800
    },
    "recipeIngredient": [] as string[],
    "recipeInstructions": [] as any[],
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
      if (ingredientGroup.list) {
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
      if (instructionGroup.steps) {
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

  // Clean up undefined values
  Object.keys(jsonLd).forEach(key => {
    if (jsonLd[key] === undefined) {
      delete jsonLd[key];
    }
  });

  return jsonLd;
}