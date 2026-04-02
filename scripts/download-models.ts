/**
 * Pre-downloads HuggingFace transformer models so they're cached for runtime.
 * Run with: pnpm exec vite-node scripts/download-models.ts
 */
import { pipeline } from '@huggingface/transformers';

const MODELS = [
	'Xenova/all-MiniLM-L6-v2',
	'Xenova/multilingual-e5-small',
];

for (const name of MODELS) {
	console.log(`Downloading ${name}...`);
	const p = await pipeline('feature-extraction', name, { dtype: 'q8' });
	await p.dispose();
	console.log(`  done`);
}
