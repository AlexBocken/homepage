/**
 * Shopping item categorizer — hybrid approach:
 * 1. Direct/substring catalog lookup for icon
 * 2. Embedding-based category classification (267 representative items)
 * 3. Category-scoped embedding search for icon (only icons in matched category)
 * 4. Per-category default icon as final fallback
 *
 * DB cache ensures each unique item is only categorized once.
 */
import { pipeline, type FeatureExtractionPipeline } from '@huggingface/transformers';
import { read } from '$app/server';
import { SHOPPING_CATEGORIES } from '$lib/data/shoppingCategoryItems';
import { ShoppingItemCategory } from '$models/ShoppingItemCategory';
import { dbConnect } from '$utils/db';
import catalog from '../../../static/shopping-icons/catalog.json';
import iconCategoriesData from '$lib/data/shoppingIconCategories.json';
import categoryEmbeddingsUrl from '$lib/data/shoppingCategoryEmbeddings.json?url';
import iconEmbeddingsUrl from '$lib/data/shoppingIconEmbeddings.json?url';

const MODEL_NAME = 'Xenova/multilingual-e5-base';
const CATEGORY_THRESHOLD = 0.5;
const ICON_THRESHOLD = 0.83;

/** Fallback icons per category when no specific icon matches */
const CATEGORY_DEFAULT_ICONS: Record<string, string> = {
  'Obst & Gemüse': 'doerrobst',
  'Fleisch & Fisch': 'hackfleisch',
  'Milchprodukte': 'kaese',
  'Brot & Backwaren': 'brot',
  'Pasta, Reis & Getreide': 'nudeln',
  'Gewürze & Saucen': 'kraeuter',
  'Getränke': 'wasser',
  'Süßes & Snacks': 'schokolade',
  'Tiefkühl': 'gemuese_gefroren',
  'Haushalt': 'spuelmittel',
  'Hygiene & Körperpflege': 'seife',
};

/**
 * Aliases: maps common English/alternate names to their German catalog equivalent.
 * Checked before embeddings so these are always correct and instant.
 * Add entries here when an item consistently matches the wrong icon.
 */
const ICON_ALIASES: Record<string, string> = {
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
  'tofu': 'tofu', 'olives': 'oliven', 'pickles': 'essiggurken',
  'soup': 'suppe', 'broth': 'brühe', 'bouillon': 'bouillon',
  'pizza': 'pizza', 'pizza dough': 'pizzateig',
};

// --- Catalog lookup maps (built once) ---

const catalogMap = new Map<string, string>();
for (const [displayName, iconFile] of Object.entries(catalog as Record<string, string>)) {
  catalogMap.set(displayName.toLowerCase(), iconFile);
}

/** Pre-computed mapping: icon display name → category */
const iconCategories = iconCategoriesData as Record<string, string>;

/** Icons grouped by category for scoped search */
const iconsByCategory = new Map<string, string[]>();
for (const [iconName, category] of Object.entries(iconCategories)) {
  if (!iconsByCategory.has(category)) iconsByCategory.set(category, []);
  iconsByCategory.get(category)!.push(iconName);
}

// --- Embedding state (lazy) ---

let embedder: FeatureExtractionPipeline | null = null;
let categoryIndex: { name: string; category: string; vector: number[] }[] | null = null;
let iconIndex: { name: string; icon: string; vector: number[] }[] | null = null;

async function getEmbedder(): Promise<FeatureExtractionPipeline> {
  if (!embedder) {
    embedder = await pipeline('feature-extraction', MODEL_NAME, { dtype: 'q8' });
  }
  return embedder;
}

async function getCategoryIndex() {
  if (!categoryIndex) {
    const raw = await read(categoryEmbeddingsUrl).json();
    categoryIndex = raw.entries;
  }
  return categoryIndex!;
}

async function getIconIndex() {
  if (!iconIndex) {
    const raw = await read(iconEmbeddingsUrl).json();
    iconIndex = raw.entries;
  }
  return iconIndex!;
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

// --- Icon lookup (direct + substring) ---

function directIconLookup(query: string): string | null {
  // Exact match
  const exact = catalogMap.get(query);
  if (exact) return exact;

  // Alias lookup: resolve English/alternate name to German catalog name
  const alias = ICON_ALIASES[query];
  if (alias) {
    const aliasIcon = catalogMap.get(alias);
    if (aliasIcon) return aliasIcon;
  }

  // Substring match: query contains catalog name or vice versa
  for (const [catalogName, iconFile] of catalogMap) {
    if (query.includes(catalogName) || catalogName.includes(query)) {
      return iconFile;
    }
  }
  return null;
}

// --- Main function ---

export async function categorizeItem(name: string): Promise<{
  category: string;
  confidence: number;
  icon: string | null;
}> {
  const query = name.toLowerCase().trim();
  if (!query) return { category: 'Sonstiges', confidence: 0, icon: null };

  // Step 0: DB cache
  try {
    await dbConnect();
    const cached = await ShoppingItemCategory.findOne({ normalizedName: query }).lean();
    if (cached) {
      console.log(`[categorizer] Cache hit for "${name}": ${cached.category} / ${cached.icon}`);
      return { category: cached.category, confidence: 1.0, icon: cached.icon ?? null };
    }
  } catch { /* continue without cache */ }

  // Step 1: Direct icon lookup (exact + substring against catalog)
  const directIcon = directIconLookup(query);
  if (directIcon) {
    console.log(`[categorizer] Direct icon match for "${name}": ${directIcon}`);
  }

  // Step 2: Embedding-based category classification
  const emb = await getEmbedder();
  const catIdx = await getCategoryIndex();

  const result = await emb(`query: ${query}`, { pooling: 'mean', normalize: true });
  const queryVector = Array.from(result.data as Float32Array);

  let bestCatScore = -1;
  let bestCatIdx = 0;
  for (let i = 0; i < catIdx.length; i++) {
    const score = cosineSimilarity(queryVector, catIdx[i].vector);
    if (score > bestCatScore) {
      bestCatScore = score;
      bestCatIdx = i;
    }
  }

  const category = bestCatScore >= CATEGORY_THRESHOLD
    ? catIdx[bestCatIdx].category
    : 'Sonstiges';
  const confidence = bestCatScore;

  console.log(`[categorizer] Category for "${name}": ${category} (${bestCatScore.toFixed(3)}, matched: ${catIdx[bestCatIdx].name})`);

  // Step 3: Icon resolution
  let icon: string | null = directIcon;

  if (!icon) {
    // Category-scoped embedding search: only compare against icons in the matched category
    const icoIdx = await getIconIndex();
    const scopedIconNames = new Set(iconsByCategory.get(category) || []);

    let bestIcoScore = -1;
    let bestIcoIdx = -1;

    for (let i = 0; i < icoIdx.length; i++) {
      // Only consider icons in the matched category
      if (!scopedIconNames.has(icoIdx[i].name.toLowerCase()) && !scopedIconNames.has(icoIdx[i].name)) {
        continue;
      }
      const score = cosineSimilarity(queryVector, icoIdx[i].vector);
      if (score > bestIcoScore) {
        bestIcoScore = score;
        bestIcoIdx = i;
      }
    }

    if (bestIcoIdx >= 0 && bestIcoScore >= ICON_THRESHOLD) {
      icon = icoIdx[bestIcoIdx].icon;
      console.log(`[categorizer] Scoped icon match for "${name}": ${icon} (${bestIcoScore.toFixed(3)}, matched: ${icoIdx[bestIcoIdx].name})`);
    } else {
      // Fall back to category default
      icon = CATEGORY_DEFAULT_ICONS[category] ?? null;
      console.log(`[categorizer] Using default icon for "${name}": ${icon} (category: ${category})`);
    }
  }

  // Step 4: Cache result
  try {
    await ShoppingItemCategory.updateOne(
      { normalizedName: query },
      { $setOnInsert: { normalizedName: query, originalName: name, category, icon } },
      { upsert: true }
    );
  } catch { /* cache write failure is non-fatal */ }

  return { category, confidence, icon };
}
