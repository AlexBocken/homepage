/**
 * Import the Allioli Bible (with the Vulgate text and the translator's
 * footnotes) from the `allioli` command into
 * `src/content/bible/allioli/<abbr>.json`, one file per book.
 *
 *   pnpm bible:import                 # the whole Bible (allioli -j -d)
 *   pnpm bible:import -- Joh          # one book
 *   pnpm bible:import -- Joh Mt Lk    # several
 *
 * The files are what `$lib/server/bibleBooks` reads:
 *
 *   { book: { name, abbreviation, number }, chapters: [{ chapter, verses }] }
 *
 * where a verse is { verse, text: { latin?, german }, footnotes?: [{ number, text }] }
 * and verse 0 carries the translator's chapter introduction.
 */
import { execFileSync } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';

import { booksFromJson, type Book } from './allioliImport.js';

const ROOT = path.resolve(process.cwd());
const OUT_DIR = path.join(ROOT, 'src', 'content', 'bible', 'allioli');

function run(args: string[]): string {
	return execFileSync('allioli', args, { encoding: 'utf-8', maxBuffer: 256 * 1024 * 1024 });
}

async function writeBook(entry: Book) {
	const file = path.join(OUT_DIR, `${entry.book.abbreviation.toLowerCase()}.json`);
	await fs.writeFile(file, JSON.stringify(entry));
	const notes = entry.chapters.reduce((n, c) => n + c.verses.reduce((m, v) => m + (v.footnotes?.length ?? 0), 0), 0);
	console.log(`[bible:import] ${entry.book.name}: ${entry.chapters.length} chapters, ${notes} footnotes → ${path.relative(ROOT, file)}`);
}

const wanted = process.argv.slice(2).filter((a) => !a.startsWith('--'));
let books: Book[];
if (wanted.length === 0) {
	books = booksFromJson(run(['-j', '-d']));
} else {
	// An ambiguous abbreviation returns several books; keep the one asked for.
	books = wanted.flatMap((w) => {
		const hits = booksFromJson(run(['-j', w])).filter((b) => b.book.abbreviation.toLowerCase() === w.toLowerCase());
		if (hits.length === 0) throw new Error(`${w}: allioli printed no book with that abbreviation`);
		return hits;
	});
}
await fs.mkdir(OUT_DIR, { recursive: true });
for (const b of books) await writeBook(b);
console.log(`[bible:import] ${books.length} book${books.length === 1 ? '' : 's'} written`);
