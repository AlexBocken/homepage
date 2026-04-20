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

	const rite: Rite = params.rite === '1969' ? '1969' : '1962';

	const dioceseParam = url.searchParams.get('diocese');
	const diocese1962: Diocese1962 = isDiocese1962(dioceseParam)
		? dioceseParam
		: DEFAULT_DIOCESE_1962;
	const diocese1969: Diocese1969 = isDiocese1969(dioceseParam)
		? dioceseParam
		: DEFAULT_DIOCESE_1969;

	const minYear = rite === '1962' ? 1900 : 1969;
	const year = Number(params.yyyy);
	const month = Number(params.mm) - 1;
	const day = Number(params.dd);

	if (!Number.isFinite(year) || year < minYear || year > 2100) await errorWithVerse(fetch, url.pathname, 404, 'Not found');
	if (!Number.isFinite(month) || month < 0 || month > 11) await errorWithVerse(fetch, url.pathname, 404, 'Not found');
	const daysInMonth = new Date(year, month + 1, 0).getDate();
	if (!Number.isFinite(day) || day < 1 || day > daysInMonth) await errorWithVerse(fetch, url.pathname, 404, 'Not found');

	const iso = isoFor(year, month, day);
	const yearMap =
		rite === '1962'
			? await getYear1962(lang, diocese1962, year)
			: await getYear(lang, diocese1969, year);
	const entry = yearMap.get(iso);
	if (!entry) await errorWithVerse(fetch, url.pathname, 404, 'Not found');

	const today = new Date();
	const todayIso = today.toISOString().slice(0, 10);

	return {
		lang,
		rite,
		diocese: rite === '1962' ? diocese1962 : diocese1969,
		year,
		month,
		day,
		iso,
		todayIso,
		day1: entry,
		session: locals.session ?? (await locals.auth())
	};
};
