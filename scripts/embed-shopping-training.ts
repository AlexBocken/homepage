/**
 * Pre-compute embeddings for the shopping classifier's static training set
 * (src/lib/data/shoppingTraining.ts), so server startup only has to train the
 * linear model instead of embedding thousands of items.
 *
 * The raw e5 vectors (1024-d for e5-large) are reduced to PCA_DIM principal components fitted on
 * this set (projection shipped alongside, so the runtime maps new items into
 * the same space), then int8-quantised with one global scale. Re-embeds
 * everything each run (~35 s on a desktop).
 *
 * Run: pnpm exec vite-node scripts/embed-shopping-training.ts
 */
import { pipeline } from '@huggingface/transformers';
import { writeFileSync } from 'fs';
import { resolve } from 'path';
import { baseTrainingItems } from '../src/lib/data/shoppingTraining';
import type { EmbeddingFile } from '../src/lib/server/shoppingClassifier';

const MODEL_NAME = 'Xenova/multilingual-e5-large';
const OUTPUT_FILE = resolve('src/lib/data/shoppingTrainingEmbeddings.json');
const PCA_DIM = 64;
const BATCH = 32;

/** Top-k principal directions of the rows of X (n × d), via subspace iteration. */
function pca(X: Float64Array, n: number, d: number, k: number) {
	const mean = new Float64Array(d);
	for (let i = 0; i < n; i++) for (let j = 0; j < d; j++) mean[j] += X[i * d + j] / n;
	for (let i = 0; i < n; i++) for (let j = 0; j < d; j++) X[i * d + j] -= mean[j];

	// Covariance (unscaled — only the directions matter)
	const cov = new Float64Array(d * d);
	for (let i = 0; i < n; i++) {
		const off = i * d;
		for (let a = 0; a < d; a++) {
			const xa = X[off + a];
			if (xa === 0) continue;
			for (let b = a; b < d; b++) cov[a * d + b] += xa * X[off + b];
		}
	}
	for (let a = 0; a < d; a++) for (let b = 0; b < a; b++) cov[a * d + b] = cov[b * d + a];

	// Q: k orthonormal columns stored as rows (k × d)
	let seed = 42;
	const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647 - 0.5;
	let Q = Float64Array.from({ length: k * d }, rand);
	const orthonormalise = (M: Float64Array) => {
		for (let c = 0; c < k; c++) {
			for (let p = 0; p < c; p++) {
				let dot = 0;
				for (let j = 0; j < d; j++) dot += M[c * d + j] * M[p * d + j];
				for (let j = 0; j < d; j++) M[c * d + j] -= dot * M[p * d + j];
			}
			let nrm = 0;
			for (let j = 0; j < d; j++) nrm += M[c * d + j] ** 2;
			nrm = Math.sqrt(nrm);
			for (let j = 0; j < d; j++) M[c * d + j] /= nrm;
		}
	};
	orthonormalise(Q);
	for (let iter = 0; iter < 100; iter++) {
		const Z = new Float64Array(k * d);
		for (let c = 0; c < k; c++)
			for (let a = 0; a < d; a++) {
				let s = 0;
				for (let b = 0; b < d; b++) s += cov[a * d + b] * Q[c * d + b];
				Z[c * d + a] = s;
			}
		orthonormalise(Z);
		let change = 0;
		for (let i = 0; i < Z.length; i++) change = Math.max(change, Math.abs(Math.abs(Z[i]) - Math.abs(Q[i])));
		Q = Z;
		if (change < 1e-7) break;
	}
	return { mean, components: Q };
}

async function main() {
	const texts = [...new Set(baseTrainingItems().map((i) => i.text))];
	console.log(`Loading model ${MODEL_NAME}...`);
	const embedder = await pipeline('feature-extraction', MODEL_NAME, { dtype: 'q8' });

	let rawDim = 0;
	let X = new Float64Array(0);
	console.log(`Embedding ${texts.length} training texts...`);
	for (let i = 0; i < texts.length; i += BATCH) {
		const batch = texts.slice(i, i + BATCH);
		// e5 wants a "query: " prefix; the runtime embeds items the same way
		const result = await embedder(batch.map((t) => `query: ${t}`), { pooling: 'mean', normalize: true });
		const data = result.data as Float32Array;
		if (!rawDim) {
			rawDim = data.length / batch.length;
			X = new Float64Array(texts.length * rawDim);
		}
		X.set(data, i * rawDim);
		if ((i / BATCH) % 50 === 0) console.log(`  ${Math.min(i + BATCH, texts.length)}/${texts.length}`);
	}

	console.log(`PCA ${rawDim} → ${PCA_DIM}...`);
	const raw = X.slice();
	const { mean, components } = pca(X, texts.length, rawDim, PCA_DIM);

	const projected = new Float64Array(texts.length * PCA_DIM);
	let normSum = 0;
	for (let i = 0; i < texts.length; i++) {
		let sq = 0;
		for (let c = 0; c < PCA_DIM; c++) {
			let s = 0;
			for (let j = 0; j < rawDim; j++) s += (raw[i * rawDim + j] - mean[j]) * components[c * rawDim + j];
			projected[i * PCA_DIM + c] = s;
			sq += s * s;
		}
		normSum += Math.sqrt(sq);
	}
	// Scale so the block is ~unit length, like the L2-normalised n-gram block
	const norm = normSum / texts.length;
	let max = 0;
	for (let i = 0; i < projected.length; i++) {
		projected[i] /= norm;
		max = Math.max(max, Math.abs(projected[i]));
	}
	const bytes = new Int8Array(projected.length);
	for (let i = 0; i < projected.length; i++) bytes[i] = Math.round((projected[i] / max) * 127);

	const round = (v: number) => Math.round(v * 1e6) / 1e6;
	const output: EmbeddingFile = {
		model: MODEL_NAME,
		rawDim,
		dim: PCA_DIM,
		mean: Array.from(mean, round),
		components: Array.from(components, round),
		norm,
		scale: max,
		texts,
		data: Buffer.from(bytes.buffer).toString('base64')
	};
	const json = JSON.stringify(output);
	writeFileSync(OUTPUT_FILE, json, 'utf-8');
	console.log(`Written ${OUTPUT_FILE} (${(json.length / 1024).toFixed(0)} KB, ${texts.length} entries)`);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
