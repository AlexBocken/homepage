/**
 * Precompute public-transport travel times from the eleven hubs to every hike.
 *
 * Why precompute at all: the honest answer to "how far away is this hike?" is a
 * timetable query, and there is no version of that which a listing page can do
 * per visitor. So the country is reduced to eleven departure hubs (`$lib/hikes/hubs`),
 * the leg from each hub to each trailhead is fetched once, here, and the
 * reader's own leg to their hub is a flat `Hub.accessMin`.
 *
 * Endpoints come from the hike's own `<JourneyPlanner>` tags in `index.svx` —
 * not from the GPX. The author already wrote down which stop they meant
 * ("Maschgenkamm", a cable-car station, not the nearest bus stop) *and* at what
 * time of day; both change the answer. Hikes with no planner fall back to the
 * nearest stop to the track's first/last point at a default hour.
 *
 * For each hub × endpoint we ask `/v1/connections` for the same handful of
 * options `JourneyPlanner` shows the reader, and keep the shortest.
 *
 * Not part of `pnpm build`: it needs the network, and the timetable moves on a
 * seasonal cadence, not a per-deploy one. Run it by hand and commit the result:
 *
 *   pnpm hikes:travel              # warm cache, only fetches what's missing
 *   pnpm hikes:travel -- --refresh # ignore the cache, re-ask everything
 *   pnpm hikes:travel -- --slug=2026-mattstock
 *
 * Emits `static/hikes-travel.json` plus a tiny `hikeTravel.generated.ts` holding
 * its URL.
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { pathExists, runWithConcurrency, shortHash } from './lib/fsUtil.js';
import { parseGpxStages } from '../src/lib/server/gpx.js';
import { HUBS } from '../src/lib/hikes/hubs.js';
import type {
	HikeTravel,
	HikeTravelEndpoint,
	HikeTravelLeg,
	HikeTravelTable,
	HubId
} from '../src/types/hikes.js';

const ROOT = path.resolve(process.cwd());
const CONTENT_DIR = path.join(ROOT, 'src', 'content', 'hikes');
const CACHE_DIR = path.join(ROOT, 'scripts', '.cache');
const CACHE_FILE = path.join(CACHE_DIR, 'hikes-travel.json');
const STOP_CACHE_FILE = path.join(CACHE_DIR, 'hikes-travel-stops.json');
const SPEND_FILE = path.join(CACHE_DIR, 'hikes-travel-spend.json');
// The table itself is a static asset, fetched by the page like the track JSON —
// it grows as hubs × hikes and has no business in the JS bundle. The generated
// module next to it carries only the URL.
const DATA_OUT = path.join(ROOT, 'static', 'hikes-travel.json');
const URL_OUT = path.join(ROOT, 'src', 'lib', 'data', 'hikeTravel.generated.ts');

const API = 'https://transport.opendata.ch/v1';

/** How many options to ask for per leg — the same order of magnitude
 * `JourneyPlanner` lists, so "shortest" is picked from a comparable set. */
const CONNECTION_LIMIT = 6;

/** More for a leg with an arrival deadline: the search starts at dawn, so the
 * window has to reach far enough into the morning to contain the connection
 * anyone would actually take. */
const ARRIVAL_SEARCH_LIMIT = 10;

// ---------------------------------------------------------------------------
// Rate limits — read this before changing anything below.
//
// transport.opendata.ch publishes no limits of its own; it is a facade over
// search.ch, and defers to https://search.ch/timetable/api/help, which says:
//
//     Die Anzahl täglicher Anfragen ist limitiert auf 1000 Routensuchen
//     und 10080 Abfahrtstabellen.
//
// So: **1000 route searches per day**. Every leg here is one route search, and
// one full rebuild at eleven hubs is ~330 of them — a third of the day's
// allowance in a single run. Three careless runs and the quota is gone.
//
// There is also an undocumented burst guard on top of the daily quota: a fast
// sequence comes back as `Too many requests this minute`. The interval below
// is set against that; the budget above it is set against the daily quota.
//
// Two rules follow, and the code enforces both:
//   1. Never fetch a leg the cache can answer (hence the disk cache, and why
//      `--refresh` should be a deliberate decision, not a habit).
//   2. Stop before the daily budget is spent, and say so, rather than letting
//      the endpoint be the thing that says no.
// ---------------------------------------------------------------------------

/** Route searches this script will spend in a day, of the documented 1000.
 * The headroom is for the site's own live `JourneyPlanner` calls, which come
 * from readers' browsers, not this script — but land on the same quota when
 * they share an IP with it. */
const DAILY_ROUTE_BUDGET = 700;

/**
 * Milliseconds between requests. Ten a minute: comfortably under the burst
 * guard (4.5 s survived several 180-leg runs untouched, so this has margin),
 * and slow enough that a runaway loop is obvious long before it is expensive.
 * Override with `--interval=<ms>` — upward, in practice.
 */
const DEFAULT_INTERVAL_MS = 6000;

/** After a 429, wait out the minute the limit is counted over. */
const RATE_LIMIT_COOLDOWN_MS = 65_000;
const MAX_ATTEMPTS = 5;

/** Fallback times for a hike with no `<JourneyPlanner>`: out in the morning,
 * back in the afternoon. Deliberately unambitious — a wrong guess here should
 * read as "roughly a Saturday", not as a schedule. */
const FALLBACK_OUT = { time: '09:00', target: 'arrival' as const };
const FALLBACK_BACK = { time: '16:00', target: 'departure' as const };

/**
 * Earliest departure counted as a way of getting to a hike.
 *
 * Asked to be in the Verzasca by 09:00, the timetable answers with a 00:26
 * departure and eight and a half hours, most of them spent waiting on platforms
 * in the dark. That is not the travel time to the hike, it is a night out — and
 * as an estimate it was the difference between "three hours away" and a number
 * that made the whole feature look broken. Nothing before this counts, so the
 * honest answer comes out instead: from Zurich you cannot be there by nine.
 */
const EARLIEST_DEPARTURE = '04:00';

// ---------------------------------------------------------------------------
// Hand-set legs
//
// The timetable is the authority right up until it isn't. A stop served by a
// seasonal minibus can answer "no connection" for a date outside its season
// even though the route is the obvious one on the ground, and the estimate then
// reads "unreachable" for a hike whose own report describes taking that bus.
//
// An override is a claim about the world that outlived a query, so each one
// says who made it and why. They are applied after fetching and are not cached:
// changing a number here takes effect on the next run without spending
// anything.
// ---------------------------------------------------------------------------

type Override = {
	slug: string;
	direction: 'toStart' | 'fromEnd';
	hub: HubId;
	durationMin: number;
	transfers: number;
	why: string;
};

const OVERRIDES: readonly Override[] = [
	{
		slug: '2024-flims-gletschermühlen',
		direction: 'toStart',
		hub: 'flims',
		durationMin: 25,
		transfers: 0,
		why: 'Bargis is a short Postauto ride from Flims, but the line runs only in season and the timetable returns nothing for the sampled Saturday.'
	}
];

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const REFRESH = args.includes('--refresh');
const ONLY_SLUG = args.find((a) => a.startsWith('--slug='))?.slice('--slug='.length) ?? null;
const INTERVAL_MS = Number(
	args.find((a) => a.startsWith('--interval='))?.slice('--interval='.length) ?? DEFAULT_INTERVAL_MS
);

// ---------------------------------------------------------------------------
// Sample date
//
// The upcoming Saturday. Hikes happen at the weekend and rural lines run a
// different (thinner) service then, so a weekday sample would flatter every
// Postauto valley. Stored in the output so a stale table is visible rather than
// merely old.
// ---------------------------------------------------------------------------

function pad2(n: number): string {
	return String(n).padStart(2, '0');
}

function nextSaturday(): string {
	const d = new Date();
	d.setHours(12, 0, 0, 0);
	do {
		d.setDate(d.getDate() + 1);
	} while (d.getDay() !== 6);
	return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

const SAMPLE_DATE = nextSaturday();

// ---------------------------------------------------------------------------
// `<JourneyPlanner>` extraction
//
// The tags are hand-written JSX-ish in `.svx`, and consistently shaped: the
// outbound one fixes its destination (`to="Wasserauen" toFixed`), the return
// one fixes its origin (`from="Hoher Kasten" fromFixed`). Attribute values
// appear quoted, unquoted (`target=departure`) and as bare booleans.
// ---------------------------------------------------------------------------

// `[\s\S]*?` up to the self-closing `/>`, not `[^>]*` — `from="<current
// location>"` puts a `>` inside a quoted value, and stopping at it truncates
// the tag just before the `to=` that matters.
const PLANNER_RE = /<JourneyPlanner\b([\s\S]*?)\/>/g;
const ATTR_RE = /([A-Za-z][A-Za-z0-9]*)(?:=(?:"([^"]*)"|'([^']*)'|\{([^}]*)\}|([^\s"'{}>]+)))?/g;

type PlannerTag = Record<string, string | true>;

function parsePlanners(source: string): PlannerTag[] {
	const out: PlannerTag[] = [];
	for (const m of source.matchAll(PLANNER_RE)) {
		const attrs: PlannerTag = {};
		for (const a of m[1].matchAll(ATTR_RE)) {
			const value = a[2] ?? a[3] ?? a[4] ?? a[5];
			attrs[a[1]] = value === undefined ? true : value;
		}
		out.push(attrs);
	}
	return out;
}

function attrString(tag: PlannerTag, key: string): string | null {
	const v = tag[key];
	return typeof v === 'string' && v.trim() ? v.trim() : null;
}

function targetOf(tag: PlannerTag, fallback: 'departure' | 'arrival'): 'departure' | 'arrival' {
	return attrString(tag, 'target') === 'arrival'
		? 'arrival'
		: attrString(tag, 'target') === 'departure'
			? 'departure'
			: fallback;
}

/** The trailhead and the way home, as the prose declares them. */
function endpointsFromPlanners(source: string): {
	start: HikeTravelEndpoint | null;
	end: HikeTravelEndpoint | null;
} {
	let start: HikeTravelEndpoint | null = null;
	let end: HikeTravelEndpoint | null = null;

	for (const tag of parsePlanners(source)) {
		if (!start && tag.toFixed) {
			const stop = attrString(tag, 'to');
			if (stop) {
				start = {
					stop,
					time: attrString(tag, 'time') ?? FALLBACK_OUT.time,
					target: targetOf(tag, 'arrival'),
					source: 'planner'
				};
			}
		}
		if (!end && tag.fromFixed) {
			const stop = attrString(tag, 'from');
			if (stop) {
				end = {
					stop,
					time: attrString(tag, 'time') ?? FALLBACK_BACK.time,
					target: targetOf(tag, 'departure'),
					source: 'planner'
				};
			}
		}
	}
	return { start, end };
}

// ---------------------------------------------------------------------------
// Timetable
// ---------------------------------------------------------------------------

type Connection = {
	duration?: string; // "00d01:23:00"
	transfers?: number;
	from?: { departure?: string | null };
	to?: { arrival?: string | null };
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** One request at a time, `INTERVAL_MS` apart, whoever asks. */
let apiChain: Promise<unknown> = Promise.resolve();
let lastRequestAt = 0;

function api(url: URL): Promise<unknown> {
	const run = apiChain.then(async () => {
		const since = Date.now() - lastRequestAt;
		if (since < INTERVAL_MS) await sleep(INTERVAL_MS - since);
		for (let attempt = 0; ; attempt++) {
			lastRequestAt = Date.now();
			const res = await fetch(url, {
				headers: { 'User-Agent': 'bocken.org hike travel-time build' }
			});
			if (res.status === 429 && attempt < MAX_ATTEMPTS - 1) {
				// The limit is counted per minute upstream, so backing off by
				// seconds only spends another request on the same refusal.
				console.warn(`[hike-travel] rate-limited, waiting ${RATE_LIMIT_COOLDOWN_MS / 1000}s`);
				await sleep(RATE_LIMIT_COOLDOWN_MS);
				continue;
			}
			if (!res.ok) throw new Error(`${url.pathname} → HTTP ${res.status}`);
			return res.json();
		}
	});
	// Keep the chain alive after a rejection, or one failed leg stalls the rest.
	apiChain = run.catch(() => undefined);
	return run;
}

/** "00d01:23:00" → 83. Days are in there because the API can answer with an
 * overnight journey, and a hike you reach tomorrow is worth not mistaking for
 * one you reach in 23 minutes. */
function durationToMinutes(raw: string | undefined): number | null {
	if (!raw) return null;
	const m = raw.match(/(?:(\d+)d)?(\d+):(\d+):(\d+)/);
	if (!m) return null;
	const days = Number(m[1] ?? 0);
	return days * 24 * 60 + Number(m[2]) * 60 + Number(m[3]);
}

function hhmm(iso: string | null | undefined): string {
	if (!iso) return '';
	// The API stamps local Swiss time with an offset; slicing the wall-clock
	// part avoids re-deriving it through the build machine's timezone.
	const m = iso.match(/T(\d{2}:\d{2})/);
	return m ? m[1] : '';
}

/** `2026-08-29T08:31` — date included, so a connection landing after midnight
 * doesn't compare as early. Sortable as a plain string. */
function stamp(iso: string | null | undefined): string | null {
	const m = iso?.match(/(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/);
	return m ? `${m[1]}T${m[2]}` : null;
}

/**
 * The shortest of the options the timetable offers, which is what a reader
 * comparing hikes actually wants: not "a connection exists" but "the best this
 * hub can do". Later departures that arrive sooner win, same as in the widget.
 *
 * The deadline is enforced here rather than trusted to the API. Asked to arrive
 * in Rovio by 09:00 from Flims, `/connections` answers with an evening arrival
 * instead of an empty list — it degrades to "here's what there is" — and taking
 * the shortest of *those* produced a confident four-hour estimate for a journey
 * that cannot be made that morning at all. A connection that misses the time
 * the hike is planned around is not a slower option, it's the wrong day out.
 */
function shortestLeg(
	connections: Connection[],
	deadline: string,
	target: 'departure' | 'arrival'
): HikeTravelLeg | null {
	let best: HikeTravelLeg | null = null;
	for (const c of connections) {
		const durationMin = durationToMinutes(c.duration);
		if (durationMin === null || durationMin <= 0) continue;
		const at = stamp(target === 'arrival' ? c.to?.arrival : c.from?.departure);
		if (!at) continue;
		// Same day, first. "Arrive in Rovio by 09:00" is answered with five
		// connections arriving the *evening before* — true, and a different
		// holiday. The shortest of those was three and a half hours; the first
		// one that gets you there on the morning of the hike is four.
		if (!at.startsWith(`${deadline.slice(0, 10)}T`)) continue;
		if (target === 'arrival' ? at > deadline : at < deadline) continue;
		const departure = stamp(c.from?.departure);
		if (!departure || departure < `${deadline.slice(0, 10)}T${EARLIEST_DEPARTURE}`) continue;
		if (best && durationMin >= best.durationMin) continue;
		best = {
			durationMin,
			transfers: typeof c.transfers === 'number' ? c.transfers : 0,
			departure: hhmm(c.from?.departure),
			arrival: hhmm(c.to?.arrival)
		};
	}
	return best;
}

/**
 * The name the timetable knows a stop by.
 *
 * The prose writes stops the way a person says them ("Bergbahn Eggberge"), and
 * `/connections` given a name it can't match answers with an empty list rather
 * than an error — a stop that reads fine in the widget silently becomes "not
 * reachable from anywhere". The widget itself doesn't hit this because its
 * typeahead resolves through `/locations` first; do the same here.
 */
async function canonicalStop(name: string, cache: StopCache): Promise<string> {
	const cached = cache[name];
	if (cached) return cached;

	// A qualifier the timetable doesn't use ("Bergbahn Eggberge" — it files the
	// mountain station as plain "Eggberge") matches nothing, so drop leading
	// words until something does. Trailing words are the specific half of a
	// Swiss stop name ("Amden, Dorf"), so they are never the ones to give up.
	let query = name;
	let resolved = name;
	while (query) {
		const u = new URL(`${API}/locations`);
		u.searchParams.set('type', 'station');
		u.searchParams.set('query', query);
		const json = (await api(u)) as { stations?: { name?: string; id?: string | number | null }[] };
		const stations = (json.stations ?? []).filter((s) => s.id != null && s.name?.trim());
		// Exact match first. Searching "Eggberge" ranks the valley bus stop
		// ("Altdorf UR, Eggberge/Moosbad") above the mountain station actually
		// called Eggberge, and taking the top hit would move the trailhead 1400
		// metres downhill.
		const hit = (
			stations.find((s) => s.name?.trim().toLowerCase() === query.toLowerCase()) ?? stations[0]
		)?.name?.trim();
		if (hit) {
			resolved = hit;
			break;
		}
		const space = query.indexOf(' ');
		if (space < 0) break;
		query = query.slice(space + 1);
	}

	if (resolved !== name) console.log(`[hike-travel] stop "${name}" → "${resolved}"`);
	cache[name] = resolved;
	return resolved;
}

async function nearestStop(lat: number, lng: number): Promise<string | null> {
	const u = new URL(`${API}/locations`);
	u.searchParams.set('type', 'station');
	u.searchParams.set('x', String(lat));
	u.searchParams.set('y', String(lng));
	const json = (await api(u)) as { stations?: { name?: string; id?: string | number | null }[] };
	// `type=station` still returns addresses ("Dorfstr. 20, Amden") alongside
	// real stops, distinguishable only by carrying no id. Feeding one of those
	// to /connections gets a walking route from a house number.
	return json.stations?.find((s) => s.id != null && s.name?.trim())?.name?.trim() ?? null;
}

/**
 * Both legs are asked for as *departure* searches, even the one with an arrival
 * deadline — `isArrivalTime=1` cannot be trusted for this.
 *
 * Asked for connections arriving in Valendas by 11:00, the API walks backwards
 * from the deadline and hands back six connections that all arrived the
 * *previous evening*, because it steps over the overnight gap without noticing
 * it has left the day. Take those at face value and the Surselva looks
 * unreachable from Zurich on a Saturday morning — when in fact the 07:07 gets
 * there at 09:12 in two hours flat, and a departure search from 04:00 finds it
 * immediately.
 *
 * So: ask what leaves after `EARLIEST_DEPARTURE`, keep what lands in time.
 */
async function fetchLeg(
	from: string,
	to: string,
	time: string,
	target: 'departure' | 'arrival'
): Promise<HikeTravelLeg | null> {
	const u = new URL(`${API}/connections`);
	u.searchParams.set('from', from);
	u.searchParams.set('to', to);
	// An arrival deadline needs a whole morning's worth of departures to choose
	// from; a return leg only needs the next few after the walk ends.
	u.searchParams.set(
		'limit',
		String(target === 'arrival' ? ARRIVAL_SEARCH_LIMIT : CONNECTION_LIMIT)
	);
	u.searchParams.set('date', SAMPLE_DATE);
	u.searchParams.set('time', target === 'arrival' ? EARLIEST_DEPARTURE : time);
	const json = (await api(u)) as { connections?: Connection[] };
	return shortestLeg(json.connections ?? [], `${SAMPLE_DATE}T${time}`, target);
}

// ---------------------------------------------------------------------------
// Daily route-search ledger
//
// The quota is per day and per IP, and it is spent across runs — so counting
// within a single run is not enough. This is a file, so a second invocation an
// hour later knows what the first one used.
//
// It is a courtesy counter, not a security boundary: delete the file and the
// script will happily spend again. The point is that the *endpoint* should
// never be the thing that tells us to stop.
// ---------------------------------------------------------------------------

type Spend = { day: string; routes: number };

/** Local calendar day. The quota presumably rolls at midnight in some
 * timezone; ours is close enough for a budget with headroom built in. */
function today(): string {
	const d = new Date();
	return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

async function loadSpend(): Promise<Spend> {
	try {
		const raw = JSON.parse(await fs.readFile(SPEND_FILE, 'utf-8')) as Spend;
		if (raw.day === today() && typeof raw.routes === 'number') return raw;
	} catch {
		// No ledger yet, or an unreadable one. Either way, today starts at zero.
	}
	return { day: today(), routes: 0 };
}

async function saveSpend(spend: Spend): Promise<void> {
	await fs.mkdir(CACHE_DIR, { recursive: true });
	await fs.writeFile(SPEND_FILE, JSON.stringify(spend));
}

// ---------------------------------------------------------------------------
// Disk cache
//
// Keyed by everything that changes the answer, sample date included — so a run
// a week later re-asks (timetables shift), while a run the same day after
// editing one hike's prose only fetches that hike.
// ---------------------------------------------------------------------------

type CacheEntry = { leg: HikeTravelLeg | null };
type Cache = Record<string, CacheEntry>;
/** Written stop name → the timetable's own spelling. Not keyed by date: stops
 * get renamed on a scale of years, not seasons. */
type StopCache = Record<string, string>;

/** Bumped when what we keep out of a response changes, so old entries don't
 * survive a rule they were never filtered by. */
const CACHE_VERSION = 5;

function cacheKey(from: string, to: string, time: string, target: string): string {
	return `v${CACHE_VERSION}|${SAMPLE_DATE}|${from}|${to}|${time}|${target}`;
}

async function loadCache(): Promise<Cache> {
	if (REFRESH) return {};
	try {
		return JSON.parse(await fs.readFile(CACHE_FILE, 'utf-8')) as Cache;
	} catch {
		return {};
	}
}

async function saveCache(cache: Cache): Promise<void> {
	await fs.mkdir(CACHE_DIR, { recursive: true });
	await fs.writeFile(CACHE_FILE, JSON.stringify(cache, null, 2));
}

async function loadStopCache(): Promise<StopCache> {
	try {
		return JSON.parse(await fs.readFile(STOP_CACHE_FILE, 'utf-8')) as StopCache;
	} catch {
		return {};
	}
}

async function saveStopCache(cache: StopCache): Promise<void> {
	await fs.mkdir(CACHE_DIR, { recursive: true });
	await fs.writeFile(STOP_CACHE_FILE, JSON.stringify(cache, null, 2));
}

// ---------------------------------------------------------------------------
// Build
// ---------------------------------------------------------------------------

/**
 * `nearestStop`, remembered — including when the answer is "there isn't one".
 *
 * The hikes without a `<JourneyPlanner>` are the two in Austria, where a Swiss
 * timetable has no stop to offer. Without caching the empty answer, every run
 * asked twice more, forever, to be told the same thing. A failure is not cached
 * (it might be the network, not the data) but is never fatal either: one hike
 * with no endpoints must not take the other sixteen down with it.
 *
 * The sentinel is the empty string — `canonicalStop` never produces one, so the
 * two share a cache file without being able to collide.
 */
async function cachedNearestStop(
	slug: string,
	which: 'start' | 'end',
	lat: number,
	lng: number,
	cache: StopCache
): Promise<string | null> {
	const key = `@track:${slug}:${which}`;
	const hit = cache[key];
	if (hit !== undefined) return hit || null;
	try {
		const stop = await nearestStop(lat, lng);
		cache[key] = stop ?? '';
		console.log(`[hike-travel:${slug}]   no ${which} planner — nearest stop: ${stop ?? 'none'}`);
		return stop;
	} catch (err) {
		console.warn(`[hike-travel:${slug}]   stop lookup failed: ${(err as Error).message}`);
		return null;
	}
}

/** Endpoints for one hike: the planners if the prose has them, otherwise the
 * stops nearest the two ends of the track. The fallback is a guess and says so
 * (`source: 'track'`), so the page can present it with less confidence. */
async function resolveEndpoints(slug: string, dir: string, stops: StopCache) {
	const svxPath = path.join(dir, 'index.svx');
	const source = await fs.readFile(svxPath, 'utf-8');
	const { start, end } = endpointsFromPlanners(source);
	try {
		if (start) start.stop = await canonicalStop(start.stop, stops);
		if (end) end.stop = await canonicalStop(end.stop, stops);
	} catch (err) {
		// Keep the name the prose wrote. It is usually already canonical, and a
		// network blip is no reason to abandon the whole rebuild.
		console.warn(`[hike-travel:${slug}]   stop canonicalisation failed: ${(err as Error).message}`);
	}
	if (start && end) return { start, end };

	const gpxPath = path.join(dir, 'track.gpx');
	if (!(await pathExists(gpxPath))) return { start, end };

	const stages = parseGpxStages(await fs.readFile(gpxPath, 'utf-8'));
	const points = stages.flatMap((s) => s.points);
	if (points.length < 2) return { start, end };

	let resolvedStart = start;
	let resolvedEnd = end;
	if (!resolvedStart) {
		const first = points[0];
		const stop = await cachedNearestStop(slug, 'start', first.lat, first.lng, stops);
		if (stop) resolvedStart = { stop, ...FALLBACK_OUT, source: 'track' };
	}
	if (!resolvedEnd) {
		const last = points[points.length - 1];
		const stop = await cachedNearestStop(slug, 'end', last.lat, last.lng, stops);
		if (stop) resolvedEnd = { stop, ...FALLBACK_BACK, source: 'track' };
	}
	return { start: resolvedStart, end: resolvedEnd };
}

type Job = {
	slug: string;
	direction: 'toStart' | 'fromEnd';
	hubId: HubId;
	from: string;
	to: string;
	time: string;
	target: 'departure' | 'arrival';
};

async function main() {
	const entries = await fs.readdir(CONTENT_DIR, { withFileTypes: true });
	const slugs = entries
		.filter((e) => e.isDirectory() && !e.name.startsWith('.'))
		.map((e) => e.name)
		.filter((s) => !ONLY_SLUG || s === ONLY_SLUG)
		.sort();

	if (slugs.length === 0) {
		console.error(`[hike-travel] No hikes matched${ONLY_SLUG ? ` --slug=${ONLY_SLUG}` : ''}.`);
		process.exit(1);
	}

	console.log(`[hike-travel] Sampling the timetable for ${SAMPLE_DATE} (next Saturday)`);

	// Before anything reaches the network. Endpoint resolution makes its own
	// (cheap, cached) calls, so the check that decides whether this run can
	// happen at all has to come first.
	const spend = await loadSpend();
	if (spend.routes >= DAILY_ROUTE_BUDGET) {
		console.error(
			`[hike-travel] ${spend.routes}/${DAILY_ROUTE_BUDGET} route searches already used today ` +
				`(the endpoint allows 1000). Nothing fetched; try again tomorrow.`
		);
		process.exit(1);
	}

	const cache = await loadCache();
	const stops = await loadStopCache();
	const table: Record<string, HikeTravel> = {};
	const jobs: Job[] = [];

	for (const slug of slugs) {
		const dir = path.join(CONTENT_DIR, slug);
		if (!(await pathExists(path.join(dir, 'index.svx')))) continue;
		const { start, end } = await resolveEndpoints(slug, dir, stops);
		table[slug] = { start, end, toStart: {}, fromEnd: {}, sampledFor: SAMPLE_DATE };
		if (!start && !end) {
			console.warn(`[hike-travel:${slug}] No usable endpoints — skipped.`);
			continue;
		}
		for (const hub of HUBS) {
			if (start) {
				jobs.push({
					slug,
					direction: 'toStart',
					hubId: hub.id,
					from: hub.station,
					to: start.stop,
					time: start.time,
					target: start.target
				});
			}
			if (end) {
				jobs.push({
					slug,
					direction: 'fromEnd',
					hubId: hub.id,
					from: end.stop,
					to: hub.station,
					time: end.time,
					target: end.target
				});
			}
		}
	}

	// What this run intends to spend, before it spends any of it. A leg the
	// cache can answer costs nothing, so the number that matters is the misses.
	const toFetch = jobs.filter((j) => !cache[cacheKey(j.from, j.to, j.time, j.target)]).length;
	const remaining = Math.max(0, DAILY_ROUTE_BUDGET - spend.routes);
	console.log(
		`[hike-travel] ${jobs.length} legs, ${jobs.length - toFetch} cached, ${toFetch} to fetch — ` +
			`${spend.routes}/${DAILY_ROUTE_BUDGET} route searches used today (${remaining} left)`
	);
	if (toFetch > remaining) {
		console.warn(
			`[hike-travel] This run needs ${toFetch} but only ${remaining} remain in today's budget. ` +
				`It will fetch what it can and stop; re-run tomorrow and the cache will fill in the rest.`
		);
	}
	if (toFetch > 0 && remaining === 0) {
		console.error(
			`[hike-travel] Today's budget is spent. The previously generated table is left as it is.`
		);
		process.exit(1);
	}

	let fetched = 0;
	let cached = 0;
	let failed = 0;
	let budgetHit = false;

	// `api()` serialises anyway; the pool only keeps a few requests queued
	// behind it so the throttle, not the loop, sets the pace.
	await runWithConcurrency(jobs, 4, async (job) => {
		const key = cacheKey(job.from, job.to, job.time, job.target);
		const hit = cache[key];
		if (hit) {
			cached++;
			table[job.slug][job.direction][job.hubId] = hit.leg;
			return;
		}
		if (budgetHit) return;
		if (spend.routes >= DAILY_ROUTE_BUDGET) {
			if (!budgetHit) {
				budgetHit = true;
				console.warn(`[hike-travel] Daily budget reached — stopping short of the endpoint's own limit.`);
			}
			return;
		}
		try {
			// Counted before the call, not after: a request that errors or is
			// refused still reached them, and an optimistic ledger is the one
			// that overspends.
			spend.routes++;
			const leg = await fetchLeg(job.from, job.to, job.time, job.target);
			cache[key] = { leg };
			table[job.slug][job.direction][job.hubId] = leg;
			fetched++;
			if (fetched % 10 === 0) {
				console.log(
					`[hike-travel] ${fetched + cached}/${jobs.length} legs ` +
						`(${spend.routes}/${DAILY_ROUTE_BUDGET} today)`
				);
				// Checkpoint, so an interrupted run resumes instead of restarting.
				await saveCache(cache);
				await saveSpend(spend);
			}
			if (!leg) {
				console.warn(`[hike-travel:${job.slug}] no connection ${job.from} → ${job.to} (${job.target} ${job.time})`);
			}
		} catch (err) {
			// A hub that failed is left absent rather than recorded as
			// unreachable: "we don't know" and "you can't get there" must not
			// look the same on the page.
			failed++;
			console.warn(`[hike-travel:${job.slug}] ${job.from} → ${job.to}: ${(err as Error).message}`);
		}
	});

	await saveCache(cache);
	await saveStopCache(stops);
	await saveSpend(spend);

	// A run that stopped early knows less than the table already on disk, and
	// writing it would turn "not fetched yet" into "no connection" on the page.
	// The caches are kept, so tomorrow's run is short.
	if (budgetHit) {
		console.error(
			`[hike-travel] Stopped at the daily budget with ${jobs.length - fetched - cached} legs ` +
				`unfetched. Existing table left untouched — re-run tomorrow to finish.`
		);
		process.exit(1);
	}

	for (const o of OVERRIDES) {
		// Scoped run: overrides for the other hikes are already in the table on
		// disk, which this run merges into below.
		if (ONLY_SLUG && o.slug !== ONLY_SLUG) continue;
		const entry = table[o.slug];
		if (!entry) {
			console.warn(`[hike-travel] override for unknown hike ${o.slug} — ignored`);
			continue;
		}
		const was = entry[o.direction][o.hub];
		entry[o.direction][o.hub] = {
			durationMin: o.durationMin,
			transfers: o.transfers,
			// No departure/arrival: the whole point is that the timetable has no
			// specific connection to name. The page shows the duration alone.
			departure: '',
			arrival: ''
		};
		console.log(
			`[hike-travel:${o.slug}] override ${o.direction}/${o.hub} = ${o.durationMin} min ` +
				`(timetable said ${was ? was.durationMin + ' min' : 'nothing'}) — ${o.why}`
		);
	}

	// A `--slug` run knows about one hike; the table on disk knows about the
	// rest. Merge into it rather than replacing it, or scoping the run to one
	// hike silently drops every other hike's estimate from the page.
	let hikes = table;
	if (ONLY_SLUG) {
		try {
			const existing = JSON.parse(await fs.readFile(DATA_OUT, 'utf-8')) as HikeTravelTable;
			hikes = { ...existing.hikes, ...table };
		} catch {
			// No table yet — this run's hikes are all there is.
		}
	}
	const payload: HikeTravelTable = {
		generatedAt: new Date().toISOString().slice(0, 10),
		hikes
	};

	// Compact on disk: this is fetched, not read.
	const json = JSON.stringify(payload);
	await fs.mkdir(path.dirname(DATA_OUT), { recursive: true });
	await fs.writeFile(DATA_OUT, json);

	// Hashed query rather than a hashed filename: the path stays stable so the
	// file can be tracked in git without every rebuild leaving the last one
	// behind, and the query still busts every cache between here and the reader.
	const hash = shortHash(json);
	const src =
		'// AUTO-GENERATED by scripts/build-hike-travel.ts — do not edit by hand.\n' +
		'// Refresh with `pnpm hikes:travel` (timetables are seasonal).\n' +
		'//\n' +
		'// Only the URL lives in the bundle. The table itself is a static asset the\n' +
		'// hikes routes fetch in `load`, the same way they fetch a track.\n\n' +
		`export const HIKE_TRAVEL_URL = '/hikes-travel.json?v=${hash}';\n`;
	await fs.mkdir(path.dirname(URL_OUT), { recursive: true });
	await fs.writeFile(URL_OUT, src);

	console.log(
		`[hike-travel] ${slugs.length} hikes, ${jobs.length} legs ` +
			`(${fetched} fetched, ${cached} cached, ${failed} failed) → ${DATA_OUT}`
	);
}

main().catch((err) => {
	console.error('[hike-travel] Fatal:', err);
	process.exit(1);
});
