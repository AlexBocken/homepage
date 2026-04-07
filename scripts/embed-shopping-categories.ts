/**
 * Pre-compute sentence embeddings for shopping category representative items.
 * Uses multilingual-e5-base for good DE/EN understanding.
 *
 * Run: pnpm exec vite-node scripts/embed-shopping-categories.ts
 */
import { pipeline } from '@huggingface/transformers';
import { writeFileSync } from 'fs';
import { resolve } from 'path';

const { CATEGORY_ITEMS } = await import('../src/lib/data/shoppingCategoryItems');

const MODEL_NAME = 'Xenova/multilingual-e5-base';
const OUTPUT_FILE = resolve('src/lib/data/shoppingCategoryEmbeddings.json');

async function main() {
  console.log(`Loading model ${MODEL_NAME}...`);
  const embedder = await pipeline('feature-extraction', MODEL_NAME, {
    dtype: 'q8',
  });

  console.log(`Embedding ${CATEGORY_ITEMS.length} category items...`);

  const entries: { name: string; category: string; vector: number[] }[] = [];

  for (let i = 0; i < CATEGORY_ITEMS.length; i++) {
    const item = CATEGORY_ITEMS[i];
    // e5 models require "passage: " prefix for documents
    const result = await embedder(`passage: ${item.name}`, { pooling: 'mean', normalize: true });
    const vector = Array.from(result.data as Float32Array).map(v => Math.round(v * 10000) / 10000);

    entries.push({
      name: item.name,
      category: item.category,
      vector,
    });

    if ((i + 1) % 50 === 0) {
      console.log(`  ${i + 1}/${CATEGORY_ITEMS.length}`);
    }
  }

  const output = {
    model: MODEL_NAME,
    dimensions: entries[0]?.vector.length || 768,
    count: entries.length,
    entries,
  };

  const json = JSON.stringify(output);
  writeFileSync(OUTPUT_FILE, json, 'utf-8');
  console.log(`Written ${OUTPUT_FILE} (${(json.length / 1024).toFixed(1)}KB, ${entries.length} entries)`);
}

main().catch(console.error);
