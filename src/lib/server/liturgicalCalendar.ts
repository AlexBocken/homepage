import { Romcal, type RomcalBundleObject } from 'romcal';
import {
	GeneralRoman_De,
	GeneralRoman_En,
	GeneralRoman_La
} from '@romcal/calendar.general-roman';
import {
	Switzerland_De,
	Switzerland_En,
	Switzerland_La
} from '@romcal/calendar.switzerland';
import {
	Romcal1962,
	Switzerland,
	Switzerland_Basel,
	Switzerland_Chur,
	Switzerland_Lausanne_Geneva_Fribourg,
	Switzerland_Lugano,
	Switzerland_Saint_Maurice_Abbey,
	Switzerland_Sankt_Gallen,
	Switzerland_Sion,
	resolvePropersBlocks
} from 'romcal/1962';
import type {
	LiturgicalDay1962,
	MassPropersBlocks,
	MassSectionField,
	PropersBlock
} from 'romcal/1962';
import {
	colorLabel1962,
	rank1962Label,
	season1962Label,
	type CalendarLang,
	type Diocese1962,
	type Diocese1969
} from '../../routes/[faithLang=faithLang]/[calendar=calendarLang]/calendarI18n';
import type {
	CalendarDay,
	ProperSection,
	ProperSegment,
	Rite1962Commem,
	Rite1962Detail
} from '../calendarTypes';
import { lookupReference } from '$lib/server/bible';
import { translateRefToTarget } from '$lib/server/bibleRefLatin';
import { resolve as resolvePath } from 'path';

const bundles1969: Record<Diocese1969, Record<CalendarLang, RomcalBundleObject>> = {
	general: { en: GeneralRoman_En, de: GeneralRoman_De, la: GeneralRoman_La },
	switzerland: { en: Switzerland_En, de: Switzerland_De, la: Switzerland_La }
};

const romcalByKey = new Map<string, Romcal>();
function getRomcal(lang: CalendarLang, diocese: Diocese1969): Romcal {
	const key = `${diocese}|${lang}`;
	let r = romcalByKey.get(key);
	if (r) return r;
	r = new Romcal({ localizedCalendar: bundles1969[diocese][lang] });
	romcalByKey.set(key, r);
	return r;
}

const yearCache = new Map<string, Map<string, CalendarDay>>();

export async function getYear(
	lang: CalendarLang,
	diocese: Diocese1969,
	year: number
): Promise<Map<string, CalendarDay>> {
	const cacheKey = `${diocese}|${lang}|${year}`;
	const cached = yearCache.get(cacheKey);
	if (cached) return cached;

	const r = getRomcal(lang, diocese);
	const raw = await r.generateCalendar(year);
	const map = new Map<string, CalendarDay>();
	for (const [iso, entries] of Object.entries(raw)) {
		const principal = entries[0];
		if (!principal) continue;
		const seasonKey = (principal as unknown as { seasons?: string[] }).seasons?.[0] ?? null;
		map.set(iso, {
			iso,
			id: principal.id,
			name: principal.name,
			rankName: principal.rankName,
			rank: principal.rank,
			seasonKey,
			seasonNames: [...principal.seasonNames],
			colorNames: [...principal.colorNames],
			colorKeys: [...principal.colors],
			psalterWeek: principal.cycles?.psalterWeek ?? null,
			sundayCycle: principal.cycles?.sundayCycle ?? null
		});
	}
	yearCache.set(cacheKey, map);
	return map;
}

// --- 1962 rite ---

const calendars1962 = {
	general: undefined,
	switzerland: Switzerland,
	basel: Switzerland_Basel,
	chur: Switzerland_Chur,
	'lausanne-geneva-fribourg': Switzerland_Lausanne_Geneva_Fribourg,
	lugano: Switzerland_Lugano,
	'saint-maurice-abbey': Switzerland_Saint_Maurice_Abbey,
	'sankt-gallen': Switzerland_Sankt_Gallen,
	sion: Switzerland_Sion
} as const satisfies Record<Diocese1962, unknown>;

const romcal1962ByKey = new Map<string, Romcal1962>();
function getRomcal1962(lang: CalendarLang, diocese: Diocese1962): Romcal1962 {
	const key = `${diocese}|${lang}`;
	let r = romcal1962ByKey.get(key);
	if (r) return r;
	// Package localizes celebration.name via i18next; structured proper
	// blocks are fetched lazily via resolvePropersBlocks (below), so we
	// don't ask attachPropers to pre-concatenate locale text.
	const calendar = calendars1962[diocese];
	r = calendar
		? new Romcal1962({ localeId: lang, calendar })
		: new Romcal1962({ localeId: lang });
	romcal1962ByKey.set(key, r);
	return r;
}

const PROPER_ORDER: MassSectionField[] = [
	'introit',
	'collect',
	'epistle',
	'gradual',
	'alleluia',
	'tract',
	'sequence',
	'gospel',
	'offertory',
	'secret',
	'preface',
	'communion',
	'postcommunion'
];

const COLOR_KEY_1962: Record<string, string> = {
	White: 'WHITE',
	Red: 'RED',
	Green: 'GREEN',
	Violet: 'PURPLE',
	Black: 'BLACK',
	Rose: 'ROSE'
};

const RANK_FROM_CLASS_1962: Record<1 | 2 | 3 | 4, string> = {
	1: 'SOLEMNITY',
	2: 'FEAST',
	3: 'MEMORIAL',
	4: 'WEEKDAY'
};

function colorKeysFrom(c: LiturgicalDay1962): string[] {
	return c.colors.map((col) => COLOR_KEY_1962[col] ?? col.toUpperCase());
}

function adaptCommem(c: LiturgicalDay1962, lang: CalendarLang): Rite1962Commem {
	const colorKeys = colorKeysFrom(c);
	return {
		key: c.key,
		name: c.name,
		rankName: rank1962Label(c.rank1962, lang),
		kind: c.kind,
		colorKeys,
		colorNames: colorKeys.map((k) => colorLabel1962(k, lang))
	};
}

function bibleTextFor(ref: string, targetLang: 'en' | 'de'): string | null {
	const tsvPath = resolvePath(targetLang === 'de' ? 'static/allioli.tsv' : 'static/drb.tsv');
	const segments = ref.split(';').map((s) => s.trim()).filter(Boolean);
	if (!segments.length) return null;

	let lastBook: string | null = null;
	let lastChapter: string | null = null;
	const parts: string[] = [];

	for (const seg of segments) {
		// Detect optional leading book (letters, optional leading digit like "1 Cor")
		const bookMatch = seg.match(/^(\d?\s?[A-Za-z]+\.?)\s+(.*)$/);
		let book: string | null = null;
		let rest = seg;
		if (bookMatch) {
			book = bookMatch[1];
			rest = bookMatch[2].trim();
		}
		if (book) lastBook = book;
		if (!lastBook) continue;

		let chapter: string;
		let verseRange: string;
		// Accept "118:85", "118, 85", "118:85-90", or bare "85" (inherit chapter)
		const normalized = rest.replace(/\s*,\s*/, ':').replace(/\s+/g, ' ').trim();
		if (normalized.includes(':')) {
			const [c, v] = normalized.split(':');
			chapter = c.trim();
			verseRange = v.trim();
			lastChapter = chapter;
		} else if (lastChapter) {
			chapter = lastChapter;
			verseRange = normalized;
		} else continue;

		const fullRef = `${lastBook} ${chapter}:${verseRange}`;
		const translated = translateRefToTarget(fullRef, targetLang);
		if (!translated) continue;

		try {
			const result = lookupReference(translated, tsvPath);
			if (result && result.verses.length) {
				parts.push(result.verses.map((v) => `${v.verse}. ${v.text}`).join(' '));
			}
		} catch {
			// skip
		}
	}

	return parts.length ? parts.join(' ') : null;
}

interface RawSegment {
	refs: string[];
	la: string;
	local: string;
}

// Zip la / local text streams by index so la[i] and local[i] land in
// the same segment. Scripture refs attach to the la block that follows
// them; trailing refs with no following la block attach to the last
// segment so they still render.
function buildSegments(items: PropersBlock, localLang: CalendarLang): RawSegment[] {
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

	if (pendingRefs.length && la.length) {
		const lastIdx = la.length - 1;
		const existing = refsByIdx.get(lastIdx) ?? [];
		refsByIdx.set(lastIdx, [...existing, ...pendingRefs]);
	}

	const count = Math.max(la.length, local.length);
	const segs: RawSegment[] = [];
	for (let i = 0; i < count; i++) {
		segs.push({ refs: refsByIdx.get(i) ?? [], la: la[i] ?? '', local: local[i] ?? '' });
	}
	return segs;
}

function propersOf(sections: MassPropersBlocks, lang: CalendarLang): ProperSection[] {
	const out: ProperSection[] = [];
	for (const key of PROPER_ORDER) {
		const block = sections[key];
		if (!block || !block.length) continue;
		const rawSegs = buildSegments(block, lang);
		if (!rawSegs.length) continue;

		const segments: ProperSegment[] = [];
		const allRefs: string[] = [];
		let sectionFromBible = false;

		for (const raw of rawSegs) {
			const seg: ProperSegment = { refs: raw.refs, la: raw.la };
			if (lang !== 'la' && raw.local) seg.local = raw.local;

			// Bible fallback: only for this segment, using only its own refs
			if (!seg.local && raw.refs.length && lang !== 'la') {
				const bible = bibleTextFor(raw.refs.join('; '), lang);
				if (bible) {
					seg.local = bible;
					seg.fromBible = true;
					sectionFromBible = true;
				}
			}

			allRefs.push(...raw.refs);
			if (seg.la || seg.local || seg.refs.length) segments.push(seg);
		}

		if (!segments.length) continue;
		const section: ProperSection = { key, segments, refs: allRefs };
		if (sectionFromBible) section.fromBible = true;
		out.push(section);
	}
	return out;
}

function extraSectionsOf(
	extras: Record<string, PropersBlock>,
	lang: CalendarLang
): ProperSection[] {
	const out: ProperSection[] = [];
	for (const [key, block] of Object.entries(extras)) {
		const buckets: Record<string, string[]> = {};
		const refs: string[] = [];
		for (const item of block) {
			if (item.type === 'text') (buckets[item.lang] ??= []).push(item.value);
			else if (item.type === 'scriptureRef') refs.push(item.ref);
		}
		const la = (buckets['la'] ?? []).join('\n\n').trim();
		const local = lang === 'la' ? '' : (buckets[lang] ?? []).join('\n\n').trim();
		if (!la && !local && refs.length === 0) continue;
		const segment: ProperSegment = { refs, la };
		if (local) segment.local = local;
		out.push({ key, segments: [segment], refs });
	}
	return out;
}

// Primary celebration may only carry the sections that override the commune
// (e.g. only `gospel` for a confessor). Merge commune sections under the
// primary so every liturgical slot has a text source.
function mergeCommunePropers(
	p: LiturgicalDay1962,
	sections: MassPropersBlocks,
	extraSections: Record<string, PropersBlock>
): { sections: MassPropersBlocks; extraSections: Record<string, PropersBlock> } {
	const slug = p.properRef.communeSlug;
	if (!slug) return { sections, extraSections };
	const communeCelebration = {
		...p,
		properRef: { source: `commune/${slug}` }
	} as LiturgicalDay1962;
	let communeResolved;
	try {
		communeResolved = resolvePropersBlocks(communeCelebration);
	} catch {
		return { sections, extraSections };
	}
	const mergedSections = { ...communeResolved.sections, ...sections } as MassPropersBlocks;
	const mergedExtras = { ...communeResolved.extraSections, ...extraSections };
	return { sections: mergedSections, extraSections: mergedExtras };
}

function adaptDay1962(entries: LiturgicalDay1962[], lang: CalendarLang): CalendarDay {
	const p = entries[0];
	const commemorations = entries.slice(1);
	const colorKeys = colorKeysFrom(p);
	const colorNames = colorKeys.map((k) => colorLabel1962(k, lang));
	const resolved = resolvePropersBlocks(p);
	const { sections, extraSections } = mergeCommunePropers(
		p,
		resolved.sections,
		resolved.extraSections
	);
	const detail: Rite1962Detail = {
		class: p.classOf1962,
		kind: p.kind,
		commemorations: commemorations.map((c) => adaptCommem(c, lang)),
		rubrics: {
			gloria: p.rubrics.gloria,
			credo: p.rubrics.credo,
			preface: p.rubrics.preface,
			lastGospel: p.rubrics.lastGospel,
			ite: p.rubrics.ite
		},
		...(p.octave
			? {
					octave: {
						id: p.octave.id,
						parentFeastId: p.octave.parentFeastId,
						day: p.octave.day,
						rank: p.octave.rank
					}
				}
			: {}),
		...(p.vigil ? { vigilOf: p.vigil.of } : {}),
		...(p.transferredFromDate ? { transferredFrom: p.transferredFromDate } : {}),
		properSource: p.properRef.source,
		...(p.properRef.communeSlug ? { communeSlug: p.properRef.communeSlug } : {}),
		propers: propersOf(sections, lang),
		extraSections: extraSectionsOf(extraSections, lang)
	};
	// Pentecost octave (Pentecost Sunday + 6 days) is carved out of Paschaltide so
	// it shows as its own arc in the year ring, mirroring the Easter Week octave.
	const isPentecostWeek = typeof p.key === 'string' && p.key.startsWith('easter_time_7_');
	const seasonKey = isPentecostWeek ? 'Pentecost' : p.season ?? null;
	const seasonNames = seasonKey ? [season1962Label(seasonKey, lang)] : [];
	return {
		iso: p.date,
		id: p.key,
		name: p.name,
		rankName: rank1962Label(p.rank1962, lang),
		rank: RANK_FROM_CLASS_1962[p.classOf1962],
		seasonKey,
		seasonNames,
		colorNames,
		colorKeys,
		psalterWeek: null,
		sundayCycle: null,
		rite1962: detail
	};
}

const yearCache1962 = new Map<string, Map<string, CalendarDay>>();

export async function getYear1962(
	lang: CalendarLang,
	diocese: Diocese1962,
	year: number
): Promise<Map<string, CalendarDay>> {
	const cacheKey = `${diocese}|${lang}|${year}`;
	const cached = yearCache1962.get(cacheKey);
	if (cached) return cached;
	const resolved = await getRomcal1962(lang, diocese).generateCalendar(year);
	const map = new Map<string, CalendarDay>();
	for (const [iso, entries] of Object.entries(resolved)) {
		if (!entries.length) continue;
		map.set(iso, adaptDay1962(entries, lang));
	}
	yearCache1962.set(cacheKey, map);
	return map;
}

export function isoFor(year: number, month: number, day: number): string {
	const mm = String(month + 1).padStart(2, '0');
	const dd = String(day).padStart(2, '0');
	return `${year}-${mm}-${dd}`;
}
