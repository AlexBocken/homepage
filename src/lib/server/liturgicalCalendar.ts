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
	createI18n1962
} from 'romcal/1962';
import type { LiturgicalDay1962, RomcalBundle1962 } from 'romcal/1962';
import { pathToFileURL } from 'node:url';
import { dirname, join as joinPath } from 'node:path';
import { createRequire } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';
import {
	colorLabel1962,
	DEFAULT_DIOCESE_1962,
	DEFAULT_DIOCESE_1969,
	rank1962Label,
	season1962Label,
	type CalendarLang,
	type Diocese1962,
	type Diocese1969
} from '../../routes/[faithLang=faithLang]/[calendar=calendarLang]/calendarI18n';
import type {
	CalendarDay,
	ProperSection,
	Rite1962Commem,
	Rite1962Detail
} from '../calendarTypes';
import { getProperRefs, getProperRefsPerSlot } from './romcal1962Refs';
import { fetchLocalFromBible, type FallbackLang } from './properBibleFallback';
import { translateRefLabel } from './bibleRefLatin';

// romcal's package.json isn't exposed via its exports map, so resolve the
// main entry instead and walk up until we hit the package root.
const requireFromHere = createRequire(import.meta.url);
function findRomcalRoot(): string {
	let dir = dirname(requireFromHere.resolve('romcal'));
	while (true) {
		const pkgPath = joinPath(dir, 'package.json');
		if (existsSync(pkgPath)) {
			try {
				const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as { name?: string };
				if (pkg.name === 'romcal') return dir;
			} catch {
				// fall through and keep walking
			}
		}
		const parent = dirname(dir);
		if (parent === dir) throw new Error('Could not locate romcal package root');
		dir = parent;
	}
}
const romcalRoot = findRomcalRoot();

const bundles1969: Record<Diocese1969, Record<CalendarLang, RomcalBundleObject>> = {
	general: { en: GeneralRoman_En, de: GeneralRoman_De, la: GeneralRoman_La },
	switzerland: { en: Switzerland_En, de: Switzerland_De, la: Switzerland_La }
};

const romcalByKey = new Map<string, Romcal>();
function getRomcal(lang: CalendarLang, diocese: Diocese1969): Romcal {
	const key = `${diocese}|${lang}`;
	let r = romcalByKey.get(key);
	if (r) return r;
	r = new Romcal({ localizedCalendar: bundles1969[diocese][lang], scope: 'liturgical' });
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

// Names & propers for the 1962 rite ship as bundled JS files outside the
// package's `exports` map, so resolve them via an absolute file URL.
const bundle1962Cache = new Map<CalendarLang, Promise<RomcalBundle1962>>();
function loadBundle1962(lang: CalendarLang): Promise<RomcalBundle1962> {
	let p = bundle1962Cache.get(lang);
	if (p) return p;
	const abs = joinPath(
		romcalRoot,
		'rites/roman1962/dist/bundles',
		lang,
		'esm/index.js'
	);
	p = import(/* @vite-ignore */ pathToFileURL(abs).href).then(
		(m) => m.default as RomcalBundle1962
	);
	bundle1962Cache.set(lang, p);
	return p;
}

const romcal1962ByKey = new Map<string, Promise<Romcal1962>>();
function getRomcal1962(lang: CalendarLang, diocese: Diocese1962): Promise<Romcal1962> {
	const key = `${diocese}|${lang}`;
	let p = romcal1962ByKey.get(key);
	if (p) return p;
	const calendar = calendars1962[diocese];
	// Do NOT pass `localizedCalendar` here: RomcalConfig's bundle-only branch
	// (`if (config?.localizedCalendar)` in rites/roman1969/src/models/config.ts)
	// pushes only the bundle's inputs and skips `particularCalendar` AND the
	// 1962 sanctoral layering entirely. The 1962 names live on the 1962
	// propers bundle and are supplied via `createI18n1962` + `resolveName1962`.
	p = loadBundle1962(lang).then((b) => {
		const i18next = createI18n1962(lang, { [lang]: b.i18n.names });
		// `i18next` is part of Romcal's runtime config but absent from the
		// published input type. Build via a permissive record so TS accepts it.
		const base: Record<string, unknown> = {
			i18next,
			scope: 'liturgical'
		};
		if (calendar) base.particularCalendar = calendar;
		return new Romcal1962(base as ConstructorParameters<typeof Romcal1962>[0]);
	});
	romcal1962ByKey.set(key, p);
	return p;
}

// Section order follows the flow of the Mass. The new propers bundles key
// sections by their Latin section names.
const PROPER_ORDER = [
	'Introitus',
	'Oratio',
	'Lectio',
	'Graduale',
	'GradualeF',
	'Tractus',
	'Sequentia',
	'Evangelium',
	'Offertorium',
	'Secreta',
	'Communio',
	'Postcommunio'
] as const;
const PROPER_ORDER_SET: ReadonlySet<string> = new Set<string>(PROPER_ORDER);

const RANK_FROM_CLASS_1962: Record<1 | 2 | 3 | 4, string> = {
	1: 'ClassI',
	2: 'ClassII',
	3: 'ClassIII',
	4: 'ClassIV'
};

function colorKeysFrom(c: LiturgicalDay1962): string[] {
	// romcal 3 returns SCREAMING_SNAKE color keys ("WHITE", "ROSE", ...) which
	// already match our legend/CSS tokens.
	return c.colors ? [...c.colors] : [];
}

function buildCommemorations(
	d: LiturgicalDay1962,
	localBundle: RomcalBundle1962 | null,
	laBundle: RomcalBundle1962
): Rite1962Commem[] {
	const out: Rite1962Commem[] = [];
	for (const c of d.commemorations ?? []) {
		const resolved = resolveCommemName(c.id, c.name, localBundle, laBundle);
		// Drop 1969 GRC leaks: the hardcoded `GeneralRoman` import in
		// RomcalConfig adds 1969-shaped ids (e.g. `andrew_apostle`) that are
		// not in either 1962 bundle. They show up as losers on the same date
		// as proper 1962 sancti — filter them out.
		if (resolved == null) continue;
		out.push({ id: c.id, name: resolved });
	}
	return out;
}

function resolveCommemName(
	id: string,
	raw: string | undefined,
	localBundle: RomcalBundle1962 | null,
	laBundle: RomcalBundle1962
): string | null {
	const bundles = [localBundle, laBundle].filter(
		(b): b is RomcalBundle1962 => b != null
	);
	for (const b of bundles) {
		const v = b.i18n.names?.[id];
		if (v && v !== id) return v;
	}
	// Not in any 1962 bundle → treat as 1969 leak and drop.
	if (!raw || raw === id) return null;
	// Defensive: raw looks like an i18n key path (namespace/key) — also drop.
	if (/^[a-z][a-z0-9_]*[/.][a-z_]/.test(raw)) return null;
	return raw;
}

function resolveStationName(
	key: string,
	localBundle: RomcalBundle1962 | null,
	laBundle: RomcalBundle1962
): string {
	const bundles = [localBundle, laBundle].filter(
		(b): b is RomcalBundle1962 => b != null
	);
	for (const b of bundles) {
		const v = (b.i18n as { stationChurches?: Record<string, string> }).stationChurches?.[key];
		if (v && v !== key) return v;
	}
	return key;
}

function sectionsFromBundle(
	laPropers: Record<string, string[]> | undefined,
	localPropers: Record<string, string[]> | undefined
): ProperSection[] {
	if (!laPropers && !localPropers) return [];
	const sections: ProperSection[] = [];
	const seen = new Set<string>();
	const emit = (key: string) => {
		if (seen.has(key)) return;
		seen.add(key);
		const la = laPropers?.[key];
		const local = localPropers?.[key];
		if ((!la || !la.length) && (!local || !local.length)) return;
		sections.push({ key, la: la ? [...la] : [], local: local ? [...local] : [] });
	};
	for (const key of PROPER_ORDER) emit(key);
	// Emit any remaining sections (ember-day readings, extras) in source order.
	const extraKeys = new Set<string>();
	for (const k of Object.keys(laPropers ?? {})) if (!PROPER_ORDER_SET.has(k)) extraKeys.add(k);
	for (const k of Object.keys(localPropers ?? {})) if (!PROPER_ORDER_SET.has(k)) extraKeys.add(k);
	for (const k of extraKeys) emit(k);
	return sections;
}

function findPropersFor(
	d: LiturgicalDay1962,
	bundle: RomcalBundle1962
): Record<string, string[]> | undefined {
	const kind = d.kind1962;
	const key = d.key1962 ?? d.id;
	if (!kind) return undefined;
	return bundle.propers[kind]?.[key];
}

function humanizeId(id: string): string {
	return id
		.split(/[_\s]+/)
		.filter(Boolean)
		.map((w) => w.charAt(0).toUpperCase() + w.slice(1))
		.join(' ');
}

// When romcal's own i18next lookup misses (stale bundle, unknown id), it
// returns the raw key — detect that and fall back to a direct bundle name
// lookup, then a humanized id.
function resolveName1962(
	d: LiturgicalDay1962,
	localBundle: RomcalBundle1962 | null,
	laBundle: RomcalBundle1962
): string {
	const raw = d.name ?? '';
	const id = d.id;
	const key = d.key1962 ?? d.id;
	const looksUnresolved =
		!raw || raw === id || raw === key || /^[a-z][a-z0-9_]*\.[a-z_]+$/.test(raw);
	if (!looksUnresolved) return raw;
	const bundles = [localBundle, laBundle].filter(
		(b): b is RomcalBundle1962 => b != null
	);
	for (const b of bundles) {
		const names = b.i18n.names;
		const v = names?.[key] ?? names?.[id];
		if (v && v !== key && v !== id) return v;
	}
	return humanizeId(id);
}

function adaptDay1962(
	d: LiturgicalDay1962,
	lang: CalendarLang,
	laBundle: RomcalBundle1962,
	localBundle: RomcalBundle1962 | null
): CalendarDay {
	const colorKeys = colorKeysFrom(d);
	const colorNames = colorKeys.map((k) => colorLabel1962(k, lang));
	const classOf = (d.classOf1962 ?? 4) as 1 | 2 | 3 | 4;
	const classKey = RANK_FROM_CLASS_1962[classOf];

	const laProps = findPropersFor(d, laBundle);
	const localProps = localBundle ? findPropersFor(d, localBundle) : undefined;
	const propers = sectionsFromBundle(laProps, localProps);
	const properKey = d.key1962 ?? d.id;
	const fallbackLang: FallbackLang | null =
		lang === 'en' ? 'en' : lang === 'de' ? 'de' : null;
	const labelLang: 'en' | 'de' | 'la' = lang === 'en' ? 'en' : lang === 'de' ? 'de' : 'la';
	for (const section of propers) {
		const refs = getProperRefs(d.kind1962, properKey, section.key);
		if (refs.length) {
			section.refs = refs;
			section.refLabel = translateRefLabel(refs[0], labelLang);
		}
		if (fallbackLang && section.local.length === 0 && refs.length) {
			const perSlot = getProperRefsPerSlot(
				d.kind1962,
				properKey,
				section.key,
				section.la.length
			);
			const localArr: string[] = new Array(section.la.length).fill('');
			let any = false;
			for (let i = 0; i < section.la.length; i++) {
				const slotRefs = perSlot[i];
				if (!slotRefs || slotRefs.length === 0) continue;
				const text = fetchLocalFromBible(slotRefs, fallbackLang);
				if (text) {
					localArr[i] = text;
					any = true;
				}
			}
			if (any) {
				section.local = localArr;
				section.localFromBible = true;
			}
		}
	}

	const detail: Rite1962Detail = {
		class: classOf,
		kind: d.kind1962 ?? 'tempora',
		commemorations: buildCommemorations(d, localBundle, laBundle),
		propers
	};
	if (d.stationChurches && d.stationChurches.length > 0) {
		// Romcal's internal i18next has no resource bundles loaded (RomcalConfig
		// ignores the `i18next` we pass in input), so `s.name` arrives equal to
		// `s.key`. Resolve from the ships-with-bundle lookup table here, with
		// Latin as a fallback floor.
		detail.stationChurches = d.stationChurches.map((s) => ({
			key: s.key,
			name: resolveStationName(s.key, localBundle, laBundle),
			...(s.mass ? { mass: s.mass } : {})
		}));
	}
	if (d.octaveOf) detail.octave = { ofId: d.octaveOf.ofId, day: d.octaveOf.day };
	if (d.vigilOf) detail.vigilOf = d.vigilOf;
	if (d.transferredFromDate) detail.transferredFrom = d.transferredFromDate;

	const seasonKey = d.seasons?.[0] ?? null;
	return {
		iso: d.date,
		id: d.id,
		name: resolveName1962(d, localBundle, laBundle),
		rankName: rank1962Label(classKey, lang),
		rank: classKey,
		seasonKey,
		// Romcal's own seasonNames come through unresolved ("advent.season") because
		// RomcalConfig's internal i18next has no resource bundle loaded — we pass
		// neither `localizedCalendar` nor a positional `locale`. Resolve here via
		// our own helper, which handles both 1962 CamelCase and 1969 SCREAMING_SNAKE.
		seasonNames: seasonKey ? [season1962Label(seasonKey, lang)] : [],
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

	const [romcal, laBundle, localBundle] = await Promise.all([
		getRomcal1962(lang, diocese),
		loadBundle1962('la'),
		lang === 'la' ? Promise.resolve<RomcalBundle1962 | null>(null) : loadBundle1962(lang)
	]);
	const resolved = await romcal.generateCalendar(year);
	const map = new Map<string, CalendarDay>();
	for (const [iso, entries] of Object.entries(resolved)) {
		const principal = entries[0];
		if (!principal) continue;
		map.set(iso, adaptDay1962(principal, lang, laBundle, localBundle));
	}
	yearCache1962.set(cacheKey, map);
	return map;
}

export function isoFor(year: number, month: number, day: number): string {
	const mm = String(month + 1).padStart(2, '0');
	const dd = String(day).padStart(2, '0');
	return `${year}-${mm}-${dd}`;
}

// Pre-compute liturgical-calendar maps for the current and next civil year
// across all supported languages for each rite's default diocese. Pages hit
// year N and N+1 on every request (AdventI-rollover logic), so warming this
// slice means the hot path — today's view in the default rite/diocese — is
// cache-hot on the first request after boot. Non-default dioceses stay lazy.
const WARMUP_LANGS: readonly CalendarLang[] = ['en', 'de', 'la'] as const;
export async function warmLiturgicalCache(): Promise<void> {
	const year = new Date().getFullYear();
	const years = [year, year + 1];
	const tasks: Promise<unknown>[] = [];
	for (const y of years) {
		for (const lang of WARMUP_LANGS) {
			tasks.push(getYear(lang, DEFAULT_DIOCESE_1969, y));
			tasks.push(getYear1962(lang, DEFAULT_DIOCESE_1962, y));
		}
	}
	await Promise.all(tasks);
}
