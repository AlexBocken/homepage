// Public ICS feed for the Catholic liturgical calendar (Vetus Ordo / 1962 and
// Novus Ordo / 1969), customizable per region (diocese) and language. No auth —
// these are public calendars. Reuses the generic RFC 5545 builder in ics.ts and
// the romcal-backed engine in liturgicalCalendar.ts.

import { getYear, getYear1962 } from './liturgicalCalendar';
import { feastICSEvents } from './feastEvents';
import { buildICS, icsHeaders } from './ics';
import {
	feastCalendarName,
	type CalendarLang,
	type Diocese1962,
	type Diocese1969,
	type Rite
} from '../../routes/[faithLang=faithLang]/[calendar=calendarLang]/calendarI18n';

const DESC: Record<CalendarLang, string> = {
	en: 'Feasts, solemnities, memorials and Sundays of the Roman liturgical calendar.',
	de: 'Feste, Hochfeste, Gedenktage und Sonntage des römischen liturgischen Kalenders.',
	la: 'Festa, sollemnitates, memoriae et dominicae calendarii liturgici Romani.'
};

// One colour for the whole calendar (per-event liturgical colours ride along via
// the RFC 7986 COLOR property on each VEVENT).
const CAL_COLOR = '#BF8C3C';

interface FeastFeedArgs {
	rite: Rite;
	diocese: Diocese1962 | Diocese1969;
	lang: CalendarLang;
}

export async function serveFeastICS({ rite, diocese, lang }: FeastFeedArgs): Promise<Response> {
	// Current + next civil year, so movable feasts stay correct across the rollover.
	const thisYear = new Date().getUTCFullYear();
	const years = [thisYear, thisYear + 1];

	const maps = await Promise.all(
		years.map((y) =>
			rite === 'vetus'
				? getYear1962(lang, diocese as Diocese1962, y)
				: getYear(lang, diocese as Diocese1969, y)
		)
	);
	const days = maps
		.flatMap((m) => [...m.values()])
		.sort((a, b) => a.iso.localeCompare(b.iso));

	const events = feastICSEvents(days, rite, diocese, lang);
	const name = feastCalendarName(rite, diocese, lang);
	const ics = buildICS({
		name,
		description: DESC[lang],
		color: CAL_COLOR,
		refreshInterval: 'P1W',
		events
	});

	return new Response(ics, { headers: icsHeaders(`${name}.ics`) });
}
