/**
 * Word count per chapter, for the reading plan's pacing.
 *
 *   pnpm bible:words
 *
 * Reads the imported books (`src/content/bible/allioli` for German,
 * `src/content/bible/drb` for English), drops footnote markers and the
 * bracketed parallel passages, and writes
 * `src/lib/data/bibleChapterWords.json` as { de: { joh: [w1, …], … }, en: … }.
 * Chapter n is at index n-1. Run again after re-importing a text.
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { stripMarkers } from '../src/lib/faith/bibleText';

const ROOT = path.resolve(process.cwd());
const OUT = path.join(ROOT, 'src', 'lib', 'data', 'bibleChapterWords.json');

type Book = { chapters: { chapter: number; verses: { verse: number; text: Record<string, string> }[] }[] };

function count(dir: string, field: string): Record<string, number[]> {
	const out: Record<string, number[]> = {};
	for (const f of readdirSync(dir).filter((n) => n.endsWith('.json')).sort()) {
		const book = JSON.parse(readFileSync(path.join(dir, f), 'utf-8')) as Book;
		const words: number[] = [];
		for (const c of book.chapters) {
			let n = 0;
			for (const v of c.verses) {
				if (!Number.isInteger(v.verse) || v.verse === 0) continue;
				const text = v.text[field];
				if (text) n += stripMarkers(text).split(/\s+/).filter(Boolean).length;
			}
			words[c.chapter - 1] = n;
		}
		out[f.replace(/\.json$/, '')] = Array.from(words, (w) => w ?? 0);
	}
	return out;
}

const de = count(path.join(ROOT, 'src', 'content', 'bible', 'allioli'), 'german');
const en = count(path.join(ROOT, 'src', 'content', 'bible', 'drb'), 'english');
mkdirSync(path.dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify({ de, en }));
const sum = (t: Record<string, number[]>) => Object.values(t).flat().reduce((a, b) => a + b, 0);
console.log(`[bible:words] de ${sum(de)} words in ${Object.keys(de).length} books, en ${sum(en)} words in ${Object.keys(en).length} books → ${path.relative(ROOT, OUT)}`);
