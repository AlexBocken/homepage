import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { Romcal } from 'romcal';
import {
	GeneralRoman_De,
	GeneralRoman_En,
	GeneralRoman_La
} from '@romcal/calendar.general-roman';
import { expectedSlug, isValidRite, type CalendarLang, type Rite } from './calendarI18n';

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
}

const localeBundles = {
	en: GeneralRoman_En,
	de: GeneralRoman_De,
	la: GeneralRoman_La
};

// Cache: lang -> Romcal instance
const romcalByLang = new Map<CalendarLang, Romcal>();
function getRomcal(lang: CalendarLang): Romcal {
	let r = romcalByLang.get(lang);
	if (r) return r;
	r = new Romcal({ localizedCalendar: localeBundles[lang] });
	romcalByLang.set(lang, r);
	return r;
}

// Cache: lang|year -> Map<iso, CalendarDay>
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

	const today = new Date();
	const riteParam = url.searchParams.get('rite');
	const rite: Rite = isValidRite(riteParam) ? riteParam : '1969';

	// 1962 rite is WIP — skip data generation
	if (rite === '1962') {
		return {
			rite,
			wip: true,
			year: today.getFullYear(),
			month: today.getMonth(),
			monthDays: [],
			today: null,
			todayIso: today.toISOString().slice(0, 10),
			selected: null,
			selectedIso: '',
			session: locals.session ?? (await locals.auth())
		};
	}

	const yParam = url.searchParams.get('y');
	const mParam = url.searchParams.get('m');
	const selectedDateParam = url.searchParams.get('d');

	const y = yParam !== null ? Number(yParam) : NaN;
	const m = mParam !== null ? Number(mParam) : NaN;

	const year = Number.isFinite(y) && y >= 1969 && y <= 2100 ? y : today.getFullYear();
	const month = Number.isFinite(m) && m >= 0 && m <= 11 ? m : today.getMonth();

	const yearMap = await getYear(lang, year);
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
	const todayYearMap = await getYear(lang, today.getFullYear());
	const todayEntry = todayYearMap.get(todayIso) ?? null;

	let selectedIso: string;
	if (selectedDateParam && /^\d{4}-\d{2}-\d{2}$/.test(selectedDateParam)) {
		selectedIso = selectedDateParam;
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
