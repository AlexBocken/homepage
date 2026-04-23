import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { errorWithVerse } from '$lib/server/errorQuote';
import {
	DEFAULT_DIOCESE_1962,
	DEFAULT_DIOCESE_1969,
	expectedSlug,
	isDiocese1962,
	isDiocese1969,
	type CalendarLang,
	type Diocese1962,
	type Diocese1969,
	type Rite
} from '../../../../../calendarI18n';
import { getYear, getYear1962, isoFor } from '$lib/server/liturgicalCalendar';

export const load: PageServerLoad = async ({ params, url, locals, fetch }) => {
	const slug = expectedSlug(params.faithLang);
	if (slug === null) await errorWithVerse(fetch, url.pathname, 404, 'Not found');
	if (params.calendar !== slug) {
		throw redirect(307, `/${params.faithLang}/${slug}`);
	}

	const lang: CalendarLang =
		params.faithLang === 'faith' ? 'en' : params.faithLang === 'fides' ? 'la' : 'de';

	// Legacy year-slug links forward to the Latin slugs.
	if (params.rite === '1962' || params.rite === '1969') {
		const tail = url.pathname.split('/').slice(4).join('/');
		const suffix = tail ? `/${tail}` : '';
		throw redirect(
			307,
			`/${params.faithLang}/${params.calendar}/${params.rite === '1962' ? 'vetus' : 'novus'}${suffix}${url.search}`
		);
	}

	const rite: Rite = params.rite === 'novus' ? 'novus' : 'vetus';
	if (rite !== 'vetus') await errorWithVerse(fetch, url.pathname, 404, 'Not found');

	const dioceseParam = url.searchParams.get('diocese');
	const diocese1962: Diocese1962 = isDiocese1962(dioceseParam)
		? dioceseParam
		: DEFAULT_DIOCESE_1962;
	const diocese1969: Diocese1969 = isDiocese1969(dioceseParam)
		? dioceseParam
		: DEFAULT_DIOCESE_1969;

	const minYear = rite === 'vetus' ? 1900 : 1969;
	const year = Number(params.yyyy);
	const month = Number(params.mm) - 1;
	const day = Number(params.dd);

	if (!Number.isFinite(year) || year < minYear || year > 2100) await errorWithVerse(fetch, url.pathname, 404, 'Not found');
	if (!Number.isFinite(month) || month < 0 || month > 11) await errorWithVerse(fetch, url.pathname, 404, 'Not found');
	const daysInMonth = new Date(year, month + 1, 0).getDate();
	if (!Number.isFinite(day) || day < 1 || day > daysInMonth) await errorWithVerse(fetch, url.pathname, 404, 'Not found');

	const iso = isoFor(year, month, day);

	// Romcal (scope: liturgical) emits LY N past Saturday-before-Advent-I of
	// civil year N with a stale tail (still on the previous post-Pentecost
	// cycle) before going missing. Dates from Advent I of civil year N onward
	// belong to LY N+1, so fetch both and pick the correct one — mirrors the
	// rollover logic in the month page.
	const fetchLy = async (y: number) =>
		rite === 'vetus'
			? await getYear1962(lang, diocese1962, y)
			: await getYear(lang, diocese1969, y);
	const yearMapN = await fetchLy(year);
	const yearMapNext = await fetchLy(year + 1);
	let adventIOfUrlYear: string | null = null;
	for (const [i, d] of yearMapNext) {
		if (d.id === 'advent_1_sunday' || d.id === 'first_sunday_of_advent') {
			adventIOfUrlYear = i;
			break;
		}
	}
	const yearMap =
		adventIOfUrlYear != null && iso >= adventIOfUrlYear ? yearMapNext : yearMapN;
	const entry = yearMap.get(iso);
	if (!entry) {
		await errorWithVerse(fetch, url.pathname, 404, 'Not found');
		throw new Error('unreachable');
	}

	const today = new Date();
	const todayIso = today.toISOString().slice(0, 10);

	return {
		lang,
		rite,
		diocese: rite === 'vetus' ? diocese1962 : diocese1969,
		year,
		month,
		day,
		iso,
		todayIso,
		day1: entry,
		session: locals.session ?? (await locals.auth())
	};
};
