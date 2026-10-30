/**
 * Pre-compute the fine-tuned e5 embedding of every BLS and USDA entry's German
 * name for the nutrition reranker (src/lib/server/nutritionReranker.ts).
 *
 * Runs the same ONNX model the server loads, so stored vectors and runtime
 * queries come from one model. int8-quantised with one scale per entry
 * (~7.5 MB for ~14.6k entries). Re-run after re-importing BLS/USDA or swapping
 * the model; needs `pnpm exec vite-node scripts/download-models.ts` first.
 *
 * Run: pnpm exec vite-node scripts/embed-nutrition-entries.ts
 */
import { pipeline } from '@huggingface/transformers';
import { writeFileSync } from 'fs';
import { resolve } from 'path';
import { BLS_DB } from '../src/lib/data/blsDb';
import { NUTRITION_DB } from '../src/lib/data/nutritionDb';
import { usdaNameDe } from '../src/lib/data/usdaNamesDe';
import { NUTRITION_MODEL, rankEntries, type EntryEmbeddingFile } from '../src/lib/server/nutritionReranker';

const OUTPUT_FILE = resolve('src/lib/data/nutritionEntryEmbeddings.json');
const BATCH = 64;

const entries = rankEntries(BLS_DB, NUTRITION_DB, usdaNameDe);
console.log(`Loading ${NUTRITION_MODEL}…`);
const embedder = await pipeline('feature-extraction', NUTRITION_MODEL, { dtype: 'q8' });

const t0 = performance.now();
let dim = 0;
const vectors: Float32Array[] = [];
for (let i = 0; i < entries.length; i += BATCH) {
	const batch = entries.slice(i, i + BATCH).map((e) => `passage: ${e.nameDe}`);
	const out = await embedder(batch, { pooling: 'mean', normalize: true });
	dim = out.dims[1];
	const data = out.data as Float32Array;
	for (let j = 0; j < batch.length; j++) vectors.push(data.slice(j * dim, (j + 1) * dim));
	if ((i / BATCH) % 20 === 0) console.log(`  ${i + batch.length}/${entries.length}`);
}

const bytes = new Int8Array(entries.length * dim);
const scales = vectors.map((v, i) => {
	const scale = v.reduce((m, x) => Math.max(m, Math.abs(x)), 0) || 1;
	for (let j = 0; j < dim; j++) bytes[i * dim + j] = Math.round((v[j] / scale) * 127);
	return Number(scale.toPrecision(6));
});

const file: EntryEmbeddingFile = {
	model: NUTRITION_MODEL,
	dim,
	keys: entries.map((e) => e.key),
	scales,
	data: Buffer.from(bytes.buffer).toString('base64')
};
const json = JSON.stringify(file);
writeFileSync(OUTPUT_FILE, json, 'utf-8');
console.log(
	`Wrote ${OUTPUT_FILE} (${(json.length / 1024 / 1024).toFixed(1)} MB, ${entries.length} entries) in ${Math.round((performance.now() - t0) / 1000)} s`
);
