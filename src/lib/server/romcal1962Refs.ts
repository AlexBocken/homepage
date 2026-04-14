import { readFileSync } from 'fs';
import { createRequire } from 'module';

type PropersBlockItem =
	| { type: 'text'; lang: string; value: string; role?: string }
	| { type: 'scriptureRef'; ref: string }
	| { type: 'directive'; value: string }
	| { type: 'ref'; target: string }
	| { type: 'rubric'; note: string }
	| { type: 'separator' };

interface RawEntry {
	id?: string;
	references?: Record<string, string>;
	sections?: Record<string, PropersBlockItem[]>;
}

const require = createRequire(import.meta.url);

function loadJson(name: 'tempora' | 'sancti' | 'commune'): Record<string, RawEntry> {
	// Resolve via package entry, then hop into the sibling /data/ folder.
	// The package exports field only exposes dist/ so we read the file directly.
	const pkgEntry = require.resolve('romcal/1962');
	const baseIdx = pkgEntry.indexOf('/rites/roman1962/');
	if (baseIdx < 0) throw new Error('cannot locate romcal/1962 data dir');
	const dataPath = pkgEntry.slice(0, baseIdx) + `/rites/roman1962/data/${name}.json`;
	return JSON.parse(readFileSync(dataPath, 'utf-8'));
}

const kinds: Record<string, Record<string, RawEntry>> = {
	tempora: loadJson('tempora'),
	sancti: loadJson('sancti'),
	commune: loadJson('commune')
};

// Proper key → source section name candidates (tried in order)
const SECTION_ALIASES: Record<string, string[]> = {
	introit: ['Introitus'],
	collect: ['Oratio'],
	epistle: ['Lectio', 'Epistola'],
	gradual: ['Graduale'],
	alleluia: ['GradualeP', 'Alleluia'],
	tract: ['Tractus'],
	sequence: ['Sequentia'],
	gospel: ['Evangelium'],
	offertory: ['Offertorium'],
	secret: ['Secreta'],
	preface: ['Praefatio'],
	communion: ['Communio'],
	postcommunion: ['Postcommunio']
};

function lookupEntry(source: string): RawEntry | null {
	const [rawKind, ...rest] = source.split('/');
	const kind = rawKind.toLowerCase();
	const id = rest.join('/');
	return kinds[kind]?.[id] ?? null;
}

function parseTarget(target: string): { source: string; section?: string } {
	const [path, section] = target.split(':');
	return { source: path, section };
}

function collectRefs(items: PropersBlockItem[]): string[] {
	const refs: string[] = [];
	for (const it of items) {
		if (it.type === 'scriptureRef') refs.push(it.ref);
	}
	return refs;
}

function hasTextOf(items: PropersBlockItem[], lang: string): boolean {
	for (const it of items) {
		if (it.type === 'text' && it.lang === lang && it.value.trim()) return true;
	}
	return false;
}

function resolveSection(
	source: string,
	sectionName: string,
	seen: Set<string>
): PropersBlockItem[] | null {
	const key = `${source}:${sectionName}`;
	if (seen.has(key)) return null;
	seen.add(key);

	const entry = lookupEntry(source);
	if (!entry) return null;

	const topRef = entry.references?.[sectionName];
	if (topRef) {
		const { source: tgtSource, section: tgtSection } = parseTarget(topRef);
		return resolveSection(tgtSource, tgtSection ?? sectionName, seen);
	}

	const items = entry.sections?.[sectionName];
	if (!items || items.length === 0) return null;

	for (const it of items) {
		if (it.type === 'ref') {
			const { source: tgtSource, section: tgtSection } = parseTarget(it.target);
			const resolved = resolveSection(tgtSource, tgtSection ?? sectionName, seen);
			if (resolved) return resolved;
		}
	}
	return items;
}

export interface ProperRefInfo {
	refs: string[];
	hasLa: boolean;
	hasLocal: boolean;
}

export function getProperRefs(
	source: string,
	properKey: string,
	localLang: 'en' | 'de' | 'la'
): ProperRefInfo {
	const aliases = SECTION_ALIASES[properKey] ?? [];
	for (const sectionName of aliases) {
		const items = resolveSection(source, sectionName, new Set());
		if (!items) continue;
		return {
			refs: collectRefs(items),
			hasLa: hasTextOf(items, 'la'),
			hasLocal: localLang === 'la' ? true : hasTextOf(items, localLang)
		};
	}
	return { refs: [], hasLa: false, hasLocal: false };
}

export interface RawProperSegment {
	refs: string[];
	la: string;
	local: string;
}

function buildSegments(items: PropersBlockItem[], localLang: string): RawProperSegment[] {
	// Raw data lists la texts (with inline scriptureRefs) first, then local
	// texts afterwards. Walk the stream separately per language, then zip by
	// index so la[i] and local[i] end up in the same segment. Scripture refs
	// are attached to the la block that follows them.
	const la: string[] = [];
	const local: string[] = [];
	const refsByIdx = new Map<number, string[]>();
	let pendingRefs: string[] = [];

	for (const it of items) {
		if (it.type === 'scriptureRef') {
			pendingRefs.push(it.ref);
		} else if (it.type === 'text') {
			const val = it.value.trim();
			if (!val) continue;
			if (it.lang === 'la') {
				if (pendingRefs.length) {
					refsByIdx.set(la.length, pendingRefs);
					pendingRefs = [];
				}
				la.push(val);
			} else if (it.lang === localLang) {
				local.push(val);
			}
		}
	}

	// Trailing refs with no following la block — attach to last la segment
	// so they still render, but only if there's something to attach to.
	if (pendingRefs.length && la.length) {
		const lastIdx = la.length - 1;
		const existing = refsByIdx.get(lastIdx) ?? [];
		refsByIdx.set(lastIdx, [...existing, ...pendingRefs]);
	}

	const count = Math.max(la.length, local.length);
	const segs: RawProperSegment[] = [];
	for (let i = 0; i < count; i++) {
		segs.push({
			refs: refsByIdx.get(i) ?? [],
			la: la[i] ?? '',
			local: local[i] ?? ''
		});
	}
	return segs;
}

export function getProperSegments(
	source: string,
	properKey: string,
	localLang: 'en' | 'de' | 'la'
): RawProperSegment[] | null {
	const aliases = SECTION_ALIASES[properKey] ?? [];
	for (const sectionName of aliases) {
		const items = resolveSection(source, sectionName, new Set());
		if (!items) continue;
		return buildSegments(items, localLang);
	}
	return null;
}
