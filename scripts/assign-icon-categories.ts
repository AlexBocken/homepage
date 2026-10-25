/**
 * Assign each Bring catalog icon to a shopping category, enabling
 * category-scoped icon search at runtime and labelling the catalog names in
 * the classifier's training set.
 *
 * The guess comes from the shopping classifier trained on everything except
 * the catalog itself; manual fixes in shoppingIconCategoryOverrides.json are
 * applied last so a re-run never clobbers a hand-corrected category.
 *
 * Run: pnpm exec vite-node scripts/assign-icon-categories.ts
 * (after scripts/embed-shopping-training.ts, which embeds the catalog names)
 */
import { pipeline } from '@huggingface/transformers';
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { SHOPPING_CATEGORIES } from '../src/lib/data/shoppingCategoryItems';
import { baseTrainingItems } from '../src/lib/data/shoppingTraining';
import { ShoppingClassifier, loadEmbeddingSpace } from '../src/lib/server/shoppingClassifier';

const MODEL_NAME = 'Xenova/multilingual-e5-large';
const CATALOG_PATH = resolve('src/lib/data/shoppingCatalog.json');
const EMBEDDINGS_PATH = resolve('src/lib/data/shoppingTrainingEmbeddings.json');
const OUTPUT_PATH = resolve('src/lib/data/shoppingIconCategories.json');
const OVERRIDES_PATH = resolve('src/lib/data/shoppingIconCategoryOverrides.json');

async function main() {
  const catalog: Record<string, string> = JSON.parse(readFileSync(CATALOG_PATH, 'utf-8'));
  const { vectors, project } = loadEmbeddingSpace(JSON.parse(readFileSync(EMBEDDINGS_PATH, 'utf-8')));

  let embedder: Awaited<ReturnType<typeof pipeline>> | null = null;
  const vectorFor = async (text: string) => {
    const known = vectors.get(text);
    if (known) return known;
    embedder ??= await pipeline('feature-extraction', MODEL_NAME, { dtype: 'q8' });
    const result = await (embedder as any)(`query: ${text}`, { pooling: 'mean', normalize: true });
    return project(result.data as Float32Array);
  };

  const items = baseTrainingItems({ catalog: false });
  console.log(`Training on ${items.length} non-catalog items...`);
  const clf = new ShoppingClassifier();
  await clf.train(await Promise.all(items.map(async (i) => ({ ...i, vector: await vectorFor(i.text) }))));

  const iconNames = Object.keys(catalog);
  const assignments: Record<string, string> = {};
  for (const name of iconNames) {
    const text = name.toLowerCase();
    assignments[name] = clf.predict(text, await vectorFor(text)).category;
  }

  // Apply manual overrides last so they always win over the classifier's guess.
  const overrides: Record<string, string> = JSON.parse(readFileSync(OVERRIDES_PATH, 'utf-8'));
  const validCategories = new Set<string>(SHOPPING_CATEGORIES);
  let applied = 0;
  for (const [name, category] of Object.entries(overrides)) {
    if (!validCategories.has(category)) {
      console.warn(`  ⚠ override for "${name}" targets unknown category "${category}" — skipped`);
      continue;
    }
    if (!(name in assignments)) {
      console.warn(`  ⚠ override key "${name}" is not in the catalog — skipped`);
      continue;
    }
    assignments[name] = category;
    applied++;
  }
  console.log(`Applied ${applied}/${Object.keys(overrides).length} manual overrides`);

  writeFileSync(OUTPUT_PATH, JSON.stringify(assignments, null, 2), 'utf-8');
  console.log(`Written ${OUTPUT_PATH} (${iconNames.length} entries)`);

  // Print summary
  const counts: Record<string, number> = {};
  for (const cat of Object.values(assignments)) {
    counts[cat] = (counts[cat] || 0) + 1;
  }
  console.log('\nCategory distribution:');
  for (const [cat, count] of Object.entries(counts).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${cat}: ${count}`);
  }
}

main().catch(console.error);
