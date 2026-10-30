/**
 * Pre-downloads the transformer models so they're cached for runtime.
 * Run with: pnpm exec vite-node scripts/download-models.ts
 *
 * Hub models go through transformers.js's own download. The fine-tuned
 * nutrition model isn't on the hub: its files are fetched from bocken.org into
 * the same cache, laid out as `<model id>/<file>`, which is where transformers.js
 * looks before it would ever contact the hub.
 */
import { createHash } from 'crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { env, pipeline } from '@huggingface/transformers';
import { NUTRITION_MODEL } from '../src/lib/server/nutritionReranker';

const MODELS = ['Xenova/multilingual-e5-large'];

const NUTRITION_MODEL_URL = 'https://bocken.org/static/models/nutrition-e5-small';
/** sha256 per file; a mismatch (e.g. after retraining) re-downloads it */
const NUTRITION_MODEL_FILES: Record<string, string> = {
	'config.json': '95ff68a370413ccaf4a43138f6621806b1b227fb1b1e4bdfa615865d2d735725',
	'tokenizer.json': 'd1428ad2c91e10b131e1c0d8452b088b632a62738a01328bae78d8af9bf4273a',
	'tokenizer_config.json': '8440b9b594ae355ca28b5ef6f4d2f720e90cfb3ed7999b2d135ca3a142682d7b',
	'onnx/model_quantized.onnx': '9980f0e68a127647e87fbdd0e2a32f3f4c55a5b50aa8d8206be1799dc524a658'
};

const sha256 = (buf: Buffer) => createHash('sha256').update(buf).digest('hex');

for (const name of MODELS) {
	console.log(`Downloading ${name}...`);
	const p = await pipeline('feature-extraction', name, { dtype: 'q8' });
	await p.dispose();
	console.log(`  done`);
}

console.log(`Downloading ${NUTRITION_MODEL}...`);
for (const [file, hash] of Object.entries(NUTRITION_MODEL_FILES)) {
	const path = join(env.cacheDir!, NUTRITION_MODEL, file);
	if (existsSync(path) && sha256(readFileSync(path)) === hash) continue;
	const res = await fetch(`${NUTRITION_MODEL_URL}/${file}`);
	if (!res.ok) throw new Error(`${file}: HTTP ${res.status}`);
	const buf = Buffer.from(await res.arrayBuffer());
	if (sha256(buf) !== hash) throw new Error(`${file}: checksum mismatch`);
	mkdirSync(dirname(path), { recursive: true });
	writeFileSync(path, buf);
	console.log(`  ${file} (${(buf.length / 1e6).toFixed(1)} MB)`);
}
console.log(`  done`);
