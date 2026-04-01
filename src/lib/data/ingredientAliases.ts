/**
 * Fast-path alias table mapping normalized English ingredient names to USDA nutrition DB names.
 * Checked before the embedding-based matching to avoid unnecessary ML inference for common ingredients.
 *
 * Keys: normalized lowercase ingredient names (stripped of modifiers)
 * Values: exact USDA FDC name as it appears in nutritionDb.ts
 *
 * Expand this table over time — run scripts/generate-ingredient-aliases.ts to suggest new entries.
 */

export const INGREDIENT_ALIASES: Record<string, string> = {
	// Dairy & Eggs
	'egg': 'Egg, whole, raw, fresh',
	'eggs': 'Egg, whole, raw, fresh',
	'egg yolk': 'Egg, yolk, raw, fresh',
	'egg yolks': 'Egg, yolk, raw, fresh',
	'egg white': 'Egg, white, raw, fresh',
	'egg whites': 'Egg, white, raw, fresh',
	'butter': 'Butter, salted',
	'unsalted butter': 'Butter, without salt',
	'milk': 'Milk, whole, 3.25% milkfat, with added vitamin D',
	'whole milk': 'Milk, whole, 3.25% milkfat, with added vitamin D',
	'cream': 'Cream, fluid, heavy whipping',
	'heavy cream': 'Cream, fluid, heavy whipping',
	'whipping cream': 'Cream, fluid, heavy whipping',
	'sour cream': 'Cream, sour, cultured',
	'cream cheese': 'Cheese, cream',
	'parmesan': 'Cheese, parmesan, hard',
	'mozzarella': 'Cheese, mozzarella, whole milk',
	'cheddar': 'Cheese, cheddar',
	'yogurt': 'Yogurt, plain, whole milk',
	'greek yogurt': 'Yogurt, Greek, plain, whole milk',

	// Fats & Oils
	'olive oil': 'Oil, olive, salad or cooking',
	'vegetable oil': 'Oil, canola',
	'canola oil': 'Oil, canola',
	'neutral oil': 'Oil, peanut, salad or cooking',
	'peanut oil': 'Oil, peanut, salad or cooking',
	'sunflower oil': 'Oil, sunflower, linoleic, (approx. 65%)',
	'coconut oil': 'Oil, coconut',
	'sesame oil': 'Oil, sesame, salad or cooking',
	'lard': 'Lard',
	'margarine': 'Margarine, regular, 80% fat, composite, stick, with salt',

	// Flours & Grains
	'flour': 'Wheat flour, white, all-purpose, enriched, bleached',
	'all purpose flour': 'Wheat flour, white, all-purpose, enriched, bleached',
	'all-purpose flour': 'Wheat flour, white, all-purpose, enriched, bleached',
	'bread flour': 'Wheat flour, white, bread, enriched',
	'whole wheat flour': 'Flour, whole wheat, unenriched',
	'rye flour': 'Rye flour, dark',
	'cornstarch': 'Cornstarch',
	'corn starch': 'Cornstarch',
	'rice': 'Rice, white, long-grain, regular, raw, enriched',
	'white rice': 'Rice, white, long-grain, regular, raw, enriched',
	'brown rice': 'Rice, brown, long-grain, raw (Includes foods for USDA\'s Food Distribution Program)',
	'pasta': 'Pasta, dry, enriched',
	'spaghetti': 'Pasta, dry, enriched',
	'noodles': 'Noodles, egg, dry, enriched',
	'oats': 'Oats (Includes foods for USDA\'s Food Distribution Program)',
	'rolled oats': 'Oats (Includes foods for USDA\'s Food Distribution Program)',
	'breadcrumbs': 'Bread, crumbs, dry, grated, plain',

	// Sugars & Sweeteners
	'sugar': 'Sugars, granulated',
	'white sugar': 'Sugars, granulated',
	'granulated sugar': 'Sugars, granulated',
	'brown sugar': 'Sugars, brown',
	'powdered sugar': 'Sugars, powdered',
	'icing sugar': 'Sugars, powdered',
	'honey': 'Honey',
	'maple syrup': 'Syrups, maple',
	'molasses': 'Molasses',
	'vanilla sugar': 'Sugars, granulated', // approximate

	// Leavening
	'baking powder': 'Leavening agents, baking powder, double-acting, sodium aluminum sulfate',
	'baking soda': 'Leavening agents, baking soda',
	'bicarbonate of soda': 'Leavening agents, baking soda',
	'yeast': 'Leavening agents, yeast, baker\'s, active dry',
	'dry yeast': 'Leavening agents, yeast, baker\'s, active dry',
	'fresh yeast': 'Leavening agents, yeast, baker\'s, compressed',

	// Vegetables
	'onion': 'Onions, raw',
	'onions': 'Onions, raw',
	'garlic': 'Garlic, raw',
	'potato': 'Potatoes, flesh and skin, raw',
	'potatoes': 'Potatoes, flesh and skin, raw',
	'carrot': 'Carrots, raw',
	'carrots': 'Carrots, raw',
	'tomato': 'Tomatoes, red, ripe, raw, year round average',
	'tomatoes': 'Tomatoes, red, ripe, raw, year round average',
	'bell pepper': 'Peppers, sweet, red, raw',
	'red bell pepper': 'Peppers, sweet, red, raw',
	'green bell pepper': 'Peppers, sweet, green, raw',
	'celery': 'Celery, cooked, boiled, drained, without salt',
	'spinach': 'Spinach, raw',
	'broccoli': 'Broccoli, raw',
	'cauliflower': 'Cauliflower, raw',
	'zucchini': 'Squash, summer, zucchini, includes skin, raw',
	'courgette': 'Squash, summer, zucchini, includes skin, raw',
	'cucumber': 'Cucumber, with peel, raw',
	'lettuce': 'Lettuce, green leaf, raw',
	'cabbage': 'Cabbage, common (danish, domestic, and pointed types), freshly harvest, raw',
	'mushrooms': 'Mushrooms, white, raw',
	'mushroom': 'Mushrooms, white, raw',
	'leek': 'Leeks, (bulb and lower leaf-portion), raw',
	'leeks': 'Leeks, (bulb and lower leaf-portion), raw',
	'peas': 'Peas, green, raw',
	'corn': 'Corn, sweet, yellow, raw',
	'sweet corn': 'Corn, sweet, yellow, raw',
	'eggplant': 'Eggplant, raw',
	'aubergine': 'Eggplant, raw',
	'pumpkin': 'Pumpkin, raw',
	'sweet potato': 'Sweet potato, raw, unprepared (Includes foods for USDA\'s Food Distribution Program)',
	'ginger': 'Ginger root, raw',
	'shallot': 'Shallots, raw',
	'shallots': 'Shallots, raw',

	// Fruits
	'lemon': 'Lemons, raw, without peel',
	'lemon juice': 'Lemon juice, raw',
	'lemon zest': 'Lemon peel, raw',
	'lime': 'Limes, raw',
	'lime juice': 'Lime juice, raw',
	'orange': 'Oranges, raw, navels',
	'orange juice': 'Orange juice, raw (Includes foods for USDA\'s Food Distribution Program)',
	'apple': 'Apples, raw, with skin (Includes foods for USDA\'s Food Distribution Program)',
	'banana': 'Bananas, raw',
	'berries': 'Blueberries, raw',
	'blueberries': 'Blueberries, raw',
	'strawberries': 'Strawberries, raw',
	'raspberries': 'Raspberries, raw',
	'raisins': 'Raisins, dark, seedless (Includes foods for USDA\'s Food Distribution Program)',
	'dried cranberries': 'Cranberries, dried, sweetened (Includes foods for USDA\'s Food Distribution Program)',

	// Nuts & Seeds
	'almonds': 'Nuts, almonds',
	'walnuts': 'Nuts, walnuts, english',
	'hazelnuts': 'Nuts, hazelnuts or filberts',
	'peanuts': 'Peanuts, all types, raw',
	'pine nuts': 'Nuts, pine nuts, dried',
	'cashews': 'Nuts, cashew nuts, raw',
	'pecans': 'Nuts, pecans',
	'sesame seeds': 'Seeds, sesame seeds, whole, dried',
	'sunflower seeds': 'Seeds, sunflower seed kernels, dried',
	'flaxseed': 'Seeds, flaxseed',
	'pumpkin seeds': 'Seeds, pumpkin and squash seed kernels, dried',
	'poppy seeds': 'Seeds, sesame seeds, whole, dried', // approximate
	'almond flour': 'Nuts, almonds, blanched',
	'ground almonds': 'Nuts, almonds, blanched',
	'coconut flakes': 'Nuts, coconut meat, dried (desiccated), sweetened, shredded',
	'desiccated coconut': 'Nuts, coconut meat, dried (desiccated), sweetened, shredded',
	'peanut butter': 'Peanut butter, smooth style, with salt',

	// Meats
	'chicken breast': 'Chicken, broiler or fryers, breast, skinless, boneless, meat only, raw',
	'chicken thigh': 'Chicken, broilers or fryers, dark meat, thigh, meat only, raw',
	'ground beef': 'Beef, grass-fed, ground, raw',
	'minced meat': 'Beef, grass-fed, ground, raw',
	'bacon': 'Pork, cured, bacon, unprepared',
	'ham': 'Ham, sliced, regular (approximately 11% fat)',
	'sausage': 'Sausage, pork, chorizo, link or ground, raw',

	// Seafood
	'salmon': 'Fish, salmon, Atlantic, wild, raw',
	'tuna': 'Fish, tuna, light, canned in water, drained solids',
	'shrimp': 'Crustaceans, shrimp, raw',
	'prawns': 'Crustaceans, shrimp, raw',
	'cod': 'Fish, cod, Atlantic, raw',

	// Legumes
	'chickpeas': 'Chickpeas (garbanzo beans, bengal gram), mature seeds, raw',
	'lentils': 'Lentils, raw',
	'black beans': 'Beans, black, mature seeds, raw',
	'kidney beans': 'Beans, kidney, red, mature seeds, raw',
	'white beans': 'Beans, white, mature seeds, raw',
	'canned chickpeas': 'Chickpeas (garbanzo beans, bengal gram), mature seeds, canned, drained solids',
	'canned beans': 'Beans, kidney, red, mature seeds, canned, drained solids',
	'tofu': 'Tofu, raw, firm, prepared with calcium sulfate',

	// Condiments & Sauces
	'soy sauce': 'Soy sauce made from soy (tamari)',
	'vinegar': 'Vinegar, distilled',
	'apple cider vinegar': 'Vinegar, cider',
	'balsamic vinegar': 'Vinegar, balsamic',
	'mustard': 'Mustard, prepared, yellow',
	'ketchup': 'Catsup',
	'tomato paste': 'Tomato products, canned, paste, without salt added (Includes foods for USDA\'s Food Distribution Program)',
	'tomato sauce': 'Tomato products, canned, sauce',
	'canned tomatoes': 'Tomatoes, red, ripe, canned, packed in tomato juice',
	'worcestershire sauce': 'Sauce, worcestershire',
	'hot sauce': 'Sauce, hot chile, sriracha',
	'mayonnaise': 'Salad dressing, mayonnaise, regular',

	// Chocolate & Baking
	'chocolate': 'Chocolate, dark, 70-85% cacao solids',
	'dark chocolate': 'Chocolate, dark, 70-85% cacao solids',
	'cocoa powder': 'Cocoa, dry powder, unsweetened',
	'cocoa': 'Cocoa, dry powder, unsweetened',
	'chocolate chips': 'Chocolate, dark, 60-69% cacao solids',
	'vanilla extract': 'Vanilla extract',
	'vanilla': 'Vanilla extract',
	'gelatin': 'Gelatin desserts, dry mix',

	// Beverages
	'coffee': 'Beverages, coffee, brewed, prepared with tap water',
	'tea': 'Beverages, tea, black, brewed, prepared with tap water',
	'wine': 'Alcoholic beverage, wine, table, red',
	'red wine': 'Alcoholic beverage, wine, table, red',
	'white wine': 'Alcoholic beverage, wine, table, white',
	'beer': 'Alcoholic beverage, beer, regular, all',
	'coconut milk': 'Nuts, coconut milk, raw (liquid expressed from grated meat and water)',

	// Misc
	'salt': 'Salt, table',
	'pepper': 'Spices, pepper, black',
	'black pepper': 'Spices, pepper, black',
	'cinnamon': 'Spices, cinnamon, ground',
	'paprika': 'Spices, paprika',
	'cumin': 'Spices, cumin seed',
	'nutmeg': 'Spices, nutmeg, ground',
	'chili powder': 'Spices, chili powder',
	'oregano': 'Spices, oregano, dried',
	'thyme': 'Spices, thyme, dried',
	'rosemary': 'Spices, rosemary, dried',
	'bay leaf': 'Spices, bay leaf',
	'turmeric': 'Spices, turmeric, ground',
	'basil': 'Spices, basil, dried',
	'parsley': 'Spices, parsley, dried',
	'dill': 'Spices, dill weed, dried',
	'mint': 'Spearmint, fresh',
	'cloves': 'Spices, cloves, ground',
	'cardamom': 'Spices, cardamom',
	'ginger powder': 'Spices, ginger, ground',
	'curry powder': 'Spices, curry powder',
};

/**
 * Look up a normalized ingredient name in the alias table.
 * Returns the USDA name if found, null otherwise.
 */
export function lookupAlias(normalizedName: string): string | null {
	return INGREDIENT_ALIASES[normalizedName] || null;
}
