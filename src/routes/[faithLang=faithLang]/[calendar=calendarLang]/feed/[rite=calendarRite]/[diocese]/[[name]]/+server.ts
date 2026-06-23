import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { serveFeastICS } from '$lib/server/feastIcsFeed';
import {
	expectedSlug,
	isDiocese1962,
	isDiocese1969,
	type CalendarLang,
	type Rite
} from '../../../../calendarI18n';

// Public liturgical-calendar ICS feed, one per rite + region + language. The
// optional [[name]] segment is a cosmetic .ics filename so calendar apps show a
// sensible name (they name the calendar after the URL's last path segment):
//   /faith/calendar/feed/vetus/chur/Vetus Ordo - Diocese of Chur.ics
//   /glaube/kalender/feed/novus/general/Novus Ordo - ....ics
export const GET: RequestHandler = async ({ params }) => {
	// Language comes from the faith-prefix (faith=en / glaube=de / fides=la); the
	// calendar word must match that prefix's slug.
	if (params.calendar !== expectedSlug(params.faithLang)) error(404, 'Not found');
	const lang: CalendarLang =
		params.faithLang === 'faith' ? 'en' : params.faithLang === 'fides' ? 'la' : 'de';

	const rite: Rite = params.rite === 'novus' || params.rite === '1969' ? 'novus' : 'vetus';
	const diocese = params.diocese; // [[name]] is cosmetic and ignored

	if (rite === 'vetus') {
		if (!isDiocese1962(diocese)) error(404, 'Unknown diocese');
		return serveFeastICS({ rite, diocese, lang });
	}
	if (!isDiocese1969(diocese)) error(404, 'Unknown diocese');
	return serveFeastICS({ rite, diocese, lang });
};
