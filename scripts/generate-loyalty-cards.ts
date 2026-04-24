/**
 * Build-time generation of loyalty-card barcode SVGs.
 *
 * Reads card numbers from env vars and writes static/shopping/supercard.svg
 * + static/shopping/cumulus.svg. Skips cards whose env var is unset so the
 * site still builds in environments without secrets.
 *
 *   SHOPPING_COOP_SUPERCARD_NUMBER  → Data Matrix (Coop Supercard)
 *   SHOPPING_MIGROS_CUMULUS_NUMBER  → Code 128 (Migros Cumulus)
 *
 * Run: pnpm exec vite-node scripts/generate-loyalty-cards.ts
 */
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { toSVG } from 'bwip-js/node';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(HERE, '..', 'static', 'shopping');

type CardSpec = {
	envVar: string;
	filename: string;
	bcid: 'datamatrix' | 'code128';
	scale: number;
	parsefnc?: boolean;
};

const cards: CardSpec[] = [
	// Coop Supercard uses GS1 Data Matrix with FNC1 separators between fields.
	// Put ^FNC1 in the env value wherever the real symbol has a separator
	// (dmtxread -G prints them as 0x1D); parsefnc: true turns each ^FNC1 into
	// a genuine FNC1 codeword so the regenerated code matches the card.
	{ envVar: 'SHOPPING_COOP_SUPERCARD_NUMBER', filename: 'supercard.svg', bcid: 'datamatrix', scale: 6, parsefnc: true },
	{ envVar: 'SHOPPING_MIGROS_CUMULUS_NUMBER', filename: 'cumulus.svg', bcid: 'code128', scale: 3 }
];

mkdirSync(OUT_DIR, { recursive: true });

for (const card of cards) {
	const value = process.env[card.envVar]?.trim();
	const outPath = resolve(OUT_DIR, card.filename);

	if (!value) {
		try { rmSync(outPath); } catch { /* not present */ }
		console.log(`[loyalty-cards] ${card.envVar} not set — skipped ${card.filename}`);
		continue;
	}

	const svg = toSVG({
		bcid: card.bcid,
		text: value,
		scale: card.scale,
		includetext: false,
		paddingwidth: 8,
		paddingheight: 8,
		...(card.parsefnc ? { parsefnc: true } : {})
	});

	writeFileSync(outPath, svg, 'utf8');
	console.log(`[loyalty-cards] wrote ${card.filename} (${card.bcid})`);
}
