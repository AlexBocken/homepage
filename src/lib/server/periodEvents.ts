// Turn a user's logged periods into calendar events: the logged bleeds plus the
// projected cycles (period, fertile window, ovulation, luteal phase). Used by the
// period-tracker ICS subscription feed.

import { projectCycles, type PeriodInput } from '$lib/js/cycleProjection';
import type { ICSEvent } from './ics';

const uidNs = '@bocken.org';
const iso = (d: Date) => d.toISOString().slice(0, 10);

export type IcsLang = 'en' | 'de';

interface Labels {
	period: string;
	periodOngoing: string;
	periodPredicted: string;
	fertile: string;
	ovulation: string;
	luteal: string;
	// Retrospective estimates for already-completed cycles (no "(predicted)" suffix).
	fertilePast: string;
	ovulationPast: string;
	lutealPast: string;
	cat: { prediction: string; estimate: string; period: string; fertility: string; ovulation: string; luteal: string };
}

const LABELS: Record<IcsLang, Labels> = {
	de: {
		period: 'Periode',
		periodOngoing: 'Periode (laufend)',
		periodPredicted: 'Periode (Vorhersage)',
		fertile: 'Fruchtbares Fenster (Vorhersage)',
		ovulation: 'Eisprung (Vorhersage)',
		luteal: 'Lutealphase (Vorhersage)',
		fertilePast: 'Fruchtbares Fenster (Schätzung)',
		ovulationPast: 'Eisprung (Schätzung)',
		lutealPast: 'Lutealphase (Schätzung)',
		cat: { prediction: 'Vorhersage', estimate: 'Schätzung', period: 'Periode', fertility: 'Fruchtbarkeit', ovulation: 'Eisprung', luteal: 'Lutealphase' }
	},
	en: {
		period: 'Period',
		periodOngoing: 'Period (ongoing)',
		periodPredicted: 'Period (predicted)',
		fertile: 'Fertile window (predicted)',
		ovulation: 'Ovulation (predicted)',
		luteal: 'Luteal phase (predicted)',
		fertilePast: 'Fertile window (estimated)',
		ovulationPast: 'Ovulation (estimated)',
		lutealPast: 'Luteal phase (estimated)',
		cat: { prediction: 'Prediction', estimate: 'Estimate', period: 'Period', fertility: 'Fertility', ovulation: 'Ovulation', luteal: 'Luteal phase' }
	}
};

// Per-event colours (RFC 7986 COLOR). Must be CSS3 colour names — clients that
// support COLOR map the name; others fall back to the calendar-level colour.
const COLOR = {
	period: 'red',
	fertile: 'royalblue',
	ovulation: 'navy', // the peak day within the (blue) fertile window
	luteal: 'peru' // muted caramel/orange-brown (softer than chocolate)
} as const;

/** Build the ICS event list for a user's period calendar. */
export function periodICSEvents(periods: PeriodInput[], lang: IcsLang = 'de'): ICSEvent[] {
	const L = LABELS[lang];
	const proj = projectCycles(periods); // UTC day-snapping (timezone-free all-day events)
	const events: ICSEvent[] = [];

	// Logged bleeds.
	for (const p of periods) {
		const start = new Date(p.startDate);
		if (p.endDate) {
			events.push({
				uid: `period-${iso(start)}${uidNs}`,
				summary: L.period,
				start,
				end: new Date(p.endDate),
				categories: [L.cat.period],
				color: COLOR.period
			});
		} else {
			// Ongoing: extend to the predicted end so the event isn't a single day.
			events.push({
				uid: `period-${iso(start)}${uidNs}`,
				summary: L.periodOngoing,
				start,
				end: proj.predictedEndOfOngoing ?? start,
				categories: [L.cat.period],
				color: COLOR.period
			});
		}
	}

	// Projected cycles. A 24h-before reminder on each predicted event.
	const reminder = { trigger: '-P1D' };
	for (const c of proj.futureCycles) {
		const key = iso(c.start);
		events.push({
			uid: `pred-period-${key}${uidNs}`,
			summary: L.periodPredicted,
			start: c.start,
			end: c.end,
			categories: [L.cat.prediction, L.cat.period],
			color: COLOR.period,
			alarm: reminder
		});
		events.push({
			uid: `fertile-${key}${uidNs}`,
			summary: L.fertile,
			start: c.fertileStart,
			end: c.fertileEnd,
			categories: [L.cat.prediction, L.cat.fertility],
			color: COLOR.fertile,
			alarm: reminder
		});
		events.push({
			uid: `ovulation-${key}${uidNs}`,
			summary: L.ovulation,
			start: c.ovulation,
			categories: [L.cat.prediction, L.cat.ovulation],
			color: COLOR.ovulation,
			alarm: reminder
		});
		events.push({
			uid: `luteal-${key}${uidNs}`,
			summary: L.luteal,
			start: c.lutealStart,
			end: c.lutealEnd,
			categories: [L.cat.prediction, L.cat.luteal],
			color: COLOR.luteal,
			alarm: reminder
		});
	}

	// Retrospective estimates for completed cycles: fertile window, ovulation and
	// luteal phase derived from the logged periods around each past cycle.
	for (const w of proj.pastFertileWindows) {
		const key = iso(w.fertileStart);
		events.push({
			uid: `past-fertile-${key}${uidNs}`,
			summary: L.fertilePast,
			start: w.fertileStart,
			end: w.fertileEnd,
			categories: [L.cat.estimate, L.cat.fertility],
			color: COLOR.fertile
		});
		events.push({
			uid: `past-ovulation-${key}${uidNs}`,
			summary: L.ovulationPast,
			start: w.ovulation,
			categories: [L.cat.estimate, L.cat.ovulation],
			color: COLOR.ovulation
		});
		events.push({
			uid: `past-luteal-${key}${uidNs}`,
			summary: L.lutealPast,
			start: w.lutealStart,
			end: w.lutealEnd,
			categories: [L.cat.estimate, L.cat.luteal],
			color: COLOR.luteal
		});
	}

	return events;
}
