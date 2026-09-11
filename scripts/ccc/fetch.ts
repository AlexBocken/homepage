/**
 * Cached fetches for the Catechism importer. Every source page is written to
 * `scripts/.cache/ccc/` (gitignored) the first time it is read, so re-running
 * the importer while working on the parsers costs nothing and hits none of the
 * three sites again. `--refresh` re-downloads.
 */
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const CACHE = path.resolve('scripts', '.cache', 'ccc');
const REFRESH = process.argv.includes('--refresh');
const UA = 'bocken.org catechism importer (one-off, cached)';

/** Politeness: one request at a time per host, with a small gap. */
let chain: Promise<unknown> = Promise.resolve();
function queued<T>(fn: () => Promise<T>): Promise<T> {
	const next = chain.then(fn);
	chain = next.then(
		() => new Promise((r) => setTimeout(r, 150)),
		() => new Promise((r) => setTimeout(r, 150))
	);
	return next;
}

/**
 * The page at `url` as text, decoded with `encoding` (these are 1990s pages;
 * two of the three sources are still ISO-8859-1 and say so in a meta tag only).
 */
export async function page(url: string, key: string, encoding: 'utf-8' | 'latin1' = 'latin1'): Promise<string> {
	const file = path.join(CACHE, key);
	if (!REFRESH && existsSync(file)) return readFile(file, 'utf-8');
	const body = await queued(async () => {
		const res = await fetch(url, { headers: { 'User-Agent': UA } });
		if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
		return Buffer.from(await res.arrayBuffer());
	});
	const text = new TextDecoder(encoding).decode(body);
	await mkdir(path.dirname(file), { recursive: true });
	await writeFile(file, text, 'utf-8');
	return text;
}
