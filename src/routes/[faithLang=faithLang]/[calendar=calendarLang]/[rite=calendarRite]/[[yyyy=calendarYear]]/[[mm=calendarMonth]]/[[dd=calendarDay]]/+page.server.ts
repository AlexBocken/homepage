import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
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
import { seasonColorFor } from '../../../../calendarColors';
import {
	getYear,
	getYear1962,
	isoFor
} from '$lib/server/liturgicalCalendar';
import type { CalendarDay, SeasonArc, YearDay } from '$lib/calendarTypes';

export type {
	CalendarDay,
	ProperSection,
	ProperSegment,
	Rite1962Commem,
	Rite1962Detail,
	SeasonArc,
	YearDay
} from '$lib/calendarTypes';

export const load: PageServerLoad = async ({ params, url, locals }) => {
	const slug = expectedSlug(params.faithLang);
	if (slug === null) throw error(404, 'Not found');
	if (params.calendar !== slug) {
		throw redirect(307, `/${params.faithLang}/${slug}`);
	}

	const lang: CalendarLang =
		params.faithLang === 'faith' ? 'en' : params.faithLang === 'fides' ? 'la' : 'de';

	const rite: Rite = params.rite === '1969' ? '1969' : '1962';

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
		throw error(404, 'Not found');
	}

	const today = new Date();
	const minYear = rite === '1962' ? 1900 : 1969;
	const yParam = params.yyyy ? Number(params.yyyy) : NaN;
	const mParam = params.mm ? Number(params.mm) - 1 : NaN;

	const year = Number.isFinite(yParam) && yParam >= minYear && yParam <= 2100 ? yParam : today.getFullYear();
	const month = Number.isFinite(mParam) && mParam >= 0 && mParam <= 11 ? mParam : today.getMonth();

	const yearMap =
		rite === '1962'
			? await getYear1962(lang, diocese1962, year)
			: await getYear(lang, diocese1969, year);
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
		rite === '1962'
			? await getYear1962(lang, diocese1962, today.getFullYear())
			: await getYear(lang, diocese1969, today.getFullYear());
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
					? await getYear1962(lang, diocese1962, selectedYear)
					: await getYear(lang, diocese1969, selectedYear);
	const selectedEntry = selectedYearMap.get(selectedIso) ?? monthDays[0];

	// --- Year overview data for the ring / month-grid views ---
	const sortedYear = [...yearMap.values()].sort((a, b) => a.iso.localeCompare(b.iso));

	// Romcal leaves `season` undefined on sanctoral-principal days (e.g. Christmas,
	// Epiphany, Circumcision) even when they fall inside a temporal season, which
	// would otherwise break the ring arcs with gaps. Fill nulls from the next
	// non-null day (Christmas Vigil → ChristmasTide, Epiphany → EpiphanyTide, …),
	// then forward-fill any trailing nulls at end-of-year.
	const filledSeasons: (string | null)[] = sortedYear.map((d) => d.seasonKey);
	for (let i = filledSeasons.length - 1; i >= 0; i--) {
		if (filledSeasons[i] == null && i + 1 < filledSeasons.length) {
			filledSeasons[i] = filledSeasons[i + 1];
		}
	}
	for (let i = 1; i < filledSeasons.length; i++) {
		if (filledSeasons[i] == null) filledSeasons[i] = filledSeasons[i - 1];
	}

	const yearDays: YearDay[] = sortedYear.map((d, i) => ({
		iso: d.iso,
		name: d.name,
		rank: d.rank,
		color: d.colorKeys[0] ?? 'GREEN',
		seasonKey: filledSeasons[i]
	}));

	const seasonArcs: SeasonArc[] = [];
	let cur: SeasonArc | null = null;
	for (let i = 0; i < sortedYear.length; i++) {
		const d = sortedYear[i];
		const key = filledSeasons[i];
		const name =
			key && key !== d.seasonKey
				? (rite === '1962' ? season1962Label(key, lang) : key)
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
		diocese: rite === '1962' ? diocese1962 : diocese1969,
		wip: false,
		year,
		month,
		monthDays,
		yearDays,
		seasonArcs,
		today: todayEntry,
		todayIso,
		selected: selectedEntry,
		selectedIso,
		session: locals.session ?? (await locals.auth())
	};
};
