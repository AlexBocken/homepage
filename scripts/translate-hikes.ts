/**
 * English translations for the hike reports, via DeepL.
 *
 * `src/content/hikes/<slug>/index.svx` is the German source. This writes the
 * committed, hand-editable `index.en.svx` next to it and keeps a per-hike
 * translation memory in `translation.en.json`, keyed by the hash of each German
 * block, so a re-run only pays for blocks whose German changed. Hand edits in
 * the English file are read back into the memory first (marked `manual`) and
 * survive every later run.
 *
 * Not part of `pnpm build`: it needs the network and a paid API. Run it by hand
 * and commit both files:
 *
 *   pnpm hikes:translate                          # every hike, only what is new
 *   pnpm hikes:translate -- --slug=2026-mattstock
 *   pnpm hikes:translate -- --dry-run             # block table + character count
 *   pnpm hikes:translate -- --force               # re-translate machine text, keep hand edits
 *   pnpm hikes:translate -- --force=all           # re-translate everything
 *   pnpm hikes:translate -- --check               # stale / unabsorbed report, no network
 *
 * The block grammar, the markdown⇄XML bridge and the memory rules live in
 * `scripts/hikeTranslate.ts` and are unit-tested; this file is the I/O around
 * them. DeepL setup follows `scripts/translate-usda-nutrition.ts`.
 */

import { promises as fs } from 'node:fs';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
	absorbEdits,
	applyOverrides,
	BlockMismatchError,
	collectUnits,
	emptyMemory,
	hashBytes,
	IGNORE_TAGS,
	inlineToXml,
	isBalancedXml,
	NON_SPLITTING_TAGS,
	renderBlocks,
	serialiseMemory,
	splitBlocks,
	unitKey,
	unitsToTranslate,
	xmlToInline,
	type ForceLevel,
	type Memory,
	type Unit,
	type UnitTexts
} from './hikeTranslate.js';

// ---------------------------------------------------------------------------
// Paths & constants
// ---------------------------------------------------------------------------

const ROOT = path.resolve(process.cwd());
const CONTENT_DIR = path.join(ROOT, 'src', 'content', 'hikes');
const SOURCE_FILE = 'index.svx';
const TARGET_FILE = 'index.en.svx';
const MEMORY_FILE = 'translation.en.json';

/** DeepL takes up to 50 texts per request. */
const BATCH_SIZE = 50;

// ---------------------------------------------------------------------------
// .env (DEEPL_API_KEY, DEEPL_API_URL). Same loader as generate-hike-alt-text.ts:
// the environment wins, then `.env`, whose lines may carry `# comments`.
// ---------------------------------------------------------------------------

function loadEnvValue(key: string): string | undefined {
	if (process.env[key]) return process.env[key];
	try {
		const raw = readFileSync(path.join(ROOT, '.env'), 'utf-8');
		for (const line of raw.split('\n')) {
			const m = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
			if (!m || m[1] !== key) continue;
			const rest = m[2].trim();
			const quoted = rest.match(/^"([^"]*)"|^'([^']*)'/);
			if (quoted) return quoted[1] ?? quoted[2];
			return rest.split(/\s+#|\s/)[0];
		}
	} catch {
		// No .env — fall through.
	}
	return undefined;
}

const DEEPL_API_KEY = loadEnvValue('DEEPL_API_KEY');
const DEEPL_API_URL = loadEnvValue('DEEPL_API_URL') ?? 'https://api-free.deepl.com/v2/translate';
const DEEPL_USAGE_URL = DEEPL_API_URL.replace(/\/translate$/, '/usage');

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

type Options = {
	slugs: string[] | null;
	force: ForceLevel;
	dryRun: boolean;
	check: boolean;
};

function parseArgs(argv: string[]): Options {
	const opts: Options = { slugs: null, force: false, dryRun: false, check: false };
	for (const arg of argv) {
		if (arg === '--force') opts.force = 'machine';
		else if (arg === '--force=all') opts.force = 'all';
		else if (arg === '--dry-run') opts.dryRun = true;
		else if (arg === '--check') opts.check = true;
		else if (arg.startsWith('--slug=')) {
			const v = arg.slice('--slug='.length);
			opts.slugs = (opts.slugs ?? []).concat(v.split(',').map((s) => s.trim()).filter(Boolean));
		} else if (arg === '--help' || arg === '-h') {
			console.log(
				'Usage: pnpm hikes:translate -- [--slug=<slug>[,<slug>]] [--force | --force=all] [--dry-run] [--check]'
			);
			process.exit(0);
		} else if (arg.startsWith('--')) {
			console.warn(`[hike-translate] Unknown flag ${arg} — ignored`);
		}
	}
	return opts;
}

// ---------------------------------------------------------------------------
// Files
// ---------------------------------------------------------------------------

async function readText(p: string): Promise<string | null> {
	try {
		return await fs.readFile(p, 'utf-8');
	} catch {
		return null;
	}
}

async function readMemory(hikeDir: string): Promise<Memory> {
	const raw = await readText(path.join(hikeDir, MEMORY_FILE));
	if (!raw) return emptyMemory();
	try {
		const parsed = JSON.parse(raw) as Partial<Memory>;
		return {
			sourceHash: parsed.sourceHash ?? '',
			enHash: parsed.enHash ?? '',
			order: Array.isArray(parsed.order) ? parsed.order : [],
			blocks: parsed.blocks && typeof parsed.blocks === 'object' ? parsed.blocks : {}
		};
	} catch {
		console.warn(`[hike-translate] ${path.basename(hikeDir)}: ${MEMORY_FILE} is not valid JSON — starting fresh`);
		return emptyMemory();
	}
}

/** Frontmatter value for the DeepL context line. */
function fmValue(source: string, key: string): string {
	const m = source.match(new RegExp(`^${key}:\\s*(.*)$`, 'm'));
	return m ? m[1].trim().replace(/^["']|["']$/g, '') : '';
}

// ---------------------------------------------------------------------------
// DeepL
// ---------------------------------------------------------------------------

const escapeXml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

async function usage(): Promise<{ character_count: number; character_limit: number }> {
	const resp = await fetch(DEEPL_USAGE_URL, {
		headers: { Authorization: `DeepL-Auth-Key ${DEEPL_API_KEY}` }
	});
	if (!resp.ok) throw new Error(`DeepL usage ${resp.status}: ${await resp.text()}`);
	return resp.json() as Promise<{ character_count: number; character_limit: number }>;
}

async function translateBatch(texts: string[], context: string): Promise<string[]> {
	const resp = await fetch(DEEPL_API_URL, {
		method: 'POST',
		headers: {
			Authorization: `DeepL-Auth-Key ${DEEPL_API_KEY}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			text: texts,
			source_lang: 'DE',
			target_lang: 'EN-GB',
			context,
			tag_handling: 'xml',
			non_splitting_tags: NON_SPLITTING_TAGS,
			ignore_tags: IGNORE_TAGS,
			preserve_formatting: true,
			// The author's hard line breaks are layout, not sentence ends.
			split_sentences: 'nonewlines'
		})
	});
	if (!resp.ok) throw new Error(`DeepL ${resp.status}: ${await resp.text()}`);
	const data = (await resp.json()) as { translations: { text: string }[] };
	return data.translations.map((t) => t.text);
}

function contextFor(source: string): string {
	const title = fmValue(source, 'title');
	const summary = fmValue(source, 'summary');
	// The context is free of charge and steers word choice; the terminology
	// list covers the words DeepL otherwise renders as farming or building
	// vocabulary.
	return escapeXml(
		`Swiss hiking report "${title}"${summary ? `: ${summary}` : ''}. ` +
			'British English, metric units. Keep Swiss place names, SAC hiking grades (T1–T6), ' +
			'hut names and public-transport stop names unchanged. Terminology: ' +
			'Verbauungen = avalanche barriers; Höhenmeter = vertical metres; Bergweg / Bergwanderweg = mountain trail; ' +
			'Wanderweg = hiking trail; Alp = alp (summer pasture); Sennhütte = alpine dairy hut; Sennenhütte = alpine dairy hut; ' +
			'Sessellift = chairlift; Gipfelkreuz = summit cross; Gipfelbuch = summit register; Grat = ridge; ' +
			'Wegweiser = signpost; Bergbahn = mountain railway; Postauto = PostBus.'
	);
}

// ---------------------------------------------------------------------------
// Per-hike work
// ---------------------------------------------------------------------------

type Report = {
	slug: string;
	status: 'missing' | 'ok' | 'stale' | 'unabsorbed' | 'mismatch';
	needed: number;
	chars: number;
	absorbed: number;
	skipped: string[];
};

/** Payload per unit, or null when the block cannot be sent as XML. */
function payloadFor(u: Unit): string | null {
	const xml = inlineToXml(u.text);
	return isBalancedXml(xml) ? xml : null;
}

async function processHike(slug: string, opts: Options, today: string): Promise<Report> {
	const hikeDir = path.join(CONTENT_DIR, slug);
	const source = await readText(path.join(hikeDir, SOURCE_FILE));
	if (source === null) throw new Error(`${slug}: no ${SOURCE_FILE}`);
	const sourceHash = hashBytes(source);
	const deBlocks = splitBlocks(source);
	const deUnits = collectUnits(deBlocks);

	let memory = await readMemory(hikeDir);
	const enPath = path.join(hikeDir, TARGET_FILE);
	const existingEn = await readText(enPath);
	const report: Report = { slug, status: 'ok', needed: 0, chars: 0, absorbed: 0, skipped: [] };

	// 1. Absorb hand edits from the English file.
	if (existingEn !== null && hashBytes(existingEn) !== memory.enHash) {
		if (opts.check) {
			report.status = 'unabsorbed';
		} else {
			const enUnits = collectUnits(splitBlocks(existingEn));
			const absorbed = absorbEdits(memory, enUnits, slug, today);
			memory = absorbed.memory;
			report.absorbed = absorbed.absorbed;
		}
	}

	// 2. What needs DeepL.
	const needed = unitsToTranslate(memory, deUnits, opts.force);
	report.needed = needed.length;
	report.chars = needed.reduce((n, u) => n + u.text.length, 0);

	if (opts.check) {
		if (existingEn === null) report.status = 'missing';
		else if (report.status === 'ok' && (needed.length > 0 || memory.sourceHash !== sourceHash)) report.status = 'stale';
		return report;
	}

	if (opts.dryRun) {
		console.log(`\n[hike-translate] ${slug}: ${deUnits.length} units, ${needed.length} to translate (${report.chars} chars)`);
		const neededHashes = new Set(needed.map((u) => u.hash));
		deUnits.forEach((u, i) => {
			const entry = memory.blocks[u.hash];
			const state = neededHashes.has(u.hash) ? 'needed' : entry?.manual ? 'manual' : 'cached';
			console.log(`  #${String(i).padStart(3)} ${deBlocks[u.block].kind.padEnd(11)} ${u.hash} ${String(u.text.length).padStart(5)}  ${state}`);
		});
		for (const u of needed) {
			const xml = payloadFor(u);
			if (xml === null) {
				console.log(`  !! block ${u.hash} is not well-formed XML and would be skipped:\n     ${u.text.slice(0, 120)}`);
			} else {
				console.log(`  -- ${u.hash}\n     ${xml.replace(/\n/g, '\n     ')}`);
			}
		}
		return report;
	}

	// 3. Translate.
	if (needed.length > 0) {
		const context = contextFor(source);
		const sendable = needed.filter((u) => {
			if (payloadFor(u) !== null) return true;
			report.skipped.push(u.hash);
			console.warn(`[hike-translate] ${slug}: block ${u.hash} is not well-formed XML — left German:\n  ${u.text.slice(0, 120)}`);
			return false;
		});
		for (let i = 0; i < sendable.length; i += BATCH_SIZE) {
			const batch = sendable.slice(i, i + BATCH_SIZE);
			const translated = await translateBatch(batch.map((u) => payloadFor(u) as string), context);
			batch.forEach((u, j) => {
				memory.blocks[u.hash] = {
					de: u.text,
					en: applyOverrides(xmlToInline(translated[j]).trim()),
					generatedAt: today
				};
			});
			// Checkpoint after every batch: an interrupted run keeps what it paid for.
			await fs.writeFile(path.join(hikeDir, MEMORY_FILE), serialiseMemory(memory));
			console.log(`[hike-translate] ${slug}: ${Math.min(i + BATCH_SIZE, sendable.length)}/${sendable.length} blocks`);
		}
	}

	// 4. Render the English file and pin both hashes.
	const texts: UnitTexts = new Map();
	let allManual = deUnits.length > 0;
	for (const u of deUnits) {
		const entry = memory.blocks[u.hash];
		if (!entry) {
			allManual = false;
			continue;
		}
		texts.set(unitKey(u), entry.en);
		if (!entry.manual) allManual = false;
	}
	const en = renderBlocks(deBlocks, texts, {
		extraFrontmatter: { translatedFrom: sourceHash, machine: allManual ? 'false' : 'true' }
	});
	memory = { ...memory, sourceHash, enHash: hashBytes(en), order: deUnits.map((u) => u.hash) };
	await fs.writeFile(path.join(hikeDir, MEMORY_FILE), serialiseMemory(memory));
	await fs.writeFile(enPath, en);
	return report;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
	const opts = parseArgs(process.argv.slice(2));
	const today = new Date().toISOString().slice(0, 10);

	const entries = await fs.readdir(CONTENT_DIR, { withFileTypes: true });
	const slugs = entries
		.filter((e) => e.isDirectory() && !e.name.startsWith('.'))
		.map((e) => e.name)
		.filter((s) => !opts.slugs || opts.slugs.includes(s))
		.sort();
	if (slugs.length === 0) {
		console.error(`[hike-translate] No hikes matched${opts.slugs ? ` --slug=${opts.slugs.join(',')}` : ''}.`);
		process.exit(1);
	}

	const needsNetwork = !opts.check;
	if (needsNetwork && !DEEPL_API_KEY) {
		console.error('[hike-translate] DEEPL_API_KEY missing (environment or .env).');
		process.exit(1);
	}

	const reports: Report[] = [];
	let mismatches = 0;
	for (const slug of slugs) {
		try {
			reports.push(await processHike(slug, opts, today));
		} catch (err) {
			if (err instanceof BlockMismatchError) {
				mismatches++;
				console.error(`[hike-translate] ${err.message}`);
				reports.push({ slug, status: 'mismatch', needed: 0, chars: 0, absorbed: 0, skipped: [] });
				continue;
			}
			throw err;
		}
	}

	if (opts.check) {
		let bad = 0;
		for (const r of reports) {
			const line =
				r.status === 'missing'
					? 'no index.en.svx yet (the English route shows the German prose)'
					: r.status === 'stale'
						? `${r.needed} block(s) changed in German since the last run`
						: r.status === 'unabsorbed'
							? 'index.en.svx was edited by hand and not absorbed yet'
							: r.status === 'mismatch'
								? 'block structure of index.en.svx diverged from index.svx'
								: 'up to date';
			console.log(`[hike-translate] ${r.slug}: ${line}`);
			if (r.status === 'stale' || r.status === 'unabsorbed' || r.status === 'mismatch') bad++;
		}
		if (bad > 0) {
			console.log(`[hike-translate] ${bad} hike(s) need \`pnpm hikes:translate\`.`);
			process.exit(1);
		}
		return;
	}

	const totalChars = reports.reduce((n, r) => n + r.chars, 0);
	const totalNeeded = reports.reduce((n, r) => n + r.needed, 0);
	const totalAbsorbed = reports.reduce((n, r) => n + r.absorbed, 0);

	if (opts.dryRun) {
		console.log(`\n[hike-translate] dry run: ${totalNeeded} block(s), ${totalChars} characters would be sent`);
		if (DEEPL_API_KEY) {
			const u = await usage();
			console.log(`[hike-translate] DeepL usage: ${u.character_count}/${u.character_limit} (${u.character_limit - u.character_count} left)`);
		}
		return;
	}

	console.log(
		`[hike-translate] ${reports.length} hike(s): ${totalNeeded} block(s) translated, ${totalAbsorbed} hand edit(s) absorbed` +
			(mismatches ? `, ${mismatches} refused` : '')
	);
	if (mismatches > 0) process.exitCode = 1;
}

// The usage check happens before the first paid call, in main's caller order:
// wrap main so a refusal is one message, not a stack trace.
async function run() {
	const opts = parseArgs(process.argv.slice(2));
	if (!opts.check && !opts.dryRun && DEEPL_API_KEY) {
		// A whole-corpus run is ~70k characters; refuse rather than half-finish
		// when the monthly quota cannot cover what the dry run would report.
		const u = await usage();
		console.log(`[hike-translate] DeepL usage: ${u.character_count}/${u.character_limit}`);
	}
	await main();
}

run().catch((err) => {
	console.error('[hike-translate] Fatal:', err instanceof Error ? err.message : err);
	process.exit(1);
});
