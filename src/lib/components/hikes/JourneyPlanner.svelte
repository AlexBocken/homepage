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
	import DatePicker from '$lib/components/DatePicker.svelte';
	import TimePicker from '$lib/components/TimePicker.svelte';

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
	let lastQuery = $state<{ from: string; to: string } | null>(null);
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

	function getPosition(): Promise<GeolocationPosition> {
		if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
			return Promise.reject(new Error('Standort steht in diesem Browser nicht zur Verfügung.'));
		}
		// Geolocation needs a secure context; on plain HTTP (e.g. a LAN IP) the
		// browser silently refuses, which is the usual cause of a vague failure.
		if (typeof window !== 'undefined' && window.isSecureContext === false) {
			return Promise.reject(new Error('Standort benötigt eine sichere (HTTPS-)Verbindung.'));
		}
		return new Promise<GeolocationPosition>((resolve, reject) =>
			navigator.geolocation.getCurrentPosition(
				resolve,
				// A GeolocationPositionError is NOT an Error instance, so map it to
				// one with a readable message — otherwise the catch can't surface it.
				(err) => {
					const msg =
						err.code === err.PERMISSION_DENIED
							? 'Standortfreigabe wurde verweigert.'
							: err.code === err.POSITION_UNAVAILABLE
								? 'Standort ist derzeit nicht verfügbar.'
								: err.code === err.TIMEOUT
									? 'Standortabfrage hat zu lange gedauert.'
									: 'Standort konnte nicht ermittelt werden.';
					reject(new Error(msg));
				},
				// Coarse accuracy is plenty for "nearest stop" and returns far
				// faster on devices without GPS (laptops geolocate via Wi-Fi/IP);
				// high accuracy waits for a GPS fix that never comes and times out.
				// A generous maximumAge lets a recent cached fix resolve instantly.
				{ enableHighAccuracy: false, timeout: 20_000, maximumAge: 300_000 }
			)
		);
	}

	async function nearestStation(): Promise<string> {
		const pos = await getPosition();
		const u = new URL('https://transport.opendata.ch/v1/locations');
		u.searchParams.set('type', 'station');
		u.searchParams.set('x', String(pos.coords.latitude));
		u.searchParams.set('y', String(pos.coords.longitude));
		const res = await fetch(u);
		if (!res.ok) throw new Error('Haltestellensuche fehlgeschlagen.');
		const json = (await res.json()) as { stations?: { name?: string }[] };
		const name = json.stations?.find((s) => s.name)?.name;
		if (!name) throw new Error('Keine Haltestelle in der Nähe gefunden.');
		return name;
	}

	// Station typeahead — the same /locations?type=station endpoint sbb-tui uses,
	// so the reader picks a canonical stop instead of letting /connections
	// geocode a fuzzy string (which yields the odd, roundabout routes).
	let activeField = $state<'from' | 'to' | null>(null);
	let suggestions = $state<string[]>([]);
	let suggestTimer: ReturnType<typeof setTimeout> | null = null;

	async function fetchStations(query: string): Promise<string[]> {
		const u = new URL('https://transport.opendata.ch/v1/locations');
		u.searchParams.set('type', 'station');
		u.searchParams.set('query', query);
		const res = await fetch(u);
		if (!res.ok) return [];
		const json = (await res.json()) as { stations?: { name?: string }[] };
		return (json.stations ?? []).map((s) => s.name?.trim()).filter((n): n is string => !!n);
	}

	async function refreshSuggestions(query: string) {
		const q = query.trim();
		if (q.length < 2) {
			suggestions = [];
			return;
		}
		try {
			suggestions = (await fetchStations(q)).slice(0, 6);
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
	async function resolveStation(query: string): Promise<string> {
		if (!query) return query;
		try {
			const [first] = await fetchStations(query);
			return first ?? query;
		} catch {
			return query;
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

	async function search() {
		activeField = null;
		suggestions = [];
		error = null;
		connections = null;
		expanded = null;
		if (!fromCurrent && !fromText.trim()) {
			error = 'Bitte einen Startpunkt angeben.';
			return;
		}
		if (!toCurrent && !toText.trim()) {
			error = 'Bitte ein Ziel angeben.';
			return;
		}
		busy = true;
		try {
			const fromQ = fromCurrent ? await nearestStation() : await resolveStation(fromText.trim());
			const toQ = toCurrent ? await nearestStation() : await resolveStation(toText.trim());
			const u = new URL('https://transport.opendata.ch/v1/connections');
			u.searchParams.set('from', fromQ);
			u.searchParams.set('to', toQ);
			u.searchParams.set('limit', String(limit));
			u.searchParams.set('date', dateStr);
			u.searchParams.set('time', timeStr || '08:00');
			if (timeMode === 'arrival') u.searchParams.set('isArrivalTime', '1');
			const res = await fetch(u);
			if (!res.ok) throw new Error('Verbindungsabfrage fehlgeschlagen.');
			const json = (await res.json()) as { connections?: Connection[] };
			connections = json.connections ?? [];
			lastQuery = { from: fromQ, to: toQ };
			if (connections.length === 0) error = 'Keine Verbindungen gefunden.';
		} catch (e) {
			console.warn('[JourneyPlanner]', e);
			error = e instanceof Error ? e.message : 'Abfrage fehlgeschlagen.';
		} finally {
			busy = false;
		}
	}

	function fmtTime(iso: string | null): string {
		if (!iso) return '–';
		return new Date(iso).toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' });
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
		return n === 0 ? 'direkt' : n === 1 ? '1 Umstieg' : `${n} Umstiege`;
	}
	const searchChLink = $derived(
		lastQuery
			? `https://fahrplan.search.ch/?from=${encodeURIComponent(lastQuery.from)}&to=${encodeURIComponent(lastQuery.to)}`
			: null
	);
</script>

<section class="jp" aria-label="Anreise mit dem öffentlichen Verkehr">
	<div class="card">
		<div class="rail" aria-hidden="true">
			<span class="dot"></span>
			<span class="line"></span>
			<span class="dot"></span>
		</div>

		<div class="field from" class:suggesting={activeField === 'from' && suggestions.length > 0}>
			{#if fromFixed}
				<span class="static" class:is-current={fromCurrent}>
					{#if fromCurrent}<LocateFixed size={15} strokeWidth={2} />Aktueller Standort{:else}{fromText}{/if}
				</span>
			{:else if fromCurrent}
				<span class="chip">
					<LocateFixed size={15} strokeWidth={2} />Aktueller Standort
					<button type="button" class="chip-x" aria-label="Standort ändern" onclick={() => (fromCurrent = false)}><X size={13} strokeWidth={2.25} /></button>
				</span>
			{:else}
				<input
					type="text"
					bind:value={fromText}
					placeholder="Von"
					aria-label="Von"
					autocomplete="off"
					oninput={(e) => onFieldInput('from', e.currentTarget.value)}
					onfocus={() => onFieldInput('from', fromText)}
				/>
				<button type="button" class="locate" title="Aktueller Standort" aria-label="Aktueller Standort" onclick={() => (fromCurrent = true)}><LocateFixed size={16} strokeWidth={2} /></button>
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
					{#if toCurrent}<LocateFixed size={15} strokeWidth={2} />Aktueller Standort{:else}{toText}{/if}
				</span>
			{:else if toCurrent}
				<span class="chip">
					<LocateFixed size={15} strokeWidth={2} />Aktueller Standort
					<button type="button" class="chip-x" aria-label="Ziel ändern" onclick={() => (toCurrent = false)}><X size={13} strokeWidth={2.25} /></button>
				</span>
			{:else}
				<input
					type="text"
					bind:value={toText}
					placeholder="Nach"
					aria-label="Nach"
					autocomplete="off"
					oninput={(e) => onFieldInput('to', e.currentTarget.value)}
					onfocus={() => onFieldInput('to', toText)}
				/>
				<button type="button" class="locate" title="Aktueller Standort" aria-label="Aktueller Standort" onclick={() => (toCurrent = true)}><LocateFixed size={16} strokeWidth={2} /></button>
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
			<button type="button" class="swap" title="Von und Nach tauschen" aria-label="Von und Nach tauschen" onclick={swap}>
				<ArrowDownUp size={18} strokeWidth={2} />
			</button>
		{/if}
	</div>

	<div class="when">
		<div class="when-toggle" role="group" aria-label="Ab- oder Ankunftszeit">
			<button type="button" class:active={timeMode === 'departure'} aria-pressed={timeMode === 'departure'} onclick={() => (timeMode = 'departure')}>Abfahrt</button>
			<button type="button" class:active={timeMode === 'arrival'} aria-pressed={timeMode === 'arrival'} onclick={() => (timeMode = 'arrival')}>Ankunft</button>
		</div>
		<DatePicker bind:value={dateStr} min={todayStr} lang="de" />
		<TimePicker bind:value={timeStr} lang="de" />
	</div>

	<button type="button" class="go" onclick={search} disabled={busy}>
		{#if busy}<LoaderCircle size={16} strokeWidth={2} class="spin" />Suche…{:else}<Search size={16} strokeWidth={2} />Verbindungen suchen{/if}
	</button>

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
										{step.minutes} Min. zu Fuss
									</div>
								{:else}
									{@const Icon = step.Icon}
									<div class="leg" data-type={step.type}>
										<span class="leg-bar"></span>
										<div class="leg-body">
											<div class="stop">
												<span class="st-time">{step.dep.time}</span>
												<span class="st-name">{step.dep.station}</span>
												{#if step.dep.platform}<span class="st-plat">Gl. {step.dep.platform}</span>{/if}
											</div>
											<div class="leg-info">
												<span class="leg-badge"><Icon size={14} strokeWidth={2} aria-hidden="true" />{step.label}</span>
												{#if step.headsign}<span class="leg-dir">Richtung {step.headsign}</span>{/if}
											</div>
											<div class="stop">
												<span class="st-time">{step.arr.time}</span>
												<span class="st-name">{step.arr.station}</span>
												{#if step.arr.platform}<span class="st-plat">Gl. {step.arr.platform}</span>{/if}
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
		{#if searchChLink}
			<a class="more" href={searchChLink} target="_blank" rel="external noopener noreferrer">
				Ganzer Fahrplan <ExternalLink size={13} strokeWidth={2} aria-hidden="true" />
			</a>
		{/if}
		<p class="credit">Verbindungen: transport.opendata.ch</p>
	{/if}
</section>

<style>
	.jp {
		margin-block: 1.5rem;
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

	.go {
		margin-top: 0.75rem;
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
