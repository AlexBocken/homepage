/**
 * Aliases: maps common English/alternate names to their German catalog equivalent.
 * Checked before embeddings so these are always correct and instant.
 * Add entries here when an item consistently matches the wrong icon.
 */
export const ICON_ALIASES: Record<string, string> = {
  // English → German catalog name
  // Fruits & vegetables
  'apples': 'äpfel', 'apple': 'äpfel', 'bananas': 'bananen', 'banana': 'bananen',
  'oranges': 'orange', 'lemons': 'zitrone', 'lemon': 'zitrone', 'grapes': 'trauben',
  'strawberries': 'erdbeeren', 'blueberries': 'heidelbeeren', 'raspberries': 'himbeeren',
  'tomatoes': 'tomaten', 'tomato': 'tomaten', 'potatoes': 'kartoffeln', 'potato': 'kartoffeln',
  'cucumber': 'gurke', 'onions': 'zwiebeln', 'onion': 'zwiebeln', 'garlic': 'knoblauch',
  'carrots': 'karotten', 'carrot': 'karotten', 'broccoli': 'brokkoli',
  'spinach': 'spinat', 'lettuce': 'salat', 'mushrooms': 'pilze', 'mushroom': 'champignons',
  'avocado': 'avocado', 'peas': 'erbsen', 'beans': 'bohnen', 'corn': 'mais',
  'peppers': 'paprika', 'bell pepper': 'peperoni', 'celery': 'sellerie',
  'pumpkin': 'kürbis', 'watermelon': 'wassermelone', 'pineapple': 'ananas',
  'mango': 'mango', 'peach': 'pfirsich', 'pear': 'birnen', 'cherries': 'kirschen',
  'asparagus': 'spargel', 'eggplant': 'aubergine', 'ginger': 'ingwer',

  // Meat & fish
  'chicken': 'poulet', 'chicken breast': 'hähnchenbrust',
  'beef': 'rindfleisch', 'pork': 'schweinefleisch', 'lamb': 'lamm',
  'ham': 'schinken', 'bacon': 'speck', 'sausage': 'wurst', 'sausages': 'bratwurst',
  'salmon': 'lachs', 'tuna': 'thunfisch', 'shrimp': 'garnelen', 'prawns': 'garnelen',
  'fish': 'fisch', 'steak': 'steak', 'ground beef': 'hackfleisch',
  'salami': 'salami', 'meatballs': 'hackfleisch',

  // Dairy
  'milk': 'milch', 'butter': 'butter', 'cheese': 'käse', 'eggs': 'eier', 'egg': 'eier',
  'yogurt': 'joghurt', 'yoghurt': 'joghurt', 'cream': 'rahm', 'sour cream': 'sauerrahm',
  'cream cheese': 'frischkäse', 'cottage cheese': 'hüttenkäse',
  'mozzarella': 'mozzarella', 'parmesan': 'parmesan', 'feta': 'feta',
  'ricotta': 'ricotta', 'mascarpone': 'mascarpone',

  // Bread & bakery
  'bread': 'brot', 'rolls': 'brötchen', 'baguette': 'baguette', 'toast': 'toast',
  'croissant': 'croissant', 'flour': 'mehl', 'yeast': 'hefe',
  'baking powder': 'backpulver', 'sugar': 'zucker', 'powdered sugar': 'puderzucker',
  'vanilla sugar': 'vanillezucker', 'cornstarch': 'speisestärke',

  // Pasta, rice & grains
  'pasta': 'nudeln', 'noodles': 'nudeln', 'spaghetti': 'spaghetti', 'penne': 'penne',
  'rice': 'reis', 'basmati': 'basmatireis', 'couscous': 'couscous',
  'oats': 'haferflocken', 'oatmeal': 'haferflocken', 'cereal': 'corn flakes',
  'muesli': 'müsli', 'lentils': 'linsen', 'chickpeas': 'kichererbsen',
  'gnocchi': 'gnocchi', 'lasagna': 'lasagne', 'tortellini': 'nudeln',

  // Spices & sauces
  'salt': 'salz', 'pepper': 'pfefferkörner', 'oil': 'öl', 'olive oil': 'olivenöl',
  'vinegar': 'essig', 'balsamic': 'balsamico', 'ketchup': 'ketchup',
  'mustard': 'senf', 'mayonnaise': 'mayonnaise', 'mayo': 'mayonnaise',
  'soy sauce': 'sojasauce', 'tomato paste': 'tomatenmark', 'tomato sauce': 'tomatensauce',
  'honey': 'honig', 'cinnamon': 'zimt', 'oregano': 'oregano', 'basil': 'basilikum',
  'parsley': 'petersilie', 'rosemary': 'rosmarin', 'thyme': 'thymian',
  'paprika': 'paprikapulver', 'curry': 'paprikapulver', 'chili': 'chili',
  'herbs': 'kräuter', 'bbq sauce': 'bbq sauce', 'pesto': 'pasta sauce',
  'jam': 'konfitüre', 'marmalade': 'marmelade',

  // Drinks
  'water': 'wasser', 'sparkling water': 'mineralwasser', 'juice': 'fruchtsaft',
  'orange juice': 'orangensaft', 'apple juice': 'apfelsaft',
  'coffee': 'kaffee', 'tea': 'tee', 'beer': 'bier', 'wine': 'rotwein',
  'white wine': 'weisswein', 'red wine': 'rotwein',
  'cola': 'cola', 'lemonade': 'limonade', 'soda': 'limonade',
  'energy drink': 'energy drink', 'smoothie': 'smoothie',
  'whiskey': 'whisky', 'whisky': 'whisky', 'gin': 'gin', 'vodka': 'vodka', 'rum': 'rum',
  'cocoa': 'kakao', 'hot chocolate': 'kakao', 'iced tea': 'eistee',
  'oat milk': 'soya milch', 'soy milk': 'soya milch', 'almond milk': 'soya milch',
  'coconut milk': 'kokosmilch', 'tonic': 'tonic water',

  // Sweets & snacks
  'chocolate': 'schokolade', 'cookies': 'kekse', 'cookie': 'kekse', 'biscuits': 'kekse',
  'chips': 'chips', 'crisps': 'chips', 'nuts': 'nüsse', 'peanuts': 'erdnüsse',
  'almonds': 'mandeln', 'walnuts': 'baumnüsse', 'hazelnuts': 'haselnüsse',
  'ice cream': 'eis', 'cake': 'kuchen', 'candy': 'süssigkeiten', 'sweets': 'süssigkeiten',
  'gummy bears': 'süssigkeiten', 'popcorn': 'pop corn', 'pretzels': 'brezeln',
  'granola bar': 'getreideriegel', 'muffins': 'muffins', 'waffles': 'waffeln',
  'pudding': 'pudding', 'nutella': 'nougatcreme',

  // Frozen
  'frozen pizza': 'pizza', 'frozen vegetables': 'gemüse gefroren',
  'fish sticks': 'fischstäbchen', 'french fries': 'pommes frites', 'fries': 'pommes frites',

  // Household
  'dish soap': 'spülmittel', 'detergent': 'waschmittel', 'laundry detergent': 'waschmittel',
  'trash bags': 'abfallsäcke', 'garbage bags': 'abfallsäcke',
  'paper towels': 'haushaltspapier', 'kitchen roll': 'küchenrolle',
  'toilet paper': 'toilettenpapier', 'aluminum foil': 'alufolie', 'tin foil': 'alufolie',
  'plastic wrap': 'frischhaltefolie', 'cling film': 'frischhaltefolie',
  'sponge': 'schwamm', 'batteries': 'batterien', 'light bulb': 'glühbirne',
  'candles': 'kerzen', 'matches': 'streichhölzer', 'baking paper': 'backpapier',
  'dishwasher tabs': 'geschirrtabs', 'fabric softener': 'weichspüler',
  'cleaning spray': 'putzmittel', 'glass cleaner': 'glasreiniger',
  'napkins': 'servietten', 'straws': 'strohhalme',

  // Hygiene & personal care
  'toothpaste': 'zahnpasta', 'toothbrush': 'zahnbürsten', 'dental floss': 'zahnseide',
  'shampoo': 'shampoo', 'conditioner': 'conditioner', 'shower gel': 'duschgel',
  'body wash': 'duschmittel', 'soap': 'seife', 'deodorant': 'deo',
  'sunscreen': 'sonnencreme', 'sunblock': 'sonnencreme',
  'hand cream': 'handcreme', 'body lotion': 'bodylotion', 'face cream': 'gesichtscreme',
  'razor': 'rasierer', 'razor blades': 'rasierklingen', 'shaving cream': 'rasierschaum',
  'tissues': 'taschentücher', 'wet wipes': 'feuchttücher',
  'cotton pads': 'wattepads', 'cotton swabs': 'wattestäbchen',
  'band-aids': 'pflaster', 'plasters': 'pflaster',
  'mouthwash': 'mundspülung', 'nail polish': 'nagellack',
  'hair gel': 'haargel', 'hairspray': 'haarspray', 'diapers': 'windeln',
  'condoms': 'kondome', 'vitamins': 'vitamine', 'painkillers': 'schmerzmittel',

  // Misc
  'flowers': 'blumen', 'gift': 'geschenk', 'wrapping paper': 'geschenkpapier',
  'cat food': 'katzenfutter', 'dog food': 'hundefutter', 'pet food': 'katzenfutter',
  'bird food': 'vogelfutter', 'cat litter': 'katzenstreu',
  'zürisäcke': 'abfallsäcke', 'zürisack': 'abfallsäcke', 'züribags': 'abfallsäcke',
  'züribag': 'abfallsäcke', 'kehrichtsäcke': 'abfallsäcke', 'kehrichtsack': 'abfallsäcke',

  // Swiss German → High German aliases
  'rahm': 'sahne', 'schlagrahm': 'schlagsahne', 'halbrahm': 'sahne', 'vollrahm': 'sahne',
  'rüebli': 'karotten',
  'nüsslisalat': 'feldsalat', 'federkohl': 'grünkohl',
  'peperoni': 'paprika', 'peperoncini': 'chili',
  'poulet': 'hähnchen', 'pouletbrust': 'hähnchenbrust', 'pouletschenkel': 'hähnchenschenkel',
  'cervelat': 'bratwurst', 'crevetten': 'garnelen',
  'weggli': 'brötchen', 'bürli': 'brötchen', 'zopf': 'brot',
  'ruchmehl': 'mehl', 'halbweissmehl': 'mehl',
  'konfitüre': 'marmelade', 'konfi': 'marmelade',
  'glacé': 'eis', 'glace': 'eis',

  'tofu': 'tofu', 'olives': 'oliven', 'pickles': 'essiggurken',
  'soup': 'suppe', 'broth': 'brühe', 'bouillon': 'bouillon',
  'pizza': 'pizza', 'pizza dough': 'pizzateig',
};
