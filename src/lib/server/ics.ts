// iCalendar (RFC 5545) builder — shared by the period-tracker subscription feed
// and the liturgical feast calendars. Knows nothing about either domain: callers
// turn their data into ICSEvent[] and hand it here for formatting.

export interface ICSEvent {
	/** Stable unique id. Same uid across refreshes = same event (updates in place). */
	uid: string;
	summary: string;
	/** Event start. For all-day events only the calendar date is used. */
	start: Date;
	/**
	 * Event end. For all-day events this is the INCLUSIVE last day — the helper
	 * emits the exclusive DTEND (last day + 1) that iCal expects. Omit for a
	 * single all-day or zero-length event.
	 */
	end?: Date;
	/** All-day (VALUE=DATE) vs. a timestamped event. Defaults to all-day. */
	allDay?: boolean;
	description?: string;
	/** Optional categories (e.g. ['Period'] / ['Feast']). */
	categories?: string[];
	/**
	 * Optional display reminder. `trigger` is an RFC 5545 duration relative to the
	 * start, e.g. '-P1D' (one day before) or '-PT24H'. Defaults description to the
	 * event summary.
	 */
	alarm?: { trigger: string; description?: string };
}

export interface ICSCalendar {
	/** X-WR-CALNAME — the name calendar apps show for the subscription. */
	name: string;
	description?: string;
	/** PRODID. Defaults to a Bocken identifier. */
	prodId?: string;
	/** X-APPLE-CALENDAR-COLOR, e.g. '#BF616A'. */
	color?: string;
	/** Suggested refresh cadence, ISO-8601 duration (e.g. 'PT12H'). */
	refreshInterval?: string;
	events: ICSEvent[];
	/** DTSTAMP for every event; defaults to now. Pass for deterministic output. */
	dtstamp?: Date;
}

const CRLF = '\r\n';
const DEFAULT_PRODID = '-//bocken.org//calendar//EN';

/** Escape TEXT-type values per RFC 5545 §3.3.11. */
function esc(text: string): string {
	return String(text)
		.replace(/\\/g, '\\\\')
		.replace(/;/g, '\\;')
		.replace(/,/g, '\\,')
		.replace(/\r?\n/g, '\\n');
}

/** Fold a content line to ≤75 octets, continuations prefixed with a space. */
function fold(line: string): string {
	const enc = new TextEncoder();
	if (enc.encode(line).length <= 75) return line;
	const out: string[] = [];
	let cur = '';
	let curBytes = 0;
	for (const ch of line) {
		const chBytes = enc.encode(ch).length;
		// Leave room for the leading space on continuation lines (limit 74).
		if (curBytes + chBytes > 74) {
			out.push(cur);
			cur = ' ';
			curBytes = 1;
		}
		cur += ch;
		curBytes += chBytes;
	}
	out.push(cur);
	return out.join(CRLF);
}

/** UTC timestamp: YYYYMMDDTHHMMSSZ. */
function dtUTC(d: Date): string {
	return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

/** Calendar date (UTC components): YYYYMMDD. */
function dateOnly(d: Date): string {
	const y = d.getUTCFullYear();
	const m = String(d.getUTCMonth() + 1).padStart(2, '0');
	const day = String(d.getUTCDate()).padStart(2, '0');
	return `${y}${m}${day}`;
}

function addDaysUTC(d: Date, days: number): Date {
	return new Date(d.getTime() + days * 86400000);
}

/** Render a single VEVENT block as an array of (unfolded) content lines. */
function vevent(ev: ICSEvent, stamp: string): string[] {
	const lines = ['BEGIN:VEVENT', `UID:${ev.uid}`, `DTSTAMP:${stamp}`];
	if (ev.allDay === false) {
		lines.push(`DTSTART:${dtUTC(ev.start)}`);
		if (ev.end) lines.push(`DTEND:${dtUTC(ev.end)}`);
	} else {
		lines.push(`DTSTART;VALUE=DATE:${dateOnly(ev.start)}`);
		// All-day DTEND is exclusive — the day after the last included day.
		const lastDay = ev.end ?? ev.start;
		lines.push(`DTEND;VALUE=DATE:${dateOnly(addDaysUTC(lastDay, 1))}`);
	}
	lines.push(`SUMMARY:${esc(ev.summary)}`);
	if (ev.description) lines.push(`DESCRIPTION:${esc(ev.description)}`);
	if (ev.categories?.length) lines.push(`CATEGORIES:${ev.categories.map(esc).join(',')}`);
	if (ev.alarm) {
		lines.push(
			'BEGIN:VALARM',
			'ACTION:DISPLAY',
			`DESCRIPTION:${esc(ev.alarm.description ?? ev.summary)}`,
			`TRIGGER:${ev.alarm.trigger}`,
			'END:VALARM'
		);
	}
	lines.push('END:VEVENT');
	return lines;
}

/** Build a complete VCALENDAR document (CRLF line endings, folded). */
export function buildICS(cal: ICSCalendar): string {
	const stamp = dtUTC(cal.dtstamp ?? new Date());
	const lines: string[] = [
		'BEGIN:VCALENDAR',
		'VERSION:2.0',
		`PRODID:${cal.prodId ?? DEFAULT_PRODID}`,
		'CALSCALE:GREGORIAN',
		'METHOD:PUBLISH',
		`X-WR-CALNAME:${esc(cal.name)}`
	];
	if (cal.description) lines.push(`X-WR-CALDESC:${esc(cal.description)}`);
	if (cal.color) lines.push(`X-APPLE-CALENDAR-COLOR:${cal.color}`);
	if (cal.refreshInterval) {
		lines.push(`REFRESH-INTERVAL;VALUE=DURATION:${cal.refreshInterval}`);
		lines.push(`X-PUBLISHED-TTL:${cal.refreshInterval}`);
	}
	for (const ev of cal.events) lines.push(...vevent(ev, stamp));
	lines.push('END:VCALENDAR');
	return lines.map(fold).join(CRLF) + CRLF;
}

/** Standard headers for an ICS HTTP response. */
export function icsHeaders(filename: string): Record<string, string> {
	return {
		'Content-Type': 'text/calendar; charset=utf-8',
		'Content-Disposition': `inline; filename="${filename}"`,
		'Cache-Control': 'public, max-age=3600'
	};
}
