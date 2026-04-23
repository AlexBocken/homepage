import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { errorWithVerse } from '$lib/server/errorQuote';
import {
	DEFAULT_DIOCESE_1962,
	DEFAULT_DIOCESE_1969,
	expectedSlug,
	isDiocese1962,
	isDiocese1969,
	season1962Label,
	type CalendarLang,
	type Diocese1962,
	type Diocese1969,
	type Rite
} from '../../../../calendarI18n';
import { rankDotSize, seasonColorFor } from '../../../../calendarColors';
import {
	getYear,
	getYear1962,
	isoFor
} from '$lib/server/liturgicalCalendar';
import type { CalendarDay, FeastDot, SeasonArc, YearDay } from '$lib/calendarTypes';

export type {
	CalendarDay,
	FeastDot,
	ProperSection,
	Rite1962Commem,
	Rite1962Detail,
	SeasonArc,
	YearDay
} from '$lib/calendarTypes';

export const load: PageServerLoad = async ({ params, url, locals, fetch }) => {
	const slug = expectedSlug(params.faithLang);
	if (slug === null) await errorWithVerse(fetch, url.pathname, 404, 'Not found');
	if (params.calendar !== slug) {
		throw redirect(307, `/${params.faithLang}/${slug}`);
	}

	const lang: CalendarLang =
		params.faithLang === 'faith' ? 'en' : params.faithLang === 'fides' ? 'la' : 'de';

	// Legacy year-slug links (/.../1962/... or /.../1969/...) forward to the new
	// Latin slugs so old bookmarks stay alive.
	if (params.rite === '1962' || params.rite === '1969') {
		const tail = url.pathname.split('/').slice(4).join('/');
		const suffix = tail ? `/${tail}` : '';
		throw redirect(
			307,
			`/${params.faithLang}/${params.calendar}/${params.rite === '1962' ? 'vetus' : 'novus'}${suffix}${url.search}`
		);
	}

	const rite: Rite = params.rite === 'novus' ? 'novus' : 'vetus';

	const dioceseParam = url.searchParams.get('diocese');
	const diocese1962: Diocese1962 = isDiocese1962(dioceseParam)
		? dioceseParam
		: DEFAULT_DIOCESE_1962;
	const diocese1969: Diocese1969 = isDiocese1969(dioceseParam)
		? dioceseParam
		: DEFAULT_DIOCESE_1969;

	// Reject mm without yyyy, dd without yyyy+mm. Sveltekit optional routes let
	// gaps through so we normalize here.
	if ((params.mm && !params.yyyy) || (params.dd && !params.mm)) {
		await errorWithVerse(fetch, url.pathname, 404, 'Not found');
	}

	const today = new Date();
	const minYear = rite === 'vetus' ? 1900 : 1969;
	const yParam = params.yyyy ? Number(params.yyyy) : NaN;
	const mParam = params.mm ? Number(params.mm) - 1 : NaN;

	const year = Number.isFinite(yParam) && yParam >= minYear && yParam <= 2100 ? yParam : today.getFullYear();
	const month = Number.isFinite(mParam) && mParam >= 0 && mParam <= 11 ? mParam : today.getMonth();

	const fetchLy = async (y: number) =>
		rite === 'vetus'
			? await getYear1962(lang, diocese1962, y)
			: await getYear(lang, diocese1969, y);

	// Initial candidate LY maps for the URL year. We may swap to LY(year+1)
	// below if the selected date falls past AdventI of civil year `year`
	// (dates in Advent..Dec 31 belong to the NEXT liturgical year, not the one
	// ending at AdventI(year)). Without this shift, clicking e.g. Dec 25 2025
	// on the LY-2026 ring would route to `/2025/12/25` → LY 2025 ring, which
	// shows the previous post-Pentecost cycle instead of Christmastide.
	let yearMap = await fetchLy(year);
	let lyNextMap = await fetchLy(year + 1);

	const isAdventI1 = (d: CalendarDay) =>
		d.id === 'advent_1_sunday' || d.id === 'first_sunday_of_advent';
	const findFirstIso = (
		m: Map<string, CalendarDay>,
		predicate: (d: CalendarDay) => boolean
	): string | null => {
		for (const [iso, day] of m) if (predicate(day)) return iso;
		return null;
	};
	// AdventI in civil year `year` = start of LY(year+1); rollover point.
	const adventIOfUrlYear = findFirstIso(lyNextMap, isAdventI1);

	const daysInMonth = new Date(year, month + 1, 0).getDate();
	if (params.dd) {
		const ddNum = Number(params.dd);
		if (ddNum < 1 || ddNum > daysInMonth) await errorWithVerse(fetch, url.pathname, 404, 'Not found');
	}
	// Tentative selectedIso used only for the LY rollover decision. The real
	// selectedIso is recomputed after monthDays below (same logic, now on the
	// possibly-shifted yearMap).
	const tentativeSelectedIso = params.dd
		? isoFor(year, month, Number(params.dd))
		: isoFor(year, month, 1);
	let liturgicalYear = year;
	if (
		adventIOfUrlYear != null &&
		tentativeSelectedIso >= adventIOfUrlYear
	) {
		liturgicalYear = year + 1;
		yearMap = lyNextMap;
		lyNextMap = await fetchLy(year + 2);
	}

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
				seasonKey: null,
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
		rite === 'vetus'
			? await getYear1962(lang, diocese1962, today.getFullYear())
			: await getYear(lang, diocese1969, today.getFullYear());
	const todayEntry = todayYearMap.get(todayIso) ?? null;

	let selectedIso: string;
	if (params.dd) {
		selectedIso = isoFor(year, month, Number(params.dd));
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
				: rite === 'vetus'
					? await getYear1962(lang, diocese1962, selectedYear)
					: await getYear(lang, diocese1969, selectedYear);
	const selectedEntry = selectedYearMap.get(selectedIso) ?? monthDays[0];

	// --- Year overview data for the ring ---
	// Romcal (scope: liturgical) emits LY N = Advent I Sunday (year N-1) through
	// the Saturday before Advent I Sunday of year N+1 — the tail overlaps one
	// week into LY N+1, so we also fetch LY N+1 and use its Advent I Sunday as
	// the exclusive cutoff. The ring's window is chosen to avoid splitting the
	// currently-displayed season: Advent-cut by default ([AdventI N-1, AdventI N));
	// once today is in TimeAfterPentecost of the current LY we swap to a
	// Pentecost-cut ([Pentecost N, Pentecost N+1)) so the ongoing post-Pentecost
	// arc isn't sliced in half by the year boundary. Either way, Advent I Sunday
	// (= start of a liturgical year) is passed to the ring as an explicit
	// marker.
	const isPentecost = (d: CalendarDay) =>
		d.id === 'pentecost_sunday' || d.id === 'pentecost';
	const pentecostN = findFirstIso(yearMap, isPentecost);
	const adventINext = findFirstIso(lyNextMap, isAdventI1);
	const pentecostNext = findFirstIso(lyNextMap, isPentecost);

	const inPostPentecost =
		pentecostN != null && adventINext != null && todayIso >= pentecostN && todayIso < adventINext;

	let windowStart: string;
	let windowEnd: string;
	let liturgicalYearStart: string;
	const windowMap = new Map<string, CalendarDay>();
	if (inPostPentecost && pentecostNext != null) {
		windowStart = pentecostN!;
		windowEnd = pentecostNext;
		liturgicalYearStart = adventINext!;
		for (const [iso, day] of yearMap) {
			if (iso >= windowStart && iso < adventINext!) windowMap.set(iso, day);
		}
		for (const [iso, day] of lyNextMap) {
			if (iso >= adventINext! && iso < windowEnd) windowMap.set(iso, day);
		}
	} else {
		const cutoff = adventINext ?? null;
		for (const [iso, day] of yearMap) {
			if (cutoff == null || iso < cutoff) windowMap.set(iso, day);
		}
		const sortedIsos = [...windowMap.keys()].sort();
		windowStart = sortedIsos[0] ?? todayIso;
		windowEnd = cutoff ?? sortedIsos[sortedIsos.length - 1] ?? todayIso;
		liturgicalYearStart = windowStart;
	}

	const sortedYear = [...windowMap.values()].sort((a, b) => a.iso.localeCompare(b.iso));

	// Romcal leaves `season` undefined on sanctoral-principal days (e.g. a saint
	// winning over its underlying ferial) even when they fall inside a temporal
	// season, which would otherwise break the ring arcs with gaps. A sanctoral
	// day inherits the *preceding* season, not the next one — otherwise a saint
	// on the Saturday before Septuagesima pulls the Septuagesima arc backward
	// one day. Forward-fill from previous day first; only backward-fill any
	// still-null leading days at year start (before Advent I Sunday).
	const filledSeasons: (string | null)[] = sortedYear.map((d) => d.seasonKey);
	for (let i = 1; i < filledSeasons.length; i++) {
		if (filledSeasons[i] == null) filledSeasons[i] = filledSeasons[i - 1];
	}
	for (let i = filledSeasons.length - 1; i >= 0; i--) {
		if (filledSeasons[i] == null && i + 1 < filledSeasons.length) {
			filledSeasons[i] = filledSeasons[i + 1];
		}
	}

	// `yearDays` only carries what the ring's needle-color lookup needs for any
	// day (feast or ferial). Feast metadata (name, rank) moves into `feastDots`
	// below so the client can iterate it directly without filtering 365 entries.
	const yearDays: YearDay[] = sortedYear.map((d) => ({
		iso: d.iso,
		color: d.colorKeys[0] ?? 'GREEN'
	}));

	const feastDots: FeastDot[] = [];
	for (const d of sortedYear) {
		if (rankDotSize(d.rank) === 0) continue;
		feastDots.push({
			iso: d.iso,
			name: d.name,
			rank: d.rank,
			color: d.colorKeys[0] ?? 'GREEN'
		});
	}

	const seasonArcs: SeasonArc[] = [];
	let cur: SeasonArc | null = null;
	for (let i = 0; i < sortedYear.length; i++) {
		const d = sortedYear[i];
		const key = filledSeasons[i];
		// 1962: seasonKey is a 1962-specific label ('Septuagesima', 'TimeAfterPentecost',
		// etc.) derived from the day id in `adaptDay1962`; the engine's `seasonNames`
		// are unresolved i18n paths like 'lent.season', so always go through
		// `season1962Label`. 1969: prefer the engine-resolved localized name.
		const name =
			rite === 'vetus'
				? (key ? season1962Label(key, lang) : '')
				: key && key !== d.seasonKey
					? key
					: d.seasonNames[0] ?? key ?? '';
		if (!key) {
			if (cur) {
				seasonArcs.push(cur);
				cur = null;
			}
			continue;
		}
		if (cur && cur.key === key) {
			cur.end = d.iso;
		} else {
			if (cur) seasonArcs.push(cur);
			cur = { key, name, start: d.iso, end: d.iso, color: seasonColorFor(key) };
		}
	}
	if (cur) seasonArcs.push(cur);

	return {
		rite,
		diocese: rite === 'vetus' ? diocese1962 : diocese1969,
		wip: false,
		year,
		liturgicalYear,
		month,
		monthDays,
		yearDays,
		feastDots,
		seasonArcs,
		windowStart,
		windowEnd,
		liturgicalYearStart,
		inPostPentecost,
		today: todayEntry,
		todayIso,
		selected: selectedEntry,
		selectedIso,
		session: locals.session ?? await locals.auth()
	};
};
