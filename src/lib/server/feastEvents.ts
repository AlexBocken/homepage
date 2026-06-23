// Turn computed liturgical days into calendar events for the feast-day ICS feed.
// Only "named" celebrations become events — plain ferial weekdays are skipped —
// so the subscription stays a feast calendar rather than a per-day log.

import type { CalendarDay } from '$lib/calendarTypes';
import type { ICSEvent } from './ics';
import type { CalendarLang, Rite } from '../../routes/[faithLang=faithLang]/[calendar=calendarLang]/calendarI18n';
import { rankDotSize } from '../../routes/[faithLang=faithLang]/[calendar=calendarLang]/calendarColors';

// Liturgical colour key → CSS3 colour name for the per-event RFC 7986 COLOR.
const CSS_COLOR: Record<string, string> = {
	WHITE: 'white',
	RED: 'red',
	GREEN: 'green',
	PURPLE: 'purple',
	ROSE: 'pink',
	BLACK: 'black',
	GOLD: 'gold'
};

const COMMEM_LABEL: Record<CalendarLang, string> = {
	en: 'Commemorations',
	de: 'Kommemorationen',
	la: 'Commemorationes'
};

/**
 * A day is "named" when it carries a real celebration:
 *  - 1962: anything that isn't a plain temporal feria (4th-class tempora).
 *    Keeps Class I–III, Sundays, vigils/ember days, and 4th-class saints.
 *  - 1969: any rank above a ferial weekday (reuses the ring's dot filter).
 */
function isNamed(d: CalendarDay): boolean {
	if (d.rite1962) return !(d.rite1962.kind === 'tempora' && d.rite1962.class === 4);
	return rankDotSize(d.rank) !== 0;
}

/** Build the ICS event list for a rite/diocese liturgical calendar. */
export function feastICSEvents(
	days: CalendarDay[],
	rite: Rite,
	diocese: string,
	lang: CalendarLang
): ICSEvent[] {
	const events: ICSEvent[] = [];
	for (const d of days) {
		if (!isNamed(d)) continue;

		const detail = [d.rankName, d.seasonNames[0], d.colorNames[0]].filter(Boolean);
		let description = detail.join(' • ');
		const commems = d.rite1962?.commemorations;
		if (commems?.length) {
			description += `\n${COMMEM_LABEL[lang]}: ${commems.map((c) => c.name).join('; ')}`;
		}

		events.push({
			// Stable per rite+diocese so subscriptions don't collide on import.
			uid: `feast-${d.iso}-${rite}-${diocese}@bocken.org`,
			summary: d.name,
			start: new Date(`${d.iso}T00:00:00Z`),
			allDay: true,
			description,
			categories: detail,
			color: CSS_COLOR[d.colorKeys[0]]
		});
	}
	return events;
}
