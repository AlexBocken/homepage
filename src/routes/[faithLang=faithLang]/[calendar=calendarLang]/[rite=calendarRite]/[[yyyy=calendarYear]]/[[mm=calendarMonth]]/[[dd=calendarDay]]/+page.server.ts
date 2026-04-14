import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { Romcal } from 'romcal';
import {
	GeneralRoman_De,
	GeneralRoman_En,
	GeneralRoman_La
} from '@romcal/calendar.general-roman';
import { Romcal1962 } from 'romcal/1962';
import type { Celebration1962, ResolvedDay1962 } from 'romcal/1962';
import {
	colorLabel1962,
	expectedSlug,
	rank1962Label,
	season1962Label,
	type CalendarLang,
	type Rite
} from '../../../../calendarI18n';
import { getProperSegments } from '$lib/server/romcal1962Refs';
import { lookupReference } from '$lib/server/bible';
import { translateRefToTarget } from '$lib/server/bibleRefLatin';
import { resolve as resolvePath } from 'path';

export interface CalendarDay {
	iso: string;
	id: string;
	name: string;
	rankName: string;
	rank: string;
	seasonNames: string[];
	colorNames: string[];
	colorKeys: string[];
	psalterWeek: string | null;
	sundayCycle: string | null;
	rite1962?: Rite1962Detail;
}

export interface Rite1962Commem {
	key: string;
	name: string;
	rankName: string;
	kind: 'tempora' | 'sancti';
	colorNames: string[];
	colorKeys: string[];
}

export interface Rite1962Detail {
	class: 1 | 2 | 3 | 4;
	kind: 'tempora' | 'sancti';
	commemorations: Rite1962Commem[];
	rubrics: {
		gloria: boolean;
		credo: boolean;
		preface?: string;
		lastGospel?: string;
		ite?: string;
	};
	octave?: {
		id: string;
		parentFeastId: string;
		day: number;
		rank: string;
	};
	vigilOf?: string;
	transferredFrom?: string;
	properSource: string;
	communeSlug?: string;
	propers: ProperSection[];
	extraSections: ProperSection[];
}

const localeBundles = {
	en: GeneralRoman_En,
	de: GeneralRoman_De,
	la: GeneralRoman_La
};

const romcalByLang = new Map<CalendarLang, Romcal>();
function getRomcal(lang: CalendarLang): Romcal {
	let r = romcalByLang.get(lang);
	if (r) return r;
	r = new Romcal({ localizedCalendar: localeBundles[lang] });
	romcalByLang.set(lang, r);
	return r;
}

const yearCache = new Map<string, Map<string, CalendarDay>>();

async function getYear(lang: CalendarLang, year: number): Promise<Map<string, CalendarDay>> {
	const cacheKey = `${lang}|${year}`;
	const cached = yearCache.get(cacheKey);
	if (cached) return cached;

	const r = getRomcal(lang);
	const raw = await r.generateCalendar(year);
	const map = new Map<string, CalendarDay>();
	for (const [iso, entries] of Object.entries(raw)) {
		const principal = entries[0];
		if (!principal) continue;
		map.set(iso, {
			iso,
			id: principal.id,
			name: principal.name,
			rankName: principal.rankName,
			rank: principal.rank,
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

const romcal1962ByLang = new Map<CalendarLang, Romcal1962>();
function getRomcal1962(lang: CalendarLang): Romcal1962 {
	let r = romcal1962ByLang.get(lang);
	if (r) return r;
	const locales = lang === 'la' ? ['la'] : ['la', lang];
	r = new Romcal1962({ includePropers: true, propersLocales: locales });
	romcal1962ByLang.set(lang, r);
	return r;
}

const PROPER_ORDER = [
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
] as const;

type ProperKey = (typeof PROPER_ORDER)[number];

export interface ProperSegment {
	refs: string[];
	la: string;
	local?: string;
	// When true, `local` text comes from the Bible translation lookup because
	// the propers dataset had no localized text for this segment.
	fromBible?: boolean;
}

export interface ProperSection {
	key: string;
	segments: ProperSegment[];
	// Aggregate list of refs across segments (for quick checks)
	refs: string[];
	fromBible?: boolean;
}

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

function colorKeysFrom(c: Celebration1962): string[] {
	return c.colors.map((col) => COLOR_KEY_1962[col] ?? col.toUpperCase());
}

function localizedName(c: Celebration1962, lang: CalendarLang): string {
	if (lang === 'la') return c.name;
	return c.names?.[lang] ?? c.name;
}

function adaptCommem(c: Celebration1962, lang: CalendarLang): Rite1962Commem {
	const colorKeys = colorKeysFrom(c);
	return {
		key: c.key,
		name: localizedName(c, lang),
		rankName: rank1962Label(c.rank1962, lang),
		kind: c.kind,
		colorKeys,
		colorNames: colorKeys.map((k) => colorLabel1962(k, lang))
	};
}

function textOf(dict: Record<string, string> | undefined, locale: string): string {
	const v = dict?.[locale];
	return v && v.trim() ? v : '';
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
		} else {
			continue;
		}

		const fullRef = `${lastBook} ${chapter}:${verseRange}`;
		const translated = translateRefToTarget(fullRef, targetLang);
		if (!translated) continue;

		try {
			const result = lookupReference(translated, tsvPath);
			if (result && result.verses.length) {
				parts.push(result.verses.map((v) => `${v.verse}. ${v.text}`).join(' '));
			}
		} catch {
			// skip this segment
		}
	}

	return parts.length ? parts.join(' ') : null;
}

function propersOf(p: Celebration1962, lang: CalendarLang): ProperSection[] {
	const out: ProperSection[] = [];
	const source = p.properRef.source;
	for (const key of PROPER_ORDER) {
		const rawSegs = getProperSegments(source, key, lang);
		if (!rawSegs || !rawSegs.length) continue;

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

function extraSectionsOf(p: Celebration1962, lang: CalendarLang): ProperSection[] {
	const extras = p.extraSections;
	if (!extras) return [];
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

function adaptDay1962(day: ResolvedDay1962, lang: CalendarLang): CalendarDay {
	const p: Celebration1962 = day.primary;
	const colorKeys = colorKeysFrom(p);
	const colorNames = colorKeys.map((k) => colorLabel1962(k, lang));
	const detail: Rite1962Detail = {
		class: p.classOf1962,
		kind: p.kind,
		commemorations: day.commemorations.map((c) => adaptCommem(c, lang)),
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
		...(day.transferredFrom ? { transferredFrom: day.transferredFrom } : {}),
		properSource: p.properRef.source,
		...(p.properRef.communeSlug ? { communeSlug: p.properRef.communeSlug } : {}),
		propers: propersOf(p, lang),
		extraSections: extraSectionsOf(p, lang)
	};
	return {
		iso: day.date,
		id: p.key,
		name: localizedName(p, lang),
		rankName: rank1962Label(p.rank1962, lang),
		rank: RANK_FROM_CLASS_1962[p.classOf1962],
		seasonNames: day.season ? [season1962Label(day.season, lang)] : [],
		colorNames,
		colorKeys,
		psalterWeek: null,
		sundayCycle: null,
		rite1962: detail
	};
}

const yearCache1962 = new Map<string, Map<string, CalendarDay>>();

async function getYear1962(
	lang: CalendarLang,
	year: number
): Promise<Map<string, CalendarDay>> {
	const cacheKey = `${lang}|${year}`;
	const cached = yearCache1962.get(cacheKey);
	if (cached) return cached;
	const resolved = await getRomcal1962(lang).generateCalendar(year);
	const map = new Map<string, CalendarDay>();
	for (const [iso, day] of resolved) map.set(iso, adaptDay1962(day, lang));
	yearCache1962.set(cacheKey, map);
	return map;
}

function isoFor(year: number, month: number, day: number): string {
	const mm = String(month + 1).padStart(2, '0');
	const dd = String(day).padStart(2, '0');
	return `${year}-${mm}-${dd}`;
}

export const load: PageServerLoad = async ({ params, url, locals }) => {
	const slug = expectedSlug(params.faithLang);
	if (slug === null) throw error(404, 'Not found');
	if (params.calendar !== slug) {
		throw redirect(307, `/${params.faithLang}/${slug}`);
	}

	const lang: CalendarLang =
		params.faithLang === 'faith' ? 'en' : params.faithLang === 'fides' ? 'la' : 'de';

	const rite: Rite = params.rite === '1969' ? '1969' : '1962';

	// Reject mm without yyyy, dd without yyyy+mm. Sveltekit optional routes let
	// gaps through so we normalize here.
	if ((params.mm && !params.yyyy) || (params.dd && !params.mm)) {
		throw error(404, 'Not found');
	}

	const today = new Date();
	const minYear = rite === '1962' ? 1900 : 1969;
	const yParam = params.yyyy ? Number(params.yyyy) : NaN;
	const mParam = params.mm ? Number(params.mm) - 1 : NaN;

	const year = Number.isFinite(yParam) && yParam >= minYear && yParam <= 2100 ? yParam : today.getFullYear();
	const month = Number.isFinite(mParam) && mParam >= 0 && mParam <= 11 ? mParam : today.getMonth();

	const yearMap =
		rite === '1962' ? await getYear1962(lang, year) : await getYear(lang, year);
	const daysInMonth = new Date(year, month + 1, 0).getDate();
	const monthDays: CalendarDay[] = [];
	for (let d = 1; d <= daysInMonth; d++) {
		const iso = isoFor(year, month, d);
		const entry = yearMap.get(iso);
		if (entry) monthDays.push(entry);
		else {
			monthDays.push({
				iso,
				id: '',
				name: '',
				rankName: '',
				rank: 'WEEKDAY',
				seasonNames: [],
				colorNames: [],
				colorKeys: ['GREEN'],
				psalterWeek: null,
				sundayCycle: null
			});
		}
	}

	const todayIso = today.toISOString().slice(0, 10);
	const todayYearMap =
		rite === '1962'
			? await getYear1962(lang, today.getFullYear())
			: await getYear(lang, today.getFullYear());
	const todayEntry = todayYearMap.get(todayIso) ?? null;

	let selectedIso: string;
	if (params.dd) {
		const dayNum = Number(params.dd);
		if (dayNum < 1 || dayNum > daysInMonth) throw error(404, 'Not found');
		selectedIso = isoFor(year, month, dayNum);
	} else if (todayEntry && today.getFullYear() === year && today.getMonth() === month) {
		selectedIso = todayIso;
	} else {
		selectedIso = monthDays[0].iso;
	}
	const selectedYear = Number(selectedIso.slice(0, 4));
	const selectedYearMap =
		selectedYear === year
			? yearMap
			: selectedYear === today.getFullYear()
				? todayYearMap
				: rite === '1962'
					? await getYear1962(lang, selectedYear)
					: await getYear(lang, selectedYear);
	const selectedEntry = selectedYearMap.get(selectedIso) ?? monthDays[0];

	return {
		rite,
		wip: false,
		year,
		month,
		monthDays,
		today: todayEntry,
		todayIso,
		selected: selectedEntry,
		selectedIso,
		session: locals.session ?? (await locals.auth())
	};
};
