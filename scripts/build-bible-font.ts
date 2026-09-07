/**
 * The reader's serif, Linux Libertine, cut down to the characters the Bible
 * routes actually set: every code point in the Allioli and Douay-Rheims
 * files, the commentary collection (when the database answers), the faith
 * translations, the commentators' lives and names, plus whole blocks for
 * safety (Latin, punctuation, superscripts, Greek with its polytonic
 * accents for the Catena's quotations). The result goes to
 * `src/lib/fonts/LinLibertine_bible.woff2`, which the faith stylesheet
 * declares and Vite fingerprints, so it is cached as immutable.
 *
 * Needs fonttools with brotli (`pyftsubset`). The unicode list is written
 * beside the font for the record.
 *
 *   pnpm bible:font
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, writeFileSync, statSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(process.cwd());
const SRC = path.join(ROOT, 'scripts', 'fonts', 'LinLibertine_Rah.ttf');
const OUT = path.join(ROOT, 'src', 'lib', 'fonts', 'LinLibertine_bible.woff2');
const LIST = path.join(ROOT, 'src', 'lib', 'fonts', 'LinLibertine_bible.unicodes.txt');

const used = new Set<number>();
const add = (text: string) => {
	for (const ch of text) used.add(ch.codePointAt(0)!);
};

// The texts themselves.
for (const dir of ['allioli', 'drb']) {
	const d = path.join(ROOT, 'src', 'content', 'bible', dir);
	for (const f of readdirSync(d)) if (f.endsWith('.json')) add(readFileSync(path.join(d, f), 'utf-8'));
}
// What the pages say around them.
for (const f of ['src/lib/i18n/faith/de.ts', 'src/lib/i18n/faith/en.ts', 'src/lib/i18n/faith/la.ts', 'src/lib/data/fathersBio.en.ts', 'src/lib/data/fathersBio.de.ts', 'src/lib/faith/fathers.ts', 'src/lib/faith/bibleCanon.ts']) {
	add(readFileSync(path.join(ROOT, f), 'utf-8'));
}
// The commentaries, when the database is there.
async function addCommentary(): Promise<number> {
	const url = process.env.MONGO_URL ?? readFileSync(path.join(ROOT, '.env'), 'utf-8').match(/MONGO_URL="?([^"\n]+)/)?.[1];
	if (!url) return 0;
	const { default: mongoose } = await import('mongoose');
	const conn = await mongoose.connect(url);
	let n = 0;
	for await (const d of conn.connection.db!.collection('commentaries').find({}, { projection: { text: 1, title: 1, work: 1, authorName: 1 } })) {
		add(`${d.text ?? ''}${d.title ?? ''}${d.work ?? ''}${d.authorName ?? ''}`);
		n++;
	}
	await mongoose.disconnect();
	return n;
}
let docs = 0;
try {
	docs = await addCommentary();
} catch (e) {
	console.warn(`[bible:font] commentary collection not read (${(e as Error).message}); the Greek blocks below cover the Catena's quotations`);
}

// Whole blocks, so a character the scan did not meet still renders in the same face.
const RANGES: [number, number][] = [
	[0x20, 0x7e], // ASCII
	[0xa0, 0xff], // Latin-1
	[0x100, 0x17f], // Latin Extended-A
	[0x2c6, 0x2c6], [0x2dc, 0x2dc], // circumflex and tilde used as spacing marks
	[0x370, 0x3ff], // Greek and Coptic
	[0x1e00, 0x1eff], // Latin Extended Additional (transliteration marks)
	[0x1f00, 0x1fff], // Greek Extended (polytonic)
	[0x2000, 0x206f], // General punctuation: dashes, quotes, daggers, ellipsis
	[0x2070, 0x209f], // Superscripts and subscripts (the footnote markers)
	[0x20ac, 0x20ac], // euro
	[0x2122, 0x2122], // trade mark
	[0x2190, 0x2193], // arrows
	[0xfb00, 0xfb06] // f-ligatures
];
const wanted = new Set<number>();
for (const [a, b] of RANGES) for (let cp = a; cp <= b; cp++) wanted.add(cp);
for (const cp of used) if (cp >= 0x20 && !(cp >= 0x7f && cp < 0xa0)) wanted.add(cp);

const list = [...wanted].sort((a, b) => a - b);
// Compact the list into ranges for pyftsubset.
const parts: string[] = [];
for (let i = 0; i < list.length; ) {
	let j = i;
	while (j + 1 < list.length && list[j + 1] === list[j] + 1) j++;
	parts.push(i === j ? `U+${list[i].toString(16)}` : `U+${list[i].toString(16)}-${list[j].toString(16)}`);
	i = j + 1;
}
writeFileSync(LIST, `${parts.join('\n')}\n`);

execFileSync('pyftsubset', [SRC, `--unicodes=${parts.join(',')}`, '--layout-features=*', '--flavor=woff2', '--no-hinting', '--desubroutinize', `--output-file=${OUT}`], { stdio: 'inherit' });
const kb = (p: string) => (statSync(p).size / 1024).toFixed(0);
console.log(`[bible:font] ${used.size} code points in use (${docs} commentary docs read), ${list.length} kept → ${path.relative(ROOT, OUT)} ${kb(OUT)} KB (from ${kb(SRC)} KB)`);
