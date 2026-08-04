/**
 * Human-readable URLs for history and segment detail pages.
 *
 * A detail URL is a cosmetic slug followed by the real id:
 *   /fitness/history/monday-push-day-507f1f77bcf86cd799439011
 *   /fitness/segments/lakeside-sprint-507f1f77bcf86cd799439011
 *
 * The id is the only load-bearing part. The slug is decoration and is never
 * trusted, parsed for meaning, or required — `extractId` reads the id straight
 * off the end, so a bare id, a stale slug (the workout was renamed), or a
 * hand-mangled one all resolve to the same page. The server then heals the URL by
 * redirecting to the canonical form, which is what makes the slug optional
 * everywhere: callers that only hold an id (the stats page, best-effort links)
 * can keep linking with a bare id and still land on a pretty URL.
 */

import type { FitnessLang } from '$lib/js/fitnessI18n';

/** Mongo ObjectId: 24 hex chars, and — unlike a UUID — never contains a dash. */
const OBJECT_ID_RE = /[0-9a-f]{24}$/i;

/** Offline-queued runs live only in the browser's IndexedDB under this prefix. */
const QUEUED_PREFIX = 'queued-';

/**
 * Lowercase, de-accented, dash-separated. Keeps ASCII letters and digits only, so
 * the result is always URL-safe and can never introduce a trailing run of hex that
 * `extractId` might mistake for the id.
 */
export function slugify(input: string): string {
	return input
		.normalize('NFKD')
		.replace(/[\u0300-\u036f]/g, '') // strip the combining marks NFKD split off
		.replace(/ß/g, 'ss') // ß-ok: folds user-entered names, which we don't control
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
}

/**
 * Read the real id out of a route param that may or may not carry a slug prefix.
 *
 * Queued ids (`queued-12`) are local-only and never slugged, so they pass through
 * untouched. Anything else yields the trailing ObjectId; a param with no ObjectId
 * is returned as-is so the caller's lookup 404s normally rather than here.
 */
export function extractId(param: string): string {
	if (param.startsWith(QUEUED_PREFIX)) return param;
	return OBJECT_ID_RE.exec(param)?.[0] ?? param;
}

/** True for an offline-queued run, which has no server-side record to slug. */
export function isQueuedId(param: string): boolean {
	return param.startsWith(QUEUED_PREFIX);
}

/**
 * The weekday a session started, lowercased and localised.
 *
 * Deliberately computed in UTC. The slug has to be byte-identical wherever it is
 * built — the client when rendering a link, the server when deciding whether to
 * heal — and those two run in different timezones (browser local vs. a container
 * that is usually UTC). A local-time weekday would disagree across that boundary
 * for late-evening workouts and bounce the user through a redirect on every click.
 * The cost is that a workout logged just after local midnight can name the
 * previous day; the slug is decoration, so that is the cheaper mistake.
 */
function weekdaySlug(startTime: string | Date, lang: FitnessLang): string {
	const d = new Date(startTime);
	if (isNaN(d.getTime())) return '';
	const locale = lang === 'de' ? 'de-DE' : 'en-US';
	return slugify(d.toLocaleDateString(locale, { weekday: 'long', timeZone: 'UTC' }));
}

/**
 * Canonical route param for a workout session: `monday-push-day-<id>`.
 * Falls back to the bare id when there is nothing worth slugging.
 */
export function sessionParam(
	session: { _id: string; name?: string; startTime?: string | Date },
	lang: FitnessLang
): string {
	const id = String(session._id);
	if (isQueuedId(id)) return id;
	const parts = [
		session.startTime ? weekdaySlug(session.startTime, lang) : '',
		session.name ? slugify(session.name) : ''
	].filter(Boolean);
	const slug = parts.join('-');
	return slug ? `${slug}-${id}` : id;
}

/**
 * Canonical route param for a public share link: `alex-monday-push-day-<id>`.
 *
 * Unlike the logged-in history URL this leads with the owner's username, so the
 * link names who recorded the run before it is even opened. That is a deliberate
 * choice for shared runs — the owner is the one handing the link out — but it is
 * the reason this is a separate function from `sessionParam` rather than a flag:
 * the two have different audiences, and the private one must never grow a
 * username by accident.
 */
export function sharedRunParam(
	session: { _id: string; name?: string; startTime?: string | Date },
	owner: string | undefined,
	lang: FitnessLang
): string {
	const base = sessionParam(session, lang);
	const who = owner ? slugify(owner) : '';
	return who ? `${who}-${base}` : base;
}

/** `name-slug-<id>`, or the bare id when there is nothing worth slugging. */
function namedParam(doc: { _id: string; name?: string }): string {
	const id = String(doc._id);
	const slug = doc.name ? slugify(doc.name) : '';
	return slug ? `${slug}-${id}` : id;
}

/** Canonical route param for a segment: `lakeside-sprint-<id>`. */
export function segmentParam(segment: { _id: string; name?: string }): string {
	return namedParam(segment);
}

/** Canonical route param for a workout template: `tuesday-tempo-<id>`. */
export function templateParam(template: { _id: string; name?: string }): string {
	return namedParam(template);
}
