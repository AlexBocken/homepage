/**
 * Pre-compute embeddings for Bring! catalog items to enable icon matching.
 * Maps item names to their icon filenames via semantic similarity.
 *
 * Run: pnpm exec vite-node scripts/embed-shopping-icons.ts
 */
import { pipeline } from '@huggingface/transformers';
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const MODEL_NAME = 'Xenova/multilingual-e5-base';
const CATALOG_PATH = resolve('static/shopping-icons/catalog.json');
const OUTPUT_FILE = resolve('src/lib/data/shoppingIconEmbeddings.json');

async function main() {
  const catalog: Record<string, string> = JSON.parse(readFileSync(CATALOG_PATH, 'utf-8'));

  // Deduplicate: multiple display names can map to the same icon
  // We want one embedding per unique display name
  const uniqueItems = new Map<string, string>();
  for (const [name, iconFile] of Object.entries(catalog)) {
    uniqueItems.set(name, iconFile);
  }

  const items = [...uniqueItems.entries()];
  console.log(`Loading model ${MODEL_NAME}...`);
  const embedder = await pipeline('feature-extraction', MODEL_NAME, { dtype: 'q8' });

  console.log(`Embedding ${items.length} catalog items...`);
  const entries: { name: string; icon: string; vector: number[] }[] = [];

  for (let i = 0; i < items.length; i++) {
    const [name, icon] = items[i];
    const result = await embedder(`passage: ${name}`, { pooling: 'mean', normalize: true });
    const vector = Array.from(result.data as Float32Array).map(v => Math.round(v * 10000) / 10000);
    entries.push({ name, icon, vector });

    if ((i + 1) % 50 === 0) {
      console.log(`  ${i + 1}/${items.length}`);
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
