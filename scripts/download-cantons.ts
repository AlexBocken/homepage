/**
 * One-shot fetch of the 26 Swiss cantonal coats of arms (Wappen) from
 * Wikimedia Commons into `static/cantons/<iso-code>.svg`. Files are
 * public-domain Swiss official insignia (PD-CH-coat-of-arms); we keep
 * the source filename in a header comment for traceability.
 *
 * Re-run with `pnpm exec vite-node scripts/download-cantons.ts` to refresh
 * any missing files. Existing files are left alone — the cantonal arms
 * don't change.
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';

type CantonEntry = {
	code: string;            // ISO 3166-2:CH (lowercase for filename)
	commonsFile: string;     // Commons filename WITHOUT the `File:` prefix
};

// Names follow the "Wappen <German-name> matt.svg" convention used across
// almost all cantons on Commons. The handful of exceptions (Basel-Stadt,
// Basel-Landschaft, the two Appenzells) are spelt out explicitly. If a
// fetch returns 404 the script logs the failure and continues so the
// remaining cantons still land.
const CANTONS: CantonEntry[] = [
	{ code: 'ag', commonsFile: 'Wappen Aargau matt.svg' },
	{ code: 'ai', commonsFile: 'Wappen Appenzell Innerrhoden matt.svg' },
	{ code: 'ar', commonsFile: 'Wappen Appenzell Ausserrhoden matt.svg' },
	{ code: 'be', commonsFile: 'Wappen Bern matt.svg' },
	{ code: 'bl', commonsFile: 'Wappen Basel-Landschaft matt.svg' },
	{ code: 'bs', commonsFile: 'Wappen Basel-Stadt matt.svg' },
	{ code: 'fr', commonsFile: 'Wappen Freiburg matt.svg' },
	{ code: 'ge', commonsFile: 'Wappen Genf matt.svg' },
	{ code: 'gl', commonsFile: 'Wappen Glarus matt.svg' },
	{ code: 'gr', commonsFile: 'Wappen Graubünden matt.svg' },
	{ code: 'ju', commonsFile: 'Wappen Jura matt.svg' },
	{ code: 'lu', commonsFile: 'Wappen Luzern matt.svg' },
	{ code: 'ne', commonsFile: 'Wappen Neuenburg matt.svg' },
	{ code: 'nw', commonsFile: 'Wappen Nidwalden matt.svg' },
	{ code: 'ow', commonsFile: 'Wappen Obwalden matt.svg' },
	{ code: 'sg', commonsFile: 'Wappen St. Gallen matt.svg' },
	{ code: 'sh', commonsFile: 'Wappen Schaffhausen matt.svg' },
	{ code: 'so', commonsFile: 'Wappen Solothurn matt.svg' },
	{ code: 'sz', commonsFile: 'Wappen Schwyz matt.svg' },
	{ code: 'tg', commonsFile: 'Wappen Thurgau matt.svg' },
	{ code: 'ti', commonsFile: 'Wappen Tessin matt.svg' },
	{ code: 'ur', commonsFile: 'Wappen Uri matt.svg' },
	{ code: 'vd', commonsFile: 'Wappen Waadt matt.svg' },
	{ code: 'vs', commonsFile: 'Wappen Wallis matt.svg' },
	{ code: 'zg', commonsFile: 'Wappen Zug matt.svg' },
	{ code: 'zh', commonsFile: 'Wappen Zürich matt.svg' }
];

const OUT_DIR = path.resolve(process.cwd(), 'static', 'cantons');
const UA = 'bocken-homepage cantons-downloader (https://bocken.org)';

async function exists(p: string): Promise<boolean> {
	try { await fs.access(p); return true; } catch { return false; }
}

/** Resolve a Commons `File:Foo.svg` to its actual upload.wikimedia.org URL
 * via the public API. Returns null on failure (typo in filename, etc.). */
async function resolveCommonsUrl(file: string): Promise<string | null> {
	const url =
		'https://commons.wikimedia.org/w/api.php' +
		'?action=query&format=json&prop=imageinfo&iiprop=url' +
		'&titles=' + encodeURIComponent('File:' + file);
	const res = await fetch(url, { headers: { 'User-Agent': UA } });
	if (!res.ok) return null;
	const json = (await res.json()) as {
		query?: { pages?: Record<string, { imageinfo?: Array<{ url?: string }> }> };
	};
	const pages = json.query?.pages;
	if (!pages) return null;
	for (const page of Object.values(pages)) {
		const u = page.imageinfo?.[0]?.url;
		if (u) return u;
	}
	return null;
}

async function downloadCanton(c: CantonEntry): Promise<'ok' | 'cached' | 'failed'> {
	const outPath = path.join(OUT_DIR, `${c.code}.svg`);
	if (await exists(outPath)) return 'cached';

	const url = await resolveCommonsUrl(c.commonsFile);
	if (!url) {
		console.warn(`[cantons] ${c.code}: could not resolve Commons file "${c.commonsFile}"`);
		return 'failed';
	}

	const res = await fetch(url, { headers: { 'User-Agent': UA } });
	if (!res.ok) {
		console.warn(`[cantons] ${c.code}: HTTP ${res.status} fetching ${url}`);
		return 'failed';
	}
	const body = await res.text();
	// Don't prepend anything: most of these files start with an `<?xml … ?>`
	// declaration, and that MUST be the very first thing in the file or
	// strict XML parsers (including browsers loading via `<img>`) reject
	// the document. Provenance is tracked in the CANTONS table above
	// instead — keep it out of the file bytes.
	await fs.writeFile(outPath, body);
	return 'ok';
}

async function main() {
	await fs.mkdir(OUT_DIR, { recursive: true });

	let ok = 0, cached = 0, failed = 0;
	for (const c of CANTONS) {
		const r = await downloadCanton(c);
		if (r === 'ok') ok++;
		else if (r === 'cached') cached++;
		else failed++;
		if (r === 'ok') console.log(`[cantons] ${c.code}: downloaded`);
		else if (r === 'cached') console.log(`[cantons] ${c.code}: cached`);
	}
	console.log(`[cantons] done — ${ok} downloaded, ${cached} cached, ${failed} failed`);
	if (failed > 0) process.exitCode = 1;
}

main().catch((err) => {
	console.error('[cantons] fatal:', err);
	process.exit(1);
});
