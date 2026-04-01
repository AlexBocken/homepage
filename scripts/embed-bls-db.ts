/**
 * Pre-compute sentence embeddings for BLS German food names.
 * Uses multilingual-e5-small for good German language understanding.
 *
 * Run: pnpm exec vite-node scripts/embed-bls-db.ts
 */
import { pipeline } from '@huggingface/transformers';
import { writeFileSync } from 'fs';
import { resolve } from 'path';

// Dynamic import of blsDb (generated file)
const { BLS_DB } = await import('../src/lib/data/blsDb');

const MODEL_NAME = 'Xenova/multilingual-e5-small';
const OUTPUT_FILE = resolve('src/lib/data/blsEmbeddings.json');

async function main() {
  console.log(`Loading model ${MODEL_NAME}...`);
  const embedder = await pipeline('feature-extraction', MODEL_NAME, {
    dtype: 'q8',
  });

  console.log(`Embedding ${BLS_DB.length} BLS entries...`);

  const entries: { blsCode: string; name: string; vector: number[] }[] = [];
  const batchSize = 32;

  for (let i = 0; i < BLS_DB.length; i += batchSize) {
    const batch = BLS_DB.slice(i, i + batchSize);
    // e5 models require "passage: " prefix for documents
    const texts = batch.map(e => `passage: ${e.nameDe}`);

    for (let j = 0; j < batch.length; j++) {
      const result = await embedder(texts[j], { pooling: 'mean', normalize: true });
      const vector = Array.from(result.data as Float32Array).map(v => Math.round(v * 10000) / 10000);

      entries.push({
        blsCode: batch[j].blsCode,
        name: batch[j].nameDe,
        vector,
      });
    }

    if ((i + batchSize) % 500 < batchSize) {
      console.log(`  ${Math.min(i + batchSize, BLS_DB.length)}/${BLS_DB.length}`);
    }
  }

  const output = {
    model: MODEL_NAME,
    dimensions: entries[0]?.vector.length || 384,
    count: entries.length,
    entries,
  };

  const json = JSON.stringify(output);
  writeFileSync(OUTPUT_FILE, json, 'utf-8');
  console.log(`Written ${OUTPUT_FILE} (${(json.length / 1024 / 1024).toFixed(1)}MB, ${entries.length} entries)`);
}

main().catch(console.error);
