<script lang="ts">
	import type { YearDay, SeasonArc } from './+page.server';
	import type { CalendarLang } from '../../../../calendarI18n';
	import { litBg, litInk, rankDotSize } from '../../../../calendarColors';
	import { Tween, prefersReducedMotion } from 'svelte/motion';
	import { cubicOut } from 'svelte/easing';
	import { untrack } from 'svelte';

	let {
		year,
		yearDays,
		seasonArcs,
		todayIso,
		selectedIso = null,
		highlightToday = true,
		lang,
		dayHref
	}: {
		year: number;
		yearDays: YearDay[];
		seasonArcs: SeasonArc[];
		todayIso: string;
		selectedIso?: string | null;
		highlightToday?: boolean;
		lang: CalendarLang;
		dayHref: (iso: string) => string;
	} = $props();

	const size = 560;
	const cx = size / 2;
	const cy = size / 2;
	const rOuter = 240;
	const rSeason = 200;
	const rSeasonInner = 140;
	const rFeasts = 250;

	function isLeap(y: number) {
		return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
	}
	function daysInYear(y: number) {
		return isLeap(y) ? 366 : 365;
	}
	function dayOfYear(iso: string): number {
		const [yy, mm, dd] = iso.split('-').map(Number);
		const start = Date.UTC(yy, 0, 1);
		const cur = Date.UTC(yy, mm - 1, dd);
		return Math.floor((cur - start) / 86400000);
	}

	const totalDays = $derived(daysInYear(year));
	const todayDoy = $derived(
		todayIso && todayIso.startsWith(String(year)) ? dayOfYear(todayIso) : null
	);
	const selectedDoy = $derived(
		selectedIso && selectedIso.startsWith(String(year)) ? dayOfYear(selectedIso) : null
	);
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
		return -Math.PI / 2 + ((doy - pivot) / totalDays) * Math.PI * 2;
	}

	// Build one season-in-view from a raw SeasonArc.
	type ResolvedArc = SeasonArc & { a0: number; a1: number };
	const resolvedArcs = $derived<ResolvedArc[]>(
		seasonArcs.map((s) => {
			const a0 = angleFromDoy(dayOfYear(s.start));
			// include the end day, so add one day before closing the arc
			const a1 = angleFromDoy(dayOfYear(s.end) + 1);
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

	const monthLabels = $derived(
		Array.from({ length: 12 }, (_, i) =>
			new Date(2000, i, 1).toLocaleDateString(
				lang === 'de' ? 'de-DE' : 'en-GB',
				{ month: 'short' }
			)
		)
	);
	const monthDoys = $derived(
		Array.from({ length: 12 }, (_, i) => {
			const start = Date.UTC(year, 0, 1);
			const cur = Date.UTC(year, i, 1);
			return Math.floor((cur - start) / 86400000);
		})
	);

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

	const currentSeasonKey = $derived(
		todayIso
			? seasonArcs.find((s) => todayIso >= s.start && todayIso <= s.end)?.key ?? null
			: null
	);

	let activeKey = $state<string | null>(null);
	const active = $derived(
		seasonArcs.find((s) => s.key === (activeKey ?? currentSeasonKey ?? seasonArcs[0]?.key)) ??
			null
	);

	function pickSeason(key: string) {
		activeKey = key;
	}

	const activeFeasts = $derived.by(() => {
		if (!active) return [] as YearDay[];
		return yearDays.filter(
			(d) =>
				rankDotSize(d.rank) > 0 && d.iso >= active.start && d.iso <= active.end
		);
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
		selectedIso && selectedIso.startsWith(String(year))
			? selectedIso
			: todayIso && todayIso.startsWith(String(year))
				? todayIso
				: null
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
			en: { now: 'Now', feastsIn: 'Feasts in this season', centerSub: 'Roman Rite', anno: 'Anno Domini' },
			de: { now: 'Jetzt', feastsIn: 'Feste in dieser Zeit', centerSub: 'Römischer Ritus', anno: 'Anno Domini' },
			la: { now: 'Nunc', feastsIn: 'Festa in hoc tempore', centerSub: 'Ritus Romanus', anno: 'Anno Domini' }
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

	function toRoman(n: number): string {
		const map: [number, string][] = [
			[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'],
			[100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'],
			[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']
		];
		let out = '';
		let num = n;
		for (const [v, s] of map) {
			while (num >= v) {
				out += s;
				num -= v;
			}
		}
		return out;
	}
	const yearRoman = $derived(toRoman(year));
</script>

<div class="ring-wrap">
	<div class="ring-svg-wrap">
		<svg class="ring-svg" viewBox="0 0 {size} {size}" role="img" aria-label="Liturgical year ring">
			{#each resolvedArcs as s (`${s.key}:${s.start}`)}
				{@const lbl = labelFor(s)}
				{@const isCurrent = s.key === currentSeasonKey && highlightToday}
				{@const isSelected = (activeKey ?? currentSeasonKey) === s.key}
				<g
					class="season"
					role="button"
					tabindex="0"
					aria-label={s.name}
					onclick={() => pickSeason(s.key)}
					onkeydown={(e) => {
						if (e.key === 'Enter' || e.key === ' ') {
							e.preventDefault();
							pickSeason(s.key);
						}
					}}
				>
					{#if isCurrent}
						<path
							d={arcPath(cx, cy, rSeasonInner - 6, rSeason + 6, s.a0, s.a1)}
							fill={litBg(s.color)}
							opacity="0.22"
							style="filter: blur(4px)"
						/>
					{/if}
					<path
						class="season-path"
						d={arcPath(cx, cy, rSeasonInner, rSeason, s.a0, s.a1)}
						fill={litBg(s.color)}
						stroke={isCurrent ? litInk(s.color) : 'var(--color-bg-primary)'}
						stroke-width={isCurrent ? 2.5 : isSelected ? 3 : 1.5}
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

			{#each monthDoys as doy, i (i)}
				{@const a = angleFromDoy(doy)}
				{@const x1 = cx + (rOuter + 4) * Math.cos(a)}
				{@const y1 = cy + (rOuter + 4) * Math.sin(a)}
				{@const x2 = cx + (rOuter + 14) * Math.cos(a)}
				{@const y2 = cy + (rOuter + 14) * Math.sin(a)}
				{@const lx = cx + (rOuter + 26) * Math.cos(a + 0.08)}
				{@const ly = cy + (rOuter + 26) * Math.sin(a + 0.08)}
				<g>
					<line class="month-tick" {x1} {y1} {x2} {y2} />
					<text class="month-label" x={lx} y={ly} text-anchor="middle" dominant-baseline="middle">
						{monthLabels[i]}
					</text>
				</g>
			{/each}

			{#each feastDots as f (f.iso + f.name)}
				{@const a = angleFromDoy(dayOfYear(f.iso))}
				{@const x = cx + rFeasts * Math.cos(a)}
				{@const y = cy + rFeasts * Math.sin(a)}
				<a
					href={dayHref(f.iso)}
					aria-label={f.name}
					data-sveltekit-noscroll
					data-sveltekit-replacestate
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

			<text class="center-caption" x={cx} y={cy - 18}>{T.anno}</text>
			<text class="center-year" x={cx} y={cy + 8}>{yearRoman}</text>
			<text class="center-sub" x={cx} y={cy + 28}>{year} · {T.centerSub}</text>
		</svg>
	</div>

	{#if active}
		<aside class="season-panel" style="border-top: 6px solid {litBg(active.color)}">
			<h3>
				{active.name}
				{#if active.key === currentSeasonKey && highlightToday}
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
				<div class="feast-list">
					{#each activeFeasts as f (f.iso + f.name)}
						<a
							class="feast-item"
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
	{/if}
</div>

<style>
	.ring-wrap {
		display: grid;
		grid-template-columns: minmax(420px, 620px) minmax(280px, 1fr);
		gap: 32px;
		align-items: start;
	}
	@media (max-width: 900px) {
		.ring-wrap {
			grid-template-columns: 1fr;
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
		font-size: 28px;
		font-weight: 700;
		fill: var(--color-text-primary);
		text-anchor: middle;
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

	.season-panel {
		background: var(--color-surface);
		border-radius: var(--radius-card);
		padding: 22px;
		box-shadow: var(--shadow-sm);
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
		display: flex;
		flex-direction: column;
		gap: 2px;
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
		transition: background var(--transition-fast);
		font-size: 0.9rem;
	}
	.feast-item:hover {
		background: var(--color-surface-hover);
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
