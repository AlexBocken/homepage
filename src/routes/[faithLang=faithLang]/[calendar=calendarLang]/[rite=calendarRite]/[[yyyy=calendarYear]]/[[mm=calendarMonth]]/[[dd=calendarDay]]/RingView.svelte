<script lang="ts">
	import type { YearDay, SeasonArc } from './+page.server';
	import type { CalendarLang } from '../../../../calendarI18n';
	import { litBg, litInk, rankDotSize } from '../../../../calendarColors';
	import { Tween, prefersReducedMotion } from 'svelte/motion';
	import { cubicOut } from 'svelte/easing';
	import { untrack } from 'svelte';
	import { goto } from '$app/navigation';

	let {
		year,
		liturgicalYear,
		yearDays,
		seasonArcs,
		todayIso,
		selectedIso = null,
		highlightToday = true,
		lang,
		dayHref,
		windowStart,
		windowEnd,
		liturgicalYearStart,
		inPostPentecost
	}: {
		year: number;
		liturgicalYear: number;
		yearDays: YearDay[];
		seasonArcs: SeasonArc[];
		todayIso: string;
		selectedIso?: string | null;
		highlightToday?: boolean;
		lang: CalendarLang;
		dayHref: (iso: string) => string;
		windowStart: string;
		windowEnd: string;
		liturgicalYearStart: string;
		inPostPentecost: boolean;
	} = $props();

	const size = 560;
	const cx = size / 2;
	const cy = size / 2;
	const rOuter = 240;
	const rSeason = 200;
	const rSeasonInner = 140;
	const rFeasts = 250;
	// Gap reserved at the end-of-post-Pentecost seam for the next-year wedge.
	// Arcs are squeezed into (2π - ringGap) so the wedge gets its own slot.
	const ringGap = 0.09;

	function isoToUTC(iso: string): number {
		const [yy, mm, dd] = iso.split('-').map(Number);
		return Date.UTC(yy, mm - 1, dd);
	}
	function dayOfWindow(iso: string): number {
		return Math.floor((isoToUTC(iso) - isoToUTC(windowStart)) / 86400000);
	}
	function isoInWindow(iso: string | null | undefined): boolean {
		return !!iso && iso >= windowStart && iso < windowEnd;
	}

	const totalDays = $derived(
		Math.floor((isoToUTC(windowEnd) - isoToUTC(windowStart)) / 86400000)
	);
	const todayDoy = $derived(isoInWindow(todayIso) ? dayOfWindow(todayIso) : null);
	const selectedDoy = $derived(isoInWindow(selectedIso) ? dayOfWindow(selectedIso!) : null);
	// The pivot doy lands at -90° (top). Prefer the selected day; fall back to
	// today; fall back to Jan 1 for off-year views.
	const targetPivot = $derived(selectedDoy ?? todayDoy ?? 0);

	// Tween the pivot so rotating to a new feast is a smooth sweep rather than a
	// snap. We pick the shortest arc (modular), so e.g. Dec 28 → Jan 5 doesn't
	// spin the long way around.
	const pivotTween = new Tween(untrack(() => targetPivot), { duration: 650, easing: cubicOut });
	$effect(() => {
		const current = pivotTween.current;
		const total = totalDays;
		let delta = targetPivot - current;
		const half = total / 2;
		if (delta > half) delta -= total;
		if (delta < -half) delta += total;
		const next = current + delta;
		if (prefersReducedMotion.current) {
			pivotTween.set(next, { duration: 0 });
		} else {
			pivotTween.target = next;
		}
	});
	const pivot = $derived(pivotTween.current);
	function angleFromDoy(doy: number): number {
		return -Math.PI / 2 + ((doy - pivot) / totalDays) * (Math.PI * 2 - ringGap);
	}

	// Build one season-in-view from a raw SeasonArc.
	type ResolvedArc = SeasonArc & { a0: number; a1: number };
	const resolvedArcs = $derived<ResolvedArc[]>(
		seasonArcs.map((s) => {
			const a0 = angleFromDoy(dayOfWindow(s.start));
			// include the end day, so add one day before closing the arc
			const a1 = angleFromDoy(dayOfWindow(s.end) + 1);
			return { ...s, a0, a1 };
		})
	);

	function arcPath(
		ax: number,
		ay: number,
		rIn: number,
		rOut: number,
		a0: number,
		a1: number
	): string {
		const large = a1 - a0 > Math.PI ? 1 : 0;
		const x0o = ax + rOut * Math.cos(a0);
		const y0o = ay + rOut * Math.sin(a0);
		const x1o = ax + rOut * Math.cos(a1);
		const y1o = ay + rOut * Math.sin(a1);
		const x0i = ax + rIn * Math.cos(a0);
		const y0i = ay + rIn * Math.sin(a0);
		const x1i = ax + rIn * Math.cos(a1);
		const y1i = ay + rIn * Math.sin(a1);
		return `M ${x0o} ${y0o} A ${rOut} ${rOut} 0 ${large} 1 ${x1o} ${y1o} L ${x1i} ${y1i} A ${rIn} ${rIn} 0 ${large} 0 ${x0i} ${y0i} Z`;
	}
	function arcOnly(ax: number, ay: number, r: number, a0: number, a1: number): string {
		const large = a1 - a0 > Math.PI ? 1 : 0;
		return `M ${ax + r * Math.cos(a0)} ${ay + r * Math.sin(a0)} A ${r} ${r} 0 ${large} 1 ${ax + r * Math.cos(a1)} ${ay + r * Math.sin(a1)}`;
	}
	function arcReversed(ax: number, ay: number, r: number, a0: number, a1: number): string {
		const large = a1 - a0 > Math.PI ? 1 : 0;
		return `M ${ax + r * Math.cos(a1)} ${ay + r * Math.sin(a1)} A ${r} ${r} 0 ${large} 0 ${ax + r * Math.cos(a0)} ${ay + r * Math.sin(a0)}`;
	}

	// Enumerate every first-of-month that falls within the window. The window
	// can span 13 civil-month boundaries (e.g. Advent-cut Dec(Y-1)..Nov(Y) shows
	// Jan..Nov of year Y + Dec of Y-1). Returns each with its label + day-offset
	// so month ticks land at the correct ring angle regardless of which year
	// the month belongs to.
	type MonthMark = { label: string; doy: number };
	const monthMarks = $derived.by<MonthMark[]>(() => {
		const out: MonthMark[] = [];
		const [wsY, wsM, wsD] = windowStart.split('-').map(Number);
		let y = wsY;
		let m = wsM - 1;
		if (wsD !== 1) {
			m += 1;
			if (m > 11) { m = 0; y += 1; }
		}
		for (let guard = 0; guard < 14; guard += 1) {
			const first = `${y}-${String(m + 1).padStart(2, '0')}-01`;
			if (first >= windowEnd) break;
			if (first >= windowStart) {
				const label = new Date(y, m, 1).toLocaleDateString(
					lang === 'de' ? 'de-DE' : 'en-GB',
					{ month: 'short' }
				);
				out.push({ label, doy: dayOfWindow(first) });
			}
			m += 1;
			if (m > 11) { m = 0; y += 1; }
		}
		return out;
	});

	// Feast dots: keep only the highest-ranking feast per ISO date, skip ferias.
	// The currently-selected feast is omitted because the static needle pin at
	// the top of the ring represents it.
	const feastDots = $derived.by(() => {
		const byDate = new Map<string, YearDay>();
		for (const d of yearDays) {
			const size = rankDotSize(d.rank);
			if (size === 0) continue;
			if (d.iso === needleIso) continue;
			const cur = byDate.get(d.iso);
			if (!cur || rankDotSize(d.rank) > rankDotSize(cur.rank)) byDate.set(d.iso, d);
		}
		return [...byDate.values()];
	});

	// A season can split into multiple arcs within one gregorian year (e.g.
	// ChristmasTide spans both Dec 25–31 and Jan 1–13 of the civil year). Each
	// arc is identified uniquely by its start ISO; the panel tracks whichever
	// arc contains `selectedIso` so it stays in sync across SvelteKit
	// navigation (including the next-year wedge click, which updates the URL
	// but would otherwise leave stale internal state).
	const currentArc = $derived(
		todayIso ? seasonArcs.find((s) => todayIso >= s.start && todayIso <= s.end) ?? null : null
	);
	const active = $derived.by(() => {
		if (selectedIso) {
			const hit = seasonArcs.find((s) => selectedIso >= s.start && selectedIso <= s.end);
			if (hit) return hit;
		}
		return currentArc ?? seasonArcs[0] ?? null;
	});

	function pickSeason(arc: SeasonArc) {
		goto(dayHref(arc.start), { noScroll: true, replaceState: true, keepFocus: true });
	}

	let nextYearHovered = $state(false);
	let hoveredFeastIso = $state<string | null>(null);
	let feastListEl = $state<HTMLDivElement | null>(null);
	let didInitialScroll = false;
	const hoveredFeast = $derived(
		hoveredFeastIso ? feastDots.find((f) => f.iso === hoveredFeastIso) ?? null : null
	);

	const activeFeasts = $derived.by(() => {
		if (!active) return [] as YearDay[];
		return yearDays.filter(
			(d) =>
				rankDotSize(d.rank) > 0 && d.iso >= active.start && d.iso <= active.end
		);
	});

	$effect(() => {
		activeFeasts;
		selectedIso;
		const list = feastListEl;
		if (!list || list.clientHeight === 0) return;
		let el = list.querySelector<HTMLElement>('[aria-current="date"]');
		if (!el && selectedIso) {
			// Selected day isn't a listed feast (e.g. ferial) — center the
			// closest feast by date so the user still lands near "today".
			const items = list.querySelectorAll<HTMLElement>('.feast-item[data-iso]');
			let best: HTMLElement | null = null;
			let bestDelta = Infinity;
			const selTime = Date.parse(selectedIso);
			for (const item of items) {
				const iso = item.dataset.iso;
				if (!iso) continue;
				const delta = Math.abs(Date.parse(iso) - selTime);
				if (delta < bestDelta) {
					bestDelta = delta;
					best = item;
				}
			}
			el = best;
		}
		if (!el) return;
		const listRect = list.getBoundingClientRect();
		const elRect = el.getBoundingClientRect();
		const relTop = elRect.top - listRect.top + list.scrollTop;
		const target = relTop - (list.clientHeight - elRect.height) / 2;
		const max = list.scrollHeight - list.clientHeight;
		list.scrollTo({
			top: Math.max(0, Math.min(max, target)),
			behavior: didInitialScroll && !prefersReducedMotion.current ? 'smooth' : 'auto'
		});
		didInitialScroll = true;
	});

	function fmtShort(iso: string): string {
		const [y, m, d] = iso.split('-').map(Number);
		return new Date(y, m - 1, d).toLocaleDateString(
			lang === 'de' ? 'de-DE' : 'en-GB',
			{ day: 'numeric', month: 'short' }
		);
	}
	function fmtRange(a: string, b: string): string {
		return `${fmtShort(a)} – ${fmtShort(b)}`;
	}

	// The needle is a static vertical bar at the top of the ring. The ring
	// itself rotates to bring the selected day under the bar, so we only need to
	// cross-fade the bar/pin's color to the selected day's liturgical color (or
	// gold when the selection is today). The selected feast's dot is hidden from
	// the ring since the pin now represents it.
	const needleIso = $derived(
		isoInWindow(selectedIso) ? selectedIso : isoInWindow(todayIso) ? todayIso : null
	);
	const needleIsToday = $derived(needleIso !== null && needleIso === todayIso);
	const needleDay = $derived(
		needleIso ? yearDays.find((d) => d.iso === needleIso) ?? null : null
	);
	const needleColorKey = $derived(needleDay?.color ?? 'GREEN');
	const needleStroke = $derived(needleIsToday ? 'var(--lit-gold)' : litBg(needleColorKey));
	const needleRadius = 6;

	const T = $derived(
		{
			en: {
				now: 'Now',
				feastsIn: 'Feasts in this season',
				centerSub: 'Roman Rite',
				anno: 'Anno Domini',
				nextYear: 'Next liturgical year'
			},
			de: {
				now: 'Jetzt',
				feastsIn: 'Feste in dieser Zeit',
				centerSub: 'Römischer Ritus',
				anno: 'Anno Domini',
				nextYear: 'Nächstes Kirchenjahr'
			},
			la: {
				now: 'Nunc',
				feastsIn: 'Festa in hoc tempore',
				centerSub: 'Ritus Romanus',
				anno: 'Anno Domini',
				nextYear: 'Annus liturgicus sequens'
			}
		}[lang]
	);

	// Arc-label budgeting: skip labels on tiny arcs.
	function labelFor(s: ResolvedArc): { path: string; text: string } {
		const mid = (s.a0 + s.a1) / 2;
		const flip = Math.sin(mid) > 0.05;
		const r = (rSeason + rSeasonInner) / 2;
		const path = flip
			? arcReversed(cx, cy, r, s.a0 + 0.02, s.a1 - 0.02)
			: arcOnly(cx, cy, r, s.a0 + 0.02, s.a1 - 0.02);
		const arcSpan = s.a1 - s.a0;
		const arcPx = r * arcSpan;
		const budget = Math.floor(arcPx / 7);
		let text = '';
		if (arcSpan >= 0.15 && s.name && s.name.length <= budget) text = s.name;
		return { path, text };
	}

</script>

<div class="ring-wrap">
	<div class="ring-svg-wrap">
		<svg class="ring-svg" viewBox="0 0 {size} {size}" role="img" aria-label="Liturgical year ring">
			{#if totalDays > 0}
			{@const aPostEnd =
				inPostPentecost && isoInWindow(liturgicalYearStart)
					? angleFromDoy(dayOfWindow(liturgicalYearStart))
					: angleFromDoy(totalDays)}
			{@const wedgeSpan = ringGap}
			{@const rMidWedge = (rSeason + rSeasonInner) / 2}
			{@const baseOx = cx + rSeason * Math.cos(aPostEnd)}
			{@const baseOy = cy + rSeason * Math.sin(aPostEnd)}
			{@const baseIx = cx + rSeasonInner * Math.cos(aPostEnd)}
			{@const baseIy = cy + rSeasonInner * Math.sin(aPostEnd)}
			{@const wedgeTipX = cx + rMidWedge * Math.cos(aPostEnd + wedgeSpan)}
			{@const wedgeTipY = cy + rMidWedge * Math.sin(aPostEnd + wedgeSpan)}
			{@const nextAdventIso =
				inPostPentecost ? liturgicalYearStart : windowEnd}
			<a
				class="next-year"
				href={dayHref(nextAdventIso)}
				aria-label={T.nextYear}
				data-sveltekit-noscroll
				data-sveltekit-keepfocus
				data-sveltekit-replacestate
				onmouseenter={() => (nextYearHovered = true)}
				onmouseleave={() => (nextYearHovered = false)}
				onfocus={() => (nextYearHovered = true)}
				onblur={() => (nextYearHovered = false)}
			>
				<title>{T.nextYear}</title>
				<polygon
					class="next-year-wedge"
					points="{baseOx},{baseOy} {wedgeTipX},{wedgeTipY} {baseIx},{baseIy}"
				/>
			</a>
			{/if}

			{#each [...resolvedArcs].sort((a, b) => Number(active?.start === a.start) - Number(active?.start === b.start)) as s (`${s.key}:${s.start}`)}
				{@const lbl = labelFor(s)}
				{@const isCurrent = s.start === currentArc?.start && highlightToday}
				{@const isSelected = active?.start === s.start}
				<g
					class="season"
					role="button"
					tabindex="0"
					aria-label={s.name}
					onclick={() => pickSeason(s)}
					onkeydown={(e) => {
						if (e.key === 'Enter' || e.key === ' ') {
							e.preventDefault();
							pickSeason(s);
						}
					}}
				>
					{#if isSelected}
						<path
							d={arcPath(cx, cy, rSeasonInner - 6, rSeason + 6, s.a0, s.a1)}
							style="fill: color-mix(in srgb, {litBg(s.color)} 55%, var(--color-text-primary) 45%); filter: blur(4px);"
							opacity="0.3"
						/>
					{/if}
					<path
						class="season-path"
						d={arcPath(cx, cy, rSeasonInner, rSeason, s.a0, s.a1)}
						fill={litBg(s.color)}
						stroke={isSelected ? litInk(s.color) : 'var(--color-bg-primary)'}
						stroke-width={isSelected ? 3 : 1.5}
						opacity={isSelected ? 1 : 0.9}
					/>
					{#if lbl.text}
						<path id="ring-arc-{s.key}-{s.start}" d={lbl.path} fill="none" />
						<text class="season-label" fill={litInk(s.color)}>
							<textPath href="#ring-arc-{s.key}-{s.start}" startOffset="50%" text-anchor="middle">
								{lbl.text}
							</textPath>
						</text>
					{/if}
				</g>
			{/each}

			{#each monthMarks as mk, i (i)}
				{@const a = angleFromDoy(mk.doy)}
				{@const x1 = cx + (rOuter + 4) * Math.cos(a)}
				{@const y1 = cy + (rOuter + 4) * Math.sin(a)}
				{@const x2 = cx + (rOuter + 14) * Math.cos(a)}
				{@const y2 = cy + (rOuter + 14) * Math.sin(a)}
				{@const lx = cx + (rOuter + 26) * Math.cos(a + 0.08)}
				{@const ly = cy + (rOuter + 26) * Math.sin(a + 0.08)}
				<g>
					<line class="month-tick" {x1} {y1} {x2} {y2} />
					<text class="month-label" x={lx} y={ly} text-anchor="middle" dominant-baseline="middle">
						{mk.label}
					</text>
				</g>
			{/each}

			{#each feastDots as f (f.iso + f.name)}
				{@const a = angleFromDoy(dayOfWindow(f.iso))}
				{@const x = cx + rFeasts * Math.cos(a)}
				{@const y = cy + rFeasts * Math.sin(a)}
				<a
					href={dayHref(f.iso)}
					aria-label={f.name}
					data-sveltekit-noscroll
					data-sveltekit-replacestate
					onmouseenter={() => (hoveredFeastIso = f.iso)}
					onmouseleave={() => {
						if (hoveredFeastIso === f.iso) hoveredFeastIso = null;
					}}
					onfocus={() => (hoveredFeastIso = f.iso)}
					onblur={() => {
						if (hoveredFeastIso === f.iso) hoveredFeastIso = null;
					}}
				>
					<circle
						class="feast-dot"
						cx={x}
						cy={y}
						r={rankDotSize(f.rank)}
						fill={litBg(f.color)}
						stroke="var(--color-bg-primary)"
						stroke-width="1.2"
					>
						<title>{fmtShort(f.iso)} · {f.name}</title>
					</circle>
				</a>
			{/each}

			{#if needleIso !== null && highlightToday}
				<g>
					<line
						class="sel-needle"
						class:today={needleIsToday}
						style="stroke: {needleStroke};"
						x1={cx}
						y1={cy - rSeasonInner}
						x2={cx}
						y2={cy - (rFeasts + 6)}
					/>
					<circle
						class="sel-dot"
						class:today={needleIsToday}
						cx={cx}
						style="fill: {needleStroke}; r: {needleRadius}px; cy: {cy -
							(rFeasts + 6 + needleRadius)}px;"
					/>
				</g>
			{/if}

			<text class="center-caption" x={cx} y={cy - 26}>{T.anno}</text>
			<text class="center-year" class:muted={nextYearHovered} x={cx} y={cy + 14}>
				{nextYearHovered ? liturgicalYear + 1 : liturgicalYear}
			</text>
			<text class="center-sub" x={cx} y={cy + 38}>{T.centerSub}</text>

			{#if hoveredFeast}
				{@const hf = hoveredFeast}
				{@const aH = angleFromDoy(dayOfWindow(hf.iso))}
				{@const pillLabel = `${fmtShort(hf.iso)} · ${hf.name}`}
				{@const pillR = rFeasts + 22}
				{@const pillW = Math.max(60, pillLabel.length * 7 + 20)}
				{@const pillH = 22}
				{@const pcx = cx + pillR * Math.cos(aH)}
				{@const pcy = cy + pillR * Math.sin(aH)}
				<g class="feast-pill" pointer-events="none">
					<rect
						x={pcx - pillW / 2}
						y={pcy - pillH / 2}
						width={pillW}
						height={pillH}
						rx={pillH / 2}
						ry={pillH / 2}
						fill={litBg(hf.color)}
						stroke="var(--color-bg-primary)"
						stroke-width="1.2"
					/>
					<text class="feast-pill-text" x={pcx} y={pcy + 4} fill={litInk(hf.color)}>
						{pillLabel}
					</text>
				</g>
			{/if}
		</svg>
	</div>

	{#if active}
	<div class="aside-slot">
		<aside class="season-panel" style="border-top: 6px solid {litBg(active.color)}">
			<h3>
				{active.name}
				{#if active.start === currentArc?.start && highlightToday}
					<span
						class="season-now-chip"
						style="background: {litBg(active.color)}; color: {litInk(active.color)}"
					>
						{T.now}
					</span>
				{/if}
			</h3>
			<div class="range">
				{fmtRange(active.start, active.end)}
			</div>

			{#if activeFeasts.length}
				<h4 class="section-h">{T.feastsIn}</h4>
				<div class="feast-list" bind:this={feastListEl}>
					{#each activeFeasts as f (f.iso + f.name)}
						{@const isSel = f.iso === selectedIso}
						{@const isToday = f.iso === todayIso}
						<a
							class="feast-item"
							class:selected={isSel}
							class:today={isSel && isToday}
							aria-current={isSel ? 'date' : undefined}
							data-iso={f.iso}
							href={dayHref(f.iso)}
							data-sveltekit-noscroll
							data-sveltekit-replacestate
						>
							<span class="d">{fmtShort(f.iso)}</span>
							<span class="sq" style="background: {litBg(f.color)}"></span>
							<span class="n">{f.name}</span>
							<span class="r">{f.rank.replace(/^Class/, '')}</span>
						</a>
					{/each}
				</div>
			{/if}
		</aside>
	</div>
	{/if}
</div>

<style>
	.ring-wrap {
		display: grid;
		grid-template-columns: minmax(420px, 620px) minmax(280px, 1fr);
		gap: 32px;
		align-items: start;
	}
	/* Ring column's intrinsic height drives the row height. The aside is
	   positioned absolutely inside `.aside-slot`, so it contributes nothing to
	   row sizing — the slot stretches to the ring's height, and the aside then
	   fills the slot. All pure CSS, no ResizeObserver. */
	.aside-slot {
		position: relative;
		align-self: stretch;
		min-width: 0;
	}
	@media (max-width: 900px) {
		.ring-wrap {
			grid-template-columns: 1fr;
		}
		.aside-slot {
			position: static;
			align-self: auto;
		}
	}
	.ring-svg-wrap {
		min-width: 0;
	}
	.ring-svg {
		width: 100%;
		height: auto;
		display: block;
		user-select: none;
		overflow: visible;
	}
	.ring-svg :global(.season-path) {
		transition: opacity var(--transition-normal);
	}
	.ring-svg :global(.season-path):hover {
		opacity: 0.85;
	}
	.ring-svg :global(.season-label) {
		font-size: 13px;
		font-weight: 600;
		pointer-events: none;
	}
	.ring-svg :global(.month-tick) {
		stroke: var(--color-text-tertiary);
		stroke-width: 1;
		opacity: 0.3;
	}
	.ring-svg :global(.month-label) {
		font-size: 10px;
		fill: var(--color-text-tertiary);
		text-transform: uppercase;
		letter-spacing: 0.1em;
	}
	.ring-svg :global(.feast-pill-text) {
		font-size: 12px;
		font-weight: 600;
		text-anchor: middle;
	}
	.ring-svg :global(.feast-dot) {
		transition: r var(--transition-fast);
	}
	.ring-svg :global(.feast-dot):hover {
		r: 7;
	}
	.ring-svg :global(.sel-needle) {
		stroke-width: 2;
		/* Matches the pivot Tween (650ms cubicOut) so bar color cross-fades in
		   lockstep with the ring rotation. */
		transition: stroke 650ms cubic-bezier(0.33, 1, 0.68, 1);
	}
	.ring-svg :global(.sel-dot) {
		stroke: var(--color-bg-primary);
		stroke-width: 2;
		transition: fill 650ms cubic-bezier(0.33, 1, 0.68, 1);
	}
	.ring-svg :global(.center-year) {
		font-size: 54px;
		font-weight: 700;
		fill: var(--color-text-primary);
		text-anchor: middle;
		font-variant-numeric: tabular-nums;
		transition: fill var(--transition-fast);
	}
	.ring-svg :global(.center-year.muted) {
		fill: var(--color-text-tertiary);
	}
	.ring-svg :global(.center-caption) {
		font-size: 11px;
		fill: var(--color-text-tertiary);
		text-anchor: middle;
		text-transform: uppercase;
		letter-spacing: 0.15em;
	}
	.ring-svg :global(.center-sub) {
		font-size: 13px;
		fill: var(--color-text-secondary);
		text-anchor: middle;
	}
	.ring-svg :global(.season) {
		cursor: pointer;
		outline: none;
		-webkit-tap-highlight-color: transparent;
	}
	.ring-svg :global(.season):focus,
	.ring-svg :global(.season):focus-visible {
		outline: none;
	}
	.ring-svg :global(.season-path) {
		-webkit-tap-highlight-color: transparent;
	}
	.ring-svg :global(.ly-marker) {
		pointer-events: none;
	}
	.ring-svg :global(.next-year) {
		cursor: pointer;
		outline: none;
	}
	.ring-svg :global(.next-year-wedge) {
		fill: var(--lit-green);
		stroke: none;
		transition: opacity var(--transition-fast);
	}
	.ring-svg :global(.next-year:hover .next-year-wedge),
	.ring-svg :global(.next-year:focus-visible .next-year-wedge) {
		opacity: 0.75;
	}

	.season-panel {
		background: var(--color-surface);
		border-radius: var(--radius-card);
		padding: 22px;
		box-shadow: var(--shadow-sm);
		display: flex;
		flex-direction: column;
		min-height: 0;
	}
	@media (min-width: 901px) {
		.season-panel {
			position: absolute;
			inset: 0;
			overflow: hidden;
		}
	}
	.season-panel h3 {
		margin: 0 0 8px;
		font-size: 1.35rem;
		color: var(--color-text-primary);
	}
	.season-now-chip {
		margin-left: 10px;
		vertical-align: middle;
		font-size: 0.62rem;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		font-weight: 700;
		padding: 4px 10px;
		border-radius: 100px;
		box-shadow: var(--shadow-sm);
	}
	.range {
		font-size: 0.88rem;
		color: var(--color-text-secondary);
		margin-top: 2px;
	}
	.section-h {
		margin: 18px 0 6px;
		font-size: 0.72rem;
		color: var(--color-text-tertiary);
		text-transform: uppercase;
		letter-spacing: 0.1em;
		font-weight: 700;
	}
	.feast-list {
		position: relative;
		display: flex;
		flex-direction: column;
		gap: 2px;
		flex: 1 1 auto;
		min-height: 0;
		overflow-y: auto;
		overscroll-behavior: contain;
		scrollbar-width: thin;
		scrollbar-color: var(--color-border) transparent;
		padding-right: 4px;
	}
	.feast-list::-webkit-scrollbar {
		width: 6px;
	}
	.feast-list::-webkit-scrollbar-thumb {
		background: var(--color-border);
		border-radius: 100px;
	}
	.feast-list::-webkit-scrollbar-track {
		background: transparent;
	}
	@media (max-width: 900px) {
		.feast-list {
			flex: 0 1 auto;
			max-height: 300px;
		}
	}
	.feast-item {
		display: grid;
		grid-template-columns: 72px 14px 1fr auto;
		gap: 10px;
		align-items: center;
		padding: 8px 10px;
		border-radius: var(--radius-md);
		text-decoration: none;
		color: inherit;
		transition: background var(--transition-fast), box-shadow var(--transition-fast);
		font-size: 0.9rem;
	}
	.feast-item:hover {
		background: var(--color-surface-hover);
	}
	.feast-item.selected {
		/* Mix text color into surface: darkens in light mode, lightens in dark. */
		background: color-mix(in srgb, var(--color-text-primary) 16%, var(--color-surface));
	}
	.feast-item.selected .n {
		font-weight: 700;
		color: var(--color-text-primary);
	}
	.feast-item.selected .d,
	.feast-item.selected .r {
		color: var(--color-text-primary);
	}
	.feast-item.selected.today {
		background: color-mix(in srgb, var(--lit-gold) 38%, var(--color-surface));
	}
	.feast-item .d {
		color: var(--color-text-tertiary);
		font-variant-numeric: tabular-nums;
		font-size: 0.82rem;
	}
	.feast-item .sq {
		width: 12px;
		height: 12px;
		border-radius: 100px;
		box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.12);
	}
	.feast-item .n {
		color: var(--color-text-primary);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.feast-item .r {
		font-size: 0.72rem;
		color: var(--color-text-tertiary);
		font-weight: 700;
		letter-spacing: 0.05em;
	}
</style>
