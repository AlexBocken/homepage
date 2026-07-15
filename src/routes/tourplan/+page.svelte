<script lang="ts">
	import { untrack } from 'svelte';
	import { fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import { prefersReducedMotion } from 'svelte/motion';
	import Seo from '$lib/components/Seo.svelte';
	import {
		TOUR,
		mapsUrl,
		stopKey,
		audienceOf,
		attendsAktive,
		attendsEhemaligen,
		type Stop,
		type TourDay
	} from './data';
	import { legFrom, formatDuration, formatDistance, type Leg } from './travel';
	import type { PageProps } from './$types';

	const { data }: PageProps = $props();

	// Every stop flattened with an absolute timestamp so "where are we now" is a
	// single scan. July is CEST, so the plan's clock times are +02:00.
	interface FlatStop extends Stop {
		date: string;
		dayLabel: string;
		/** epoch ms, or null when the plan gives no time (e.g. "Noch offen"). */
		at: number | null;
	}

	/** Planned wall-clock instant of a stop. July is CEST, so the plan is +02:00. */
	function plannedAt(date: string, time: string): number {
		return new Date(`${date}T${time}:00+02:00`).getTime();
	}

	function flatten(days: TourDay[]): FlatStop[] {
		const out: FlatStop[] = [];
		for (const day of days) {
			for (const stop of day.stops) {
				const at = stop.time ? plannedAt(day.date, stop.time) : null;
				out.push({ ...stop, date: day.date, dayLabel: day.label, at });
			}
		}
		return out;
	}

	const allStops = flatten(TOUR);
	/** The Aktive march — Ehemalige-only events are not on their route. */
	const aktiveStops = allStops.filter(attendsAktive);
	const ehemaligenStops = allStops.filter(attendsEhemaligen);

	type Located =
		| { state: 'before'; current: null; next: FlatStop }
		| { state: 'current'; current: FlatStop; next: FlatStop | null }
		| { state: 'after'; current: FlatStop; next: null }
		| { state: 'none'; current: null; next: null };

	// Given a (time-ordered) subset of stops and the current instant, work out
	// which stop the corps is standing at and which one comes next. `offsetMs`
	// shifts every planned time forward — that's how the Aktive "Verzug" (delay)
	// slides the whole schedule so the logged station becomes the current one.
	function locate(list: FlatStop[], nowMs: number, offsetMs = 0): Located {
		const timed = list.filter((s) => s.at !== null);
		if (timed.length === 0) return { state: 'none', current: null, next: null };
		const eff = (s: FlatStop) => s.at! + offsetMs;
		const first = timed[0];
		const last = timed[timed.length - 1];
		if (nowMs < eff(first)) return { state: 'before', current: null, next: first };
		if (nowMs >= eff(last)) return { state: 'after', current: last, next: null };
		let idx = 0;
		for (let k = 0; k < timed.length; k++) if (eff(timed[k]) <= nowMs) idx = k;
		return { state: 'current', current: timed[idx], next: timed[idx + 1] ?? null };
	}

	let mode = $state<'aktive' | 'ehemaligen'>('aktive');

	// Card-swap animation. Collapses to an instant cut when the visitor asks for
	// reduced motion — the toggle still works, it just doesn't move.
	const swap = $derived(
		prefersReducedMotion.current
			? { duration: 0 }
			: { duration: 260, easing: cubicOut }
	);

	// Seeded from the server's clock so SSR and the first client render agree
	// (no hydration mismatch, no hero popping in late). On mount we switch to the
	// browser's clock and tick each minute so "current station" stays honest.
	let now = $state<number | null>(untrack(() => data.serverNow));
	$effect(() => {
		now = Date.now();
		const id = setInterval(() => (now = Date.now()), 60_000);
		return () => clearInterval(id);
	});

	// Live Aktive delay ("Verzug"), seeded from the DB and kept in sync after a
	// logged-in user reports a new station. Only the Aktive schedule is shifted;
	// the Ehemaligen-Stationen keep their own printed times.
	let delayMinutes = $state(untrack(() => data.delay?.minutes ?? 0));
	let delayMeta = $state<{ loggedBy: string | null; loggedAt: number | null } | null>(
		untrack(() => (data.delay ? { loggedBy: data.delay.loggedBy, loggedAt: data.delay.loggedAt } : null))
	);
	let saving = $state(false);
	let saveError = $state('');

	const aktiveOffsetMs = $derived(delayMinutes * 60_000);

	const located = $derived(
		now === null
			? null
			: mode === 'ehemaligen'
				? locate(ehemaligenStops, now, 0)
				: locate(aktiveStops, now, aktiveOffsetMs)
	);

	// Signed chip, e.g. "+40 Min" (behind) or "−10 Min" (ahead of the plan).
	function delaySign(m: number): string {
		return `${m > 0 ? '+' : '−'}${Math.abs(m)} Min`;
	}

	function hhmm(ts: number): string {
		return new Intl.DateTimeFormat('de-DE', {
			hour: '2-digit',
			minute: '2-digit',
			timeZone: 'Europe/Berlin'
		}).format(new Date(ts));
	}

	// Report "die Aktive sind gerade hier": derive the delay from how far `now`
	// is past this stop's printed time, persist it, then update in place.
	async function markHere(date: string, stop: Stop) {
		if (!stop.time || now === null || saving) return;
		const planned = new Date(`${date}T${stop.time}:00+02:00`).getTime();
		const minutes = Math.round((now - planned) / 60_000);
		await persist(minutes, stopKey({ date, time: stop.time, name: stop.name }));
	}

	async function persist(minutes: number, stationKey: string | null) {
		saving = true;
		saveError = '';
		try {
			const res = await fetch('/api/tourplan/delay', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ delayMinutes: minutes, stationKey })
			});
			if (!res.ok) throw new Error(await res.text());
			const { delay } = await res.json();
			delayMinutes = delay?.minutes ?? 0;
			delayMeta = delay ? { loggedBy: delay.loggedBy, loggedAt: delay.loggedAt } : null;
		} catch (e) {
			console.error('tourplan: failed to save delay', e);
			saveError = 'Konnte den Verzug nicht speichern.';
		} finally {
			saving = false;
		}
	}

	async function resetDelay() {
		if (saving) return;
		saving = true;
		saveError = '';
		try {
			const res = await fetch('/api/tourplan/delay', { method: 'DELETE' });
			if (!res.ok) throw new Error(await res.text());
			delayMinutes = 0;
			delayMeta = null;
		} catch (e) {
			console.error('tourplan: failed to reset delay', e);
			saveError = 'Konnte den Verzug nicht zurücksetzen.';
		} finally {
			saving = false;
		}
	}

	// The physical march (Aktive, delay-shifted) is the single source of truth for
	// the timeline below — the red "now" marker, and which nodes are already
	// passed. The mode toggle only re-aims the hero and dims the list.
	const aktiveLocated = $derived(now === null ? null : locate(aktiveStops, now, aktiveOffsetMs));
	// Only a genuinely *current* stop counts. In the 'after' state `.current` is
	// the last stop of the tour, which must not read as "they are standing here".
	const aktiveCurrentKey = $derived(
		aktiveLocated?.state === 'current' ? stopKey(aktiveLocated.current) : null
	);
	// The Ehemaligen walk only the (E) stops, on the printed times (no Verzug).
	const ehemLocated = $derived(now === null ? null : locate(ehemaligenStops, now, 0));
	const ehemCurrentKey = $derived(
		ehemLocated?.state === 'current' ? stopKey(ehemLocated.current) : null
	);
	// A planned stop counts as "passed" once now (minus the delay) is past it.
	const compareNow = $derived(now === null ? null : now - aktiveOffsetMs);
	// Day the corps is currently in — used to light up its header.
	const currentDate = $derived(
		aktiveLocated?.state === 'current' ? aktiveLocated.current.date : null
	);

	type StopState = 'current' | 'passed' | 'upcoming' | 'none';
	function stopState(dateStr: string, stop: Stop): StopState {
		if (!stop.time) return 'none';
		if (stopKey({ date: dateStr, time: stop.time, name: stop.name }) === aktiveCurrentKey) return 'current';
		if (now === null || compareNow === null) return 'upcoming';
		// The Verzug is the Aktive's alone; Ehemalige-only events keep their
		// printed times, so they are measured against the raw clock.
		const reference = attendsAktive(stop) ? compareNow : now;
		const at = plannedAt(dateStr, stop.time);
		return at <= reference ? 'passed' : 'upcoming';
	}

	function displayAddress(s: Stop): string {
		if (s.address && s.address.toLowerCase() !== s.city.toLowerCase()) return `${s.address}, ${s.city}`;
		return s.city;
	}

	interface StopRow {
		stop: Stop;
		key: string;
		/** Travel to the next routable stop, once travel data is generated. */
		leg: Leg | null;
		/** Latest departure that still makes the next stop's printed time. */
		departAt: number | null;
		/** The leg eats the whole gap — the plan leaves no time to linger. */
		tight: boolean;
	}

	// Section (town) sub-headers: emitted whenever the town changes down a list.
	// Each stop also carries its outgoing leg and the departure that implies.
	// Called on a full day *or* on the past/live half of one, so the city
	// headers stay correct after the split.
	function withSections(dateStr: string, stops: Stop[]): Array<{ section: string } | { row: StopRow }> {
		const rows: Array<{ section: string } | { row: StopRow }> = [];
		let city = '';
		for (const stop of stops) {
			if (stop.city !== city) {
				city = stop.city;
				rows.push({ section: city });
			}
			const key = stopKey({ date: dateStr, time: stop.time, name: stop.name });
			const leg = stop.time ? legFrom(key) : null;
			let departAt: number | null = null;
			let tight = false;
			if (leg) {
				const [toDate, toTime] = leg.to.split('|');
				departAt = plannedAt(toDate, toTime) - leg.seconds * 1000;
				tight = departAt <= plannedAt(dateStr, stop.time);
			}
			rows.push({ row: { stop, key, leg, departAt, tight } });
		}
		return rows;
	}

	// Split each day into already-passed and still-to-come stops. Everything
	// past collapses behind one fold; the fold vanishes entirely before the tour
	// starts (nothing passed) and holds the whole plan once it's over.
	const dayView = $derived(
		TOUR.map((day) => {
			const past: Stop[] = [];
			const live: Stop[] = [];
			// A timeless row ("Noch offen") has no state of its own — keep it with
			// the stop before it so it never floats loose above the fold.
			let wasPast = false;
			for (const stop of day.stops) {
				wasPast = stop.time ? stopState(day.date, stop) === 'passed' : wasPast;
				(wasPast ? past : live).push(stop);
			}
			return { day, past, live };
		})
	);
	const pastCount = $derived(
		dayView.reduce((n, d) => n + d.past.filter((s) => s.time).length, 0)
	);
	const hasLive = $derived(dayView.some((d) => d.live.length > 0));
</script>

<Seo
	title="Tourplan 2026 – Trommlergruppe Weingarten"
	description="Der Tourplan der Trommlergruppe zum Kinderfest Weingarten 2026 (Fr 10. – Di 14. Juli). Zeigt live, an welcher Station Aktive und Ehemaligen gerade sind."
	lang="de"
/>

<main class="tourplan">
	<header class="masthead">
		<p class="masthead-eyebrow">Kinderfest Weingarten · Fr 10. – Di 14. Juli</p>
		<h1 class="masthead-title">Trommler<span>tour</span> 2026</h1>
	</header>

	{#if located}
		{@const isEhem = mode === 'ehemaligen'}
		<section class="live-wrap" aria-live="polite">
			<h2 class="live-title">
				{located.state === 'current'
					? 'Aktuelle Station'
					: located.state === 'before'
						? 'Nächste Station'
						: 'Tour beendet'}
			</h2>

			<div class="seg" role="tablist" aria-label="Ansicht">
				<button type="button" role="tab" class="seg-aktive" aria-selected={!isEhem} class:on={!isEhem} onclick={() => (mode = 'aktive')}>Aktive</button>
				<button type="button" role="tab" class="seg-ehem" aria-selected={isEhem} class:on={isEhem} onclick={() => (mode = 'ehemaligen')}>Ehemaligen</button>
			</div>

			<!-- Two stacked cards: the inactive one peeks out behind in its own
			     accent, so the toggle reads as flipping between them. -->
			<div class="cards" class:cards--ehem={isEhem}>
				<div class="card-behind" aria-hidden="true"></div>
				<div class="card-stage">
				{#key mode}
				<div
					class="live card-front"
					class:live--ehem={isEhem}
					in:fly={{ y: 16, ...swap, delay: swap.duration ? 80 : 0 }}
					out:fly={{ y: -16, ...swap }}
				>

			{#if located.state === 'current'}
				{@const s = located.current}
				<p class="live-day">{s.dayLabel}</p>
				<div class="live-grid">
					<div class="live-main">
						<p class="live-status"><span class="dot"></span>{isEhem ? 'Ehemaligen-Station' : 'Aktive'} · seit {s.time} Uhr</p>
						<h3 class="live-station">{s.name}</h3>
						<p class="live-addr">{displayAddress(s)}</p>
						{#if mapsUrl(s)}
							<a class="go" href={mapsUrl(s)} target="_blank" rel="noopener noreferrer">Route öffnen<span aria-hidden="true"> →</span></a>
						{/if}
					</div>

					{#if !isEhem && delayMinutes !== 0}
						<div class="verzug" class:verzug--early={delayMinutes < 0}>
							<span class="verzug-num">{delaySign(delayMinutes)}</span>
							<span class="verzug-lab">{delayMinutes > 0 ? 'Verzug' : 'vor Plan'}</span>
							{#if delayMeta?.loggedBy}
								<span class="verzug-by">{delayMeta.loggedBy}{#if delayMeta.loggedAt}, {hhmm(delayMeta.loggedAt)}{/if}</span>
							{/if}
							{#if data.loggedIn}
								<button type="button" class="verzug-reset" onclick={resetDelay} disabled={saving}>zurücksetzen</button>
							{/if}
						</div>
					{/if}
				</div>

				{#if located.next}
					{@const n = located.next}
					{@const nUrl = mapsUrl(n)}
					{@const sLeg = legFrom(stopKey(s))}
					{@const nLeg = sLeg && sLeg.to === stopKey(n) ? sLeg : null}
					<svelte:element
						this={nUrl ? 'a' : 'div'}
						class="next"
						href={nUrl ?? undefined}
						target={nUrl ? '_blank' : undefined}
						rel={nUrl ? 'noopener noreferrer' : undefined}
					>
						<span class="next-lab">danach</span>
						<span class="next-time">{n.time}</span>
						<span class="next-name">{n.name}</span>
						{#if nLeg}
							<span class="next-travel">
								<span aria-hidden="true">{nLeg.mode === 'walking' ? '🚶' : '🚗'}</span>
								{formatDuration(nLeg.seconds)}
								<span class="next-dist">{formatDistance(nLeg.meters)}</span>
							</span>
						{/if}
						{#if nUrl}<span class="next-arr" aria-hidden="true">→</span>{/if}
					</svelte:element>
				{/if}
			{:else if located.state === 'before'}
				{@const s = located.next}
				<p class="live-day">{s.dayLabel}</p>
				<div class="live-grid">
					<div class="live-main">
						<p class="live-status">{isEhem ? 'Ehemaligen-Station' : 'Aktive'} · ab {s.time} Uhr</p>
						<h3 class="live-station">{s.name}</h3>
						<p class="live-addr">{displayAddress(s)}</p>
						{#if mapsUrl(s)}
							<a class="go" href={mapsUrl(s)} target="_blank" rel="noopener noreferrer">Route öffnen<span aria-hidden="true"> →</span></a>
						{/if}
					</div>
				</div>
			{:else}
				<p class="live-day">{isEhem ? 'Ehemaligen' : 'Tour 2026'}</p>
				<div class="live-grid">
					<div class="live-main">
						<h3 class="live-station">Beendet</h3>
						<p class="live-addr">
							{isEhem ? 'Keine weiteren Ehemaligen-Stationen.' : 'Bis zum nächsten Kinderfest!'}
						</p>
					</div>
				</div>
			{/if}

				</div>
				{/key}
				</div>
			</div>

			{#if saveError}<p class="err">{saveError}</p>{/if}
		</section>
	{/if}

	{#if aktiveCurrentKey || ehemCurrentKey}
		<nav class="jump" aria-label="Zur aktuellen Station im Plan springen">
			{#if aktiveCurrentKey}
				<a
					class="jump-btn jump-btn--aktive"
					href="#now-aktive"
					aria-label="Zur aktuellen Station der Aktiven im Plan springen"
				>
					<span class="chip-dot" aria-hidden="true"></span>
					Aktive im Plan
					<span class="jump-arr" aria-hidden="true">↓</span>
				</a>
			{/if}
			{#if ehemCurrentKey}
				<a
					class="jump-btn jump-btn--ehem"
					href="#now-ehemaligen"
					aria-label="Zur aktuellen Station der Ehemaligen im Plan springen"
				>
					<span class="chip-dot" aria-hidden="true"></span>
					Ehemaligen im Plan
					<span class="jump-arr" aria-hidden="true">↓</span>
				</a>
			{/if}
		</nav>
	{/if}

	{#snippet dayBlock(dateStr: string, label: string, stops: Stop[], isNow: boolean)}
		<section class="rday" class:rday--now={isNow}>
			<h2 class="rday-head"><span class="rday-mark"></span>{label}</h2>
			<ol class="rlist" class:rlist--ehem={mode === 'ehemaligen'}>
				{#each withSections(dateStr, stops) as row, i (i)}
					{#if 'section' in row}
						<li class="rcity"><span>{row.section}</span></li>
					{:else}
						{@const s = row.row.stop}
						{@const leg = row.row.leg}
						{@const st = stopState(dateStr, s)}
						{@const href = mapsUrl(s)}
						{@const isAktiveNow = row.row.key === aktiveCurrentKey}
						{@const isEhemNow = row.row.key === ehemCurrentKey}
						<li
							class="r r--{st}"
							class:r--ehem={attendsEhemaligen(s)}
							class:r--ehemonly={audienceOf(s) === 'ehemaligen'}
							class:r--ehemnow={isEhemNow}
							class:r--muster={s.kind === 'muster'}
							class:r--finale={s.kind === 'finale'}
						>
							{#if isAktiveNow}<span class="anchor" id="now-aktive"></span>{/if}
							{#if isEhemNow}<span class="anchor" id="now-ehemaligen"></span>{/if}
							<span class="r-node" aria-hidden="true"></span>
							<span class="r-time">
								<span>{s.time || ''}</span>
								{#if row.row.departAt !== null}
									<span
										class="r-depart"
										class:r-depart--tight={row.row.tight}
										title={row.row.tight
											? 'Die Fahrzeit füllt die ganze Pause — hier wird es knapp.'
											: 'Spätestens abfahren, um die nächste Station pünktlich zu erreichen'}
									>ab {hhmm(row.row.departAt)}</span>
								{/if}
							</span>
							<span class="r-body">
								<span class="r-name">
									{s.name}
									{#if audienceOf(s) === 'ehemaligen'}
										<span class="etag etag--only" title="Nur für Ehemalige – die Aktive sind hier nicht">nur Ehemalige</span>
									{:else if attendsEhemaligen(s)}
										<span class="etag" title="Ehemaligen-Station">E</span>
									{/if}
									{#if isAktiveNow}
										<span class="chip chip--aktive"><span class="chip-dot" aria-hidden="true"></span>Aktive</span>
									{/if}
									{#if isEhemNow}
										<span class="chip chip--ehem"><span class="chip-dot" aria-hidden="true"></span>Ehemaligen</span>
									{/if}
								</span>
								{#if s.note}<span class="r-note">{s.note}</span>{/if}
								{#if s.address}<span class="r-addr">{displayAddress(s)}</span>{/if}
							</span>
							<span class="r-act">
								{#if href}
									<a class="r-map" href={href} target="_blank" rel="noopener noreferrer" aria-label={`Route zu ${s.name}`}>
										Route<span aria-hidden="true"> →</span>
									</a>
								{/if}
								{#if data.loggedIn && s.time}
									<button
										type="button"
										class="r-here"
										onclick={() => markHere(dateStr, s)}
										disabled={saving}
										title="Aktive sind gerade hier – Verzug melden"
										aria-label={`Aktive sind gerade bei ${s.name}`}
									>hier</button>
								{/if}
							</span>
						</li>
						{#if leg}
							<li class="rleg">
								<span aria-hidden="true">{leg.mode === 'walking' ? '🚶' : '🚗'}</span>
								<span class="rleg-dur">{formatDuration(leg.seconds)}</span>
								<span class="rleg-dist">{formatDistance(leg.meters)}</span>
							</li>
						{/if}
					{/if}
				{/each}
			</ol>
		</section>
	{/snippet}

	<div class="route">
		<!-- Everything already behind the corps collapses into one fold, shut by
		     default. It disappears before the tour starts (nothing passed). -->
		{#if pastCount > 0}
			<details class="past-fold">
				<summary>
					<span class="past-chevron" aria-hidden="true">▸</span>
					{pastCount} vergangene {pastCount === 1 ? 'Station' : 'Stationen'}
				</summary>
				{#each dayView as { day, past } (day.date)}
					{#if past.length > 0}
						{@render dayBlock(day.date, day.label, past, false)}
					{/if}
				{/each}
			</details>
		{/if}

		{#each dayView as { day, live } (day.date)}
			{#if live.length > 0}
				{@render dayBlock(day.date, day.label, live, day.date === currentDate)}
			{/if}
		{/each}

		{#if !hasLive && pastCount === 0}
			<p class="route-empty">Der Plan erscheint hier, sobald die Tour beginnt.</p>
		{/if}
	</div>
</main>

<style>
	/* Red = live / now / Verzug (corps colour). Orange = Ehemaligen stations.
	   Blue (--color-primary) = navigation. Everything else stays on the quiet
	   Nord surface/text tokens so the one red accent carries the page. */
	.tourplan {
		/* --orange is a light salmon in both themes, so white text on it fails
		   contrast. Every orange surface uses this dark ink instead. */
		--ink-on-orange: #2e3440;
		max-width: 640px;
		margin-inline: auto;
		/* This route has no Header, so nothing else pushes it clear of the status
		   bar. In the edge-to-edge app the inset is non-zero and the masthead
		   would sit under the clock; on the web it resolves to 0px. */
		padding: calc(2rem + env(safe-area-inset-top, 0px)) 1.15rem 5rem;
		color: var(--color-text-primary);
	}

	/* --- Masthead ---------------------------------------------------------- */
	.masthead {
		margin-bottom: 1.75rem;
	}
	.masthead-eyebrow {
		margin: 0 0 0.35rem;
		font-size: var(--text-sm);
		font-weight: 600;
		letter-spacing: 0.02em;
		color: var(--color-text-secondary);
	}
	.masthead-title {
		margin: 0;
		font-size: clamp(2rem, 9vw, 2.9rem);
		font-weight: 800;
		letter-spacing: -0.03em;
		line-height: 0.95;
	}
	.masthead-title span {
		color: var(--red);
	}

	/* --- Live panel -------------------------------------------------------- */
	.live-wrap {
		margin-bottom: 1.5rem;
	}
	.live-title {
		margin: 0 0 0.85rem;
		font-size: clamp(1.4rem, 5.5vw, 1.8rem);
		font-weight: 800;
		letter-spacing: -0.02em;
		line-height: 1.1;
	}

	/* Two stacked cards. The inactive one peeks out below in its own accent, so
	   the Aktive/Ehemaligen toggle reads as flipping the front card. */
	.cards {
		--back-accent: var(--orange);
		position: relative;
		margin-bottom: 1.1rem;
	}
	.cards--ehem {
		--back-accent: var(--red);
	}
	.card-behind {
		position: absolute;
		inset: 0;
		border-radius: var(--radius-card);
		background: color-mix(in srgb, var(--back-accent) 38%, var(--color-surface));
		box-shadow: var(--shadow-sm);
		transform: translateY(0.95rem) scaleX(0.94);
		transition: background var(--transition-normal), transform var(--transition-normal);
	}
	.cards:hover .card-behind {
		transform: translateY(1.15rem) scaleX(0.94);
	}
	/* Outgoing and incoming cards share one grid cell, so they cross-fade in
	   place instead of stacking and shoving the page down mid-swap.
	 *
	 * The stage also carries the card's opaque surface, radius and shadow. Both
	 * fronts are translucent mid-fade, and without a full-width surface beneath
	 * them the page shows through everywhere the narrower back card isn't — the
	 * card appears to shrink and then snap back to full width. `z-index` lifts
	 * the stage above the absolutely-positioned back card. */
	.card-stage {
		position: relative;
		z-index: 1;
		display: grid;
		border-radius: var(--radius-card);
		background: var(--color-surface);
		box-shadow: var(--shadow-md);
	}
	.card-front {
		grid-area: 1 / 1;
	}

	/* The front card is the highlight: a wash of the status colour, no rails.
	   One accent variable drives the wash, the eyebrow and the live dot. */
	.live {
		--live-accent: var(--red);
		position: relative;
		background: color-mix(in srgb, var(--live-accent) 9%, var(--color-surface));
		border-radius: var(--radius-card);
		padding: 1.25rem 1.35rem 1.1rem;
		overflow: hidden;
		transition: background var(--transition-normal);
	}
	.live--ehem {
		--live-accent: var(--orange);
		background: color-mix(in srgb, var(--live-accent) 13%, var(--color-surface));
	}

	/* segmented control */
	.seg {
		display: inline-flex;
		gap: 0.15rem;
		padding: 0.2rem;
		margin-bottom: 1.1rem;
		background: var(--color-bg-tertiary);
		border-radius: var(--radius-pill);
	}
	.seg button {
		border: none;
		background: transparent;
		color: var(--color-text-secondary);
		font: inherit;
		font-size: var(--text-sm);
		font-weight: 600;
		padding: 0.35rem 0.95rem;
		border-radius: var(--radius-pill);
		cursor: pointer;
		transition: color var(--transition-fast), background var(--transition-fast);
	}
	/* The selected pill carries its group's accent — the same red/orange the
	   card, chips and jump buttons use. */
	.seg button.on {
		color: #fff;
		box-shadow: var(--shadow-sm);
	}
	.seg button.seg-aktive.on {
		background: var(--red);
	}
	/* Needs to outrank `.seg button.on`'s white ink, hence the element selector. */
	.seg button.seg-ehem.on {
		background: var(--orange);
		color: var(--ink-on-orange);
	}

	.live-day {
		margin: 0 0 0.15rem;
		font-size: var(--text-sm);
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.12em;
		color: var(--live-accent);
	}

	.live-grid {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem 1.25rem;
	}
	.live-main {
		flex: 1 1 62%;
		min-width: 0;
	}
	.live-status {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		margin: 0.2rem 0 0.1rem;
		font-size: var(--text-sm);
		color: var(--color-text-secondary);
	}
	.dot {
		flex: none;
		width: 0.5rem;
		height: 0.5rem;
		border-radius: 50%;
		background: var(--live-accent);
		animation: dotpulse 2s ease-out infinite;
	}
	.live-station {
		margin: 0;
		font-size: clamp(2.1rem, 8.5vw, 3rem);
		font-weight: 800;
		letter-spacing: -0.025em;
		line-height: 1;
	}
	.live-addr {
		margin: 0.4rem 0 0;
		color: var(--color-text-tertiary);
	}
	.go {
		display: inline-block;
		margin-top: 0.85rem;
		padding: 0.5rem 1.1rem;
		background: var(--color-primary);
		color: var(--color-text-on-primary);
		font-weight: 600;
		font-size: var(--text-sm);
		text-decoration: none;
		border-radius: var(--radius-pill);
		transition: background var(--transition-normal);
	}
	.go:hover {
		background: var(--color-primary-hover);
	}

	/* Verzug — a primary number, given its own tile */
	.verzug {
		flex: 0 0 auto;
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		text-align: right;
		padding: 0.6rem 0.9rem;
		border-radius: var(--radius-lg);
		background: color-mix(in srgb, var(--red) 26%, var(--color-surface));
	}
	.verzug--early {
		background: color-mix(in srgb, var(--green) 26%, var(--color-surface));
	}
	.verzug-num {
		font-size: clamp(1.9rem, 7vw, 2.4rem);
		font-weight: 800;
		font-variant-numeric: tabular-nums;
		line-height: 1;
		letter-spacing: -0.02em;
		color: var(--red);
	}
	.verzug--early .verzug-num {
		color: var(--green);
	}
	.verzug-lab {
		margin-top: 0.15rem;
		font-size: var(--text-xs, 0.72rem);
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--color-text-secondary);
	}
	.verzug-by {
		margin-top: 0.35rem;
		font-size: var(--text-xs, 0.72rem);
		color: var(--color-text-tertiary);
	}
	.verzug-reset {
		margin-top: 0.4rem;
		border: none;
		background: none;
		padding: 0;
		font: inherit;
		font-size: var(--text-xs, 0.72rem);
		color: var(--color-text-secondary);
		text-decoration: underline;
		cursor: pointer;
	}
	.verzug-reset:disabled {
		opacity: 0.5;
		cursor: default;
	}

	/* next stop — one quiet line */
	/* "danach" sits in its own recessed block rather than under a hairline */
	.next {
		display: flex;
		align-items: baseline;
		gap: 0.6rem;
		margin-top: 1.1rem;
		padding: 0.6rem 0.8rem;
		border-radius: var(--radius-md);
		background: color-mix(in srgb, var(--color-text-primary) 7%, transparent);
		text-decoration: none;
		color: inherit;
		transition: background var(--transition-fast);
	}
	.next:hover {
		background: color-mix(in srgb, var(--color-text-primary) 12%, transparent);
	}
	.next-lab {
		font-size: var(--text-xs, 0.72rem);
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--color-text-tertiary);
	}
	.next-time {
		font-weight: 700;
		font-variant-numeric: tabular-nums;
		color: var(--color-text-secondary);
	}
	.next-name {
		font-weight: 600;
	}
	.next-travel {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		padding: 0.1rem 0.5rem;
		border-radius: var(--radius-pill);
		background: color-mix(in srgb, var(--color-text-primary) 9%, transparent);
		font-size: var(--text-xs, 0.72rem);
		font-weight: 600;
		white-space: nowrap;
		color: var(--color-text-secondary);
	}
	.next-dist {
		font-weight: 500;
		opacity: 0.75;
	}
	.next-dist::before {
		content: '·';
		margin-right: 0.3rem;
	}
	.next-arr {
		margin-left: auto;
		color: var(--color-primary);
		font-weight: 700;
	}
	.next:hover .next-name {
		color: var(--color-primary);
	}

	.err {
		margin: 0.75rem 0 0;
		color: var(--red);
		font-size: var(--text-sm);
	}

	/* --- Past fold --------------------------------------------------------- */
	.past-fold {
		margin-bottom: 2.25rem;
	}
	.past-fold > summary {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 0.95rem;
		border-radius: var(--radius-pill);
		background: var(--color-bg-tertiary);
		color: var(--color-text-secondary);
		font-size: var(--text-sm);
		font-weight: 600;
		cursor: pointer;
		list-style: none;
		user-select: none;
	}
	.past-fold > summary::-webkit-details-marker {
		display: none;
	}
	.past-fold > summary:hover {
		color: var(--color-text-primary);
	}
	.past-chevron {
		font-size: 0.7rem;
		transition: transform var(--transition-fast);
	}
	.past-fold[open] .past-chevron {
		transform: rotate(90deg);
	}
	/* Past days sit slightly recessed so the live plan below reads as primary. */
	.past-fold[open] {
		margin-top: 0.9rem;
		opacity: 0.72;
	}
	.past-fold[open] > summary {
		margin-bottom: 1.1rem;
	}

	.route-empty {
		margin: 1rem 0;
		color: var(--color-text-tertiary);
	}

	/* --- Route timeline ---------------------------------------------------- */
	.rday {
		margin-bottom: 2.25rem;
	}
	.rday-head {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		margin: 0 0 0.6rem;
		font-size: 1.15rem;
		font-weight: 800;
		letter-spacing: -0.01em;
		color: var(--color-text-secondary);
	}
	.rday-mark {
		width: 0.6rem;
		height: 0.6rem;
		border-radius: 50%;
		background: var(--color-border);
	}
	.rday--now .rday-head {
		color: var(--color-text-primary);
	}
	.rday--now .rday-mark {
		background: var(--red);
	}

	.rlist {
		position: relative;
		list-style: none;
		margin: 0;
		padding: 0;
	}
	/* the march spine */
	.rlist::before {
		content: '';
		position: absolute;
		top: 0.55rem;
		bottom: 0.55rem;
		left: 0.36rem;
		width: 2px;
		background: var(--color-border);
	}

	.rcity {
		padding: 0.6rem 0 0.25rem 1.6rem;
		font-size: var(--text-xs, 0.72rem);
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.14em;
		color: var(--color-text-tertiary);
	}

	.r {
		position: relative;
		display: grid;
		/* wide enough for the "ab 10:55" departure line under the arrival time */
		grid-template-columns: 3.7rem 1fr auto;
		align-items: baseline;
		column-gap: 0.7rem;
		padding: 0.5rem 0 0.5rem 1.6rem;
	}
	/* Nodes are solid fills, wide enough to cover the spine behind them — so no
	   halo ring is needed and they sit cleanly on any row wash. */
	.r-node {
		position: absolute;
		left: 0;
		top: 0.62rem;
		width: 0.72rem;
		height: 0.72rem;
		border-radius: 50%;
		background: var(--color-border);
	}
	/* passed = filled muted; current day recolours its passed nodes red */
	.r--passed .r-node {
		background: var(--color-text-tertiary);
	}
	.rday--now .r--passed .r-node {
		background: var(--red);
	}
	/* current live marker — one channel, one meaning: the node encodes progress
	   only, so nothing else may recolour it. */
	.r--current .r-node {
		width: 0.95rem;
		height: 0.95rem;
		top: 0.5rem;
		left: -0.11rem;
		background: var(--red);
		animation: ring 1.8s ease-out infinite;
	}
	/* finale = squared-off end node */
	.r--finale .r-node {
		border-radius: 3px;
	}

	.r-time {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		font-size: 0.9rem;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
		color: var(--color-text-tertiary);
		text-align: right;
	}
	/* latest departure that still makes the next station on time */
	.r-depart {
		margin-top: 0.1rem;
		font-size: 0.68rem;
		font-weight: 600;
		letter-spacing: 0.01em;
		color: var(--color-text-tertiary);
		opacity: 0.75;
	}
	.r-depart--tight {
		color: var(--red);
		opacity: 1;
	}

	/* travel between two stops, sitting on the spine */
	.rleg {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0 0 0.15rem 1.6rem;
		font-size: 0.72rem;
		color: var(--color-text-tertiary);
	}
	.rleg-dur {
		font-weight: 700;
	}
	.rleg-dist::before {
		content: '·';
		margin-right: 0.4rem;
	}
	.r--current .r-time,
	.rday--now .r--passed .r-time {
		color: var(--color-text-secondary);
	}
	.r-body {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}
	.r-name {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.3rem 0.4rem;
		font-weight: 600;
		line-height: 1.25;
	}
	.r--current .r-name {
		font-weight: 800;
	}
	.etag {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 1.05rem;
		height: 1.05rem;
		padding: 0 0.2rem;
		border-radius: 0.3rem;
		background: var(--orange);
		color: var(--ink-on-orange);
		font-size: 0.62rem;
		font-weight: 800;
	}
	.etag--only {
		padding: 0 0.4rem;
		font-size: 0.58rem;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		white-space: nowrap;
	}
	.r-note {
		font-size: var(--text-sm);
		color: var(--green);
	}
	.r-addr {
		font-size: 0.82rem;
		color: var(--color-text-tertiary);
	}
	.r-act {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		align-self: center;
	}
	.r-map {
		font-size: 0.82rem;
		font-weight: 600;
		color: var(--color-primary);
		text-decoration: none;
		white-space: nowrap;
	}
	.r-map:hover {
		text-decoration: underline;
	}
	.r-here {
		font: inherit;
		font-size: 0.78rem;
		font-weight: 600;
		white-space: nowrap;
		color: var(--color-text-secondary);
		background: color-mix(in srgb, var(--color-text-primary) 10%, transparent);
		border: none;
		border-radius: var(--radius-pill);
		padding: 0.2rem 0.6rem;
		cursor: pointer;
		transition: color var(--transition-fast), background var(--transition-fast);
	}
	.r-here:hover:not(:disabled) {
		color: var(--color-text-on-primary);
		background: var(--color-primary);
	}
	.r-here:disabled {
		opacity: 0.5;
		cursor: default;
	}

	/* Row highlighting is a wash, never an outline. Red always means "the Aktive
	   are here now"; orange means "the Ehemaligen are here now". */
	.r--ehem,
	.r--ehemnow,
	.r--ehemonly,
	.r--current {
		border-radius: var(--radius-md);
	}
	/* Ehemalige-only events sit in the timeline but not on the Aktive march, so
	   their node never carries the corps' progress colour. */
	.r--ehemonly {
		background: color-mix(in srgb, var(--orange) 10%, transparent);
	}
	.r--ehemonly .r-node,
	.rday--now .r--ehemonly .r-node {
		background: var(--orange);
		opacity: 0.5;
	}
	/* Ehemaligen view: their stops get an orange wash to stand out. The other
	   stops keep full contrast — the plan stays readable in both views. */
	.rlist--ehem .r--ehem {
		background: color-mix(in srgb, var(--orange) 20%, transparent);
	}
	.r--ehemnow {
		background: color-mix(in srgb, var(--orange) 22%, transparent);
	}
	/* Red wins wherever the two coincide — both chips still render. */
	.r--current,
	.r--current.r--ehemnow,
	.rlist--ehem .r--current.r--ehem {
		background: color-mix(in srgb, var(--red) 18%, transparent);
	}

	/* Scroll target parked above the row so the jump doesn't hide it under the nav. */
	.anchor {
		position: absolute;
		top: -5.5rem;
		left: 0;
		width: 0;
		height: 0;
	}

	/* "who is standing here" markers */
	.chip {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		padding: 0.1rem 0.5rem;
		border-radius: var(--radius-pill);
		font-size: 0.62rem;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		white-space: nowrap;
		color: #fff;
	}
	.chip--aktive {
		background: var(--red);
	}
	.chip--ehem {
		background: var(--orange);
		color: var(--ink-on-orange);
	}
	.chip-dot {
		flex: none;
		width: 0.34rem;
		height: 0.34rem;
		border-radius: 50%;
		background: currentColor;
		animation: chippulse 2s ease-in-out infinite;
	}

	/* --- Jump-to-now buttons ------------------------------------------------ */
	.jump {
		display: flex;
		flex-wrap: wrap;
		gap: 0.6rem;
		margin: 0 0 2.5rem;
	}
	.jump-arr {
		font-weight: 800;
		opacity: 0.85;
	}
	.jump-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
		padding: 0.45rem 0.95rem;
		border-radius: var(--radius-pill);
		font-size: var(--text-sm);
		font-weight: 700;
		text-decoration: none;
		color: #fff;
		transition: filter var(--transition-fast);
	}
	.jump-btn:hover {
		filter: brightness(1.08);
	}
	.jump-btn--aktive {
		background: var(--red);
	}
	.jump-btn--ehem {
		background: var(--orange);
		color: var(--ink-on-orange);
	}

	@keyframes chippulse {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.3; }
	}

	@keyframes dotpulse {
		0% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--live-accent) 55%, transparent); }
		70%, 100% { box-shadow: 0 0 0 0.5rem transparent; }
	}
	@keyframes ring {
		0% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--red) 50%, transparent); }
		70%, 100% { box-shadow: 0 0 0 0.6rem transparent; }
	}
	@media (prefers-reduced-motion: reduce) {
		.dot, .r--current .r-node, .chip-dot { animation: none; }
	}

	@media (max-width: 540px) {
		.r {
			grid-template-columns: 2.7rem 1fr;
			row-gap: 0.1rem;
		}
		.r-act {
			grid-column: 2 / -1;
			justify-content: flex-start;
			margin-top: 0.2rem;
		}
	}

	@media (max-width: 430px) {
		.verzug {
			align-items: flex-start;
			text-align: left;
		}
		.live-grid {
			flex-direction: column;
		}
	}
</style>
