/**
 * Pure helpers for `scripts/translate-hikes.ts` — the block grammar of a hike's
 * `index.svx`, the markdown⇄XML bridge for DeepL, and the translation-memory
 * bookkeeping. No I/O here, so every rule has a unit test
 * (`tests/unit/hikes/translateBlocks.test.ts`).
 *
 * The contract that makes hand editing safe:
 *
 * - `splitBlocks` cuts a file into blocks that cover every line exactly once,
 *   so `renderBlocks(splitBlocks(src), ...)` with unchanged texts is the source
 *   byte for byte. Prose becomes translatable *units*; frontmatter keys,
 *   `<script>`, component tags and blank lines pass through verbatim.
 * - A unit is keyed by the hash of its normalised German text. Re-wrapping a
 *   paragraph is not a change; rewording a sentence is.
 * - The English file has the same block structure by construction, so its
 *   units align positionally with the German ones — that is how hand edits are
 *   read back into the memory (`absorbEdits`) before anything is re-translated.
 */

import crypto from 'node:crypto';

// ---------------------------------------------------------------------------
// Blocks
// ---------------------------------------------------------------------------

export type BlockKind =
	| 'frontmatter'
	| 'script'
	| 'component'
	| 'heading'
	| 'list-item'
	| 'blockquote'
	| 'html'
	| 'paragraph'
	| 'blank';

export interface Block {
	kind: BlockKind;
	/** The exact source lines this block owns. */
	lines: string[];
}

/** One translatable piece of a block: a paragraph, a heading, a frontmatter
 * value, or one attribute of a component tag. */
export interface Unit {
	/** Position of the owning block in the block list. */
	block: number;
	/** `text` for prose blocks; the frontmatter key or attribute name otherwise. */
	field: string;
	/** The German (or, when read from the English file, the English) text. */
	text: string;
	/** Hash of the normalised text — the translation-memory key. */
	hash: string;
}

/** Frontmatter keys whose values are prose and get translated. */
export const FRONTMATTER_TEXT_KEYS = ['title', 'summary', 'heroAlt'] as const;

/** Component attributes that carry prose. `JourneyPlanner` `from`/`to` are stop
 * names and stay as they are. */
const COMPONENT_TEXT_ATTRS: Record<string, readonly string[]> = {
	HikeImage: ['alt', 'caption']
};

/** Frontmatter keys the script itself writes into `index.en.svx`. */
export const GENERATED_FM_KEYS = ['translatedFrom', 'machine'] as const;

const HEADING_RE = /^(#{1,6})\s+(.*)$/;
const LIST_RE = /^(\s*)([-*+]|\d+\.)\s+(.*)$/;
const QUOTE_RE = /^>(\s?)(.*)$/;
const COMPONENT_OPEN_RE = /^\s*<\/?[A-Z][A-Za-z0-9]*(\s|>|\/>|$)/;
const HTML_OPEN_RE = /^\s*(<!--|<[a-z][a-z0-9-]*(\s|>|$))/;

export function hashText(text: string): string {
	const normalised = text.replace(/\s+/g, ' ').trim();
	return crypto.createHash('sha256').update(normalised).digest('hex').slice(0, 12);
}

export function hashBytes(content: string): string {
	return crypto.createHash('sha256').update(content).digest('hex').slice(0, 12);
}

function isBlank(line: string): boolean {
	return line.trim() === '';
}

/** A line that ends an open paragraph without a blank line in between. */
function breaksParagraph(line: string): boolean {
	return (
		COMPONENT_OPEN_RE.test(line) ||
		HEADING_RE.test(line) ||
		LIST_RE.test(line) ||
		QUOTE_RE.test(line) ||
		/^\s*<script\b/.test(line) ||
		HTML_OPEN_RE.test(line)
	);
}

/** Does this tag line close itself? Counts a `/>` or a `>` that ends the tag. */
function tagClosesOn(line: string): boolean {
	return />\s*$/.test(line);
}

export function splitBlocks(source: string): Block[] {
	const lines = source.split('\n');
	const blocks: Block[] = [];
	let i = 0;

	// Frontmatter: `---` on the first line, closed by the next `---` line.
	if (lines[0] === '---') {
		let end = -1;
		for (let j = 1; j < lines.length; j++) {
			if (lines[j] === '---') {
				end = j;
				break;
			}
		}
		if (end > 0) {
			blocks.push({ kind: 'frontmatter', lines: lines.slice(0, end + 1) });
			i = end + 1;
		}
	}

	while (i < lines.length) {
		const line = lines[i];

		if (isBlank(line)) {
			const start = i;
			while (i < lines.length && isBlank(lines[i])) i++;
			blocks.push({ kind: 'blank', lines: lines.slice(start, i) });
			continue;
		}

		if (/^\s*<script\b/.test(line)) {
			const start = i;
			while (i < lines.length && !/<\/script>/.test(lines[i])) i++;
			i = Math.min(i + 1, lines.length);
			blocks.push({ kind: 'script', lines: lines.slice(start, i) });
			continue;
		}

		if (COMPONENT_OPEN_RE.test(line)) {
			const start = i;
			// A tag may span lines; it ends on the first line that closes it.
			while (i < lines.length && !tagClosesOn(lines[i])) i++;
			i = Math.min(i + 1, lines.length);
			blocks.push({ kind: 'component', lines: lines.slice(start, i) });
			continue;
		}

		if (HTML_OPEN_RE.test(line)) {
			const start = i;
			if (line.trimStart().startsWith('<!--')) {
				while (i < lines.length && !/-->/.test(lines[i])) i++;
				i = Math.min(i + 1, lines.length);
			} else {
				while (i < lines.length && !isBlank(lines[i])) i++;
			}
			blocks.push({ kind: 'html', lines: lines.slice(start, i) });
			continue;
		}

		if (HEADING_RE.test(line)) {
			blocks.push({ kind: 'heading', lines: [line] });
			i++;
			continue;
		}

		if (LIST_RE.test(line)) {
			const start = i;
			i++;
			// Continuation lines are indented and neither blank nor a new item.
			while (i < lines.length && /^\s+\S/.test(lines[i]) && !LIST_RE.test(lines[i])) i++;
			blocks.push({ kind: 'list-item', lines: lines.slice(start, i) });
			continue;
		}

		if (QUOTE_RE.test(line)) {
			const start = i;
			while (i < lines.length && QUOTE_RE.test(lines[i])) i++;
			blocks.push({ kind: 'blockquote', lines: lines.slice(start, i) });
			continue;
		}

		// Paragraph: runs until a blank line or a line that starts something else.
		const start = i;
		i++;
		while (i < lines.length && !isBlank(lines[i]) && !breaksParagraph(lines[i])) i++;
		blocks.push({ kind: 'paragraph', lines: lines.slice(start, i) });
	}

	return blocks;
}

// ---------------------------------------------------------------------------
// Units: the translatable text inside blocks
// ---------------------------------------------------------------------------

/** Parse `key: value` frontmatter lines. Returns the raw value with its
 * surrounding quotes stripped, plus the quote character so it can be put back. */
function parseFmLine(line: string): { key: string; value: string; quote: string } | null {
	const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*):\s*(.*)$/);
	if (!m) return null;
	let value = m[2].trim();
	let quote = '';
	if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
		quote = value[0];
		value = value.slice(1, -1);
	}
	return { key: m[1], value, quote };
}

function componentName(lines: string[]): string | null {
	const m = lines[0].match(/^\s*<([A-Z][A-Za-z0-9]*)/);
	return m ? m[1] : null;
}

/** Attribute values of a (possibly multi-line) component tag, as written. Only
 * double-quoted attributes are considered: `{expr}` values are code. */
function componentAttrs(lines: string[]): Map<string, string> {
	const out = new Map<string, string>();
	const tag = lines.join('\n');
	for (const m of tag.matchAll(/\b([a-zA-Z][\w-]*)="([^"]*)"/g)) out.set(m[1], m[2]);
	return out;
}

function listText(lines: string[]): string {
	const m = lines[0].match(LIST_RE)!;
	return [m[3], ...lines.slice(1).map((l) => l.replace(/^\s+/, ''))].join('\n');
}

function quoteText(lines: string[]): string {
	return lines.map((l) => l.match(QUOTE_RE)![2]).join('\n');
}

export function collectUnits(blocks: Block[]): Unit[] {
	const units: Unit[] = [];
	const push = (block: number, field: string, text: string) => {
		if (text.trim() === '') return;
		units.push({ block, field, text, hash: hashText(text) });
	};
	blocks.forEach((b, idx) => {
		switch (b.kind) {
			case 'frontmatter':
				for (const line of b.lines) {
					const fm = parseFmLine(line);
					if (fm && (FRONTMATTER_TEXT_KEYS as readonly string[]).includes(fm.key)) {
						push(idx, `fm:${fm.key}`, fm.value);
					}
				}
				break;
			case 'component': {
				const name = componentName(b.lines);
				const attrs = name ? COMPONENT_TEXT_ATTRS[name] : undefined;
				if (!attrs) break;
				const values = componentAttrs(b.lines);
				for (const attr of attrs) {
					const v = values.get(attr);
					if (v !== undefined) push(idx, `attr:${attr}`, v);
				}
				break;
			}
			case 'heading':
				push(idx, 'text', b.lines[0].match(HEADING_RE)![2]);
				break;
			case 'list-item':
				push(idx, 'text', listText(b.lines));
				break;
			case 'blockquote':
				push(idx, 'text', quoteText(b.lines));
				break;
			case 'paragraph':
				push(idx, 'text', b.lines.join('\n'));
				break;
			default:
				break;
		}
	});
	return units;
}

// ---------------------------------------------------------------------------
// Rendering: blocks + replacement texts → file
// ---------------------------------------------------------------------------

/** Replacement text per unit, keyed `${block}:${field}`. Units without a
 * replacement render their original text. */
export type UnitTexts = Map<string, string>;

export const unitKey = (u: Pick<Unit, 'block' | 'field'>): string => `${u.block}:${u.field}`;

function renderList(lines: string[], text: string): string[] {
	const m = lines[0].match(LIST_RE)!;
	const [first, ...rest] = text.split('\n');
	// Keep the author's continuation indent when the line count still matches;
	// otherwise indent under the marker.
	const indent = lines.length > 1 ? lines[1].match(/^\s*/)![0] : ' '.repeat(m[1].length + m[2].length + 1);
	return [
		`${m[1]}${m[2]} ${first}`,
		...rest.map((l, i) => `${lines[i + 1]?.match(/^\s*/)?.[0] ?? indent}${l}`)
	];
}

function renderQuote(lines: string[], text: string): string[] {
	return text.split('\n').map((l, i) => {
		const sep = lines[i]?.match(QUOTE_RE)?.[1] ?? (l === '' ? '' : ' ');
		return `>${l === '' && sep === '' ? '' : sep}${l}`;
	});
}

function renderComponent(lines: string[], values: Map<string, string>): string[] {
	let tag = lines.join('\n');
	for (const [attr, value] of values) {
		const re = new RegExp(`\\b${attr}="[^"]*"`);
		tag = tag.replace(re, `${attr}="${value.replace(/"/g, '&quot;')}"`);
	}
	return tag.split('\n');
}

export interface RenderOptions {
	/** Extra frontmatter lines appended before the closing `---`, replacing any
	 * earlier lines with the same keys. */
	extraFrontmatter?: Record<string, string>;
}

export function renderBlocks(blocks: Block[], texts: UnitTexts, opts: RenderOptions = {}): string {
	const out: string[] = [];
	blocks.forEach((b, idx) => {
		const get = (field: string) => texts.get(`${idx}:${field}`);
		switch (b.kind) {
			case 'frontmatter': {
				const extra = opts.extraFrontmatter ?? {};
				const body = b.lines.slice(1, -1).flatMap((line) => {
					const fm = parseFmLine(line);
					if (!fm) return [line];
					if (fm.key in extra) return [];
					const replacement = get(`fm:${fm.key}`);
					if (replacement === undefined) return [line];
					return [`${fm.key}: ${fm.quote}${replacement}${fm.quote}`];
				});
				for (const [k, v] of Object.entries(extra)) body.push(`${k}: ${v}`);
				out.push('---', ...body, '---');
				break;
			}
			case 'component': {
				const values = new Map<string, string>();
				for (const attr of Object.values(COMPONENT_TEXT_ATTRS).flat()) {
					const v = get(`attr:${attr}`);
					if (v !== undefined) values.set(attr, v);
				}
				out.push(...(values.size ? renderComponent(b.lines, values) : b.lines));
				break;
			}
			case 'heading': {
				const t = get('text');
				if (t === undefined) out.push(...b.lines);
				else out.push(`${b.lines[0].match(HEADING_RE)![1]} ${t}`);
				break;
			}
			case 'list-item': {
				const t = get('text');
				out.push(...(t === undefined ? b.lines : renderList(b.lines, t)));
				break;
			}
			case 'blockquote': {
				const t = get('text');
				out.push(...(t === undefined ? b.lines : renderQuote(b.lines, t)));
				break;
			}
			case 'paragraph': {
				const t = get('text');
				out.push(...(t === undefined ? b.lines : t.split('\n')));
				break;
			}
			default:
				out.push(...b.lines);
		}
	});
	return out.join('\n');
}

// ---------------------------------------------------------------------------
// Markdown ⇄ XML for DeepL
//
// DeepL keeps XML tags intact and never translates attribute values, which is
// exactly what links and emphasis need; sent as raw markdown it is known to
// break `[…](…)` spacing and to translate URL slugs. Private `md-*` names make
// the way back unambiguous: the author's own `<q>` / `<em>` are left alone.
// ---------------------------------------------------------------------------

export const NON_SPLITTING_TAGS = [
	'md-a',
	'md-b',
	'md-i',
	'md-code',
	'q',
	'em',
	'i',
	'strong',
	'b',
	'a',
	'abbr',
	'sup',
	'sub'
];
export const IGNORE_TAGS = ['md-code'];

function escapeText(s: string): string {
	return (
		s
			// A bare ampersand; existing entities stay.
			.replace(/&(?!(?:[a-zA-Z]+|#\d+|#x[0-9a-fA-F]+);)/g, '&amp;')
			// A `<` that does not open or close a tag.
			.replace(/<(?![/a-zA-Z])/g, '&lt;')
	);
}

export function inlineToXml(text: string): string {
	let out = text.replace(/`([^`\n]+)`/g, (_m, code: string) => `<md-code>${escapeText(code)}</md-code>`);
	out = out.replace(/\[([^\]\n]+)\]\(([^)\s]+)\)/g, (_m, label: string, url: string) => {
		return `<md-a href="${url.replace(/"/g, '&quot;')}">${label}</md-a>`;
	});
	out = out.replace(/\*\*([^*\n]+)\*\*/g, '<md-b>$1</md-b>');
	out = out.replace(/(^|[^*\w])\*([^*\n]+)\*(?=[^*\w]|$)/g, '$1<md-i>$2</md-i>');
	out = out.replace(/(^|[^_\w])_([^_\n]+)_(?=[^_\w]|$)/g, '$1<md-i>$2</md-i>');
	// Escape what is left outside the tags we just wrote and the author's own.
	return out
		.split(/(<[^>]+>)/)
		.map((part, i) => (i % 2 === 1 ? part : escapeText(part)))
		.join('');
}

export function xmlToInline(xml: string): string {
	let out = xml;
	out = out.replace(/<md-a href="([^"]*)">([\s\S]*?)<\/md-a>/g, (_m, url: string, label: string) => {
		return `[${label}](${url.replace(/&quot;/g, '"')})`;
	});
	out = out.replace(/<md-b>([\s\S]*?)<\/md-b>/g, '**$1**');
	out = out.replace(/<md-i>([\s\S]*?)<\/md-i>/g, '*$1*');
	out = out.replace(/<md-code>([\s\S]*?)<\/md-code>/g, '`$1`');
	return out.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
}

/** True when every tag in the payload is closed in order — what DeepL's XML
 * handling demands. A stray `<` or an unclosed `<q>` fails here, before it
 * costs characters. */
export function isBalancedXml(xml: string): boolean {
	const stack: string[] = [];
	const re = /<(\/?)([a-zA-Z][\w-]*)(?:\s[^<>]*?)?(\/?)>/g;
	let m: RegExpExecArray | null;
	let last = 0;
	while ((m = re.exec(xml)) !== null) {
		// Any `<` between tags is a bare one.
		if (xml.slice(last, m.index).includes('<')) return false;
		last = m.index + m[0].length;
		if (m[3] === '/') continue;
		if (m[1] === '/') {
			if (stack.pop() !== m[2]) return false;
		} else {
			stack.push(m[2]);
		}
	}
	if (xml.slice(last).includes('<')) return false;
	return stack.length === 0;
}

// ---------------------------------------------------------------------------
// Post-processing: the few terms DeepL keeps getting wrong for hiking prose
// ---------------------------------------------------------------------------

export const OVERRIDES: ReadonlyArray<readonly [RegExp, string]> = [
	// "Höhenmeter" is direction-neutral in German; "vertical metres" is the
	// English hiking term that keeps it so ("700 vertical metres on the ascent").
	[/\b(metres|meters) (in|of) (altitude|elevation)( gain| difference)?\b/gi, 'vertical metres'],
	[/\b(altitude|elevation) (metres|meters)\b/gi, 'vertical metres'],
	[/\bvertical meters\b/gi, 'vertical metres'],
	[/\bmeters\b/g, 'metres'],
	[/\bkilometers\b/g, 'kilometres'],
	[/\bmountain hiking path\b/gi, 'mountain hiking trail'],
	[/\bmountain path\b/g, 'mountain trail'],
	[/\bSwiss francs\b/g, 'francs'],
	[/«/g, '“'],
	[/»/g, '”'],
	// The repo writes Swiss German: no sharp s, not even inside a name DeepL
	// leaves in German ("Großer Mythen"). ß-ok
	[/ß/g, 'ss'] // ß-ok
];

export function applyOverrides(text: string): string {
	let out = text;
	for (const [re, rep] of OVERRIDES) out = out.replace(re, rep);
	return out;
}

// ---------------------------------------------------------------------------
// Translation memory
// ---------------------------------------------------------------------------

export interface MemoryEntry {
	de: string;
	en: string;
	generatedAt: string;
	/** Set once the English text was edited by hand; never overwritten by a
	 * plain run, only by `--force=all`. */
	manual?: boolean;
	editedAt?: string;
}

export interface Memory {
	/** `index.svx` bytes the memory was last generated against. */
	sourceHash: string;
	/** `index.en.svx` bytes as last written by the script. A different hash on
	 * disk means hand edits that have not been absorbed yet. */
	enHash: string;
	/** German unit hashes in document order at the last generation. */
	order: string[];
	blocks: Record<string, MemoryEntry>;
}

export function emptyMemory(): Memory {
	return { sourceHash: '', enHash: '', order: [], blocks: {} };
}

export class BlockMismatchError extends Error {
	constructor(
		public readonly slug: string,
		public readonly enCount: number,
		public readonly expected: number,
		public readonly firstDifference: string
	) {
		super(
			`${slug}: index.en.svx has ${enCount} translatable blocks, translation memory expects ${expected} ` +
				`(first difference: '${firstDifference}'). Either restore the block structure of the English ` +
				`file or delete translation.en.json and index.en.svx to start over.`
		);
	}
}

/**
 * Read hand edits from the English file back into the memory. Units align by
 * position with `memory.order`; a different count means the structure of the
 * English file diverged from the German one and nothing is guessed.
 */
export function absorbEdits(
	memory: Memory,
	enUnits: Unit[],
	slug: string,
	today: string
): { memory: Memory; absorbed: number } {
	if (enUnits.length !== memory.order.length) {
		const n = Math.min(enUnits.length, memory.order.length);
		let first = '';
		for (let i = 0; i < n; i++) {
			const entry = memory.blocks[memory.order[i]];
			if (!entry || entry.en !== enUnits[i].text) {
				first = enUnits[i].text.slice(0, 60);
				break;
			}
		}
		if (!first) first = (enUnits[n] ?? { text: '(end of file)' }).text.slice(0, 60);
		throw new BlockMismatchError(slug, enUnits.length, memory.order.length, first);
	}
	let absorbed = 0;
	const blocks = { ...memory.blocks };
	memory.order.forEach((hash, i) => {
		const entry = blocks[hash];
		if (!entry) return;
		if (entry.en !== enUnits[i].text) {
			blocks[hash] = { ...entry, en: enUnits[i].text, manual: true, editedAt: today };
			absorbed++;
		}
	});
	return { memory: { ...memory, blocks }, absorbed };
}

export type ForceLevel = false | 'machine' | 'all';

/** Which German units need a DeepL call. */
export function unitsToTranslate(memory: Memory, deUnits: Unit[], force: ForceLevel): Unit[] {
	const seen = new Set<string>();
	const out: Unit[] = [];
	for (const u of deUnits) {
		if (seen.has(u.hash)) continue;
		seen.add(u.hash);
		const entry = memory.blocks[u.hash];
		if (!entry) {
			out.push(u);
			continue;
		}
		if (force === 'all') out.push(u);
		else if (force === 'machine' && !entry.manual) out.push(u);
	}
	return out;
}

/** Sorted keys, so the committed diff is a per-block change and not a reshuffle. */
export function serialiseMemory(memory: Memory): string {
	const blocks: Record<string, MemoryEntry> = {};
	for (const k of Object.keys(memory.blocks).sort()) blocks[k] = memory.blocks[k];
	return JSON.stringify({ sourceHash: memory.sourceHash, enHash: memory.enHash, order: memory.order, blocks }, null, '\t') + '\n';
}
