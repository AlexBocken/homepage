/**
 * Translates the USDA food database (src/lib/data/nutritionDb.ts) to German via DeepL.
 *
 * Run with:
 *   pnpm exec vite-node scripts/translate-usda-nutrition.ts -- --pilot=200
 *   pnpm exec vite-node scripts/translate-usda-nutrition.ts -- --full
 *
 * Outputs two committed files:
 *   src/lib/data/usdaSegmentsDe.json   — the paid artifact: DeepL output per
 *                                        (category, segment). Do not regenerate casually.
 *   src/lib/data/nutritionNamesDe.json — derived: English full name -> German full name.
 *                                        This is what the app loads.
 *
 * ## Why segments, not whole names
 *
 * USDA names are comma-separated qualifier lists over a small closed vocabulary
 * ("Beef, chuck, short ribs, boneless, separable lean only, trimmed to 0" fat, cooked").
 * Translating whole names through DeepL worked, but came back inconsistent between
 * batches — "cooked" as both gegart and gekocht, "all grades" as both Qualitätsklassen
 * and Qualitätsstufen. That breaks search: half the entries miss either query.
 *
 * So each name is split into segments and each segment resolved by one of three rules:
 *   1. canonical — in usdaGermanTerms.ts. Covers 59% of segment occurrences. Pinned and
 *                  never sent to DeepL, so it is consistent by construction.
 *   2. verbatim  — segments with no lowercase letter are USDA brand names ("QUAKER",
 *                  "MEAD JOHNSON", "MARS SNACKFOOD US"). Kept as written.
 *   3. DeepL     — everything else: the distinctive food, cut or variety. Deduplicated
 *                  by (category, segment) across the corpus.
 *
 * Rules 1 and 2 cut the spend from 408k characters to ~77k, which is what makes this
 * affordable on the DeepL free tier (500k/month) with room left to re-run.
 *
 * ## Context
 *
 * A bare segment like "top round" is ambiguous, so every request carries the food
 * category and example source names as `context`. DeepL does not bill context
 * characters, so this disambiguation is free.
 */
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { NUTRITION_DB } from '../src/lib/data/nutritionDb';
import { canonicalSegment } from './usdaGermanTerms';

const SEGMENT_PATH = resolve('src/lib/data/usdaSegmentsDe.json');
const NAMES_PATH = resolve('src/lib/data/nutritionNamesDe.json');
const REPORT_PATH = resolve('data/usda-de-report.txt');

const DEEPL_API_KEY = process.env.DEEPL_API_KEY;
const DEEPL_API_URL = process.env.DEEPL_API_URL || 'https://api-free.deepl.com/v2/translate';
const DEEPL_USAGE_URL = DEEPL_API_URL.replace(/\/translate$/, '/usage');

if (!DEEPL_API_KEY) {
	console.error('DEEPL_API_KEY missing from .env');
	process.exit(1);
}

const BATCH_SIZE = 50;

// USDA shorthand, expanded before translation so DeepL renders the meaning rather than
// passing the abbreviation through untouched (or reading "NS" as a unit).
const ABBREVIATIONS: [RegExp, string][] = [
	[/\bNFS\b/g, 'not further specified'],
	[/\bNS\b/g, 'not specified'],
	[/\bincl\b\.?/g, 'including'],
	[/\bexcl\b\.?/g, 'excluding'],
	[/\bapprox\b\.?/g, 'approximately'],
	[/\bw\/o\b/g, 'without'],
	[/\bwo\/\b/g, 'without'],
	[/\bw\/\b/g, 'with'],
];

type Unit = { key: string; segment: string; category: string; sample: string };

/**
 * Split a segment into its base and an optional trailing parenthetical.
 *
 * 700 names carry one ("Cheese, cheddar (Includes foods for USDA's Food Distribution
 * Program)"). Left attached, the parenthetical glues itself to the preceding term and
 * hides it from the canonical dictionary — "raw (Includes...)" no longer matches "raw",
 * so the same boilerplate came back translated seven different ways. Resolving the two
 * halves separately keeps the base canonical and collapses the note to one cache entry.
 */
function splitParenthetical(seg: string): { base: string; note: string | null } {
	const m = seg.match(/^(.*?)\s*\(([^)]*)\)$/);
	if (!m || !m[1]) return { base: seg, note: null };
	return { base: m[1], note: m[2] };
}

/** The atomic pieces of a name that each need a German rendering. */
function resolvableParts(name: string): { base: string; note: string | null }[] {
	return name
		.split(/,\s*/)
		.filter(Boolean)
		.map(splitParenthetical);
}

/** A segment with no lowercase letter is a USDA brand name — never translate it. */
function isBrand(seg: string): boolean {
	return /[A-Z]/.test(seg) && !/[a-z]/.test(seg);
}

/**
 * Fence ALL-CAPS runs (brand names inside an otherwise translatable segment) so DeepL
 * passes them through, and XML-escape the rest: tag_handling=xml requires a well-formed
 * payload, and USDA names carry bare "&" ("M&M'S", "Soups & Gravies").
 */
function protectBrands(text: string): string {
	const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
	// Trailing apostrophes must stay out of the match: "USDA's" would otherwise capture
	// "USDA'" as the brand and leave a dangling "s", rendering as "USDA'’s".
	const re = /\b[A-Z][A-Z0-9&.-]+(?:'S)?\b/g;
	let out = '';
	let last = 0;
	let m: RegExpExecArray | null;
	while ((m = re.exec(text)) !== null) {
		out += esc(text.slice(last, m.index)) + `<x>${esc(m[0])}</x>`;
		last = m.index + m[0].length;
	}
	return out + esc(text.slice(last));
}

function unprotect(text: string): string {
	return (
		text
			.replace(/<\/?x>/g, '')
			// DeepL wraps ignore_tags content in German quotation marks; strip them so
			// brand names read as USDA writes them.
			.replace(/[„“”»«]/g, '')
			.replace(/&lt;/g, '<')
			.replace(/&gt;/g, '>')
			.replace(/&amp;/g, '&')
	);
}

/**
 * This repo writes Swiss High German. DeepL always returns reichsdeutsch, so normalise
 * its output here rather than fixing up the generated files afterwards — otherwise the
 * next re-run quietly reintroduces it.
 *
 *  - eszett becomes ss (also enforced by the pre-commit hook)
 *  - grilling is grillieren, not grillen, so "gegrillt" becomes "grilliert". The
 *    suffix is left alone so inflections carry through ("gegrilltes" → "grilliertes").
 *    Nouns like "Grillputen" are already fine and must not be touched.
 */
function toSwissGerman(text: string): string {
	return text
		.replace(/ß/g, 'ss') // ß-ok (this is the normaliser)
		.replace(/([Gg])egrillt/g, (_, g: string) => (g === 'G' ? 'Grilliert' : 'grilliert'));
}

function preprocess(seg: string): string {
	let out = seg;
	for (const [re, rep] of ABBREVIATIONS) out = out.replace(re, rep);
	return protectBrands(out);
}

function segmentKey(category: string, segment: string): string {
	return `${category} :: ${segment}`;
}

function loadJson<T>(path: string, fallback: T): T {
	return existsSync(path) ? JSON.parse(readFileSync(path, 'utf-8')) : fallback;
}

function saveJson(path: string, obj: Record<string, string>) {
	const sorted: Record<string, string> = {};
	for (const k of Object.keys(obj).sort()) sorted[k] = obj[k];
	writeFileSync(path, JSON.stringify(sorted, null, '\t') + '\n', 'utf-8');
}

async function usage(): Promise<{ character_count: number; character_limit: number }> {
	const resp = await fetch(DEEPL_USAGE_URL, {
		headers: { Authorization: `DeepL-Auth-Key ${DEEPL_API_KEY}` },
	});
	if (!resp.ok) throw new Error(`DeepL usage ${resp.status}: ${await resp.text()}`);
	return resp.json();
}

/** Translate a batch of segments that share a category. */
async function translateBatch(units: Unit[], category: string): Promise<string[]> {
	// The context is parsed as XML too under tag_handling=xml, and the sample names it
	// embeds carry bare "&" — escape it exactly like the payload.
	const escapeXml = (s: string) =>
		s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
	const context = escapeXml(
		`Segments of entry names from the USDA FoodData Central food composition database, ` +
		`category "${category}". Each is one comma-separated qualifier of a food name, ` +
		`naming the food itself or its variety, cut, part, preparation or state. ` +
		`Translate as German food-database terms. Example source names from this category: ` +
			units
				.slice(0, 8)
				.map((u) => `"${u.sample}"`)
				.join('; ')
	);

	const resp = await fetch(DEEPL_API_URL, {
		method: 'POST',
		headers: {
			Authorization: `DeepL-Auth-Key ${DEEPL_API_KEY}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			text: units.map((u) => preprocess(u.segment)),
			source_lang: 'EN',
			target_lang: 'DE',
			context,
			tag_handling: 'xml',
			ignore_tags: ['x'],
			preserve_formatting: true,
		}),
	});
	if (!resp.ok) throw new Error(`DeepL ${resp.status}: ${await resp.text()}`);
	const data = (await resp.json()) as { translations: { text: string }[] };
	return data.translations.map((t) => toSwissGerman(unprotect(t.text).trim()));
}

/** Resolve a full English name to German using canonical terms + the segment cache. */
function assemble(name: string, category: string, segments: Record<string, string>): string | null {
	const resolve = (piece: string): string | null => {
		const canon = canonicalSegment(piece);
		if (canon) return canon;
		if (isBrand(piece)) return piece;
		return segments[segmentKey(category, piece)] ?? null;
	};

	const parts: string[] = [];
	for (const { base, note } of resolvableParts(name)) {
		const baseDe = resolve(base);
		if (baseDe === null) return null; // not translated yet
		if (note === null) {
			parts.push(baseDe);
			continue;
		}
		const noteDe = resolve(note);
		if (noteDe === null) return null;
		parts.push(`${baseDe} (${noteDe})`);
	}

	// Collapse adjacent duplicates. English distinguishes qualifiers that German merges
	// onto one word — "Peppers, bell" is Paprika twice, "Chicory, witloof" Chicorée twice
	// — and a translated segment can itself contain a comma, so re-split before checking.
	const flat = parts.join(', ').split(', ');
	const deduped = flat.filter((p, i) => i === 0 || p.toLowerCase() !== flat[i - 1].toLowerCase());
	return deduped.join(', ');
}

/** Proportional sample across all categories, with a floor so small ones appear. */
function stratifiedSample<T extends { category: string }>(entries: readonly T[], target: number): T[] {
	const byCategory = new Map<string, T[]>();
	for (const e of entries) {
		if (!byCategory.has(e.category)) byCategory.set(e.category, []);
		byCategory.get(e.category)!.push(e);
	}
	const picked: T[] = [];
	for (const [, list] of byCategory) {
		const n = Math.max(3, Math.round((list.length / entries.length) * target));
		const stride = Math.max(1, Math.floor(list.length / n));
		for (let i = 0; i < list.length && picked.length < target * 1.5; i += stride) picked.push(list[i]);
	}
	return picked;
}

async function main() {
	const args = process.argv.slice(2);
	const pilotArg = args.find((a) => a.startsWith('--pilot'));
	const isFull = args.includes('--full');
	if (!pilotArg && !isFull) {
		console.error('Pass --pilot=<n> or --full');
		process.exit(1);
	}

	const segments = loadJson<Record<string, string>>(SEGMENT_PATH, {});
	const selected = isFull
		? NUTRITION_DB
		: stratifiedSample(NUTRITION_DB, Number(pilotArg!.split('=')[1] || 200));

	// Collect the distinct (category, segment) pairs that still need DeepL.
	const units = new Map<string, Unit>();
	for (const entry of selected) {
		for (const { base, note } of resolvableParts(entry.name)) {
			for (const piece of note === null ? [base] : [base, note]) {
				if (!piece || canonicalSegment(piece) || isBrand(piece)) continue;
				const key = segmentKey(entry.category, piece);
				if (key in segments || units.has(key)) continue;
				units.set(key, { key, segment: piece, category: entry.category, sample: entry.name });
			}
		}
	}

	const todo = [...units.values()];
	const chars = todo.reduce((a, u) => a + preprocess(u.segment).length, 0);
	const before = await usage();
	const remaining = before.character_limit - before.character_count;
	console.log(`DeepL usage: ${before.character_count}/${before.character_limit} (${remaining} left)`);
	console.log(`${selected.length} entries selected; ${todo.length} new segments (~${chars} chars)`);

	if (chars > remaining) {
		console.error(`\nAborting: needs ~${chars} chars but only ${remaining} remain this period.`);
		process.exit(1);
	}

	if (todo.length > 0) {
		const groups = new Map<string, Unit[]>();
		for (const u of todo) {
			if (!groups.has(u.category)) groups.set(u.category, []);
			groups.get(u.category)!.push(u);
		}
		let done = 0;
		for (const [category, list] of groups) {
			for (let i = 0; i < list.length; i += BATCH_SIZE) {
				const chunk = list.slice(i, i + BATCH_SIZE);
				const out = await translateBatch(chunk, category);
				chunk.forEach((u, j) => (segments[u.key] = out[j]));
				// Persist after every batch — a crash must not lose paid-for characters.
				saveJson(SEGMENT_PATH, segments);
				done += chunk.length;
				process.stdout.write(`  · ${done}/${todo.length}  [${category}]\n`);
			}
		}
		const after = await usage();
		console.log(`\nDeepL usage now: ${after.character_count}/${after.character_limit}`);
		console.log(`This run spent ${after.character_count - before.character_count} characters.`);
	} else {
		console.log('All segments already cached — no DeepL calls needed.');
	}

	// Assemble every name that is now fully resolvable (a pilot leaves most unresolved).
	const names: Record<string, string> = {};
	for (const entry of NUTRITION_DB) {
		const de = assemble(entry.name, entry.category, segments);
		if (de) names[entry.name] = de;
	}
	saveJson(NAMES_PATH, names);
	console.log(`\nResolved ${Object.keys(names).length}/${NUTRITION_DB.length} names -> ${NAMES_PATH}`);
	console.log(`Segment cache: ${Object.keys(segments).length} entries -> ${SEGMENT_PATH}`);

	const report = selected
		.filter((e) => names[e.name])
		.map((e) => `[${e.category}]\n  EN  ${e.name}\n  DE  ${names[e.name]}\n`)
		.join('\n');
	writeFileSync(REPORT_PATH, report, 'utf-8');
	console.log(`Report written to ${REPORT_PATH}`);
}

main().catch((err) => {
	console.error('Translation failed:', err);
	process.exit(1);
});
