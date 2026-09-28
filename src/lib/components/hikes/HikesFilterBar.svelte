<script lang="ts">
	import SlidersHorizontal from '@lucide/svelte/icons/sliders-horizontal';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import X from '@lucide/svelte/icons/x';
	// The same marks the cards use for the same metrics — a filter chip and the
	// card it filters should not need two vocabularies for one idea.
	import Route from '@lucide/svelte/icons/route';
	import Clock from '@lucide/svelte/icons/clock';
	import TrendingUp from '@lucide/svelte/icons/trending-up';
	import TrendingDown from '@lucide/svelte/icons/trending-down';
	import TrainFront from '@lucide/svelte/icons/train-front';
	import CalendarRange from '@lucide/svelte/icons/calendar-range';
	import type { Component } from 'svelte';
	import RangeSlider from './RangeSlider.svelte';
	import ChipTypeahead from './ChipTypeahead.svelte';
	import Toggle from '$lib/components/Toggle.svelte';
	import { hikeAreaValues, type HikeArea } from '$lib/hikes/hikeArea';
	import {
		hikeFilterBounds,
		DISTANCE_STEP,
		DURATION_STEP,
		ELEVATION_STEP,
		TRAVEL_STEP
	} from '$lib/hikes/filterBounds';
	import { HUBS } from '$lib/hikes/hubs';
	import { formatHikeDuration } from '$lib/hikes/elapsed';
	import { sacBand } from '$lib/data/sacColors';
	import { hubFor, setHub } from '$lib/hikes/travelHub.svelte';
	import { toggledParams, withParams } from '$lib/js/queryToggle';
	import {
		filterToParams,
		RANGE_KEYS,
		boundsKey,
		type HikesFilter,
		type RangeKey
	} from '$lib/hikes/browseParams';
	import type { Difficulty, HikeManifestEntry, HikeTravelTable, HubId } from '$types/hikes';
	import { hikesLocale, m, tagLabel, type HikesKey, type HikesLang } from '$lib/js/hikesI18n';
	import { graphicPlaceholder } from '$lib/hikes/graphicPlaceholder';
	import { HIKE_AREA_PLACEHOLDER } from '$lib/data/hikeAreaPlaceholder.generated';

	interface Props {
		hikes: HikeManifestEntry[];
		/** Precomputed travel times — what the Anreisezeit track is measured
		 * against. Without it that range collapses and filters nothing. */
		travel?: HikeTravelTable | null;
		filter: HikesFilter;
		/** Hikes passing the current filter — shown in the bar summary. */
		resultCount: number;
		/** Total hikes before filtering. */
		totalCount: number;
		/** Summed distance / ascent over the filtered subset (already rounded). */
		totalKm: number;
		totalGain: number;
		/** Where a control leads with no script running — the listing's own path.
		 * Absent means the caller cannot honour a filtered URL, so the controls stay
		 * buttons: a link that looks like it did something and did not is worse. */
		facetPath?: string | null;
		/** UI language for the labels; tags keep their German key in the URL. */
		lang?: HikesLang;
	}

	const DIFFICULTIES: Difficulty[] = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6'];

	const {
		hikes,
		travel = null,
		filter,
		resultCount,
		totalCount,
		totalKm,
		totalGain,
		facetPath = null,
		lang = 'de'
	}: Props = $props();

	const t = $derived(m[lang]);
	const locale = $derived(hikesLocale(lang));

	const panelId = $props.id();

	/**
	 * The URL this control leads to with no script running: the filters as they
	 * stand, with this one flipped. With script, every one of them calls
	 * preventDefault and changes the filter directly — the href is the fallback,
	 * never the mechanism.
	 */
	function facetUrl(key: string, value: string, repeated = false): string | undefined {
		if (!facetPath) return undefined;
		return withParams(facetPath, toggledParams(filterToParams(filter, bounds), key, value, repeated));
	}

	/** Same, for a range: dropping the parameter restores its full extent. */
	function clearRangeUrl(key: RangeKey): string | undefined {
		if (!facetPath) return undefined;
		const next = filterToParams(filter, bounds);
		next.delete(key);
		return withParams(facetPath, next);
	}

	const resetUrl = $derived(facetPath ?? undefined);

	/** Everything except the ranges, as hidden fields for the script-free range
	 *  form — submitting it must narrow the listing, not restart it. */
	const carriedFilters = $derived.by(() => {
		const params = filterToParams(filter, bounds);
		for (const k of RANGE_KEYS) params.delete(k);
		// The hub travels as the picker's own <select name="hub">; a hidden copy
		// would submit it twice.
		params.delete('hub');
		return [...params.entries()];
	});

	// Collapsed-by-default: the bar is just a summary + active-filter chips +
	// a trigger until the user opens the control panel. Keeps the listing's
	// vertical rhythm clean — the filters only take space when wanted.
	let open = $state(false);
	let root = $state<HTMLElement>();

	// Range-slider track extents, derived from the data (see filterBounds.ts —
	// the same helper seeds the page's default filter state).
	// Same expression as the listing's, so the track and the filter state agree
	// about where each end sits — see +page.svelte.
	const hub = $derived(hubFor(filter.hub));
	const bounds = $derived(hikeFilterBounds(hikes, hub, travel));
	const hubLabel = $derived(HUBS.find((h) => h.id === hub)?.label ?? hub);

	/**
	 * Switching hubs rescales the travel axis — two hours from Zurich reaches
	 * half the country, two hours from Flims reaches Chur — so the range is
	 * reset to the new extents rather than carried across. Keeping the numbers
	 * would silently re-filter the listing against a scale the reader never saw.
	 *
	 * The cookie is written too, so the hike pages this listing links to open on
	 * the hub the reader just chose.
	 */
	function chooseHub(id: HubId) {
		filter.hub = id;
		setHub(id);
		const next = hikeFilterBounds(hikes, id, travel).travel;
		filter.minTravelMin = next.min;
		filter.maxTravelMin = next.max;
	}

	const regions = $derived.by(() => {
		const seen: Record<string, true> = {};
		const out: string[] = [];
		for (const h of hikes) {
			if (h.region && !seen[h.region]) {
				seen[h.region] = true;
				out.push(h.region);
			}
		}
		return out.sort((a, b) => a.localeCompare(b));
	});

	// Geographic areas present in the data. A hike contributes every level it
	// belongs to — its canton or Bundesland AND its country — so the list can
	// offer "Österreich" next to "Kärnten". Deduped by namespaced value; cantons
	// first (alphabetical), then regions abroad, then whole countries.
	const areaList = $derived.by(() => {
		const map = new Map<string, HikeArea>();
		for (const h of hikes) {
			for (const a of hikeAreaValues(h.canton, h.country, h.state)) {
				if (!map.has(a.value)) map.set(a.value, a);
			}
		}
		const rank = { canton: 0, state: 1, country: 2 };
		return [...map.values()].sort((a, b) =>
			a.kind === b.kind ? a.label.localeCompare(b.label) : rank[a.kind] - rank[b.kind]
		);
	});
	const areaValues = $derived(areaList.map((a) => a.value));
	const areaByValue = $derived(new Map(areaList.map((a) => [a.value, a])));

	// Tags sorted by usage frequency (most-used first), alphabetical for
	// ties. Frequency ordering surfaces broadly-applicable filters like
	// "winter" or "easy" at the head of the list, where they're most
	// useful for narrowing the listing.
	const tags = $derived.by(() => {
		const counts = new Map<string, number>();
		for (const h of hikes) {
			for (const t of h.tags ?? []) {
				counts.set(t, (counts.get(t) ?? 0) + 1);
			}
		}
		return [...counts.entries()]
			.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
			.map(([t]) => t);
	});

	/** A handful of evenly spaced marks along a track, snapped to the control's own
	 *  step so a thumb dragged to a mark lands exactly on it. */
	function ticksFor(b: { min: number; max: number }, step: number, count = 5): number[] {
		const span = b.max - b.min;
		const out: number[] = [];
		for (let i = 0; i < count; i++) {
			out.push(Math.round((b.min + (span * i) / (count - 1)) / step) * step);
		}
		return [...new Set(out)];
	}

	/** Travel times read as journeys, not as stopwatch readings: "2h 05", not
	 *  "2h 5m". Minutes alone below the hour. */
	function fmtTravel(min: number) {
		if (min < 60) return `${min} min`;
		const h = Math.floor(min / 60);
		const m = min % 60;
		return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, '0')}`;
	}

	/** The filter's numeric fields — the ends of each range. */
	type RangeEnd = {
		[K in keyof HikesFilter]: HikesFilter[K] extends number ? K : never;
	}[keyof HikesFilter];

	/**
	 * The five ranges, in chip order (the URL's). Each has a slider in the panel
	 * and, while narrowed, a removable chip in the bar.
	 */
	const RANGES: {
		key: RangeKey;
		lo: RangeEnd;
		hi: RangeEnd;
		label: HikesKey;
		Icon: Component;
		step: number;
		/** Slider readout and track scale. */
		fmt: (v: number) => string;
		/** Chip label: the number, and the unit written once after the pair. */
		chipFmt: (v: number) => string;
		unit: string;
	}[] = [
		{ key: 'dist', lo: 'minDistanceKm', hi: 'maxDistanceKm', label: 'distance', Icon: Route, step: DISTANCE_STEP, fmt: (v) => `${v} km`, chipFmt: (v) => `${v}`, unit: 'km' },
		{ key: 'dur', lo: 'minDurationMin', hi: 'maxDurationMin', label: 'duration', Icon: Clock, step: DURATION_STEP, fmt: formatHikeDuration, chipFmt: formatHikeDuration, unit: '' },
		{ key: 'up', lo: 'minGainM', hi: 'maxGainM', label: 'ascent', Icon: TrendingUp, step: ELEVATION_STEP, fmt: (v) => `${v} m`, chipFmt: (v) => `${v}`, unit: 'm' },
		{ key: 'down', lo: 'minLossM', hi: 'maxLossM', label: 'descent', Icon: TrendingDown, step: ELEVATION_STEP, fmt: (v) => `${v} m`, chipFmt: (v) => `${v}`, unit: 'm' },
		{ key: 'trav', lo: 'minTravelMin', hi: 'maxTravelMin', label: 'travel_time', Icon: TrainFront, step: TRAVEL_STEP, fmt: fmtTravel, chipFmt: fmtTravel, unit: '' }
	];
	/** The panel leads with travel time: it sits under the hub picker it depends on. */
	const SLIDERS = [RANGES[4], ...RANGES.slice(0, 4)];

	// Compact chip label for a narrowed range: "≤ hi" / "≥ lo" / "lo–hi",
	// suppressing whichever end still sits at its data bound.
	function rangeLabel(
		lo: number,
		hi: number,
		b: { min: number; max: number },
		fmt: (v: number) => string,
		unit: string
	) {
		const u = unit ? ` ${unit}` : '';
		const loNarrowed = lo > b.min;
		const hiNarrowed = hi < b.max;
		if (loNarrowed && hiNarrowed) return `${fmt(lo)}–${fmt(hi)}${u}`;
		if (hiNarrowed) return `≤ ${fmt(hi)}${u}`;
		return `≥ ${fmt(lo)}${u}`;
	}

	// Active filters, flattened into removable chips for the collapsed bar.
	// A range counts as "active" only when narrowed below its data ceiling.
	type Chip = {
		key: string;
		label: string;
		/** Image URL — the cantonal arms / country flags an area chip carries. */
		icon?: string;
		/** Lucide icon, for the chips that stand for a measurement. */
		Icon?: Component;
		href?: string;
		clear: () => void;
	};
	const chips = $derived.by<Chip[]>(() => {
		const out: Chip[] = [];
		if (filter.inSeasonOnly)
			out.push({
				key: 'season',
				label: t.in_season,
				Icon: CalendarRange,
				href: facetUrl('season', 'now'),
				clear: () => (filter.inSeasonOnly = false)
			});
		for (const r of RANGES) {
			const b = bounds[boundsKey(r.key)];
			if (filter[r.lo] <= b.min && filter[r.hi] >= b.max) continue;
			const label = rangeLabel(filter[r.lo], filter[r.hi], b, r.chipFmt, r.unit);
			out.push({
				key: r.key,
				href: clearRangeUrl(r.key),
				Icon: r.Icon,
				// The travel chip names the hub: the same "≤ 2 h" means different
				// hikes from Basel than from Chur, and the chip is all the reader
				// sees of this filter once the panel is closed.
				label: r.key === 'trav' ? `${label} ${t.from} ${hubLabel}` : label,
				clear: () => {
					filter[r.lo] = b.min;
					filter[r.hi] = b.max;
				}
			});
		}
		for (const d of DIFFICULTIES)
			if (filter.difficulties.has(d))
				out.push({
					key: `d-${d}`,
					label: d,
					href: facetUrl('d', d, true),
					clear: () => filter.difficulties.delete(d)
				});
		for (const r of filter.regions)
			out.push({
				key: `r-${r}`,
				label: r,
				href: facetUrl('region', r, true),
				clear: () => filter.regions.delete(r)
			});
		for (const value of filter.areas) {
			const a = areaByValue.get(value);
			out.push({
				key: `a-${value}`,
				label: a?.label ?? value,
				icon: a?.iconUrl,
				href: facetUrl('area', value, true),
				clear: () => filter.areas.delete(value)
			});
		}
		for (const tag of filter.tags)
			out.push({
				key: `t-${tag}`,
				label: `#${tagLabel(tag, lang)}`,
				href: facetUrl('tag', tag, true),
				clear: () => filter.tags.delete(tag)
			});
		return out;
	});

	const activeCount = $derived(chips.length);

	function toggleIn<T>(set: Set<T>, value: T) {
		if (set.has(value)) set.delete(value);
		else set.add(value);
	}

	/** Every range back to its data bounds and every facet off. The hub stays:
	 *  it is a setting, not a filter (so not `emptyFilter()`, which drops it). */
	function resetFilters() {
		for (const r of RANGES) {
			const b = bounds[boundsKey(r.key)];
			filter[r.lo] = b.min;
			filter[r.hi] = b.max;
		}
		filter.difficulties.clear();
		filter.regions.clear();
		filter.areas.clear();
		filter.tags.clear();
		filter.inSeasonOnly = false;
	}

	// Light-dismiss: close the panel on outside click or Escape. Only wired
	// up while open so the listeners aren't carried for the whole session.
	$effect(() => {
		if (!open) return;
		const onPointer = (e: PointerEvent) => {
			if (root && !root.contains(e.target as Node)) open = false;
		};
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') open = false;
		};
		document.addEventListener('pointerdown', onPointer);
		document.addEventListener('keydown', onKey);
		return () => {
			document.removeEventListener('pointerdown', onPointer);
			document.removeEventListener('keydown', onKey);
		};
	});
</script>

<div class="filter-bar" bind:this={root}>
	<p class="summary">
		<span class="count"><strong>{resultCount}</strong> {t.of} {totalCount} {t.tours}</span>
		{#if resultCount > 0}
			<span class="dot" aria-hidden="true">·</span>
			<span class="stat">{totalKm.toLocaleString(locale)} km</span>
			<span class="dot" aria-hidden="true">·</span>
			<span class="stat">{totalGain.toLocaleString(locale)} hm</span>
		{/if}
	</p>

	{#if activeCount > 0}
		<div class="active-chips" aria-label={t.active_filters}>
			{#each chips as chip (chip.key)}
				<svelte:element
					this={chip.href ? 'a' : 'button'}
					role={chip.href ? 'link' : 'button'}
					href={chip.href}
					type={chip.href ? undefined : 'button'}
					class="chip"
					onclick={(e: Event) => { if (chip.href) e.preventDefault(); chip.clear(); }}
				>
					{#if chip.icon}{@const ph = graphicPlaceholder(HIKE_AREA_PLACEHOLDER[chip.icon])}<img
							class="chip-emblem"
							src={chip.icon}
							alt=""
							aria-hidden="true"
							fetchpriority="low"
							style={ph.style}
							{@attach ph.attach}
						/>{:else if chip.Icon}{@const Icon = chip.Icon}<Icon
							class="chip-icon"
							size={13}
							strokeWidth={1.75}
							aria-hidden="true"
						/>{/if}<span class="chip-label">{chip.label}</span>
					<X size={13} strokeWidth={2} aria-label={t.remove} />
				</svelte:element>
			{/each}
			<svelte:element
				this={resetUrl ? 'a' : 'button'}
				role={resetUrl ? 'link' : 'button'}
				href={resetUrl}
				type={resetUrl ? undefined : 'button'}
				class="clear-all"
				onclick={(e: Event) => { if (resetUrl) e.preventDefault(); resetFilters(); }}
			>{t.clear_all}</svelte:element>
		</div>
	{/if}

	<!-- A checkbox behind a label, so the panel opens in CSS and a browser with no
	     script can still reach the filters. `open` stays bound to it, so the
	     light-dismiss effect and everything else that drove the old button work
	     unchanged. -->
	<input
		id={panelId}
		class="panel-toggle"
		type="checkbox"
		bind:checked={open}
		aria-controls="filter-panel"
	/>
	<label class="filter-toggle" class:open for={panelId}>
		<SlidersHorizontal size={16} strokeWidth={1.75} aria-hidden="true" />
		<span>{t.filter}</span>
		{#if activeCount > 0}<span class="badge">{activeCount}</span>{/if}
		<ChevronDown class="chev" size={16} strokeWidth={1.75} aria-hidden="true" />
	</label>

	<div class="panel-wrap">
		<div id="filter-panel" class="panel">
			<div class="panel-inner">
			<div class="season-row">
				<Toggle
					bind:checked={filter.inSeasonOnly}
					label={t.in_season_only}
					href={facetUrl('season', 'now')}
				/>
			</div>

			<hr class="divider" />

			<!--
				Two halves of the same control. The dual-thumb track needs pointer
				handlers to move, so with no script it is hidden and the native range
				inputs below it take over — in a GET form with its own submit button,
				because a range cannot narrow the listing until it is sent.
			-->
			{#snippet nativeRange(key: RangeKey, label: string, low: number, high: number, b: { min: number; max: number }, step: number, fmt: (v: number) => string)}
				{@const ticks = ticksFor(b, step)}
				<fieldset class="range-inputs">
					<legend class="sr-only">{label}</legend>
					<label class="bound">
						<span>ab</span>
						<!--
							The lower bound runs on a reversed axis: its value is negated and
							the track laid out right-to-left, which puts the minimum on the
							left and the maximum on the right exactly as the upper slider has
							them — while the browser's own fill, which always runs from the
							track's minimum end, now covers everything to the right of the
							thumb. That is the half the filter keeps, and it follows the thumb
							live, with no script and no colour trickery. The negation is undone
							by the listing's redirect, so the URL never shows it.
						-->
						<input
							class="bound-min"
							type="range"
							dir="rtl"
							name="{key}minneg"
							value={-low}
							min={-b.max}
							max={-b.min}
							{step}
							list="{panelId}-ticks-{key}-neg"
							aria-label="{label} {t.from}"
						/>
					</label>
					<label class="bound">
						<span>{t.to}</span>
						<input
							class="bound-max"
							type="range"
							name="{key}max"
							value={high}
							min={b.min}
							max={b.max}
							{step}
							list="{panelId}-ticks-{key}"
							aria-label="{label} {t.to}"
						/>
					</label>
					<!-- The marks the browser draws on the track, and the same values
					     written out underneath so they can be read as well as felt. -->
					<datalist id="{panelId}-ticks-{key}">
						{#each ticks as tick (tick)}<option value={tick}></option>{/each}
					</datalist>
					<datalist id="{panelId}-ticks-{key}-neg">
						{#each ticks as tick (tick)}<option value={-tick}></option>{/each}
					</datalist>
					<p class="range-scale" aria-hidden="true">
						{#each ticks as tick (tick)}<span>{fmt(tick)}</span>{/each}
					</p>
				</fieldset>
			{/snippet}

			{#snippet rangeFields()}
				<!--
					The hub the travel range is measured from. One control serves
					both paths: with script its onchange rescales the axis in
					place, without it the reader picks and presses Anwenden, and
					the layout reads `?hub=` on the way back. It is a <select>
					rather than a row of pills because it is a single-choice
					setting for the whole panel, not another facet to toggle.
				-->
				<div class="hub-row">
					<label class="hub-label" for="{panelId}-hub">{t.travel_from}</label>
					<select
						id="{panelId}-hub"
						name="hub"
						class="hub-select"
						value={hub}
						onchange={(e: Event & { currentTarget: HTMLSelectElement }) =>
							chooseHub(e.currentTarget.value as HubId)}
					>
						{#each HUBS as h (h.id)}
							<option value={h.id}>{h.label}</option>
						{/each}
					</select>
					<span class="hub-note">
						{#if hub === 'flims'}{t.public_transport}{:else}{t.public_transport_incl}{/if}
					</span>
				</div>
				<div class="ranges">
					{#each SLIDERS as r (r.key)}
						{@const b = bounds[boundsKey(r.key)]}
						<div class="range-field">
							<RangeSlider
								label={t[r.label]}
								icon={r.Icon}
								min={b.min}
								max={b.max}
								step={r.step}
								bind:low={filter[r.lo]}
								bind:high={filter[r.hi]}
								format={r.fmt}
							/>
							{@render nativeRange(r.key, t[r.label], filter[r.lo], filter[r.hi], b, r.step, r.fmt)}
						</div>
					{/each}
				</div>
			{/snippet}

			{#if facetPath}
				<form class="range-form" method="get" action={facetPath}>
					{#each carriedFilters as [key, value] (key + value)}
						<input type="hidden" name={key} value={value} />
					{/each}
					{@render rangeFields()}
					<button type="submit" class="range-submit">{t.apply}</button>
				</form>
			{:else}
				{@render rangeFields()}
			{/if}

			<hr class="divider" />

			<fieldset>
				<legend>{t.difficulty_sac}</legend>
				<div class="sac-grid">
					{#each DIFFICULTIES as d (d)}
						{@const active = filter.difficulties.has(d)}
						{@const href = facetUrl('d', d, true)}
						<svelte:element
							this={href ? 'a' : 'button'}
							role={href ? 'link' : 'button'}
							{href}
							type={href ? undefined : 'button'}
							class="sac-toggle"
							class:active
							aria-current={href && active ? 'true' : undefined}
							aria-pressed={href ? undefined : active}
							aria-label="SAC-Schwierigkeit {d}"
							onclick={(e: Event) => { if (href) e.preventDefault(); toggleIn(filter.difficulties, d); }}
						>
							<span class="sac-marker sac-marker-{sacBand(d)}">{d}</span>
						</svelte:element>
					{/each}
				</div>
			</fieldset>

			{#if regions.length > 0}
				<fieldset>
					<legend>{t.region}</legend>
					<div class="pills">
						{#each regions as r (r)}
							{@const active = filter.regions.has(r)}
							{@const href = facetUrl('region', r, true)}
							<svelte:element
								this={href ? 'a' : 'button'}
								role={href ? 'link' : 'button'}
								{href}
								type={href ? undefined : 'button'}
								class="pill"
								class:active
								aria-current={href && active ? 'true' : undefined}
								aria-pressed={href ? undefined : active}
								onclick={(e: Event) => { if (href) e.preventDefault(); toggleIn(filter.regions, r); }}
							>{r}</svelte:element>
						{/each}
					</div>
				</fieldset>
			{/if}

			{#if areaList.length > 0}
				<fieldset>
					<legend>{t.canton_country}</legend>
					<ChipTypeahead
						options={areaValues}
						selected={filter.areas}
						onToggle={(value) => toggleIn(filter.areas, value)}
						placeholder={t.canton_country_placeholder}
						{lang}
						iconFor={(value) => areaByValue.get(value)?.iconUrl}
						labelFor={(value) => areaByValue.get(value)?.label ?? value}
					/>
					<!-- The typeahead needs script to filter as you type; without it the
					     same options are simply all there, as links. -->
					<div class="pills nojs-pills">
						{#each areaList as area (area.value)}
							{@const active = filter.areas.has(area.value)}
							{@const href = facetUrl('area', area.value, true)}
							{@const ph = graphicPlaceholder(HIKE_AREA_PLACEHOLDER[area.iconUrl])}
							<svelte:element
								this={href ? 'a' : 'button'}
								role={href ? 'link' : 'button'}
								{href}
								type={href ? undefined : 'button'}
								class="pill"
								class:active
								aria-current={href && active ? 'true' : undefined}
								aria-pressed={href ? undefined : active}
								onclick={(e: Event) => { if (href) e.preventDefault(); toggleIn(filter.areas, area.value); }}
							>
								<!-- Lazy: the list is hidden whenever script runs, and hidden
								     lazy images never load. -->
								<img
									class="pill-emblem"
									src={area.iconUrl}
									alt=""
									aria-hidden="true"
									loading="lazy"
									fetchpriority="low"
									style={ph.style}
									{@attach ph.attach}
								/>{area.label}
							</svelte:element>
						{/each}
					</div>
				</fieldset>
			{/if}

			{#if tags.length > 0}
				<fieldset>
					<legend>{t.tags}</legend>
					<ChipTypeahead
						options={tags}
						selected={filter.tags}
						onToggle={(value) => toggleIn(filter.tags, value)}
						hash
						placeholder={t.tag_placeholder}
						labelFor={(value) => tagLabel(value, lang)}
						{lang}
					/>
					<div class="pills nojs-pills">
						{#each tags as tag (tag)}
							{@const active = filter.tags.has(tag)}
							{@const href = facetUrl('tag', tag, true)}
							<svelte:element
								this={href ? 'a' : 'button'}
								role={href ? 'link' : 'button'}
								{href}
								type={href ? undefined : 'button'}
								class="pill"
								class:active
								aria-current={href && active ? 'true' : undefined}
								aria-pressed={href ? undefined : active}
								onclick={(e: Event) => { if (href) e.preventDefault(); toggleIn(filter.tags, tag); }}
							>#{tagLabel(tag, lang)}</svelte:element>
						{/each}
					</div>
				</fieldset>
			{/if}

			<div class="panel-foot">
				{#if resetUrl && activeCount > 0}
					<a
						class="reset"
						href={resetUrl}
						onclick={(e) => { e.preventDefault(); resetFilters(); }}
					>{t.reset}</a>
				{:else}
					<button type="button" class="reset" onclick={resetFilters} disabled={activeCount === 0}>
						{t.reset}
					</button>
				{/if}
				</div>
			</div>
		</div>
	</div>
</div>

<style>
	.filter-bar {
		position: relative;
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.5rem 0.75rem;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		padding: 0.5rem 0.6rem 0.5rem 1rem;
		box-shadow: var(--shadow-sm);
	}

	.summary {
		display: inline-flex;
		align-items: baseline;
		flex-wrap: wrap;
		gap: 0.4rem;
		margin: 0;
		flex: 0 1 auto;
		font-size: 0.9rem;
		color: var(--color-text-secondary);
	}

	.count strong {
		color: var(--color-text-primary);
		font-weight: 700;
	}

	.stat {
		font-size: 0.82rem;
		color: var(--color-text-tertiary);
		font-variant-numeric: tabular-nums;
	}

	.dot {
		color: var(--color-text-muted);
	}

	/* Active filters surfaced inline so the user always sees what's narrowing
	 * the listing without opening the panel; each chip removes its own facet. */
	.active-chips {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.35rem;
		flex: 1 1 auto;
		min-width: 0;
	}

	.chip {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		appearance: none;
		font: inherit;
		font-size: 0.78rem;
		padding: 0.18rem 0.5rem 0.18rem 0.65rem;
		border-radius: var(--radius-pill);
		cursor: pointer;
		color: var(--color-text-primary);
		background: color-mix(in srgb, var(--color-primary) 12%, var(--color-surface));
		border: 1px solid color-mix(in srgb, var(--color-primary) 32%, var(--color-border));
		transition: background-color var(--transition-fast), border-color var(--transition-fast);
	}

	.chip:hover {
		background: color-mix(in srgb, var(--color-primary) 22%, var(--color-surface));
	}

	/* The trailing X, which stays quiet until the chip is hovered. */
	.chip :global(svg) {
		opacity: 0.6;
		transition: opacity var(--transition-fast);
	}

	/* The leading metric mark is not a control — it is what the chip is about,
	   and it carries the same colour the cards give the same icon. */
	.chip :global(svg.chip-icon) {
		opacity: 1;
		color: var(--color-primary);
		flex: 0 0 auto;
	}

	.chip:hover :global(svg) {
		opacity: 1;
	}

	.chip-label {
		font-variant-numeric: tabular-nums;
	}

	/* Canton coat-of-arms inside an active-filter chip. */
	.chip-emblem {
		width: 12px;
		height: 15px;
		object-fit: contain;
		flex: 0 0 auto;
		filter: drop-shadow(0 1px 1px rgb(0 0 0 / 0.18));
	}

	.clear-all {
		appearance: none;
		background: transparent;
		border: 0;
		font: inherit;
		font-size: 0.78rem;
		color: var(--color-text-tertiary);
		cursor: pointer;
		padding: 0.18rem 0.3rem;
		text-decoration: underline;
		text-underline-offset: 2px;
	}

	.clear-all:hover {
		color: var(--color-text-primary);
	}

	.filter-toggle {
		margin-left: auto;
		user-select: none;
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		appearance: none;
		font: inherit;
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--color-text-primary);
		background: var(--color-bg-tertiary);
		border: 1px solid var(--color-border);
		padding: 0.45rem 0.8rem;
		border-radius: var(--radius-pill);
		cursor: pointer;
		transition: background-color var(--transition-fast), border-color var(--transition-fast);
	}

	.filter-toggle:hover {
		background: var(--color-bg-elevated);
	}

	.filter-toggle.open {
		border-color: var(--color-primary);
		background: var(--color-bg-elevated);
	}

	.filter-toggle :global(.chev) {
		transition: rotate var(--transition-normal);
	}

	.filter-toggle.open :global(.chev) {
		rotate: 180deg;
	}

	.badge {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 1.2rem;
		height: 1.2rem;
		padding: 0 0.35rem;
		background: var(--color-primary);
		color: var(--color-text-on-primary);
		border-radius: var(--radius-pill);
		font-size: 0.72rem;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
	}

	/* Expands in-flow on its own full-width row inside the bar, so opening it
	 * pushes the card grid down (accordion) rather than overlaying it. The
	 * top border separates it from the summary row; both it and the vertical
	 * padding are animated by the `slide` transition. */
	/* Visually gone, still focusable and still the thing that holds the state —
	   the label in front of it is what a pointer sees. */
	.panel-toggle {
		position: absolute;
		width: 1px;
		height: 1px;
		margin: -1px;
		padding: 0;
		border: 0;
		overflow: hidden;
		clip-path: inset(50%);
		white-space: nowrap;
	}

	.panel-toggle:focus-visible + .filter-toggle {
		outline: 2px solid var(--color-primary);
		outline-offset: 2px;
	}

	/* The disclosure animates in CSS rather than through a Svelte transition, so
	   it still slides with no script running. A 0fr → 1fr grid row is the one way
	   to animate to a height nobody has measured. */
	.panel-wrap {
		width: 100%;
		display: grid;
		grid-template-rows: 0fr;
		transition: grid-template-rows var(--transition-normal) ease;
	}

	.panel-toggle:checked ~ .panel-wrap {
		grid-template-rows: 1fr;
	}

	@media (prefers-reduced-motion: reduce) {
		.panel-wrap { transition: none; }
	}

	/* The clipping half of the disclosure: nothing but overflow, because padding,
	   a border or a margin here would keep rendering at row height 0 and leave a
	   sliver of open panel behind. All of that lives on `.panel-inner`.
	   
	   The clip is only wanted while the row is collapsing — once open it would cut
	   off the typeahead's dropdown, which has to hang over the cards below. */
	.panel {
		width: 100%;
		overflow: hidden;
		min-height: 0;
		transition: overflow 0s;
		transition-behavior: allow-discrete;
	}

	/* Lifted at the END of the opening animation and restored at the START of the
	   closing one, so the panel is never both clipping and mid-slide. Browsers
	   without discrete transitions just flip it immediately: the dropdown still
	   escapes, the only cost is that the panel does not clip itself for 200ms. */
	.panel-toggle:checked ~ .panel-wrap > .panel {
		overflow: visible;
		transition: overflow 0s var(--transition-normal);
		transition-behavior: allow-discrete;
	}

	.panel-inner {
		display: flex;
		flex-direction: column;
		gap: 1.1rem;
		margin-top: 0.6rem;
		padding-top: 1.1rem;
		border-top: 1px solid var(--color-border);
	}

	.ranges {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 1.1rem 1.75rem;
	}

	/* Hub picker sits above the ranges as their shared premise, not as one more
	   field among them. */
	.hub-row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.4rem 0.6rem;
		margin-bottom: 0.9rem;
	}

	.hub-row .hub-label {
		font-size: var(--text-sm);
		color: var(--color-text-secondary);
	}

	.hub-row .hub-select {
		appearance: none;
		background: var(--color-bg-tertiary);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-pill);
		color: var(--color-text-primary);
		font: inherit;
		font-size: var(--text-sm);
		font-weight: 600;
		padding: 0.25rem 1.5rem 0.25rem 0.7rem;
		background-image: linear-gradient(45deg, transparent 50%, currentColor 50%),
			linear-gradient(135deg, currentColor 50%, transparent 50%);
		background-position: right 0.72rem center, right 0.5rem center;
		background-size: 0.3rem 0.3rem, 0.3rem 0.3rem;
		background-repeat: no-repeat;
		cursor: pointer;
	}

	.hub-row .hub-select:hover {
		background-color: var(--color-bg-elevated);
	}

	.hub-row .hub-note {
		font-size: var(--text-sm);
		color: var(--color-text-tertiary);
	}

	.divider {
		height: 1px;
		border: 0;
		margin: 0;
		background: var(--color-border);
	}

	fieldset {
		border: 0;
		padding: 0;
		margin: 0;
	}

	legend {
		display: block;
		margin-bottom: 0.5rem;
		font-size: 0.72rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-text-tertiary);
	}

	.pills {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
	}

	.pill {
		appearance: none;
		border: 1px solid var(--color-border);
		background: var(--color-bg-tertiary);
		color: var(--color-text-secondary);
		font: inherit;
		font-size: 0.8rem;
		padding: 0.25rem 0.7rem;
		border-radius: var(--radius-pill);
		cursor: pointer;
		transition: scale var(--transition-fast), background-color var(--transition-fast),
			color var(--transition-fast);
	}

	.pill:hover {
		scale: 1.05;
		background: var(--color-bg-elevated);
	}

	.pill.active {
		background: var(--color-primary);
		color: var(--color-text-on-primary);
		border-color: var(--color-primary);
	}

	/* Difficulty toggles render the actual SAC trail-sign markers (same shapes
	 * as the hike cards): T1 yellow Wegweiser arrow, T2/T3 white-red-white
	 * Bergweg, T4–T6 white-blue-white Alpinweg. No container chrome — boxing
	 * the irregular arrow looked off. Selection is the sign itself "lighting
	 * up": unselected signs are dimmed + desaturated, the selected ones snap
	 * to full colour, scale up and lift with a shadow. */
	.sac-grid {
		display: flex;
		flex-wrap: wrap;
		gap: 0.6rem;
	}

	.sac-toggle {
		appearance: none;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 2px;
		background: none;
		border: 0;
		border-radius: var(--radius-sm);
		cursor: pointer;
		opacity: 0.45;
		filter: grayscale(0.6);
		transition: scale var(--transition-fast), opacity var(--transition-fast),
			filter var(--transition-fast);
	}

	.sac-toggle:hover {
		opacity: 0.85;
		filter: grayscale(0.1);
		scale: 1.08;
	}

	.sac-toggle.active {
		opacity: 1;
		filter: none;
		scale: 1.08;
	}

	.sac-toggle:focus-visible {
		outline: 2px solid var(--color-primary);
		outline-offset: 2px;
	}

	/* Lift only the selected signs so they read as raised above the dimmed
	 * ones. (Applied to the marker, not the toggle, so it survives the
	 * toggle's `filter: none`.) */
	.sac-toggle.active .sac-marker {
		filter: drop-shadow(0 2px 5px rgb(0 0 0 / 0.35));
	}

	.sac-marker {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		height: 26px;
		font-family: ui-monospace, 'SF Mono', Menlo, monospace;
		font-size: 0.8rem;
		font-weight: 700;
		letter-spacing: 0.02em;
		line-height: 1;
	}

	.sac-marker-yellow {
		width: 44px;
		color: #1a1a1a;
		background: #f5a623;
		clip-path: polygon(0 0, 75% 0, 100% 50%, 75% 100%, 0 100%);
		/* Text sits in the rectangular left portion (arrow tip is the right 25%). */
		justify-content: flex-start;
		padding-left: 0.55rem;
	}

	.sac-marker-red,
	.sac-marker-blue {
		width: 32px;
		color: #fff;
		text-shadow: 0 1px 1px rgb(0 0 0 / 0.45);
		border-radius: 2px;
		box-shadow: 0 0 0 1px rgb(0 0 0 / 0.18);
	}

	.sac-marker-red {
		background: linear-gradient(to bottom, #fff 0 25%, #dc1d2a 25% 75%, #fff 75% 100%);
	}

	.sac-marker-blue {
		background: linear-gradient(to bottom, #fff 0 25%, #2965c8 25% 75%, #fff 75% 100%);
	}

	.panel-foot {
		display: flex;
		justify-content: flex-end;
	}

	.reset {
		appearance: none;
		background: transparent;
		border: 1px solid var(--color-border);
		color: var(--color-text-secondary);
		font: inherit;
		font-size: 0.85rem;
		padding: 0.4rem 0.9rem;
		border-radius: var(--radius-pill);
		cursor: pointer;
		transition: background-color var(--transition-fast);
	}

	.reset:hover:not(:disabled) {
		background: var(--color-bg-elevated);
	}

	.reset:disabled {
		opacity: 0.45;
		cursor: default;
	}

	@media (max-width: 560px) {
		.ranges {
			grid-template-columns: 1fr;
		}

		/* Give the trigger its own line so the summary + chips aren't squeezed. */
		.summary {
			flex: 1 1 100%;
		}
	}

	/* The script-free halves of this bar, hidden wherever the script-driven
	   controls actually work. A browser that does not know the media feature is a
	   browser running script, which is the case those controls serve. */
	.range-inputs,
	.range-submit,
	.nojs-pills {
		display: none;
	}

	/* Every control in the bar is a link now, and a link brings an underline with
	   it. These read as controls, not as prose. */
	.chip,
	.clear-all,
	.sac-toggle,
	.pill,
	.reset {
		text-decoration: none;
	}

	@media (scripting: none) {
		/* The dual-thumb track needs pointer handlers to move, so it goes — but
		   only it. Its label and readout are plain markup and stay, with the native
		   inputs taking their place directly underneath. */
		.range-field :global(.rs-track) { display: none; }

		.range-inputs {
			display: block;
			border: none;
			margin: 0;
			padding: 0;
		}

		.bound {
			display: block;
			margin-bottom: 0.15rem;
		}

		.bound span {
			display: block;
			font-size: 0.62rem;
			line-height: 1.4;
			color: var(--color-text-tertiary);
		}

		.bound input[type='range'] {
			width: 100%;
			accent-color: var(--color-primary);
		}

		.range-scale {
			display: flex;
			justify-content: space-between;
			margin: 0.1rem 0 0;
			font-size: 0.62rem;
			font-variant-numeric: tabular-nums;
			color: var(--color-text-tertiary);
		}

		.range-submit {
			display: inline-block;
			margin-top: 0.8rem;
			font: inherit;
			font-size: 0.85rem;
			font-weight: 600;
			padding: 0.45rem 1rem;
			border: 0;
			border-radius: var(--radius-pill);
			background: var(--color-primary);
			color: var(--color-text-on-primary);
			cursor: pointer;
		}

		/* The typeahead cannot filter as you type without script, so the options
		   are simply all listed instead. */
		fieldset :global(.tt) { display: none; }
		.nojs-pills { display: flex; }
	}

	.pill-emblem {
		width: 14px;
		height: 14px;
		object-fit: contain;
		margin-right: 0.3rem;
		vertical-align: -2px;
	}

	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		margin: -1px;
		overflow: hidden;
		clip-path: inset(50%);
		white-space: nowrap;
	}
</style>
