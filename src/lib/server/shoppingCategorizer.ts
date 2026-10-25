/**
 * Shopping item categorizer:
 * 1. Manual label lookup — what a user set in the edit dialog always wins
 * 2. Category from a linear classifier (char n-grams + e5 embedding, see
 *    shoppingClassifier.ts) trained on the static set in shoppingTraining.ts
 *    plus every manual label, so corrections generalise to similar names
 * 3. Icon: exact/alias catalog match, else a substring match whose icon belongs
 *    to the predicted category, else category-scoped embedding search, else the
 *    category's default icon
 *
 * Training takes a few seconds and runs in the background at startup and again
 * shortly after each manual override; requests meanwhile use the previous model.
 * It needs no e5 model: the static set ships embedded and each manual label
 * stores its own embedding, so the model still only loads on first use.
 * Automatic results are not cached: classifying is a ~15 ms embed + dot products,
 * and a cache would pin answers from older models.
 */
import { pipeline, type FeatureExtractionPipeline } from '@huggingface/transformers';
import { read } from '$app/server';
import { ShoppingItemCategory } from '$models/ShoppingItemCategory';
import { dbConnect } from '$utils/db';
import catalog from '$lib/data/shoppingCatalog.json';
import iconCategoriesData from '$lib/data/shoppingIconCategories.json';
import { ICON_ALIASES } from '$lib/data/shoppingIconAliases';
import { baseTrainingItems } from '$lib/data/shoppingTraining';
import {
  ShoppingClassifier,
  loadEmbeddingSpace,
  type EmbeddingFile,
  type EmbeddingSpace,
  type TrainingSample
} from './shoppingClassifier';
import trainingEmbeddingsUrl from '$lib/data/shoppingTrainingEmbeddings.json?url';
import iconEmbeddingsUrl from '$lib/data/shoppingIconEmbeddings.json?url';

const MODEL_NAME = 'Xenova/multilingual-e5-large';
/** Cosine cut-off for the scoped icon search, tuned on the prod labels' icons for e5-large */
const ICON_THRESHOLD = 0.8;
/** A manual label counts this many generated items in the loss */
const MANUAL_WEIGHT = 2;
/** Batch overrides made in quick succession into one retrain */
const RETRAIN_DELAY_MS = 5000;

/** Fallback icons per category when no specific icon matches */
const CATEGORY_DEFAULT_ICONS: Record<string, string> = {
  'Obst & Gemüse': 'doerrobst',
  'Fleisch & Fisch': 'hackfleisch',
  'Milchprodukte': 'kaese',
  'Brot & Backwaren': 'brot',
  'Pasta, Reis & Getreide': 'nudeln',
  'Konserven': 'kidneybohnen',
  'Gewürze & Saucen': 'kraeuter',
  'Getränke': 'wasser',
  'Süsses & Snacks': 'schokolade',
  'Tiefkühl': 'gemuese_gefroren',
  'Haushalt': 'spuelmittel',
  'Hygiene & Körperpflege': 'seife',
};

// --- Catalog lookup maps (built once) ---

const catalogMap = new Map<string, string>();
for (const [displayName, iconFile] of Object.entries(catalog as Record<string, string>)) {
  catalogMap.set(displayName.toLowerCase(), iconFile);
}

/** Pre-computed mapping: icon display name → category */
const iconCategories = iconCategoriesData as Record<string, string>;
const iconCategoryByName = new Map<string, string>();
for (const [name, category] of Object.entries(iconCategories)) iconCategoryByName.set(name.toLowerCase(), category);

/** Icons grouped by category for scoped search */
const iconsByCategory = new Map<string, string[]>();
for (const [iconName, category] of Object.entries(iconCategories)) {
  if (!iconsByCategory.has(category)) iconsByCategory.set(category, []);
  iconsByCategory.get(category)!.push(iconName);
}

// --- Embedding state (lazy) ---

let embedder: FeatureExtractionPipeline | null = null;
let iconIndex: { name: string; icon: string; vector: number[] }[] | null = null;

async function getEmbedder(): Promise<FeatureExtractionPipeline> {
  if (!embedder) {
    embedder = await pipeline('feature-extraction', MODEL_NAME, { dtype: 'q8' });
  }
  return embedder;
}

async function embed(text: string): Promise<Float32Array> {
  const emb = await getEmbedder();
  const result = await emb(`query: ${text}`, { pooling: 'mean', normalize: true });
  return result.data as Float32Array;
}

async function getIconIndex() {
  if (!iconIndex) {
    const raw = await read(iconEmbeddingsUrl).json();
    iconIndex = raw.entries;
  }
  return iconIndex!;
}

function cosineSimilarity(a: ArrayLike<number>, b: ArrayLike<number>): number {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

// --- Classifier (trained in the background, swapped in when ready) ---

let classifier: ShoppingClassifier | null = null;
let training: Promise<ShoppingClassifier> | null = null;
let retrainTimer: ReturnType<typeof setTimeout> | null = null;
let space: EmbeddingSpace | null = null;

async function getSpace(): Promise<EmbeddingSpace> {
  if (!space) {
    const file: EmbeddingFile = await read(trainingEmbeddingsUrl).json();
    space = loadEmbeddingSpace(file);
  }
  return space;
}

async function trainClassifier(): Promise<ShoppingClassifier> {
  const t0 = performance.now();
  const { vectors, project } = await getSpace();

  await dbConnect();
  const labels = await ShoppingItemCategory.find(
    { source: 'manual' },
    { normalizedName: 1, category: 1, embedding: 1, embeddingModel: 1 }
  ).lean();
  const labelled = new Set(labels.map((l) => l.normalizedName));

  const samples: TrainingSample[] = [];
  let missing = 0;
  for (const item of baseTrainingItems()) {
    if (labelled.has(item.text)) continue; // the user's label replaces ours
    let vector = vectors.get(item.text);
    if (!vector) {
      missing++;
      vector = project(await embed(item.text));
      vectors.set(item.text, vector);
    }
    samples.push({ text: item.text, category: item.category, vector });
  }
  // Label embeddings live on the label itself, so a restart can train without
  // loading the e5 model; only new labels need embedding (once). They're stored
  // raw, so a re-fitted projection doesn't invalidate them; a model switch does.
  for (const label of labels) {
    let raw: ArrayLike<number> | undefined =
      label.embedding?.length && label.embeddingModel === MODEL_NAME ? label.embedding : undefined;
    if (!raw) {
      const fresh = await embed(label.normalizedName);
      raw = fresh;
      await ShoppingItemCategory.updateOne(
        { _id: label._id },
        { embedding: Array.from(fresh), embeddingModel: MODEL_NAME }
      );
    }
    samples.push({ text: label.normalizedName, category: label.category, vector: project(raw), weight: MANUAL_WEIGHT });
  }

  const tTrain = performance.now();
  const clf = new ShoppingClassifier();
  await clf.train(samples);
  console.log(
    `[categorizer] Trained on ${samples.length} items (${labels.length} manual) in ` +
      `${Math.round(performance.now() - t0)}ms (fit ${Math.round(performance.now() - tTrain)}ms)` +
      (missing ? ` — ${missing} items had no shipped embedding; run scripts/embed-shopping-training.ts` : '')
  );
  return clf;
}

/** Train if nothing is in flight; resolves to the newest model once trained. */
function startTraining(): Promise<ShoppingClassifier> {
  if (!training) {
    training = trainClassifier()
      .then((clf) => (classifier = clf))
      .finally(() => (training = null));
  }
  return training;
}

async function getClassifier(): Promise<ShoppingClassifier> {
  return classifier ?? startTraining();
}

/** Start training in the background so the first item added doesn't wait. */
export function warmShoppingCategorizer(): Promise<unknown> {
  return startTraining();
}

/** Call after a manual label changes; retrains once the edits settle. */
export function scheduleRetrain() {
  if (retrainTimer) clearTimeout(retrainTimer);
  retrainTimer = setTimeout(() => {
    retrainTimer = null;
    // A retrain already running started from older labels — queue behind it
    (training ?? Promise.resolve())
      .catch(() => {})
      .then(startTraining)
      .catch((err) => console.error('[categorizer] Retrain failed:', err));
  }, RETRAIN_DELAY_MS);
}

// --- Icon lookup ---

/**
 * Categories whose items are mostly a form of something filed elsewhere
 * ("tk gipfeli", "basilikum setzling"), so the plain thing's icon fits them.
 */
const BORROW_ICONS_FROM_ANY_CATEGORY = new Set(['Tiefkühl', 'Sonstiges']);

/**
 * Catalog icon whose name matches the item. Exact and alias hits are trusted
 * outright; a substring hit (longest catalog name inside the item, or the item
 * inside a catalog name) only counts if its icon sits in the predicted category,
 * so "ei" can't become a cereal bar — except for the categories above.
 */
function catalogIconLookup(query: string, category: string): string | null {
  const exact = catalogMap.get(query);
  if (exact) return exact;

  // Alias lookup: resolve English/alternate name to German catalog name
  const alias = ICON_ALIASES[query];
  if (alias) {
    const aliasIcon = catalogMap.get(alias);
    if (aliasIcon) return aliasIcon;
  }

  let best: string | null = null;
  for (const catalogName of catalogMap.keys()) {
    if (iconCategoryByName.get(catalogName) !== category && !BORROW_ICONS_FROM_ANY_CATEGORY.has(category)) continue;
    const contains = catalogName.length >= 3 && query.includes(catalogName);
    const contained = query.length >= 4 && catalogName.includes(query);
    if ((contains || contained) && (!best || catalogName.length > best.length)) best = catalogName;
  }
  return best ? catalogMap.get(best)! : null;
}

async function scopedIconSearch(query: string, vector: Float32Array, category: string): Promise<string | null> {
  const icoIdx = await getIconIndex();
  const scopedIconNames = new Set(iconsByCategory.get(category) || []);

  let bestScore = -1;
  let bestIdx = -1;
  for (let i = 0; i < icoIdx.length; i++) {
    if (!scopedIconNames.has(icoIdx[i].name.toLowerCase()) && !scopedIconNames.has(icoIdx[i].name)) continue;
    const score = cosineSimilarity(vector, icoIdx[i].vector);
    if (score > bestScore) {
      bestScore = score;
      bestIdx = i;
    }
  }

  if (bestIdx >= 0 && bestScore >= ICON_THRESHOLD) {
    console.log(`[categorizer] Scoped icon match for "${query}": ${icoIdx[bestIdx].icon} (${bestScore.toFixed(3)}, matched: ${icoIdx[bestIdx].name})`);
    return icoIdx[bestIdx].icon;
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

  // Step 1: manual label
  try {
    await dbConnect();
    const label = await ShoppingItemCategory.findOne({ normalizedName: query, source: 'manual' }, { embedding: 0 }).lean();
    if (label) {
      console.log(`[categorizer] Manual label for "${name}": ${label.category} / ${label.icon}`);
      return { category: label.category, confidence: 1.0, icon: label.icon ?? null };
    }
  } catch { /* continue without labels */ }

  // Step 2: classifier
  const [vector, clf, { project }] = await Promise.all([embed(query), getClassifier(), getSpace()]);
  const { category, margin } = clf.predict(query, project(vector));
  console.log(`[categorizer] Category for "${name}": ${category} (margin ${margin.toFixed(2)})`);

  // Step 3: icon
  const icon =
    catalogIconLookup(query, category) ??
    (await scopedIconSearch(query, vector, category)) ??
    CATEGORY_DEFAULT_ICONS[category] ??
    null;

  return { category, confidence: margin, icon };
}
