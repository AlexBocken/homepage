<script lang="ts">
	// SBB-style "Von / Nach" public-transport widget for hike pages. Drop it in
	// a hike's prose with a fixed destination (the trailhead) and let the reader
	// fill / geolocate the start:
	//
	//   <JourneyPlanner from="<current location>" to="Urnerboden, Klausenpass" toFixed />
	//
	// Connections come from the free Swiss transport API (transport.opendata.ch,
	// which sends CORS headers, so the browser can call it directly).
	import LocateFixed from '@lucide/svelte/icons/locate-fixed';
	import LocateOff from '@lucide/svelte/icons/locate-off';
	import ArrowDownUp from '@lucide/svelte/icons/arrow-down-up';
	import Search from '@lucide/svelte/icons/search';
	import X from '@lucide/svelte/icons/x';
	import LoaderCircle from '@lucide/svelte/icons/loader-circle';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import Clock from '@lucide/svelte/icons/clock';
	import ExternalLink from '@lucide/svelte/icons/external-link';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import TrainFront from '@lucide/svelte/icons/train-front';
	import Bus from '@lucide/svelte/icons/bus';
	import TramFront from '@lucide/svelte/icons/tram-front';
	import Ship from '@lucide/svelte/icons/ship';
	import CableCar from '@lucide/svelte/icons/cable-car';
	import Footprints from '@lucide/svelte/icons/footprints';
	import { untrack, type Component } from 'svelte';
	import { slide } from 'svelte/transition';
	import { page } from '$app/state';
	import DatePicker from '$lib/components/DatePicker.svelte';
	import TimePicker from '$lib/components/TimePicker.svelte';
	import { HUBS } from '$lib/hikes/hubs';
	import { activeHub, setHub } from '$lib/hikes/travelHub.svelte';
	import {
		formatTravelMinutes,
		transfersLabel as transfersLabelFor,
		travelEstimate,
		travelSampledFor,
		type TravelDirection
	} from '$lib/hikes/travel';
	import { fmt, hikesLocale, m, type HikesLang } from '$lib/js/hikesI18n';
	import type { HikeTravelTable, HubId } from '$types/hikes';

	interface Props {
		/** Prefilled start. The sentinel `<current location>` (also `current`,
		 * `hier`, `mein Standort`) geolocates the reader and uses the nearest
		 * stop. */
		from?: string;
		/** Prefilled destination. Same `<current location>` sentinel. */
		to?: string;
		/** Lock the start field — display-only, the reader can't change it. */
		fromFixed?: boolean;
		/** Lock the destination field. */
		toFixed?: boolean;
		/** How many connections to fetch. */
		limit?: number;
		/** Default time, "HH:MM" (e.g. "08:00"). The reader can still change it. */
		time?: string;
		/** Whether `time` means "leave at" (departure) or "arrive by" (arrival). */
		target?: 'departure' | 'arrival';
	}

	const {
		from = '',
		to = '',
		fromFixed = false,
		toFixed = false,
		limit = 4,
		time = '08:00',
		target = 'departure'
	}: Props = $props();

	// -----------------------------------------------------------------------
	// Precomputed estimate
	//
	// The widget answers "what leaves when", which needs the reader to press
	// the button and to know where they're starting from. The line above it
	// answers the question they have before that one — "is this a hike I can
	// get to at all?" — from the table built by scripts/build-hike-travel.ts:
	// the shortest connection from one of eleven hubs, plus a flat allowance for
	// reaching that hub. It's an estimate about the hike, not a plan for the
	// day, so it renders on arrival with nothing pressed.
	//
	// Which leg this planner is comes from its own props: the outbound one
	// pins its destination (the trailhead), the return one pins its origin.
	// Anything else — both pinned, neither pinned — isn't one of the two legs
	// the table knows about, and gets no estimate.
	const direction: TravelDirection | null = $derived(
		toFixed && !fromFixed ? 'toStart' : fromFixed && !toFixed ? 'fromEnd' : null
	);

	const lang = $derived((page.data.lang as HikesLang | undefined) ?? 'de');
	const t = $derived(m[lang]);
	const hikeSlug = $derived((page.data.hike?.slug as string | undefined) ?? null);
	// From `load`, not from a prop: this component is dropped into `.svx` prose,
	// where the author writes a tag and nothing threads data into it.
	const travelTable = $derived((page.data.travel as HikeTravelTable | null) ?? null);
	// Server-resolved (cookie, else GeoIP2, else the default) until the reader
	// picks something — so SSR and the first client render agree. See
	// travelHub.svelte.ts.
	const hub = $derived(activeHub());
	const estimate = $derived(
		direction ? travelEstimate(travelTable, hikeSlug, hub, direction) : ({ state: 'unknown' } as const)
	);
	const sampledFor = $derived(travelSampledFor(travelTable, hikeSlug));
	const hubSelectId = $props.id();

	/** How the number was arrived at, for the reader who wonders. */
	const estimateTitle = $derived.by(() => {
		if (estimate.state !== 'ok') return undefined;
		const parts = [fmt(t.jp_estimate_title, { sampled: sampledFor ? ` (${sampledFor})` : '' })];
		if (estimate.accessMin > 0) {
			parts.push(fmt(t.jp_estimate_access, { min: estimate.accessMin }));
		}
		return `${parts.join(', ')}. ${t.jp_estimate_suffix}`;
	});

	function onHubChange(event: Event & { currentTarget: HTMLSelectElement }) {
		setHub(event.currentTarget.value as HubId);
	}

	const isCurrentSentinel = (v: string) =>
		/^\s*<?\s*(current location|current|aktueller standort|mein standort|hier)\s*>?\s*$/i.test(v);

	// Props are author-set once in the prose, so seed the editable state from
	// their initial values (untrack makes the one-shot snapshot intentional).
	let fromText = $state(untrack(() => (isCurrentSentinel(from) ? '' : from)));
	let toText = $state(untrack(() => (isCurrentSentinel(to) ? '' : to)));
	let fromCurrent = $state(untrack(() => isCurrentSentinel(from)));
	let toCurrent = $state(untrack(() => isCurrentSentinel(to)));

	// Date defaults to the next weekend day (hikes happen on weekends): the
	// upcoming Saturday on a weekday, Sunday when it's already Saturday. Always
	// strictly after today.
	function pad2(n: number): string {
		return String(n).padStart(2, '0');
	}
	function toDateStr(d: Date): string {
		return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
	}
	function nextWeekendDay(): string {
		const d = new Date();
		d.setHours(12, 0, 0, 0);
		do {
			d.setDate(d.getDate() + 1);
		} while (d.getDay() !== 0 && d.getDay() !== 6);
		return toDateStr(d);
	}
	const todayStr = toDateStr(new Date());
	let dateStr = $state(nextWeekendDay());
	let timeStr = $state(untrack(() => time));
	// Whether `time` is interpreted as "leave at" or "arrive by".
	let timeMode = $state<'departure' | 'arrival'>(untrack(() => target));

	let busy = $state(false);
	let error = $state<string | null>(null);
	// Aborts the running search: the two /locations calls, the /connections
	// call, and the wait for a geolocation fix. `getCurrentPosition` can't be
	// called off — a permission prompt the reader never answers keeps the
	// callback pending, and its own `timeout` doesn't necessarily run while the
	// prompt is open — so the abort resolves the wait and the late fix (if it
	// ever comes) is dropped on the floor.
	let searchCtl: AbortController | null = null;

	const GEO_DENIED_MSG = $derived(t.jp_err_geo_denied);

	/** A rejection the search loop recognises as "the reader hit Abbrechen",
	 * so it stays silent instead of showing an error. */
	function abortError(): DOMException {
		return new DOMException('Suche abgebrochen', 'AbortError');
	}
	function isAbort(e: unknown): boolean {
		return e instanceof DOMException && e.name === 'AbortError';
	}

	/** What the browser will do with a geolocation request, as far as the
	 * Permissions API will tell us. `'unsupported'` covers both a missing
	 * Permissions API and a missing geolocation — with either we simply try and
	 * handle the failure. Knowing it is `'denied'` up front lets us skip a call
	 * that cannot succeed and say so before the reader waits for it. */
	let geoPermission = $state<'granted' | 'denied' | 'prompt' | 'unsupported'>('unsupported');

	$effect(() => {
		if (typeof navigator === 'undefined' || !('geolocation' in navigator)) return;
		if (!('permissions' in navigator)) {
			// No Permissions API (Safari): treat as "ask and see".
			geoPermission = 'prompt';
			return;
		}
		let status: PermissionStatus | null = null;
		const onChange = () => {
			if (status) geoPermission = status.state;
		};
		navigator.permissions
			.query({ name: 'geolocation' as PermissionName })
			.then((s) => {
				status = s;
				geoPermission = s.state;
				s.addEventListener('change', onChange);
			})
			.catch(() => {
				geoPermission = 'prompt';
			});
		return () => status?.removeEventListener('change', onChange);
	});

	/** True when a field asks for the current location but the browser has the
	 * permission blocked — the search would fail, so the UI says so first. */
	const geoBlocked = $derived((fromCurrent || toCurrent) && geoPermission === 'denied');

	type Stop = {
		station: { name: string };
		departure?: string | null;
		arrival?: string | null;
		platform?: string | null;
	};
	type Section = {
		walk?: { duration?: number | null } | null;
		journey?: { category?: string | null; number?: string | null; to?: string | null } | null;
		departure: Stop;
		arrival: Stop;
	};
	type Connection = {
		from: { departure: string | null; platform?: string | null; station: { name: string } };
		to: { arrival: string | null; station: { name: string } };
		duration: string;
		transfers: number;
		products: string[];
		sections: Section[];
	};
	let connections = $state<Connection[] | null>(null);
	let lastQuery = $state<{
		from: string;
		to: string;
		fromId: string | null;
		toId: string | null;
		date: string;
		time: string;
		arrival: boolean;
	} | null>(null);
	let expanded = $state<number | null>(null);

	// Map a transport.opendata.ch vehicle category to a coarse type + icon, so a
	// reader sees at a glance whether a leg is a bus, train, tram, boat or
	// cable car.
	type LegType = 'bus' | 'tram' | 'train' | 'ship' | 'cable';
	const TYPE_ICON: Record<LegType, Component> = {
		bus: Bus,
		tram: TramFront,
		train: TrainFront,
		ship: Ship,
		cable: CableCar
	};
	function legType(category: string | null | undefined): LegType {
		const c = (category ?? '').toUpperCase();
		if (['B', 'BUS', 'NFB', 'NFO', 'EXB', 'KB', 'RUB'].includes(c)) return 'bus';
		if (['T', 'TRAM', 'NFT'].includes(c)) return 'tram';
		if (c === 'BAT') return 'ship';
		if (['GB', 'PB', 'LB', 'FUN', 'CC', 'SL', 'ASC'].includes(c)) return 'cable';
		return 'train';
	}

	type Chip =
		| { kind: 'walk'; minutes: number; Icon: Component }
		| { kind: 'transit'; type: LegType; label: string; Icon: Component };
	type Step =
		| { kind: 'walk'; minutes: number }
		| {
				kind: 'transit';
				type: LegType;
				label: string;
				headsign: string | null;
				Icon: Component;
				dep: { time: string; station: string; platform: string | null };
				arr: { time: string; station: string; platform: string | null };
		  };

	// Flatten a connection's sections into the collapsed chip row + the expanded
	// itinerary. Transit labels reuse `products` (already nicely formatted, e.g.
	// "IR 75"), which lists the legs in section order.
	function detail(c: Connection): { chips: Chip[]; steps: Step[] } {
		const chips: Chip[] = [];
		const steps: Step[] = [];
		let ti = 0;
		for (const s of c.sections ?? []) {
			if (s.walk) {
				const minutes = Math.round((s.walk.duration ?? 0) / 60);
				if (minutes <= 0) continue;
				chips.push({ kind: 'walk', minutes, Icon: Footprints });
				steps.push({ kind: 'walk', minutes });
				continue;
			}
			if (!s.journey) continue;
			const type = legType(s.journey.category);
			const Icon = TYPE_ICON[type];
			const label =
				c.products?.[ti] ?? `${s.journey.category ?? ''} ${s.journey.number ?? ''}`.trim();
			ti++;
			chips.push({ kind: 'transit', type, label, Icon });
			steps.push({
				kind: 'transit',
				type,
				label,
				headsign: s.journey.to ?? null,
				Icon,
				dep: {
					time: fmtTime(s.departure.departure ?? null),
					station: s.departure.station.name,
					platform: s.departure.platform ?? null
				},
				arr: {
					time: fmtTime(s.arrival.arrival ?? null),
					station: s.arrival.station.name,
					platform: s.arrival.platform ?? null
				}
			});
		}
		return { chips, steps };
	}

	const enriched = $derived(connections ? connections.map((c) => ({ c, ...detail(c) })) : []);

	// Swap only makes sense when both ends are editable.
	const canSwap = $derived(!fromFixed && !toFixed);
	function swap() {
		if (!canSwap) return;
		[fromText, toText] = [toText, fromText];
		[fromCurrent, toCurrent] = [toCurrent, fromCurrent];
		connections = null;
		error = null;
	}

	function getPosition(signal: AbortSignal): Promise<GeolocationPosition> {
		if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
			return Promise.reject(new Error(t.jp_err_geo_unavailable));
		}
		// Geolocation needs a secure context; on plain HTTP (e.g. a LAN IP) the
		// browser silently refuses, which is the usual cause of a vague failure.
		if (typeof window !== 'undefined' && window.isSecureContext === false) {
			return Promise.reject(new Error(t.jp_err_geo_insecure));
		}
		// Already blocked: asking again cannot prompt and cannot succeed, so fail
		// immediately with the one message that tells the reader what to do.
		if (geoPermission === 'denied') {
			return Promise.reject(new Error(GEO_DENIED_MSG));
		}
		return new Promise<GeolocationPosition>((resolve, reject) => {
			if (signal.aborted) {
				reject(abortError());
				return;
			}
			signal.addEventListener('abort', () => reject(abortError()), { once: true });
			navigator.geolocation.getCurrentPosition(
				resolve,
				// A GeolocationPositionError is NOT an Error instance, so map it to
				// one with a readable message — otherwise the catch can't surface it.
				(err) => {
					// A denial here is the authoritative answer even where the
					// Permissions API said otherwise — remember it so the next
					// search fails fast and the hint below appears.
					if (err.code === err.PERMISSION_DENIED) geoPermission = 'denied';
					const msg =
						err.code === err.PERMISSION_DENIED
							? GEO_DENIED_MSG
							: err.code === err.POSITION_UNAVAILABLE
								? t.jp_err_geo_position
								: err.code === err.TIMEOUT
									? t.jp_err_geo_timeout
									: t.jp_err_geo_generic;
					reject(new Error(msg));
				},
				// Coarse accuracy is plenty for "nearest stop" and returns far
				// faster on devices without GPS (laptops geolocate via Wi-Fi/IP);
				// high accuracy waits for a GPS fix that never comes and times out.
				// A generous maximumAge lets a recent cached fix resolve instantly.
				{ enableHighAccuracy: false, timeout: 20_000, maximumAge: 300_000 }
			);
		});
	}

	// A resolved stop: canonical name + the station id (didok/UIC) that SBB's
	// deep link needs in its `stops` parameter. id is null when we couldn't
	// resolve the typed text to a real station.
	type Station = { name: string; id: string | null };

	/** The stop we last located the reader at. Both ends can be "current
	 * location" (and searches get repeated with a different time), and the fix
	 * doesn't move meaningfully within a few minutes — so one lookup serves them
	 * all instead of one geolocation round-trip per field per search. */
	let nearestCache: { station: Station; at: number } | null = null;
	const NEAREST_TTL_MS = 5 * 60_000;

	async function nearestStation(signal: AbortSignal): Promise<Station> {
		const cached = nearestCache;
		if (cached && Date.now() - cached.at < NEAREST_TTL_MS) return cached.station;
		const pos = await getPosition(signal);
		const u = new URL('https://transport.opendata.ch/v1/locations');
		u.searchParams.set('type', 'station');
		u.searchParams.set('x', String(pos.coords.latitude));
		u.searchParams.set('y', String(pos.coords.longitude));
		const res = await fetch(u, { signal });
		if (!res.ok) throw new Error(t.jp_err_stop_search);
		const json = (await res.json()) as { stations?: { name?: string; id?: string | number }[] };
		const st = json.stations?.find((s) => s.name);
		if (!st?.name) throw new Error(t.jp_err_no_stop);
		const station = { name: st.name, id: st.id != null ? String(st.id) : null };
		nearestCache = { station, at: Date.now() };
		return station;
	}

	// Station typeahead — the same /locations?type=station endpoint sbb-tui uses,
	// so the reader picks a canonical stop instead of letting /connections
	// geocode a fuzzy string (which yields the odd, roundabout routes).
	let activeField = $state<'from' | 'to' | null>(null);
	let suggestions = $state<string[]>([]);
	let suggestTimer: ReturnType<typeof setTimeout> | null = null;

	async function fetchStations(query: string, signal?: AbortSignal): Promise<Station[]> {
		const u = new URL('https://transport.opendata.ch/v1/locations');
		u.searchParams.set('type', 'station');
		u.searchParams.set('query', query);
		const res = await fetch(u, { signal });
		if (!res.ok) return [];
		const json = (await res.json()) as { stations?: { name?: string; id?: string | number }[] };
		return (json.stations ?? [])
			.filter((s): s is { name: string; id?: string | number } => !!s.name?.trim())
			.map((s) => ({ name: s.name.trim(), id: s.id != null ? String(s.id) : null }));
	}

	async function refreshSuggestions(query: string) {
		const q = query.trim();
		if (q.length < 2) {
			suggestions = [];
			return;
		}
		try {
			suggestions = (await fetchStations(q)).map((s) => s.name).slice(0, 6);
		} catch {
			suggestions = [];
		}
	}

	function onFieldInput(field: 'from' | 'to', value: string) {
		activeField = field;
		if (suggestTimer) clearTimeout(suggestTimer);
		suggestTimer = setTimeout(() => refreshSuggestions(value), 250);
	}

	function pickSuggestion(field: 'from' | 'to', name: string) {
		if (field === 'from') fromText = name;
		else toText = name;
		suggestions = [];
		activeField = null;
	}

	// Split a suggestion around the typed query so the matched run can be
	// emphasised — makes the list read as a continuation of what you're typing.
	function highlightParts(name: string, query: string): { text: string; match: boolean }[] {
		const q = query.trim();
		if (!q) return [{ text: name, match: false }];
		const i = name.toLowerCase().indexOf(q.toLowerCase());
		if (i < 0) return [{ text: name, match: false }];
		return [
			{ text: name.slice(0, i), match: false },
			{ text: name.slice(i, i + q.length), match: true },
			{ text: name.slice(i + q.length), match: false }
		].filter((p) => p.text);
	}

	// Resolve a typed (un-picked) field to its canonical station before the
	// connections call; fall back to the raw text on miss/error.
	async function resolveStation(query: string, signal: AbortSignal): Promise<Station> {
		if (!query) return { name: query, id: null };
		try {
			const [first] = await fetchStations(query, signal);
			return first ?? { name: query, id: null };
		} catch (e) {
			// A cancelled search must not quietly continue with the raw text.
			if (isAbort(e)) throw e;
			return { name: query, id: null };
		}
	}

	$effect(() => {
		if (!activeField) return;
		function onAway(e: MouseEvent) {
			const target = e.target as HTMLElement | null;
			if (target && !target.closest('.field')) {
				activeField = null;
				suggestions = [];
			}
		}
		window.addEventListener('pointerdown', onAway);
		return () => window.removeEventListener('pointerdown', onAway);
	});

	/** Drops the current-location mode on whichever editable field still asks
	 * for it, so a blocked permission leaves the reader with a typable field
	 * instead of a dead end. Fixed fields are the author's choice and stay. */
	function useManualEntry() {
		if (fromCurrent && !fromFixed) fromCurrent = false;
		if (toCurrent && !toFixed) toCurrent = false;
		error = null;
	}

	/** Stops the running search. The button turns into this while `busy`, which
	 * matters most when a field is set to the current location: the browser's
	 * permission prompt can sit there unanswered with nothing else to click. */
	function cancelSearch() {
		searchCtl?.abort();
	}

	async function search() {
		activeField = null;
		suggestions = [];
		error = null;
		connections = null;
		expanded = null;
		if (!fromCurrent && !fromText.trim()) {
			error = t.jp_err_need_start;
			return;
		}
		if (!toCurrent && !toText.trim()) {
			error = t.jp_err_need_dest;
			return;
		}
		// A second search supersedes the first rather than racing it.
		searchCtl?.abort();
		const ctl = new AbortController();
		searchCtl = ctl;
		const signal = ctl.signal;
		busy = true;
		try {
			const fromR = fromCurrent
				? await nearestStation(signal)
				: await resolveStation(fromText.trim(), signal);
			const toR = toCurrent
				? await nearestStation(signal)
				: await resolveStation(toText.trim(), signal);
			const u = new URL('https://transport.opendata.ch/v1/connections');
			u.searchParams.set('from', fromR.name);
			u.searchParams.set('to', toR.name);
			u.searchParams.set('limit', String(limit));
			const reqTime = timeStr || '08:00';
			u.searchParams.set('date', dateStr);
			u.searchParams.set('time', reqTime);
			if (timeMode === 'arrival') u.searchParams.set('isArrivalTime', '1');
			const res = await fetch(u, { signal });
			if (!res.ok) throw new Error(t.jp_err_conn_failed);
			const json = (await res.json()) as { connections?: Connection[] };
			connections = json.connections ?? [];
			lastQuery = {
				from: fromR.name,
				to: toR.name,
				fromId: fromR.id,
				toId: toR.id,
				date: dateStr,
				time: reqTime,
				arrival: timeMode === 'arrival'
			};
			if (connections.length === 0) error = t.jp_err_no_conn;
		} catch (e) {
			// Cancelled — either by the reader or by a newer search taking over.
			// Neither is a failure worth a banner.
			if (isAbort(e)) return;
			console.warn('[JourneyPlanner]', e);
			const msg = e instanceof Error ? e.message : t.jp_err_generic;
			// The blocked-permission case already has its standing hint above the
			// button; the banner would only say the same thing twice.
			if (msg === GEO_DENIED_MSG) return;
			error = msg;
		} finally {
			// Only the newest search owns the spinner; a superseded one must not
			// clear it out from under its successor.
			if (searchCtl === ctl) {
				searchCtl = null;
				busy = false;
			}
		}
	}

	function fmtTime(iso: string | null): string {
		if (!iso) return '–';
		return new Date(iso).toLocaleTimeString(hikesLocale(lang), { hour: '2-digit', minute: '2-digit' });
	}
	function fmtDuration(d: string): string {
		// API format: "00d01:23:00"
		const m = d.match(/(?:(\d+)d)?(\d+):(\d+):/);
		if (!m) return d;
		const days = Number(m[1] ?? 0);
		const h = days * 24 + Number(m[2]);
		const min = Number(m[3]);
		return h > 0 ? `${h} h ${min} min` : `${min} min`;
	}
	function transfersLabel(n: number): string {
		return transfersLabelFor(n, lang);
	}
	// Deep link to the full journey on the official SBB timetable. The live site
	// (2026) uses: stops=<from>~<to> where each stop is `<label>_I<stationId>`
	// (spaces as "+"), time with an underscore ("09:10" → "09_10"), and a short
	// lowercase moment token (dep/arr). `day` mirrors `date`. URLSearchParams
	// can't produce this (it would percent-encode "_"/"~"/":" and use "+" only
	// for spaces), so the query is assembled by hand.
	const sbbLink = $derived.by(() => {
		if (!lastQuery) return null;
		const stop = (name: string, id: string | null) => {
			const label = encodeURIComponent(name).replace(/%20/g, '+');
			return id ? `${label}_I${id}` : label;
		};
		const stops = `${stop(lastQuery.from, lastQuery.fromId)}~${stop(lastQuery.to, lastQuery.toId)}`;
		const time = lastQuery.time.replace(':', '_');
		const moment = lastQuery.arrival ? 'arr' : 'dep';
		return `https://www.sbb.ch/${lang}?date=${lastQuery.date}&time=${time}&moment=${moment}&stops=${stops}&day=${lastQuery.date}`;
	});
</script>

<section class="jp" aria-label={t.jp_aria}>
	{#if estimate.state !== 'unknown'}
		<div class="estimate">
			<span class="est-icon" aria-hidden="true"><TrainFront size={15} strokeWidth={1.75} /></span>

			<!-- The picker is a plain GET form, so a reader with no script can
			     still change hubs: the layout reads `?hub=` and remembers it in
			     the same cookie the click path writes. With script the select's
			     onchange does it in place and the form never submits. -->
			<form class="hub-form" method="GET">
				<label class="hub-label" for={hubSelectId}>{direction === 'toStart' ? t.jp_hub_from : t.jp_hub_to}</label>
				<select
					id={hubSelectId}
					name="hub"
					class="hub-select"
					aria-label={direction === 'toStart' ? t.jp_hub_start_aria : t.jp_hub_end_aria}
					value={hub}
					onchange={onHubChange}
				>
					{#each HUBS as h (h.id)}
						<option value={h.id}>{h.label}</option>
					{/each}
				</select>
				<noscript><button type="submit" class="hub-go">{t.jp_go}</button></noscript>
			</form>

			{#if estimate.state === 'ok'}
				<p class="est-text">
					<strong title={estimateTitle}>{t.jp_approx} {formatTravelMinutes(estimate.totalMin)}</strong>
					{#if direction === 'toStart'}{t.jp_until}{:else}{t.jp_from}{/if}
					{estimate.endpoint.stop}
					<span class="est-meta"
						>{transfersLabel(estimate.leg.transfers)}{#if estimate.accessMin > 0}, {t.jp_incl} {estimate.accessMin}
							min {direction === 'toStart' ? t.jp_to_station : t.jp_from_station}{/if}</span
					>
				</p>
			{:else}
				<p
					class="est-text est-none"
					title={t.jp_none_title}
				>
					{#if direction === 'toStart'}
						{#if estimate.endpoint.target === 'arrival'}
							{fmt(t.jp_none_arrival, { hub: estimate.hub.label, time: estimate.endpoint.time, stop: estimate.endpoint.stop })}
						{:else}
							{fmt(t.jp_none_departure, { hub: estimate.hub.label, time: estimate.endpoint.time })}
						{/if}
					{:else}
						{fmt(t.jp_none_return, { hub: estimate.hub.label, time: estimate.endpoint.time })}
					{/if}
				</p>
			{/if}
		</div>
	{/if}

	<div class="card">
		<div class="rail" aria-hidden="true">
			<span class="dot"></span>
			<span class="line"></span>
			<span class="dot"></span>
		</div>

		<div class="field from" class:suggesting={activeField === 'from' && suggestions.length > 0}>
			{#if fromFixed}
				<span class="static" class:is-current={fromCurrent}>
					{#if fromCurrent}<LocateFixed size={15} strokeWidth={2} />{t.jp_current_location}{:else}{fromText}{/if}
				</span>
			{:else if fromCurrent}
				<span class="chip">
					<LocateFixed size={15} strokeWidth={2} />{t.jp_current_location}
					<button type="button" class="chip-x" aria-label={t.jp_change_location} onclick={() => (fromCurrent = false)}><X size={13} strokeWidth={2.25} /></button>
				</span>
			{:else}
				<input
					type="text"
					bind:value={fromText}
					placeholder={t.jp_from_placeholder}
					aria-label={t.jp_from_placeholder}
					autocomplete="off"
					oninput={(e) => onFieldInput('from', e.currentTarget.value)}
					onfocus={() => onFieldInput('from', fromText)}
				/>
				<button type="button" class="locate" title={t.jp_current_location} aria-label={t.jp_current_location} onclick={() => (fromCurrent = true)}><LocateFixed size={16} strokeWidth={2} /></button>
				{#if activeField === 'from' && suggestions.length > 0}
					<ul class="suggest" role="listbox" transition:slide={{ duration: 160 }}>
						{#each suggestions as s (s)}
							<li class="suggest-item">
								<button type="button" onclick={() => pickSuggestion('from', s)}>
									<span class="suggest-dot" aria-hidden="true"></span>
									<span class="suggest-name">{#each highlightParts(s, fromText) as part, pi (pi)}{#if part.match}<mark>{part.text}</mark>{:else}{part.text}{/if}{/each}</span>
								</button>
							</li>
						{/each}
					</ul>
				{/if}
			{/if}
		</div>

		<div class="field to">
			{#if toFixed}
				<span class="static" class:is-current={toCurrent}>
					{#if toCurrent}<LocateFixed size={15} strokeWidth={2} />{t.jp_current_location}{:else}{toText}{/if}
				</span>
			{:else if toCurrent}
				<span class="chip">
					<LocateFixed size={15} strokeWidth={2} />{t.jp_current_location}
					<button type="button" class="chip-x" aria-label={t.jp_change_destination} onclick={() => (toCurrent = false)}><X size={13} strokeWidth={2.25} /></button>
				</span>
			{:else}
				<input
					type="text"
					bind:value={toText}
					placeholder={t.jp_to_placeholder}
					aria-label={t.jp_to_placeholder}
					autocomplete="off"
					oninput={(e) => onFieldInput('to', e.currentTarget.value)}
					onfocus={() => onFieldInput('to', toText)}
				/>
				<button type="button" class="locate" title={t.jp_current_location} aria-label={t.jp_current_location} onclick={() => (toCurrent = true)}><LocateFixed size={16} strokeWidth={2} /></button>
				{#if activeField === 'to' && suggestions.length > 0}
					<ul class="suggest" role="listbox" transition:slide={{ duration: 160 }}>
						{#each suggestions as s (s)}
							<li class="suggest-item">
								<button type="button" onclick={() => pickSuggestion('to', s)}>
									<span class="suggest-dot" aria-hidden="true"></span>
									<span class="suggest-name">{#each highlightParts(s, toText) as part, pi (pi)}{#if part.match}<mark>{part.text}</mark>{:else}{part.text}{/if}{/each}</span>
								</button>
							</li>
						{/each}
					</ul>
				{/if}
			{/if}
		</div>

		{#if canSwap}
			<button type="button" class="swap" title={t.jp_swap} aria-label={t.jp_swap} onclick={swap}>
				<ArrowDownUp size={18} strokeWidth={2} />
			</button>
		{/if}
	</div>

	<div class="when">
		<div class="when-toggle" role="group" aria-label={t.jp_time_mode}>
			<button type="button" class:active={timeMode === 'departure'} aria-pressed={timeMode === 'departure'} onclick={() => (timeMode = 'departure')}>{t.jp_departure}</button>
			<button type="button" class:active={timeMode === 'arrival'} aria-pressed={timeMode === 'arrival'} onclick={() => (timeMode = 'arrival')}>{t.jp_arrival}</button>
		</div>
		<DatePicker bind:value={dateStr} min={todayStr} {lang} />
		<TimePicker bind:value={timeStr} {lang} />
	</div>

	{#if geoBlocked}
		<p class="geo-hint" role="status">
			<LocateOff size={15} strokeWidth={2} aria-hidden="true" />
			<span>
				{t.jp_geo_blocked}
				{#if (fromCurrent && !fromFixed) || (toCurrent && !toFixed)}
					<button type="button" class="geo-fix" onclick={useManualEntry}>{t.jp_type_instead}</button>
				{:else}
					{t.jp_allow_in_settings}
				{/if}
			</span>
		</p>
	{/if}

	<div class="go-row">
		<button type="button" class="go" onclick={search} disabled={busy}>
			{#if busy}<LoaderCircle size={16} strokeWidth={2} class="spin" />{t.jp_searching}{:else}<Search size={16} strokeWidth={2} />{t.jp_search}{/if}
		</button>
		{#if busy}
			<button type="button" class="cancel" onclick={cancelSearch}>
				<X size={16} strokeWidth={2.25} aria-hidden="true" />{t.jp_cancel}
			</button>
		{/if}
	</div>

	{#if error}
		<p class="err" role="status">{error}</p>
	{/if}

	{#if connections && connections.length > 0}
		<ol class="results">
			{#each enriched as e, i (i)}
				<li class="conn" class:open={expanded === i}>
					<button
						type="button"
						class="conn-head"
						aria-expanded={expanded === i}
						onclick={() => (expanded = expanded === i ? null : i)}
					>
						<div class="times">
							<span class="t">{fmtTime(e.c.from.departure)}</span>
							<ArrowRight size={14} strokeWidth={2} aria-hidden="true" />
							<span class="t">{fmtTime(e.c.to.arrival)}</span>
						</div>
						<div class="meta">
							<span class="dur"><Clock size={13} strokeWidth={1.75} aria-hidden="true" />{fmtDuration(e.c.duration)}</span>
							<span class="xfer">{transfersLabel(e.c.transfers)}</span>
						</div>
						<div class="chips">
							{#each e.chips as chip, ci (ci)}
								{@const Icon = chip.Icon}
								<span class="chip2" data-type={chip.kind === 'walk' ? 'walk' : chip.type}>
									<Icon size={14} strokeWidth={2} aria-hidden="true" />
									{chip.kind === 'walk' ? `${chip.minutes}′` : chip.label}
								</span>
							{/each}
						</div>
						<span class="chev"><ChevronDown size={18} strokeWidth={2} aria-hidden="true" /></span>
					</button>

					{#if expanded === i}
						<div class="itin">
							{#each e.steps as step, si (si)}
								{#if step.kind === 'walk'}
									<div class="walk-step">
										<Footprints size={14} strokeWidth={2} aria-hidden="true" />
										{fmt(t.jp_walk, { min: step.minutes })}
									</div>
								{:else}
									{@const Icon = step.Icon}
									<div class="leg" data-type={step.type}>
										<span class="leg-bar"></span>
										<div class="leg-body">
											<div class="stop">
												<span class="st-time">{step.dep.time}</span>
												<span class="st-name">{step.dep.station}</span>
												{#if step.dep.platform}<span class="st-plat">{t.jp_platform} {step.dep.platform}</span>{/if}
											</div>
											<div class="leg-info">
												<span class="leg-badge"><Icon size={14} strokeWidth={2} aria-hidden="true" />{step.label}</span>
												{#if step.headsign}<span class="leg-dir">{t.jp_direction} {step.headsign}</span>{/if}
											</div>
											<div class="stop">
												<span class="st-time">{step.arr.time}</span>
												<span class="st-name">{step.arr.station}</span>
												{#if step.arr.platform}<span class="st-plat">{t.jp_platform} {step.arr.platform}</span>{/if}
											</div>
										</div>
									</div>
								{/if}
							{/each}
						</div>
					{/if}
				</li>
			{/each}
		</ol>
		{#if sbbLink}
			<a class="more" href={sbbLink} target="_blank" rel="external noopener noreferrer">
				{t.jp_full_timetable} <ExternalLink size={13} strokeWidth={2} aria-hidden="true" />
			</a>
		{/if}
		<p class="credit">{t.jp_credit}</p>
	{/if}
</section>

<style>
	.jp {
		margin-block: 1.5rem;
	}

	/* Precomputed estimate — one quiet line above the widget. It has to read as
	   a caption rather than a result: it is the answer to a rougher question
	   than the one the card below answers. */
	.estimate {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 0.25rem 0.5rem;
		margin-bottom: 0.5rem;
		padding-inline: 0.15rem;
		font-size: 0.85rem;
		color: var(--color-text-secondary);
	}

	.est-icon {
		align-self: center;
		display: inline-flex;
		color: var(--color-primary);
	}

	.est-text {
		margin: 0;
		min-width: 0;
	}

	.est-text strong {
		color: var(--color-text-primary);
		font-variant-numeric: tabular-nums;
		/* Dotted underline says "there is more behind this" without asking to
		   be clicked — the detail is in the title attribute. */
		text-decoration: underline dotted;
		text-underline-offset: 0.2em;
		text-decoration-color: var(--color-border);
	}

	.est-meta::before {
		content: '·';
		margin-inline: 0.35rem;
		color: var(--color-border);
	}

	.est-none {
		font-style: italic;
	}

	.hub-form {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
	}

	.hub-label {
		color: var(--color-text-secondary);
	}

	.hub-select {
		appearance: none;
		background: var(--color-bg-tertiary);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-pill);
		color: var(--color-text-primary);
		font: inherit;
		font-weight: 600;
		padding: 0.1rem 1.35rem 0.1rem 0.6rem;
		/* Chevron drawn in the background so the pill keeps its own shape
		   instead of the platform's select chrome. */
		background-image: linear-gradient(45deg, transparent 50%, currentColor 50%),
			linear-gradient(135deg, currentColor 50%, transparent 50%);
		background-position: right 0.62rem center, right 0.4rem center;
		background-size: 0.28rem 0.28rem, 0.28rem 0.28rem;
		background-repeat: no-repeat;
		cursor: pointer;
	}

	.hub-select:hover {
		background-color: var(--color-bg-elevated);
	}

	.hub-go {
		font: inherit;
		padding: 0.1rem 0.55rem;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-pill);
		background: var(--color-bg-tertiary);
		color: var(--color-text-primary);
		cursor: pointer;
	}

	.card {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr) auto;
		grid-template-rows: 1fr 1fr;
		align-items: center;
		column-gap: 0.85rem;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		padding: 0.35rem 1rem;
		box-shadow: var(--shadow-sm);
	}

	/* Two target dots joined by a line, aligned with the Von / Nach rows. */
	.rail {
		grid-column: 1;
		grid-row: 1 / 3;
		align-self: stretch;
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 0.9rem 0;
	}

	.dot {
		width: 13px;
		height: 13px;
		flex: 0 0 auto;
		border-radius: 50%;
		border: 2px solid var(--color-text-secondary);
		display: grid;
		place-items: center;
	}

	.dot::after {
		content: '';
		width: 3px;
		height: 3px;
		border-radius: 50%;
		background: var(--color-text-secondary);
	}

	.line {
		width: 2px;
		flex: 1 1 auto;
		min-height: 1.1rem;
		background: var(--color-border);
		margin: 3px 0;
	}

	.field {
		position: relative;
		grid-column: 2;
		display: flex;
		align-items: center;
		gap: 0.4rem;
		min-width: 0;
		min-height: 2.9rem;
	}

	/* Station typeahead: grows straight out of the field (no gap, no top edge,
	 * same surface as the card) and continues the route line — each candidate is
	 * a stop on a little spur. */
	.suggest {
		--rail-x: 0.8rem;
		position: absolute;
		top: 100%;
		left: 0;
		right: 0;
		z-index: 40;
		margin: 0;
		padding: 0.15rem 0 0.3rem;
		list-style: none;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-top: none;
		border-radius: 0 0 var(--radius-md) var(--radius-md);
		box-shadow: var(--shadow-md);
		overflow: hidden;
	}

	.suggest-item {
		position: relative;
		margin: 0;
	}

	/* The spur line threading the stop dots. */
	.suggest-item::before {
		content: '';
		position: absolute;
		left: var(--rail-x);
		top: 0;
		bottom: 0;
		width: 2px;
		transform: translateX(-50%);
		background: var(--color-border);
	}
	.suggest-item:first-child::before {
		top: 50%;
	}
	.suggest-item:last-child::before {
		bottom: 50%;
	}

	.suggest button {
		position: relative;
		display: block;
		width: 100%;
		text-align: left;
		appearance: none;
		border: 0;
		background: transparent;
		font: inherit;
		font-size: 0.92rem;
		color: var(--color-text-primary);
		padding: 0.5rem 0.7rem 0.5rem calc(var(--rail-x) + 0.95rem);
		cursor: pointer;
		transition: background var(--transition-fast), color var(--transition-fast);
	}

	.suggest-dot {
		position: absolute;
		left: var(--rail-x);
		top: 50%;
		width: 9px;
		height: 9px;
		transform: translate(-50%, -50%);
		border-radius: 50%;
		border: 2px solid var(--color-text-secondary);
		background: var(--color-surface);
		transition: border-color var(--transition-fast), transform var(--transition-fast);
	}

	.suggest button:hover,
	.suggest button:focus-visible {
		background: var(--color-bg-elevated);
		outline: none;
	}
	.suggest button:hover .suggest-dot,
	.suggest button:focus-visible .suggest-dot {
		border-color: var(--color-primary);
		transform: translate(-50%, -50%) scale(1.15);
	}

	.suggest-name mark {
		background: transparent;
		color: var(--color-primary);
		font-weight: 700;
	}

	.field.from {
		grid-row: 1;
		border-bottom: 1px solid var(--color-border);
	}

	/* When the From suggestions are open, drop the divider so the input flows
	 * straight into the list. */
	.field.from.suggesting {
		border-bottom-color: transparent;
	}

	.field.to {
		grid-row: 2;
	}

	.field input {
		flex: 1 1 auto;
		min-width: 0;
		appearance: none;
		border: 0;
		background: transparent;
		font: inherit;
		font-size: 1rem;
		color: var(--color-text-primary);
		padding: 0.2rem 0;
	}

	.field input::placeholder {
		color: var(--color-text-tertiary);
	}

	.field input:focus {
		outline: none;
	}

	.static {
		flex: 1 1 auto;
		min-width: 0;
		font-size: 1rem;
		color: var(--color-text-primary);
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
	}

	.static.is-current,
	.chip {
		color: var(--color-primary);
	}

	.chip {
		flex: 1 1 auto;
		min-width: 0;
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		font-size: 1rem;
	}

	.chip-x {
		display: inline-flex;
		appearance: none;
		border: 0;
		background: transparent;
		color: var(--color-text-tertiary);
		cursor: pointer;
		padding: 0.1rem;
		margin-left: 0.1rem;
		border-radius: var(--radius-sm);
	}

	.chip-x:hover {
		color: var(--color-text-primary);
	}

	.locate {
		flex: 0 0 auto;
		display: inline-grid;
		place-items: center;
		width: 1.9rem;
		height: 1.9rem;
		appearance: none;
		border: 0;
		background: transparent;
		color: var(--color-text-tertiary);
		cursor: pointer;
		border-radius: 50%;
		transition: color var(--transition-fast), background var(--transition-fast);
	}

	.locate:hover {
		color: var(--color-primary);
		background: var(--color-bg-elevated);
	}

	/* Circular swap button, vertically centred on the divider. */
	.swap {
		grid-column: 3;
		grid-row: 1 / 3;
		justify-self: end;
		align-self: center;
		display: grid;
		place-items: center;
		width: 44px;
		height: 44px;
		appearance: none;
		border: 1px solid var(--color-border);
		border-radius: 50%;
		background: var(--color-surface);
		color: var(--color-text-secondary);
		box-shadow: var(--shadow-sm);
		cursor: pointer;
		transition: color var(--transition-fast), transform var(--transition-fast), box-shadow var(--transition-fast);
	}

	.swap:hover {
		color: var(--color-primary);
		transform: scale(1.06);
		box-shadow: var(--shadow-md);
	}

	.go-row {
		margin-top: 0.75rem;
		display: flex;
		align-items: stretch;
		gap: 0.5rem;
	}

	.go {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.45rem;
		width: 100%;
		appearance: none;
		font: inherit;
		font-size: 0.95rem;
		font-weight: 600;
		padding: 0.6rem 1rem;
		border: 0;
		border-radius: var(--radius-pill);
		background: var(--color-primary);
		color: var(--color-text-on-primary);
		cursor: pointer;
		transition: background var(--transition-fast);
	}

	.go:hover:not(:disabled) {
		background: var(--color-primary-hover);
	}

	/* Sits beside the spinner while a search runs — the only way out when a
	   permission prompt or a slow fix keeps the search hanging. */
	.cancel {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.4rem;
		flex: 0 0 auto;
		appearance: none;
		font: inherit;
		font-size: 0.9rem;
		font-weight: 600;
		padding: 0.6rem 0.9rem;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-pill);
		background: var(--color-bg-tertiary);
		color: var(--color-text-secondary);
		cursor: pointer;
		transition:
			background var(--transition-fast),
			color var(--transition-fast);
	}

	.cancel:hover {
		background: var(--color-bg-elevated);
		color: var(--color-text-primary);
	}

	.geo-hint {
		display: flex;
		align-items: flex-start;
		gap: 0.45rem;
		margin: 0.6rem 0 0;
		font-size: 0.85rem;
		line-height: 1.45;
		color: var(--color-text-secondary);
	}

	.geo-hint :global(svg) {
		flex: 0 0 auto;
		margin-top: 0.15rem;
		color: var(--orange);
	}

	.geo-fix {
		appearance: none;
		border: 0;
		background: none;
		padding: 0;
		font: inherit;
		font-weight: 600;
		color: var(--color-primary);
		cursor: pointer;
		text-decoration: underline;
	}

	.go:disabled {
		opacity: 0.7;
		cursor: progress;
	}

	.go :global(.spin) {
		animation: jp-spin 0.85s linear infinite;
	}

	@keyframes jp-spin {
		to {
			transform: rotate(360deg);
		}
	}

	.err {
		margin: 0.6rem 0 0;
		font-size: 0.85rem;
		color: var(--red);
	}

	.results {
		list-style: none;
		margin: 0.85rem 0 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.conn {
		background: var(--color-bg-secondary);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		overflow: hidden;
	}

	.conn.open {
		border-color: var(--color-primary);
	}

	.conn-head {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.3rem 0.9rem;
		width: 100%;
		padding: 0.6rem 0.85rem;
		appearance: none;
		border: 0;
		background: transparent;
		font: inherit;
		text-align: left;
		cursor: pointer;
		transition: background var(--transition-fast);
	}

	.conn-head:hover {
		background: var(--color-bg-elevated);
	}

	.chev {
		flex: 0 0 auto;
		display: inline-flex;
		align-items: center;
		color: var(--color-text-tertiary);
		transition: transform var(--transition-fast);
	}

	.conn.open .chev {
		transform: rotate(180deg);
	}

	.times {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		font-variant-numeric: tabular-nums;
	}

	.times :global(svg) {
		color: var(--color-text-tertiary);
	}

	.t {
		font-size: 1.05rem;
		font-weight: 700;
		color: var(--color-text-primary);
	}

	.meta {
		display: inline-flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.25rem 0.7rem;
		font-size: 0.8rem;
		color: var(--color-text-secondary);
	}

	.dur {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		font-variant-numeric: tabular-nums;
	}

	/* Collapsed leg chips: a transport-type icon + line label (or walk minutes). */
	.chips {
		display: inline-flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.3rem;
		margin-left: auto;
	}

	.chip2 {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		font-size: 0.72rem;
		font-weight: 700;
		padding: 0.1rem 0.4rem;
		border-radius: var(--radius-sm);
		background: var(--color-bg-tertiary);
		color: var(--color-text-secondary);
		font-variant-numeric: tabular-nums;
	}

	.chip2 :global(svg) {
		flex: 0 0 auto;
	}

	.chip2[data-type='bus'] :global(svg) {
		color: var(--orange);
	}
	.chip2[data-type='tram'] :global(svg) {
		color: var(--red);
	}
	.chip2[data-type='train'] :global(svg),
	.chip2[data-type='ship'] :global(svg) {
		color: var(--blue);
	}
	.chip2[data-type='cable'] :global(svg) {
		color: var(--green);
	}
	.chip2[data-type='walk'] :global(svg) {
		color: var(--color-text-tertiary);
	}

	/* Expanded itinerary: one coloured rail per ride, dotted walk connectors. */
	.itin {
		padding: 0.2rem 0.85rem 0.7rem;
		border-top: 1px solid var(--color-border);
	}

	.leg {
		display: flex;
		gap: 0.7rem;
		--leg-color: var(--blue);
	}
	.leg[data-type='bus'] {
		--leg-color: var(--orange);
	}
	.leg[data-type='tram'] {
		--leg-color: var(--red);
	}
	.leg[data-type='cable'] {
		--leg-color: var(--green);
	}

	.leg-bar {
		flex: 0 0 auto;
		width: 4px;
		border-radius: 2px;
		background: var(--leg-color);
		margin: 0.55rem 0;
	}

	.leg-body {
		flex: 1 1 auto;
		min-width: 0;
		display: flex;
		flex-direction: column;
		padding: 0.4rem 0;
	}

	.stop {
		display: flex;
		align-items: baseline;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.st-time {
		font-variant-numeric: tabular-nums;
		font-weight: 700;
		font-size: 0.9rem;
		color: var(--color-text-primary);
		min-width: 3.1em;
	}

	.st-name {
		font-size: 0.9rem;
		color: var(--color-text-primary);
	}

	.st-plat {
		font-size: 0.72rem;
		color: var(--color-text-tertiary);
	}

	.leg-info {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.4rem;
		padding-left: 3.6em;
		margin: 0.25rem 0;
	}

	.leg-badge {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		font-size: 0.75rem;
		font-weight: 700;
		padding: 0.1rem 0.45rem;
		border-radius: var(--radius-sm);
		background: var(--leg-color);
		color: #fff;
	}

	.leg-dir {
		font-size: 0.78rem;
		color: var(--color-text-secondary);
	}

	.walk-step {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		margin-left: 1px;
		padding: 0.35rem 0 0.35rem 0.7rem;
		border-left: 2px dotted var(--color-border);
		font-size: 0.78rem;
		color: var(--color-text-tertiary);
	}

	.walk-step :global(svg) {
		flex: 0 0 auto;
	}

	/* Departure / arrival time controls. */
	.when {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.5rem 0.75rem;
		margin-top: 0.75rem;
	}

	.when-toggle {
		display: inline-flex;
		gap: 2px;
		padding: 2px;
		background: var(--color-bg-tertiary);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-pill);
	}

	.when-toggle button {
		appearance: none;
		border: 0;
		background: transparent;
		font: inherit;
		font-size: 0.8rem;
		font-weight: 600;
		padding: 0.3rem 0.7rem;
		border-radius: var(--radius-pill);
		color: var(--color-text-secondary);
		cursor: pointer;
		transition: background var(--transition-fast), color var(--transition-fast);
	}

	.when-toggle button:hover {
		color: var(--color-text-primary);
	}

	.when-toggle button.active {
		background: var(--color-primary);
		color: var(--color-text-on-primary);
	}


	.more {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		margin-top: 0.6rem;
		font-size: 0.85rem;
		color: var(--color-primary);
	}

	.credit {
		margin: 0.5rem 0 0;
		font-size: 0.7rem;
		color: var(--color-text-tertiary);
	}
</style>
