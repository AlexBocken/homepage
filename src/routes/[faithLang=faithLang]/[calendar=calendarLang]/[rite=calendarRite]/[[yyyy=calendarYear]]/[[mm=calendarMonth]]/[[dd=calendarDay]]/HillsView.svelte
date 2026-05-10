<script lang="ts">
	import type { FeastDot, YearDay, SeasonArc } from './+page.server';
	import type { CalendarLang } from '../../../../calendarI18n';
	import { litBg, litInk, rankDotSize } from '../../../../calendarColors';
	import { Tween, prefersReducedMotion } from 'svelte/motion';
	import { cubicOut } from 'svelte/easing';
	import { untrack } from 'svelte';
	import { goto } from '$app/navigation';

	let {
		liturgicalYear,
		yearDays,
		feastDots: feastDotsProp,
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
		feastDots: FeastDot[];
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

	// Canvas geometry. baseY is the fade-to-zero ground; baseLevel is the curve's
	// minimum y so a constant-height color band stays visible everywhere along
	// the bottom. Easter hill is twice the height of the Christmas hill per spec:
	// hill2Height / hill1Height === 2.
	const W = 1100;
	const H = 380;
	const padX = 50;
	const padTop = 30;
	const padBottom = 50;
	const baseY = H - padBottom;
	const baseLevel = baseY - 40;
	const hill1Height = 90;
	const hill2Height = 180;
	const hill1Peak = baseLevel - hill1Height;
	const hill2Peak = baseLevel - hill2Height;
	const pentecostShoulder = hill2Peak + 25;
	const valleyDip = baseLevel + 5;

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
	const targetDoy = $derived(selectedDoy ?? todayDoy ?? 0);

	// 1D needle slide. No modular shortest-arc math needed (unlike the ring).
	const doyTween = new Tween(untrack(() => targetDoy), { duration: 650, easing: cubicOut });
	$effect(() => {
		if (prefersReducedMotion.current) {
			doyTween.set(targetDoy, { duration: 0 });
		} else {
			doyTween.target = targetDoy;
		}
	});
	const animDoy = $derived(doyTween.current);

	// Silhouette and feast dots inset by padX inside the SVG canvas so when the
	// horizontal scroll reaches an end, the first/last feasts have breathing
	// room and can be scrolled toward the center. The SVG canvas itself still
	// reaches the screen edges (handled by .hills-stage at 100vw).
	function x(doy: number): number {
		if (totalDays <= 0) return padX;
		return padX + (doy / totalDays) * (W - 2 * padX);
	}

	type Anchor = { doy: number; y: number };

	// Anchors are derived from the season arcs supplied by the loader. Each named
	// landmark pins a y-coordinate; smoothstep interpolation between adjacent
	// anchors produces the silhouette. Order is irrelevant — anchors are sorted
	// by doy after collection.
	const anchors = $derived.by<Anchor[]>(() => {
		const findArc = (keys: string[]) => seasonArcs.find((a) => keys.includes(a.key)) ?? null;
		const christmas = findArc(['ChristmasTide', 'CHRISTMAS_TIME']);
		const septua = findArc(['Septuagesima']);
		const lent = findArc(['Lent', 'LENT']);
		const easter = findArc(['EasterWeek', 'EASTER_TIME', 'Paschaltide']);
		const pentecost = findArc(['Pentecost']);

		const out: Anchor[] = [];
		out.push({ doy: 0, y: inPostPentecost ? pentecostShoulder : baseLevel });

		// Pentecost-cut window: descend to baseline ~1/3 of the way through
		// TimeAfterPentecost so the long post-Pentecost stretch reads as mostly
		// flat. Without this anchor, smoothstep would interpolate up toward the
		// Christmas peak across the entire stretch.
		if (inPostPentecost) {
			const adventStartDoy = isoInWindow(liturgicalYearStart)
				? dayOfWindow(liturgicalYearStart)
				: totalDays;
			out.push({ doy: Math.floor(adventStartDoy / 3), y: baseLevel });
		}

		if (christmas) {
			out.push({ doy: dayOfWindow(christmas.start), y: hill1Peak });
			out.push({ doy: dayOfWindow(christmas.end) + 1, y: hill1Peak });
		}

		// Valley between hills: end of Septuagesima (1962) or day Lent starts (1969).
		let vDoy: number | null = null;
		if (septua) vDoy = dayOfWindow(septua.end) + 1;
		else if (lent) vDoy = dayOfWindow(lent.start);
		if (vDoy != null) out.push({ doy: vDoy, y: valleyDip });

		if (lent && (!septua || dayOfWindow(lent.start) !== dayOfWindow(septua.end) + 1)) {
			out.push({ doy: dayOfWindow(lent.start), y: valleyDip });
		}

		if (easter) {
			out.push({ doy: dayOfWindow(easter.start), y: hill2Peak });
		}

		// Pentecost shoulder: explicit 1962 arc, else end of EASTER_TIME (1969).
		let pentecostDoy: number | null = null;
		if (pentecost) {
			pentecostDoy = dayOfWindow(pentecost.start);
			out.push({ doy: pentecostDoy, y: pentecostShoulder });
		} else if (easter) {
			pentecostDoy = dayOfWindow(easter.end);
			out.push({ doy: pentecostDoy, y: pentecostShoulder });
		}

		// Advent-cut window: descend to baseline ~1/3 of the way from Pentecost
		// to windowEnd (start of next Advent). The remaining 2/3 of post-Pentecost
		// reads as a flat tail at baseline.
		if (!inPostPentecost && pentecostDoy != null) {
			const descentDoy = pentecostDoy + Math.floor((totalDays - pentecostDoy) / 3);
			if (descentDoy < totalDays - 14) {
				out.push({ doy: descentDoy, y: baseLevel });
			}
		}

		out.push({ doy: totalDays, y: inPostPentecost ? pentecostShoulder : baseLevel });

		out.sort((a, b) => a.doy - b.doy);
		const dedup: Anchor[] = [];
		for (const a of out) {
			const prev = dedup[dedup.length - 1];
			if (prev && prev.doy === a.doy) prev.y = a.y;
			else dedup.push(a);
		}
		return dedup;
	});

	function elevation(doy: number): number {
		const arr = anchors;
		if (arr.length === 0) return baseY;
		if (doy <= arr[0].doy) return arr[0].y;
		if (doy >= arr[arr.length - 1].doy) return arr[arr.length - 1].y;
		for (let i = 1; i < arr.length; i++) {
			if (doy <= arr[i].doy) {
				const a = arr[i - 1];
				const b = arr[i];
				const span = b.doy - a.doy;
				if (span === 0) return b.y;
				const t = (doy - a.doy) / span;
				const s = t * t * (3 - 2 * t);
				return a.y + (b.y - a.y) * s;
			}
		}
		return arr[arr.length - 1].y;
	}

	const silhouettePath = $derived.by(() => {
		if (totalDays <= 0) return '';
		const pts: string[] = [];
		for (let d = 0; d <= totalDays; d++) {
			pts.push(`${d === 0 ? 'M' : 'L'} ${x(d).toFixed(2)} ${elevation(d).toFixed(2)}`);
		}
		return pts.join(' ');
	});

	// Anchor + tangent for a season label. textPath would orient each glyph by
	// its own local tangent, which on ascending arcs (e.g. Lent) reads as too
	// shallow because the leftmost glyph sits where the smoothstep slope is
	// near-zero. Instead, position the whole label as one rigid block tilted
	// to the slope at the arc midpoint, where the smoothstep slope peaks.
	function midlineY(d: number): number {
		const e = elevation(d);
		return e + (baseY - e) * 0.5;
	}
	function arcLabelTransform(start: number, end: number): {
		x: number;
		y: number;
		rot: number;
	} {
		const midDoy = (start + end) / 2;
		const lx = x(midDoy);
		const ly = midlineY(midDoy);
		const x1 = x(midDoy - 0.5);
		const y1 = midlineY(midDoy - 0.5);
		const x2 = x(midDoy + 0.5);
		const y2 = midlineY(midDoy + 0.5);
		const rot = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
		return { x: lx, y: ly, rot };
	}

	function seasonShape(start: number, end: number): string {
		const pts: string[] = [];
		pts.push(`M ${x(start).toFixed(2)} ${baseY.toFixed(2)}`);
		for (let d = start; d <= end; d++) {
			pts.push(`L ${x(d).toFixed(2)} ${elevation(d).toFixed(2)}`);
		}
		pts.push(`L ${x(end).toFixed(2)} ${baseY.toFixed(2)} Z`);
		return pts.join(' ');
	}

	type ResolvedArc = SeasonArc & { startDoy: number; endDoy: number };
	const resolvedArcs = $derived<ResolvedArc[]>(
		seasonArcs.map((s) => ({
			...s,
			startDoy: dayOfWindow(s.start),
			endDoy: dayOfWindow(s.end) + 1
		}))
	);

	type MonthMark = { label: string; doy: number };
	const monthMarks = $derived.by<MonthMark[]>(() => {
		const out: MonthMark[] = [];
		const [wsY, wsM, wsD] = windowStart.split('-').map(Number);
		let yy = wsY;
		let mm = wsM - 1;
		if (wsD !== 1) {
			mm += 1;
			if (mm > 11) {
				mm = 0;
				yy += 1;
			}
		}
		for (let guard = 0; guard < 14; guard += 1) {
			const first = `${yy}-${String(mm + 1).padStart(2, '0')}-01`;
			if (first >= windowEnd) break;
			if (first >= windowStart) {
				const label = new Date(yy, mm, 1).toLocaleDateString(
					lang === 'de' ? 'de-DE' : 'en-GB',
					{ month: 'short' }
				);
				out.push({ label, doy: dayOfWindow(first) });
			}
			mm += 1;
			if (mm > 11) {
				mm = 0;
				yy += 1;
			}
		}
		return out;
	});

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
	let svgWrapEl = $state<HTMLDivElement | null>(null);
	let wrapWidth = $state(0);
	let didInitialScroll = false;
	let didInitialHScroll = false;

	// Watch the wrap's width so the centering effect re-fires on viewport
	// resizes (and orientation changes). ResizeObserver also covers parent
	// layout changes that pure window-resize listeners would miss.
	$effect(() => {
		const wrap = svgWrapEl;
		if (!wrap) return;
		const ro = new ResizeObserver((entries) => {
			for (const e of entries) {
				wrapWidth = e.contentRect.width;
			}
		});
		ro.observe(wrap);
		return () => ro.disconnect();
	});

	// Center the horizontal scroll on the selected/today feast so users on small
	// screens see "now" as soon as they land on the page. Re-runs when targetDoy
	// changes (URL navigation) or wrapWidth changes (viewport resize). First
	// run is instant, subsequent are smooth.
	$effect(() => {
		const doy = targetDoy;
		const total = totalDays;
		wrapWidth;
		const wrap = svgWrapEl;
		if (!wrap || total <= 0) return;
		if (wrap.scrollWidth <= wrap.clientWidth) return;
		const svgEl = wrap.querySelector('svg');
		if (!svgEl) return;
		const svgWidth = svgEl.getBoundingClientRect().width;
		if (svgWidth <= 0) return;
		const xInViewBox = padX + (doy / total) * (W - 2 * padX);
		const xInPx = (xInViewBox / W) * svgWidth;
		const target = xInPx - wrap.clientWidth / 2;
		const max = wrap.scrollWidth - wrap.clientWidth;
		const left = Math.max(0, Math.min(max, target));
		wrap.scrollTo({
			left,
			behavior: didInitialHScroll && !prefersReducedMotion.current ? 'smooth' : 'auto'
		});
		didInitialHScroll = true;
	});

	const needleIso = $derived(
		isoInWindow(selectedIso) ? selectedIso : isoInWindow(todayIso) ? todayIso : null
	);
	const needleIsToday = $derived(needleIso !== null && needleIso === todayIso);
	const needleDay = $derived(
		needleIso ? yearDays.find((d) => d.iso === needleIso) ?? null : null
	);
	const needleColorKey = $derived(needleDay?.color ?? 'GREEN');
	const needleStroke = $derived(needleIsToday ? 'var(--lit-gold)' : litBg(needleColorKey));

	const feastDots = $derived(feastDotsProp.filter((d) => d.iso !== needleIso));

	const hoveredFeast = $derived(
		hoveredFeastIso ? feastDots.find((f) => f.iso === hoveredFeastIso) ?? null : null
	);

	const activeFeasts = $derived.by(() => {
		if (!active) return [] as FeastDot[];
		return feastDotsProp.filter((d) => d.iso >= active.start && d.iso <= active.end);
	});

	$effect(() => {
		activeFeasts;
		selectedIso;
		const list = feastListEl;
		if (!list || list.clientHeight === 0) return;
		let el = list.querySelector<HTMLElement>('[aria-current="date"]');
		if (!el && selectedIso) {
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

	const T = $derived(
		{
			en: {
				now: 'Now',
				feastsIn: 'Feasts in this season',
				anno: 'Anno Domini',
				rite: 'Roman Rite',
				nextYear: 'Next liturgical year',
				prevYear: 'Previous liturgical year'
			},
			de: {
				now: 'Jetzt',
				feastsIn: 'Feste in dieser Zeit',
				anno: 'Anno Domini',
				rite: 'Römischer Ritus',
				nextYear: 'Nächstes Kirchenjahr',
				prevYear: 'Vorheriges Kirchenjahr'
			},
			la: {
				now: 'Nunc',
				feastsIn: 'Festa in hoc tempore',
				anno: 'Anno Domini',
				rite: 'Ritus Romanus',
				nextYear: 'Annus liturgicus sequens',
				prevYear: 'Annus liturgicus praecedens'
			}
		}[lang]
	);

	const nextAdventIso = $derived(inPostPentecost ? liturgicalYearStart : windowEnd);

	// Prev-year navigation: in Advent-cut windows, the day before windowStart
	// is the last day of the previous LY. In Pentecost-cut windows, windowStart
	// sits mid-LY so we need to step further back to land in LY-(N-1).
	function isoMinusDays(iso: string, days: number): string {
		const [y, m, d] = iso.split('-').map(Number);
		const dt = new Date(Date.UTC(y, m - 1, d - days));
		return dt.toISOString().slice(0, 10);
	}
	const prevYearIso = $derived(
		inPostPentecost ? isoMinusDays(windowStart, 200) : isoMinusDays(windowStart, 1)
	);

	// Year buttons sit at the vertical mid of the content area.
	const yearBtnY = (padTop + baseY) / 2;
</script>

<div class="hills-wrap">
	<div class="hills-svg-wrap" bind:this={svgWrapEl}>
		<svg class="hills-svg" viewBox="0 0 {W} {H}" role="img" aria-label="Liturgical year hills">
			{#if totalDays > 0}
				<line class="ground" x1={padX} y1={baseY} x2={W - padX} y2={baseY} />

				{#each resolvedArcs as s (s.key + ':' + s.start)}
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
						<path
							class="season-path"
							d={seasonShape(s.startDoy, s.endDoy)}
							fill={litBg(s.color)}
							opacity={isSelected ? 1 : 0.85}
						/>
						{#if isSelected}
							<path
								class="season-outline"
								d={seasonShape(s.startDoy, s.endDoy)}
								fill="none"
								stroke={litInk(s.color)}
								stroke-width="2"
								opacity="0.6"
							/>
						{/if}
					</g>
				{/each}

				<path class="silhouette" d={silhouettePath} fill="none" />

				<!-- Vertical dividers at season boundaries so adjacent same-color
				     seasons (e.g. Pre-Lent → Lent, both purple) read as distinct. -->
				{#each resolvedArcs as s, i (s.key + ':div:' + s.start)}
					{#if i > 0}
						{@const dx = x(s.startDoy)}
						{@const dy = elevation(s.startDoy)}
						<line class="season-divider" x1={dx} y1={dy} x2={dx} y2={baseY} />
					{/if}
				{/each}

				{#each resolvedArcs as s (s.key + ':label:' + s.start)}
					{@const arcWidthPx = ((s.endDoy - s.startDoy) / totalDays) * (W - 2 * padX)}
					{@const budget = Math.floor(arcWidthPx / 7.5)}
					{#if s.name && s.name.length <= budget && arcWidthPx > 60}
						{@const lbl = arcLabelTransform(s.startDoy, s.endDoy)}
						<text
							class="season-label"
							x={lbl.x.toFixed(2)}
							y={lbl.y.toFixed(2)}
							fill={litInk(s.color)}
							text-anchor="middle"
							dominant-baseline="middle"
							transform="rotate({lbl.rot.toFixed(2)} {lbl.x.toFixed(2)} {lbl.y.toFixed(2)})"
						>
							{s.name}
						</text>
					{/if}
				{/each}

				{#each monthMarks as mk, i (i)}
					{@const ax = x(mk.doy)}
					<g>
						<line class="month-tick" x1={ax} y1={baseY} x2={ax} y2={baseY + 6} />
						<text
							class="month-label"
							x={ax}
							y={baseY + 18}
							text-anchor="middle"
							dominant-baseline="hanging"
						>
							{mk.label}
						</text>
					</g>
				{/each}

				{#each feastDots as f (f.iso + f.name)}
					{@const fdoy = dayOfWindow(f.iso)}
					{@const fx = x(fdoy)}
					{@const fy = elevation(fdoy)}
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
							cx={fx}
							cy={fy}
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
					{@const nx = x(animDoy)}
					{@const ny = elevation(animDoy)}
					<g>
						<line
							class="sel-needle"
							class:today={needleIsToday}
							style="stroke: {needleStroke};"
							x1={nx}
							y1={baseY}
							x2={nx}
							y2={ny - 12}
						/>
						<circle
							class="sel-dot"
							class:today={needleIsToday}
							cx={nx}
							cy={ny - 18}
							r="6"
							style="fill: {needleStroke};"
						/>
					</g>
				{/if}

				{#if hoveredFeast}
					{@const hdoy = dayOfWindow(hoveredFeast.iso)}
					{@const hx = x(hdoy)}
					{@const hy = elevation(hdoy)}
					{@const pillLabel = `${fmtShort(hoveredFeast.iso)} · ${hoveredFeast.name}`}
					{@const pillW = Math.max(60, pillLabel.length * 7 + 20)}
					{@const pillH = 22}
					{@const pillCx = Math.min(W - padX - pillW / 2, Math.max(padX + pillW / 2, hx))}
					{@const pillCy = Math.max(padTop + pillH / 2 + 4, hy - 28)}
					<g class="feast-pill" pointer-events="none">
						<rect
							x={pillCx - pillW / 2}
							y={pillCy - pillH / 2}
							width={pillW}
							height={pillH}
							rx={pillH / 2}
							ry={pillH / 2}
							fill={litBg(hoveredFeast.color)}
							stroke="var(--color-bg-primary)"
							stroke-width="1.2"
						/>
						<text class="feast-pill-text" x={pillCx} y={pillCy + 4} fill={litInk(hoveredFeast.color)}>
							{pillLabel}
						</text>
					</g>
				{/if}

				<text class="hills-caption" x={padX} y={padTop} dominant-baseline="hanging">
					{T.anno}
				</text>
				<text
					class="hills-year"
					class:muted={nextYearHovered}
					x={padX}
					y={padTop + 16}
					dominant-baseline="hanging"
				>
					{nextYearHovered ? liturgicalYear + 1 : liturgicalYear}
				</text>
				<text class="hills-rite" x={padX} y={padTop + 50} dominant-baseline="hanging">
					{T.rite}
				</text>

				<a
					class="prev-year"
					href={dayHref(prevYearIso)}
					aria-label={T.prevYear}
					data-sveltekit-noscroll
					data-sveltekit-keepfocus
					data-sveltekit-replacestate
				>
					<title>{T.prevYear}</title>
					<g transform="translate({padX / 2}, {yearBtnY})">
						<polyline
							class="year-btn-icon"
							points="3 -9 -3 0 3 9"
							fill="none"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						/>
					</g>
				</a>

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
					<g transform="translate({W - padX / 2}, {yearBtnY})">
						<polyline
							class="year-btn-icon"
							points="-3 -9 3 0 -3 9"
							fill="none"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						/>
					</g>
				</a>
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
	.hills-wrap {
		display: flex;
		flex-direction: column;
		gap: 24px;
	}
	.aside-slot {
		min-width: 0;
		width: 100%;
		max-width: 1120px;
		margin-inline: auto;
		padding-inline: 1rem;
		box-sizing: border-box;
	}
	.hills-svg-wrap {
		min-width: 0;
		overflow-x: auto;
		-webkit-overflow-scrolling: touch;
	}
	.hills-svg {
		width: 100%;
		height: auto;
		display: block;
		user-select: none;
		overflow: visible;
	}
	@media (max-width: 1300px) {
		.hills-svg {
			min-width: 1300px;
		}
	}
	.hills-svg :global(.ground) {
		stroke: var(--color-border);
		stroke-width: 1;
	}
	.hills-svg :global(.silhouette) {
		stroke: var(--color-text-secondary);
		stroke-width: 1.5;
		opacity: 0.55;
		pointer-events: none;
	}
	.hills-svg :global(.season-divider) {
		stroke: var(--color-bg-primary);
		stroke-width: 1.5;
		pointer-events: none;
	}
	.hills-svg :global(.season-path) {
		transition: opacity var(--transition-normal);
	}
	.hills-svg :global(.season-path):hover {
		opacity: 0.9;
	}
	.hills-svg :global(.season-outline) {
		pointer-events: none;
	}
	.hills-svg :global(.season) {
		cursor: pointer;
		outline: none;
		-webkit-tap-highlight-color: transparent;
	}
	.hills-svg :global(.season):focus,
	.hills-svg :global(.season):focus-visible {
		outline: none;
	}
	.hills-svg :global(.season-label) {
		font-size: 13px;
		font-weight: 600;
		pointer-events: none;
	}
	.hills-svg :global(.month-tick) {
		stroke: var(--color-text-tertiary);
		stroke-width: 1;
		opacity: 0.5;
	}
	.hills-svg :global(.month-label) {
		font-size: 10px;
		fill: var(--color-text-tertiary);
		text-transform: uppercase;
		letter-spacing: 0.1em;
	}
	.hills-svg :global(.feast-dot) {
		transition: r var(--transition-fast);
	}
	.hills-svg :global(.feast-dot):hover {
		r: 7;
	}
	.hills-svg :global(.feast-pill-text) {
		font-size: 12px;
		font-weight: 600;
		text-anchor: middle;
	}
	.hills-svg :global(.sel-needle) {
		stroke-width: 2;
		transition: stroke 650ms cubic-bezier(0.33, 1, 0.68, 1);
	}
	.hills-svg :global(.sel-dot) {
		stroke: var(--color-bg-primary);
		stroke-width: 2;
		transition: fill 650ms cubic-bezier(0.33, 1, 0.68, 1);
	}
	.hills-svg :global(.hills-caption) {
		font-size: 11px;
		fill: var(--color-text-tertiary);
		text-transform: uppercase;
		letter-spacing: 0.15em;
	}
	.hills-svg :global(.hills-year) {
		font-size: 32px;
		font-weight: 700;
		fill: var(--color-text-primary);
		font-variant-numeric: tabular-nums;
		transition: fill var(--transition-fast);
	}
	.hills-svg :global(.hills-year.muted) {
		fill: var(--color-text-tertiary);
	}
	.hills-svg :global(.hills-rite) {
		font-size: 12px;
		fill: var(--color-text-secondary);
	}
	.hills-svg :global(.next-year),
	.hills-svg :global(.prev-year) {
		cursor: pointer;
		outline: none;
	}
	.hills-svg :global(.year-btn-icon) {
		stroke: var(--color-text-secondary);
		transition: stroke var(--transition-fast);
	}
	.hills-svg :global(.next-year:hover .year-btn-icon),
	.hills-svg :global(.next-year:focus-visible .year-btn-icon),
	.hills-svg :global(.prev-year:hover .year-btn-icon),
	.hills-svg :global(.prev-year:focus-visible .year-btn-icon) {
		stroke: var(--color-text-primary);
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
		flex: 0 1 auto;
		max-height: 360px;
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
