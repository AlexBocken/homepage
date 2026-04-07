/**
 * Pre-assign each Bring catalog icon to a shopping category using embeddings.
 * This enables category-scoped icon search at runtime.
 *
 * Run: pnpm exec vite-node scripts/assign-icon-categories.ts
 */
import { pipeline } from '@huggingface/transformers';
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const MODEL_NAME = 'Xenova/multilingual-e5-base';
const CATEGORY_EMBEDDINGS_PATH = resolve('src/lib/data/shoppingCategoryEmbeddings.json');
const CATALOG_PATH = resolve('static/shopping-icons/catalog.json');
const OUTPUT_PATH = resolve('src/lib/data/shoppingIconCategories.json');

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

async function main() {
  const catData = JSON.parse(readFileSync(CATEGORY_EMBEDDINGS_PATH, 'utf-8'));
  const catalog: Record<string, string> = JSON.parse(readFileSync(CATALOG_PATH, 'utf-8'));

  console.log(`Loading model ${MODEL_NAME}...`);
  const embedder = await pipeline('feature-extraction', MODEL_NAME, { dtype: 'q8' });

  const iconNames = Object.keys(catalog);
  console.log(`Assigning ${iconNames.length} icons to categories...`);

  const assignments: Record<string, string> = {};

  for (let i = 0; i < iconNames.length; i++) {
    const name = iconNames[i];
    const result = await embedder(`query: ${name.toLowerCase()}`, { pooling: 'mean', normalize: true });
    const qv = Array.from(result.data as Float32Array);

    let bestCategory = 'Sonstiges';
    let bestScore = -1;
    for (const entry of catData.entries) {
      const score = cosineSimilarity(qv, entry.vector);
      if (score > bestScore) {
        bestScore = score;
        bestCategory = entry.category;
      }
    }

    assignments[name] = bestCategory;

    if ((i + 1) % 50 === 0) {
      console.log(`  ${i + 1}/${iconNames.length}`);
    }
  }

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
