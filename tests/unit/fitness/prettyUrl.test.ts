import { describe, it, expect } from 'vitest';
import { slugify, extractId, isQueuedId, sessionParam, sharedRunParam, segmentParam } from '$lib/fitness/prettyUrl';

const OID = '507f1f77bcf86cd799439011';

describe('slugify', () => {
	it('lowercases and dashes', () => {
		expect(slugify('Push Day')).toBe('push-day');
	});

	it('folds German accents and eszett rather than dropping them', () => {
		expect(slugify('Rücken-Tag')).toBe('rucken-tag');
		expect(slugify('Straße')).toBe('strasse'); // ß-ok: a workout name may contain one
		expect(slugify('Übung Für Beine')).toBe('ubung-fur-beine');
	});

	it('collapses runs of punctuation and trims the edges', () => {
		expect(slugify('  Leg / Day!!  ')).toBe('leg-day');
		expect(slugify('A -- B')).toBe('a-b');
		expect(slugify('***')).toBe('');
	});

	it('drops non-latin scripts rather than emitting raw bytes', () => {
		expect(slugify('Тренировка')).toBe('');
		expect(slugify('Run 🏃 5k')).toBe('run-5k');
	});
});

describe('extractId', () => {
	it('reads the id off the end of a slugged param', () => {
		expect(extractId(`monday-push-day-${OID}`)).toBe(OID);
		expect(extractId(`lakeside-sprint-${OID}`)).toBe(OID);
	});

	it('passes a bare id through — the URL-healing entry point', () => {
		expect(extractId(OID)).toBe(OID);
	});

	it('ignores the slug entirely, so a stale or wrong one still resolves', () => {
		// The workout was renamed, or someone hand-edited the URL.
		expect(extractId(`totally-wrong-name-${OID}`)).toBe(OID);
		expect(extractId(`friday-leg-day-${OID}`)).toBe(OID);
	});

	it('leaves queued ids alone — they are local-only and never slugged', () => {
		expect(extractId('queued-12')).toBe('queued-12');
		expect(extractId('queued-0')).toBe('queued-0');
	});

	it('is not fooled by hex-looking words in the slug', () => {
		// 'decade' is hex-ish but the anchored 24-char match can only take the tail.
		expect(extractId(`decade-beef-cafe-${OID}`)).toBe(OID);
	});

	it('returns garbage unchanged so the caller 404s instead of guessing', () => {
		expect(extractId('not-an-id')).toBe('not-an-id');
		expect(extractId('')).toBe('');
	});
});

describe('isQueuedId', () => {
	it('identifies offline-queued runs', () => {
		expect(isQueuedId('queued-3')).toBe(true);
		expect(isQueuedId(OID)).toBe(false);
		expect(isQueuedId(`monday-push-day-${OID}`)).toBe(false);
	});
});

describe('sessionParam', () => {
	// 2026-07-13T10:00:00Z is a Monday.
	const monday = '2026-07-13T10:00:00.000Z';

	it('builds weekday + name + id', () => {
		expect(sessionParam({ _id: OID, name: 'Push Day', startTime: monday }, 'en'))
			.toBe(`monday-push-day-${OID}`);
	});

	it('localises the weekday', () => {
		expect(sessionParam({ _id: OID, name: 'Push Day', startTime: monday }, 'de'))
			.toBe(`montag-push-day-${OID}`);
	});

	it('round-trips through extractId', () => {
		const param = sessionParam({ _id: OID, name: 'Rücken & Bizeps', startTime: monday }, 'de');
		expect(param).toBe(`montag-rucken-bizeps-${OID}`);
		expect(extractId(param)).toBe(OID);
	});

	it('falls back to the bare id when there is nothing to slug', () => {
		expect(sessionParam({ _id: OID, name: '***', startTime: monday }, 'en')).toBe(`monday-${OID}`);
		expect(sessionParam({ _id: OID }, 'en')).toBe(OID);
		expect(sessionParam({ _id: OID, name: '', startTime: '' }, 'en')).toBe(OID);
	});

	it('never slugs a queued run', () => {
		expect(sessionParam({ _id: 'queued-7', name: 'Push Day', startTime: monday }, 'en')).toBe('queued-7');
	});

	it('survives an unparseable start time', () => {
		expect(sessionParam({ _id: OID, name: 'Push Day', startTime: 'nonsense' }, 'en')).toBe(`push-day-${OID}`);
	});

	it('names the weekday in UTC, not the runtime local zone', () => {
		// The slug is built in two places that run in different zones — the browser
		// when rendering a link, the server when deciding whether to heal. Anchoring
		// to UTC is what keeps those byte-identical; a local-time weekday would
		// disagree across that boundary and bounce users through a redirect per
		// click. The trade-off: 23:30Z Monday is already Tuesday in CEST but still
		// slugs as "monday".
		expect(sessionParam({ _id: OID, name: 'Late', startTime: '2026-07-13T23:30:00.000Z' }, 'en'))
			.toBe(`monday-late-${OID}`);
		// ...and 00:30Z Tuesday is still Monday evening in New York, yet slugs Tuesday.
		expect(sessionParam({ _id: OID, name: 'Late', startTime: '2026-07-14T00:30:00.000Z' }, 'en'))
			.toBe(`tuesday-late-${OID}`);
	});
});

describe('sharedRunParam', () => {
	const monday = '2026-07-13T10:00:00.000Z';
	const session = { _id: OID, name: 'Morning Run', startTime: monday };

	it('leads with the owner so a share link names who recorded it', () => {
		expect(sharedRunParam(session, 'Alex', 'en')).toBe(`alex-monday-morning-run-${OID}`);
	});

	it('slugifies an awkward username', () => {
		expect(sharedRunParam(session, 'Anna M\u00fcller', 'de')).toBe(`anna-muller-montag-morning-run-${OID}`);
	});

	it('falls back to the plain session slug when there is no owner', () => {
		expect(sharedRunParam(session, undefined, 'en')).toBe(`monday-morning-run-${OID}`);
		expect(sharedRunParam(session, '', 'en')).toBe(`monday-morning-run-${OID}`);
		// A username that slugs away to nothing must not leave a stray leading dash.
		expect(sharedRunParam(session, '\ud83d\ude42', 'en')).toBe(`monday-morning-run-${OID}`);
	});

	it('round-trips through extractId like any other param', () => {
		expect(extractId(sharedRunParam(session, 'Alex', 'en'))).toBe(OID);
	});

	it('never leaks the owner into the private history URL', () => {
		// sharedRunParam and sessionParam are separate functions precisely so the
		// logged-in URL cannot grow a username by accident. Pin that they stay apart.
		expect(sessionParam(session, 'en')).toBe(`monday-morning-run-${OID}`);
		expect(sessionParam(session, 'en')).not.toContain('alex');
	});
});

describe('segmentParam', () => {
	it('builds name + id', () => {
		expect(segmentParam({ _id: OID, name: 'Lakeside Sprint' })).toBe(`lakeside-sprint-${OID}`);
	});

	it('round-trips through extractId', () => {
		expect(extractId(segmentParam({ _id: OID, name: 'Zürichberg Climb' }))).toBe(OID);
	});

	it('falls back to the bare id when the name slugs to nothing', () => {
		expect(segmentParam({ _id: OID, name: '🏔️' })).toBe(OID);
		expect(segmentParam({ _id: OID })).toBe(OID);
	});
});
