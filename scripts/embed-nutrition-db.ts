/**
 * Pre-computes sentence embeddings for all USDA nutrition DB entries using
 * all-MiniLM-L6-v2 via @huggingface/transformers.
 *
 * Run with: pnpm exec vite-node scripts/embed-nutrition-db.ts
 *
 * Outputs: src/lib/data/nutritionEmbeddings.json
 * Format: { entries: [{ fdcId, name, vector: number[384] }] }
 */
import { writeFileSync } from 'fs';
import { resolve } from 'path';
import { pipeline } from '@huggingface/transformers';
import { NUTRITION_DB } from '../src/lib/data/nutritionDb';

const OUTPUT_PATH = resolve('src/lib/data/nutritionEmbeddings.json');
const MODEL_NAME = 'Xenova/all-MiniLM-L6-v2';
const BATCH_SIZE = 64;

async function main() {
	console.log('=== Nutrition DB Embedding Generation ===\n');
	console.log(`Entries to embed: ${NUTRITION_DB.length}`);
	console.log(`Model: ${MODEL_NAME}`);
	console.log(`Loading model (first run downloads ~23MB)...\n`);

	const embedder = await pipeline('feature-extraction', MODEL_NAME, {
		dtype: 'q8',
	});

	const entries: { fdcId: number; name: string; vector: number[] }[] = [];
	const totalBatches = Math.ceil(NUTRITION_DB.length / BATCH_SIZE);

	for (let i = 0; i < NUTRITION_DB.length; i += BATCH_SIZE) {
		const batch = NUTRITION_DB.slice(i, i + BATCH_SIZE);
		const batchNum = Math.floor(i / BATCH_SIZE) + 1;
		process.stdout.write(`\r  Batch ${batchNum}/${totalBatches} (${i + batch.length}/${NUTRITION_DB.length})`);

		// Embed all names in this batch
		for (const item of batch) {
			const result = await embedder(item.name, { pooling: 'mean', normalize: true });
			// result.data is a Float32Array — truncate to 4 decimal places to save space
			const vector = Array.from(result.data as Float32Array).map(v => Math.round(v * 10000) / 10000);
			entries.push({ fdcId: item.fdcId, name: item.name, vector });
		}
	}

	console.log('\n\nWriting embeddings...');

	const output = { model: MODEL_NAME, dimensions: 384, count: entries.length, entries };
	writeFileSync(OUTPUT_PATH, JSON.stringify(output), 'utf-8');

	const fileSizeMB = (Buffer.byteLength(JSON.stringify(output)) / 1024 / 1024).toFixed(1);
	console.log(`Written ${entries.length} embeddings to ${OUTPUT_PATH} (${fileSizeMB}MB)`);

	await embedder.dispose();
}

main().catch(err => {
	console.error('Embedding generation failed:', err);
	process.exit(1);
});
