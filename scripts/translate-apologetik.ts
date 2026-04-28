/**
 * Translates apologetik English data → target language via DeepL.
 *
 * Usage:
 *   pnpm exec vite-node scripts/translate-apologetik.ts            # default DE
 *   pnpm exec vite-node scripts/translate-apologetik.ts -- --lang=DE
 *
 * Reads:  src/lib/data/apologetik.ts (English source of truth)
 * Writes: src/lib/data/apologetik.<lang>.ts
 *
 * Note: DeepL does not support Latin. For LA, translate manually or wire a
 * different provider.
 */

import { writeFileSync, readFileSync } from 'fs';
import { resolve } from 'path';

// Minimal .env loader — avoid extra deps.
function loadEnv() {
	try {
		const raw = readFileSync(resolve(process.cwd(), '.env'), 'utf8');
		for (const line of raw.split('\n')) {
			const trimmed = line.trim();
			if (!trimmed || trimmed.startsWith('#')) continue;
			const eq = trimmed.indexOf('=');
			if (eq < 0) continue;
			const key = trimmed.slice(0, eq).trim();
			let value = trimmed.slice(eq + 1).trim();
			if (
				(value.startsWith('"') && value.endsWith('"')) ||
				(value.startsWith("'") && value.endsWith("'"))
			) {
				value = value.slice(1, -1);
			}
			if (!(key in process.env)) process.env[key] = value;
		}
	} catch {
		// no .env — fine, rely on process env
	}
}
loadEnv();

import {
	ARCHETYPES,
	ARGUMENTS,
	POS_VOICES,
	POS_LAYERS,
	POS_ARGUMENTS,
	type Archetype,
	type Argument,
	type Counter,
	type PosVoice,
	type PosLayer,
	type PosArgument,
	type PosCounter
} from '../src/lib/data/apologetik';

const DEEPL_API_KEY = process.env.DEEPL_API_KEY;
const DEEPL_API_URL = process.env.DEEPL_API_URL || 'https://api-free.deepl.com/v2/translate';

if (!DEEPL_API_KEY) {
	console.error('DEEPL_API_KEY missing from .env');
	process.exit(1);
}

const argLang = process.argv.find((a) => a.startsWith('--lang='))?.split('=')[1];
const TARGET_LANG = (argLang ?? 'DE').toUpperCase();
const FILE_LANG = TARGET_LANG.toLowerCase();

const BATCH_SIZE = 50;
const cache = new Map<string, string>();

// Manual overrides applied after DeepL translation, keyed by English source.
// Use for cases where DeepL produces a wrong / inconsistent German rendering
// that should survive regeneration.
const OVERRIDES: Record<string, Record<string, string>> = {
	DE: {
		// generic-masculine for archetype role names
		'The Scientist': 'Der Wissenschaftler'
	}
};

async function translateBatch(texts: string[]): Promise<string[]> {
	const out: string[] = [];
	const toFetch: { idx: number; text: string }[] = [];
	for (let i = 0; i < texts.length; i++) {
		const cached = cache.get(texts[i]);
		if (cached !== undefined) out[i] = cached;
		else toFetch.push({ idx: i, text: texts[i] });
	}
	for (let i = 0; i < toFetch.length; i += BATCH_SIZE) {
		const chunk = toFetch.slice(i, i + BATCH_SIZE);
		const body = {
			text: chunk.map((c) => c.text),
			source_lang: 'EN',
			target_lang: TARGET_LANG,
			preserve_formatting: true,
			formality: 'prefer_more'
		};
		const resp = await fetch(DEEPL_API_URL, {
			method: 'POST',
			headers: {
				Authorization: `DeepL-Auth-Key ${DEEPL_API_KEY}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(body)
		});
		if (!resp.ok) {
			const t = await resp.text();
			throw new Error(`DeepL ${resp.status}: ${t}`);
		}
		const data = (await resp.json()) as { translations: { text: string }[] };
		data.translations.forEach((tr, j) => {
			const slot = chunk[j];
			out[slot.idx] = tr.text;
			cache.set(slot.text, tr.text);
		});
		process.stdout.write(`  · translated ${Math.min(i + BATCH_SIZE, toFetch.length)}/${toFetch.length}\n`);
	}
	return out;
}

// Helper: collect translatable strings from an object's selected fields,
// queue them, and return a setter that applies the translations back.
type Job = {
	get: () => string;
	set: (v: string) => void;
};

const jobs: Job[] = [];

function field<T extends object, K extends keyof T>(obj: T, key: K) {
	if (typeof obj[key] !== 'string') return;
	jobs.push({
		get: () => obj[key] as unknown as string,
		set: (v) => {
			(obj as any)[key] = v;
		}
	});
}

function arrayField<T>(arr: T[], key: keyof T) {
	for (const item of arr) field(item as any, key as any);
}

function stringArray(arr: string[]) {
	for (let i = 0; i < arr.length; i++) {
		const idx = i;
		jobs.push({
			get: () => arr[idx],
			set: (v) => {
				arr[idx] = v;
			}
		});
	}
}

// ---------- clone source data ----------
function cloneArchetype(a: Archetype): Archetype {
	return { ...a };
}
function cloneCounter(c: Counter): Counter {
	return { ...c, body: [...c.body], cites: [...c.cites] };
}
function cloneArgument(a: Argument): Argument {
	const counters: Record<string, Counter> = {};
	for (const [k, v] of Object.entries(a.counters)) counters[k] = cloneCounter(v);
	return { ...a, related: [...a.related], counters };
}
function clonePosVoice(v: PosVoice): PosVoice {
	return { ...v };
}
function clonePosLayer(l: PosLayer): PosLayer {
	return { ...l };
}
function clonePosCounter(c: PosCounter): PosCounter {
	return { ...c, body: [...c.body], cites: [...c.cites] };
}
function clonePosArgument(a: PosArgument): PosArgument {
	const voices: Record<string, PosCounter> = {};
	for (const [k, v] of Object.entries(a.voices)) voices[k] = clonePosCounter(v);
	return {
		...a,
		related: [...a.related],
		voices,
		scripture: { ...a.scripture }
	};
}

const archetypesOut: Record<string, Archetype> = {};
for (const [k, v] of Object.entries(ARCHETYPES)) archetypesOut[k] = cloneArchetype(v);
const argumentsOut: Argument[] = ARGUMENTS.map(cloneArgument);
const posVoicesOut: Record<string, PosVoice> = {};
for (const [k, v] of Object.entries(POS_VOICES)) posVoicesOut[k] = clonePosVoice(v);
const posLayersOut: PosLayer[] = POS_LAYERS.map(clonePosLayer);
const posArgsOut: PosArgument[] = POS_ARGUMENTS.map(clonePosArgument);

// ---------- queue translation jobs ----------
//
// What we DON'T translate:
//   - id, n, related (cross-link keys)
//   - color, colorSoft, colorHex, glyph, font (visual)
//   - era (numeric / dates)
//   - cites (bibliographic — keep canonical English)
//   - scripture.ref (book chapter:verse)
//   - layer (enum key)
//   - strength (number)

// archetypes — translate name + sub. DeepL leaves canonical proper nouns alone
// (e.g. "Pascal") and localizes ones with established forms ("Thomas von Aquin",
// "Franz von Assisi", "Augustinus"). Role names ("The Logician") get translated
// idiomatically.
for (const a of Object.values(archetypesOut)) {
	field(a, 'name');
	field(a, 'sub');
}

// arguments
for (const a of argumentsOut) {
	field(a, 'title');
	field(a, 'short');
	field(a, 'steel');
	field(a, 'quote');
	field(a, 'quoteBy');
	field(a, 'pub');
	for (const c of Object.values(a.counters)) {
		field(c, 'lede');
		stringArray(c.body);
	}
}

// pos voices — translate name + sub (same rationale as archetypes).
for (const v of Object.values(posVoicesOut)) {
	field(v, 'name');
	field(v, 'sub');
}

// pos layers
for (const l of posLayersOut) {
	field(l, 'title');
	field(l, 'sub');
}

// pos arguments
for (const a of posArgsOut) {
	field(a, 'title');
	field(a, 'claim');
	field(a, 'thesis');
	if (a.note) field(a, 'note');
	field(a.scripture, 'text');
	for (const c of Object.values(a.voices)) {
		field(c, 'lede');
		stringArray(c.body);
	}
}

console.log(`Queued ${jobs.length} translation jobs · target ${TARGET_LANG}`);

// Site is Swiss High German — no ß. Bible quotes are sourced from Allioli at
// runtime and untouched by this pass, so this only affects translated prose.
function postProcess(s: string): string {
	if (TARGET_LANG === 'DE') return s.replace(/ß/g, 'ss');
	return s;
}

// ---------- run translations ----------
const inputs = jobs.map((j) => j.get());
const outputs = await translateBatch(inputs);
const overrides = OVERRIDES[TARGET_LANG] ?? {};
let overrideHits = 0;
jobs.forEach((j, i) => {
	const en = inputs[i];
	if (overrides[en] !== undefined) {
		j.set(postProcess(overrides[en]));
		overrideHits++;
	} else {
		j.set(postProcess(outputs[i]));
	}
});
if (overrideHits) console.log(`Applied ${overrideHits} manual override(s)`);

console.log(`Done · cache hits saved ${jobs.length - cache.size} duplicate calls`);

// ---------- emit file ----------
function ts(value: unknown, indent = 0): string {
	const pad = '\t'.repeat(indent);
	if (value === null) return 'null';
	if (typeof value === 'string') return JSON.stringify(value);
	if (typeof value === 'number' || typeof value === 'boolean') return String(value);
	if (Array.isArray(value)) {
		if (value.length === 0) return '[]';
		const inner = value.map((v) => `${pad}\t${ts(v, indent + 1)}`).join(',\n');
		return `[\n${inner}\n${pad}]`;
	}
	if (typeof value === 'object') {
		const entries = Object.entries(value as object);
		if (entries.length === 0) return '{}';
		const inner = entries
			.map(([k, v]) => `${pad}\t${JSON.stringify(k)}: ${ts(v, indent + 1)}`)
			.join(',\n');
		return `{\n${inner}\n${pad}}`;
	}
	return JSON.stringify(value);
}

const header = `// AUTO-GENERATED by scripts/translate-apologetik.ts — DO NOT EDIT BY HAND.
// Source: src/lib/data/apologetik.ts (EN)  ·  Target: ${TARGET_LANG}  ·  Generated ${new Date().toISOString()}
//
// To regenerate:  pnpm exec vite-node scripts/translate-apologetik.ts -- --lang=${TARGET_LANG}

import type {
\tArchetype,
\tArgument,
\tPosArgument,
\tPosLayer,
\tPosVoice
} from './apologetik';

`;

const content = [
	header,
	`export const ARCHETYPES_${TARGET_LANG}: Record<string, Archetype> = ${ts(archetypesOut)};`,
	'',
	`export const ARGUMENTS_${TARGET_LANG}: Argument[] = ${ts(argumentsOut)};`,
	'',
	`export const POS_VOICES_${TARGET_LANG}: Record<string, PosVoice> = ${ts(posVoicesOut)};`,
	'',
	`export const POS_LAYERS_${TARGET_LANG}: PosLayer[] = ${ts(posLayersOut)};`,
	'',
	`export const POS_ARGUMENTS_${TARGET_LANG}: PosArgument[] = ${ts(posArgsOut)};`,
	''
].join('\n');

const outPath = resolve(process.cwd(), `src/lib/data/apologetik.${FILE_LANG}.ts`);
writeFileSync(outPath, content, 'utf8');
console.log(`✓ Wrote ${outPath}`);
