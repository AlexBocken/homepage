<script lang="ts">
	/**
	 * The listing's left column: order, season, category, keywords, nutrition.
	 *
	 * Every section is driven by one `createRecipeBrowse()` instance, so the
	 * counts beside each option are the real number of recipes that option
	 * would leave — computed against all the *other* active filters, not the
	 * whole collection.
	 *
	 * Below 1150px — the width at which the results column stops fitting three
	 * cards beside the rail — the column becomes a bottom sheet: same markup,
	 * opened by a button that carries the active-filter count.
	 */
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import X from '@lucide/svelte/icons/x';
	import RangeSlider from '$lib/components/hikes/RangeSlider.svelte';
	import Toggle from '$lib/components/Toggle.svelte';
	import { m, type RecipesLang } from '$lib/js/recipesI18n';
	import { getCategories } from '$lib/js/categories';
	import type { RecipeBrowse, RecipeSort } from '$lib/js/recipeBrowse.svelte';
	import { browseToParams, toggledParams } from '$lib/js/browseParams';
	import { MACRO_KCAL_CEILING, MACRO_PRESETS, isPresetActive, type MacroPresetKey } from '$lib/js/recipeMacros';

	interface Props {
		browse: RecipeBrowse;
		lang: RecipesLang;
		/** Off when signed out, and on a listing that is already all favourites. */
		showFavorites?: boolean;
		/** Sheet visibility on narrow screens. Bindable. */
		open?: boolean;
		/** The checkbox the sheet opens from, owned by the parent so its trigger button
		 *  can be a `<label>` for it and work without JavaScript. */
		toggleId: string;
		/**
		 * Where a filter links to when there is no script to handle the click — the
		 * listing's own path. Only a page that applies these parameters while
		 * rendering may pass one: a link the server ignores is worse than a button,
		 * because it looks like it did something.
		 */
		facetPath?: string | null;
	}

	let {
		browse,
		lang,
		showFavorites = false,
		open = $bindable(false),
		toggleId,
		facetPath = null
	}: Props = $props();

	const sectionId = $props.id();

	/**
	 * The URL this control leads to with no script running: the filters as they stand,
	 * with this one flipped. With script, every one of them calls preventDefault and
	 * changes the state directly — the href is the fallback, never the mechanism.
	 */
	function facetUrl(key: string, value: string, repeated = false): string | undefined {
		if (!facetPath) return undefined;
		const next = toggledParams(browseToParams(browse), key, value, repeated);
		return next.toString() ? `${facetPath}?${next}` : facetPath;
	}

	/** A nutrition preset sets several ranges at once, so it is built rather than flipped. */
	function presetUrl(key: MacroPresetKey): string | undefined {
		if (!facetPath) return undefined;
		if (isPresetActive(browse.macro, key)) return resetMacrosUrl();
		const preset = MACRO_PRESETS[key] as Record<string, number>;
		const next = browseToParams(browse);
		for (const k of ['p', 'f', 'c', 'kcal']) next.delete(k);
		const pair = (lo: string, hi: string, defLo: number, defHi: number) => {
			const min = preset[lo] ?? defLo;
			const max = preset[hi] ?? defHi;
			return min === defLo && max === defHi ? null : `${min}-${max}`;
		};
		const p = pair('proteinMin', 'proteinMax', 0, 100);
		const f = pair('fatMin', 'fatMax', 0, 100);
		const c = pair('carbsMin', 'carbsMax', 0, 100);
		const kc = pair('kcalMin', 'kcalMax', 0, MACRO_KCAL_CEILING);
		if (p) next.set('p', p);
		if (f) next.set('f', f);
		if (c) next.set('c', c);
		if (kc) next.set('kcal', kc);
		return next.toString() ? `${facetPath}?${next}` : facetPath;
	}

	function resetMacrosUrl(): string | undefined {
		if (!facetPath) return undefined;
		const next = browseToParams(browse);
		for (const k of ['p', 'f', 'c', 'kcal', 'unknown']) next.delete(k);
		return next.toString() ? `${facetPath}?${next}` : facetPath;
	}

	/** Everything except the nutrition ranges, as hidden fields for the script-free
	 *  range form — submitting it must narrow the listing, not restart it. */
	const carriedFilters = $derived.by(() => {
		const params = browseToParams(browse);
		for (const k of ['p', 'f', 'c', 'kcal']) params.delete(k);
		return [...params.entries()];
	});

	const t = $derived(m[lang]);
	const categories = $derived(getCategories(lang));

	const MONTH_FMT = $derived(
		new Intl.DateTimeFormat(lang === 'en' ? 'en-GB' : 'de-CH', { month: 'long' })
	);
	const months = $derived(
		Array.from({ length: 12 }, (_, i) => {
			const name = MONTH_FMT.format(new Date(2001, i, 1));
			return { n: i + 1, name, initial: name.slice(0, 1) };
		})
	);

	const SORTS: { key: RecipeSort; label: () => string }[] = [
		{ key: 'season', label: () => t.sort_season },
		{ key: 'alpha', label: () => t.sort_alpha },
		{ key: 'shuffle', label: () => t.sort_shuffle }
	];

	const PRESETS: { key: MacroPresetKey; label: () => string }[] = [
		{ key: 'high_protein', label: () => t.preset_high_protein },
		{ key: 'low_carb', label: () => t.preset_low_carb },
		{ key: 'light', label: () => t.preset_light }
	];

	// Keywords are long-tailed; show the ones that actually narrow the current
	// result set and keep the rest one click away.
	const TAG_PREVIEW = 14;
	let allTagsShown = $state(false);
	const rankedTags = $derived(
		[...browse.tagCounts.entries()]
			.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'de'))
	);
	const visibleTags = $derived(
		allTagsShown ? rankedTags : rankedTags.slice(0, TAG_PREVIEW)
	);

	// Which sections start open. The disclosure itself is a checkbox — see the styles —
	// so this only seeds it; opening and closing needs no script.
	let sectionOpen = $state({
		season: true,
		category: true,
		tags: false,
		nutrition: false
	});

	// Deliberately not a <dialog>/`showModal()`. Those, and the `:modal`
	// selector that the sheet's visibility hung off, are Safari 15.4/15.6 —
	// on an iPad that stopped at an earlier iPadOS the panel could never be
	// opened, and `:not(:modal)` was an invalid selector there, which drops the
	// whole rule it sits in. Result: no filters at all. A class the CSS keys on
	// works everywhere. `position: fixed` is safe for the sheet because the
	// listing sits outside the hero's parallax transform, which lives in its
	// own out-of-flow layer (see the note on `.hero-layer` in the page).
	// The checkbox is the sheet's control, so it is also what focus lands on: a label
	// cannot take focus, and the checkbox both closes the sheet with Space and is what
	// a screen reader reads the state from.
	let toggleEl = $state<HTMLInputElement>();
	let restoreFocus: HTMLElement | null = null;

	// What `showModal()` used to hand us: focus lands in the sheet, and comes
	// back to whatever opened it.
	$effect(() => {
		if (!open) return;
		restoreFocus = document.activeElement as HTMLElement | null;
		toggleEl?.focus();
		return () => {
			if (restoreFocus?.isConnected) restoreFocus.focus();
		};
	});

	function onKeydown(e: KeyboardEvent) {
		if (open && e.key === 'Escape') open = false;
	}

	/** The four ranges, for the script-free form: label, bounds, and where the current
	 *  value lives. The sliders above read the same state. */
	const SHARE_TICKS = [0, 25, 50, 75, 100];
	const KCAL_TICKS = [0, 500, 1000, MACRO_KCAL_CEILING];

	const RANGE_FIELDS = $derived([
		{ key: 'p', label: () => t.protein, max: 100, step: 5, ticks: SHARE_TICKS,
		  low: () => browse.macro.proteinMin, high: () => browse.macro.proteinMax,
		  readout: () => `${browse.macro.proteinMin}–${browse.macro.proteinMax} %` },
		{ key: 'c', label: () => t.carbs, max: 100, step: 5, ticks: SHARE_TICKS,
		  low: () => browse.macro.carbsMin, high: () => browse.macro.carbsMax,
		  readout: () => `${browse.macro.carbsMin}–${browse.macro.carbsMax} %` },
		{ key: 'f', label: () => t.fat, max: 100, step: 5, ticks: SHARE_TICKS,
		  low: () => browse.macro.fatMin, high: () => browse.macro.fatMax,
		  readout: () => `${browse.macro.fatMin}–${browse.macro.fatMax} %` },
		{ key: 'kcal', label: () => t.kcal_per_portion, max: MACRO_KCAL_CEILING, step: 50, ticks: KCAL_TICKS,
		  low: () => browse.macro.kcalMin, high: () => browse.macro.kcalMax,
		  readout: () => `${browse.macro.kcalMin}–${kcal(browse.macro.kcalMax)} kcal` },
	]);

	/** "All" lifts whichever category is pressed, so it is that category's own link. */
	const allCategoriesHref = $derived(
		browse.category ? facetUrl('category', browse.category) : facetPath ?? undefined
	);

	const pct = (v: number) => `${v} %`;
	const kcal = (v: number) => (v >= MACRO_KCAL_CEILING ? `${v}+` : String(v));
</script>

<style>
	/* Wide screens: a plain column. Narrow: the same markup, fixed to the
	   bottom of the viewport over a scrim. */
	.rail {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		color: inherit;
		font-size: 0.9rem;
	}
	.scrim {
		display: none;
	}

	.rail-head {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 0.5rem;
		padding-bottom: 0.5rem;
	}
	.rail-title {
		font-size: 0.75rem;
		font-weight: 700;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--color-text-secondary);
		margin: 0;
	}
	.reset {
		background: none;
		border: none;
		padding: 0;
		font-size: 0.8rem;
		color: var(--color-primary);
		cursor: pointer;
		text-decoration: underline;
		text-decoration-style: dotted;
		text-underline-offset: 3px;
	}
	.reset:hover { color: var(--color-primary-hover); }

	.section {
		border-top: 1px solid var(--color-border);
		padding: 0.75rem 0;
	}
	.section:first-of-type { border-top: none; }

	/* Section disclosures and the sheet are checkboxes: visually hidden, still
	   focusable, and the only thing that decides what is open. No script involved —
	   with JS the same checkbox is bound to state the rest of the rail reads. */
	.section-toggle,
	.sheet-toggle {
		position: absolute;
		width: 1px;
		height: 1px;
		margin: -1px;
		padding: 0;
		overflow: hidden;
		clip-path: inset(50%);
		white-space: nowrap;
	}
	.section-toggle:focus-visible + .section-head {
		outline: 2px solid var(--color-primary);
		outline-offset: 2px;
	}

	.section-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
		gap: 0.5rem;
		background: none;
		border: none;
		padding: 0;
		cursor: pointer;
		color: var(--color-text-primary);
		font-size: 0.8rem;
		font-weight: 600;
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}
	.section-head :global(svg) {
		transition: transform var(--transition-normal);
		color: var(--color-text-secondary);
		flex-shrink: 0;
	}
	.section-toggle:checked + .section-head :global(svg) { transform: rotate(180deg); }

	/* Grown from 0fr to 1fr rather than slid open by script, so a section can be
	   opened with JavaScript off — and so the animation costs nothing at runtime. */
	.section-body {
		display: grid;
		grid-template-rows: 0fr;
		padding-top: 0;
		/* The clip that lets the section animate its height would also cut the range
		   slider's thumbs, which sit half outside their track at 0 % and 100 %. The
		   gutter moves the clip edge out of their way; it fits inside the one the rail
		   column already keeps for the same reason, so nothing shifts. */
		padding-inline: 0.6rem;
		margin-inline: -0.6rem;
		overflow: hidden;
		transition: grid-template-rows var(--transition-normal) ease, padding-top var(--transition-normal) ease;
	}
	.section-inner {
		min-height: 0;
		visibility: hidden;
		transition: visibility var(--transition-normal);
	}
	.section-toggle:checked ~ .section-body {
		grid-template-rows: 1fr;
		padding-top: 0.7rem;
	}
	.section-toggle:checked ~ .section-body .section-inner {
		visibility: visible;
	}
	@media (prefers-reduced-motion: reduce) {
		.section-body { transition: none; }
	}

	/* The script-free half of each range: hidden wherever the dual-thumb track can
	   actually be dragged. A browser that does not know the media feature is a
	   browser running script, which is the case the track serves. */
	.range-inputs,
	.range-submit { display: none; }

	@media (scripting: none) {
		/* The dual-thumb track needs pointer handlers to move, so it goes — but only
		   it. The label, the readout and the histogram above it are plain markup, and
		   the native inputs take their place directly under the same histogram. */
		.range-field :global(.rs-track) { display: none; }

		/* Full width, like the histogram they sit under — a label column would inset
		   the tracks and the two would stop lining up. The bound's name goes above its
		   own track instead. */
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

		/*
		 * The fill has to move with the thumb, which means the browser has to be the
		 * one painting it: there is no way to read a control's value in CSS, so
		 * anything we draw ourselves can only be redrawn on submit.
		 *
		 * Firefox hands us the two halves of the track as their own elements, so it
		 * gets our colours *and* keeps filling live — no border, dynamic fill.
		 *
		 * Chromium paints the whole control itself, hairline border included, and
		 * ignores styling on the track while it does. Taking that over is what stops
		 * the fill following the thumb, so the border stays: a live fill is worth more
		 * than a pixel of chrome.
		 *
		 * Neither needs the sides special-cased — the lower slider's axis is reversed
		 * (see the markup), so the colour lands on the half it keeps in both.
		 */
		.range-inputs input[type='range'] {
			display: block;
			box-sizing: border-box;
			margin: 0;
			width: 100%;
			height: 1rem;
			border: none;
			accent-color: var(--color-primary);
			cursor: pointer;
		}
		.range-inputs input[type='range']:focus {
			outline: none;
		}
		.range-inputs input[type='range']:focus-visible {
			outline: 2px solid var(--color-primary);
			outline-offset: 2px;
		}

		.range-inputs input[type='range']::-moz-range-track {
			height: 0.35rem;
			border: none;
			border-radius: 999px;
			background: var(--color-bg-tertiary);
		}
		.range-inputs input[type='range']::-moz-range-progress {
			height: 0.35rem;
			border-radius: 999px;
			background: var(--color-primary);
		}
		.range-inputs input[type='range']::-moz-range-thumb {
			width: 0.95rem;
			height: 0.95rem;
			border: none;
			border-radius: 50%;
			background: var(--color-primary);
		}

		/* The scale carries the tick marks itself, since a custom-painted track no
		   longer gets the ones the datalist put there. */
		.range-scale {
			display: flex;
			justify-content: space-between;
			margin: 0 0 0.2rem;
			font-size: 0.62rem;
			font-variant-numeric: tabular-nums;
			color: var(--color-text-tertiary);
		}
		.range-scale span {
			position: relative;
			padding-top: 0.35rem;
		}
		.range-scale span::before {
			content: '';
			position: absolute;
			top: 0;
			left: 50%;
			width: 1px;
			height: 0.25rem;
			background: var(--color-border);
		}
		/* The end marks belong over the ends of the track, not over the middle of
		   their own label. */
		.range-scale span:first-child::before { left: 0; }
		.range-scale span:last-child::before { left: auto; right: 0; }

		.range-field { margin-bottom: 0.4rem; }

		.range-submit {
			display: block;
			align-self: flex-start;
			margin-top: 0.3rem;
			padding: 0.4rem 0.9rem;
			border: none;
			border-radius: var(--radius-pill);
			background: var(--color-primary);
			color: var(--color-text-on-primary);
			font-size: 0.8rem;
			font-weight: 600;
			cursor: pointer;
		}
	}

	/* ─── Order: one segmented control ─── */
	/* Every filter is either a button or, where the page can honour it without script,
	   a link to the same filter — so the link form has to look like the button it
	   replaces rather than like prose. */
	.rail a.chip,
	.rail a.option,
	.months a,
	.segmented a {
		text-align: center;
		text-decoration: none;
	}

	.segmented {
		display: flex;
		background: var(--color-bg-tertiary);
		border-radius: var(--radius-md);
		padding: 2px;
		gap: 2px;
	}
	.segmented button,
	.segmented a {
		flex: 1;
		background: none;
		border: none;
		border-radius: calc(var(--radius-md) - 2px);
		padding: 0.4em 0.3em;
		font-size: 0.78rem;
		color: var(--color-text-secondary);
		cursor: pointer;
		white-space: nowrap;
		transition: background var(--transition-fast), color var(--transition-fast);
	}
	.segmented button:hover,
	.segmented a:hover { color: var(--color-text-primary); }
	.segmented button[aria-pressed='true'],
	.segmented .active {
		background: var(--color-surface);
		color: var(--color-text-primary);
		font-weight: 600;
		box-shadow: var(--shadow-sm);
	}

	/* Toggle draws its own label; the row just turns it around so the switch
	   lands on the right edge of the column, aligned with the counts above it. */
	.switch-row { padding: 0.15rem 0; }
	.switch-row + .switch-row { margin-top: 0.5rem; }
	.switch-row :global(.toggle-wrapper) { display: flex; width: 100%; }
	.switch-row :global(.toggle-wrapper label) {
		flex-direction: row-reverse;
		justify-content: space-between;
		width: 100%;
		font-size: 0.85rem;
		gap: 0.75rem;
	}

	/* ─── Months: one cell per month, so the strip reads as the year ─── */
	.months {
		display: grid;
		grid-template-columns: repeat(12, 1fr);
		gap: 2px;
		margin-top: 0.8rem;
	}
	.months button,
	.months a {
		aspect-ratio: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--color-bg-tertiary);
		border: none;
		border-radius: var(--radius-sm);
		font-size: 0.65rem;
		color: var(--color-text-secondary);
		cursor: pointer;
		padding: 0;
		transition: background var(--transition-fast), color var(--transition-fast);
	}
	.months button:hover,
	.months a:hover { background: var(--color-bg-elevated); }
	.months button[aria-pressed='true'],
	.months .active {
		background: var(--green);
		color: var(--color-bg-primary);
		font-weight: 700;
	}

	/* ─── Category: a list, because it reads as a list ─── */
	.options { display: flex; flex-direction: column; gap: 1px; }
	.option {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 0.5rem;
		width: 100%;
		background: none;
		border: none;
		border-radius: var(--radius-sm);
		padding: 0.3em 0.4em;
		font-size: 0.85rem;
		color: var(--color-text-primary);
		cursor: pointer;
		text-align: left;
		transition: background var(--transition-fast);
	}
	.option:hover { background: var(--color-bg-elevated); }
	.option[aria-pressed='true'],
	.option.active {
		background: var(--color-primary);
		color: var(--color-text-on-primary);
		font-weight: 600;
	}
	.option .count {
		font-size: 0.75rem;
		opacity: 0.65;
		font-variant-numeric: tabular-nums;
	}

	/* ─── Keywords ─── */
	.chips { display: flex; flex-wrap: wrap; gap: 0.3rem; }
	.chip {
		background: var(--color-bg-tertiary);
		border: none;
		border-radius: var(--radius-pill);
		padding: 0.25em 0.7em;
		font-size: 0.75rem;
		color: var(--color-text-secondary);
		cursor: pointer;
		transition: transform var(--transition-fast), background var(--transition-fast), color var(--transition-fast);
	}
	.chip:hover { transform: scale(1.05); background: var(--color-bg-elevated); }
	.chip[aria-pressed='true'],
	.chip.active {
		background: var(--color-primary);
		color: var(--color-text-on-primary);
	}
	.more {
		background: none;
		border: none;
		padding: 0.25em 0;
		margin-top: 0.5rem;
		font-size: 0.78rem;
		color: var(--color-primary);
		cursor: pointer;
	}

	/* ─── Nutrition ─── */
	.presets { display: flex; flex-wrap: wrap; gap: 0.3rem; margin-bottom: 0.9rem; }
	.axis-note {
		margin: 0 0 0.6rem;
		font-size: 0.72rem;
		color: var(--color-text-tertiary);
	}
	.sliders { display: flex; flex-direction: column; gap: 0.9rem; }
	.unknown-row { margin-top: 1rem; }

	/* ─── Sheet behaviour on narrow screens ─── */
	.sheet-head { display: none; }
	.done-bar { display: none; }

	@media (max-width: 1150px) {
		/* The column is in the server-rendered HTML either way; here it stays
		   out of the flow until the trigger asks for it. Longhand offsets
		   rather than `inset`, and no `:modal`/`::backdrop`, so this still
		   resolves on pre-15 Safari. */
		.rail { display: none; }
		.sheet-toggle:checked ~ .rail,
		.rail.open {
			display: flex;
			position: fixed;
			top: auto;
			right: 0;
			bottom: 0;
			left: 0;
			z-index: 201;
			width: 100%;
			max-width: 100%;
			max-height: 88vh;
			background: var(--color-bg-primary);
			border-radius: var(--radius-card) var(--radius-card) 0 0;
			box-shadow: var(--shadow-lg);
			padding: 0 1.25rem;
			overflow-y: auto;
			overscroll-behavior: contain;
			animation: sheet-up 220ms ease-out;
		}
		/* Above the sticky header (z-index 100), below the sheet. Only while the
		   sheet is open — it is in the markup either way now, because a label cannot
		   be conjured up by the script that used to render it. */
		.sheet-toggle:checked ~ .scrim {
			display: block;
			position: fixed;
			top: 0;
			right: 0;
			bottom: 0;
			left: 0;
			z-index: 200;
			width: 100%;
			height: 100%;
			border: none;
			padding: 0;
			background: rgba(0, 0, 0, 0.45);
		}
		.rail-head { display: none; }
		.sheet-head {
			display: flex;
			align-items: center;
			justify-content: space-between;
			gap: 1rem;
			position: sticky;
			top: 0;
			z-index: 1;
			background: var(--color-bg-primary);
			padding: 1rem 0 0.75rem;
			border-bottom: 1px solid var(--color-border);
			margin-bottom: 0.5rem;
		}
		.sheet-head h2 {
			margin: 0;
			font-size: 1.1rem;
		}
		.icon-button {
			display: flex;
			align-items: center;
			background: none;
			border: none;
			padding: 0.35rem;
			color: var(--color-text-secondary);
			cursor: pointer;
		}
		/* A solid footer rather than a floating pill: the list scrolls under it
		   instead of peeking around its edges. */
		.done-bar {
			display: block;
			position: sticky;
			bottom: 0;
			margin: 1.5rem -1.25rem 0;
			padding: 0.75rem 1.25rem calc(0.75rem + env(safe-area-inset-bottom, 0px));
			background: var(--color-bg-primary);
			border-top: 1px solid var(--color-border);
		}
		/* A label, not a button — so it has to be told to fill the bar and centre its
		   text, which a button does on its own. */
		.done {
			display: block;
			text-align: center;
			width: 100%;
			padding: 0.85em;
			border: none;
			border-radius: var(--radius-pill);
			background: var(--color-primary);
			color: var(--color-text-on-primary);
			font-size: 0.95rem;
			font-weight: 600;
			cursor: pointer;
			box-shadow: var(--shadow-lg);
		}
	}

	@keyframes sheet-up {
		from { transform: translateY(100%); }
		to { transform: translateY(0); }
	}
	@media (prefers-reduced-motion: reduce) {
		.sheet-toggle:checked ~ .rail,
		.rail.open { animation: none; }
	}
</style>

<svelte:window onkeydown={onKeydown} />

<!-- One markup for both shapes: the column on wide screens, the sheet on narrow
	 ones. The sheet's open state is this checkbox, so the trigger, the scrim and
	 both close controls are labels for it and the panel opens with no JS. -->
<input
	type="checkbox"
	class="sheet-toggle"
	id={toggleId}
	bind:checked={open}
	bind:this={toggleEl}
	aria-label={t.filters}
/>

<label class="scrim" for={toggleId} aria-label={t.filters_close}></label>

<div
	class="rail"
	class:open
	role={open ? 'dialog' : 'group'}
	aria-modal={open ? 'true' : undefined}
	aria-label={t.filters}
>
	<div class="sheet-head">
		<h2>{t.filters}</h2>
		<label class="icon-button" for={toggleId} aria-label={t.filters_close}>
			<X size={20} />
		</label>
	</div>

	<div class="rail-head">
		<p class="rail-title">{t.filters}</p>
		{#if browse.activeCount > 0}
			{#if facetPath}
				<a class="reset" href={facetPath} onclick={(e) => { e.preventDefault(); browse.reset(); }}>{t.filters_reset}</a>
			{:else}
				<button class="reset" onclick={() => browse.reset()}>{t.filters_reset}</button>
			{/if}
		{/if}
	</div>

	<div class="section">
		<p class="section-head" aria-hidden="true">{t.sort_label}</p>
		<div class="section-body">
			<div class="segmented" role="group" aria-label={t.sort_label}>
				{#each SORTS as option (option.key)}
					{@const active = browse.sort === option.key}
					{@const href = facetUrl('sort', option.key)}
					<svelte:element
						this={href ? 'a' : 'button'}
						role={href ? 'link' : 'button'}
						{href}
						aria-current={href && active ? 'true' : undefined}
						aria-pressed={href ? undefined : active}
						class:active
						onclick={(e: Event) => { if (href) e.preventDefault(); browse.sort = option.key; }}
					>{option.label()}</svelte:element>
				{/each}
			</div>
		</div>
	</div>

	<div class="section">
		<input type="checkbox" class="section-toggle" id="{sectionId}-season" bind:checked={sectionOpen.season} aria-label={t.season_section} />
		<label class="section-head" for="{sectionId}-season">
			{t.season_section}
			<ChevronDown size={16} />
		</label>
		<div class="section-body">
			<div class="section-inner">
				<div class="switch-row">
					<Toggle
						bind:checked={browse.inSeasonOnly}
						label={t.season_only_now}
						href={facetUrl('season', 'now')}
					/>
				</div>
				{#if showFavorites}
					<div class="switch-row">
						<Toggle
							bind:checked={browse.favoritesOnly}
							label={t.favorites_only}
							href={facetUrl('fav', '1')}
						/>
					</div>
				{/if}
				<div class="months" role="group" aria-label={t.seasons_label}>
					{#each months as month (month.n)}
						{@const active = browse.months.has(month.n)}
						{@const href = facetUrl('month', String(month.n), true)}
						<svelte:element
							this={href ? 'a' : 'button'}
							role={href ? 'link' : 'button'}
							{href}
							aria-current={href && active ? 'true' : undefined}
							aria-pressed={href ? undefined : active}
							class:active
							aria-label={month.name}
							title={month.name}
							onclick={(e: Event) => { if (href) e.preventDefault(); browse.toggleMonth(month.n); }}
						>{month.initial}</svelte:element>
					{/each}
				</div>
			</div>
		</div>
	</div>

	<div class="section">
		<input type="checkbox" class="section-toggle" id="{sectionId}-category" bind:checked={sectionOpen.category} aria-label={t.category_section} />
		<label class="section-head" for="{sectionId}-category">
			{t.category_section}
			<ChevronDown size={16} />
		</label>
		<div class="section-body">
			<div class="section-inner">
				<div class="options">
					<svelte:element
						this={allCategoriesHref ? 'a' : 'button'}
						role={allCategoriesHref ? 'link' : 'button'}
						href={allCategoriesHref}
						class="option"
						class:active={browse.category === null}
						aria-current={allCategoriesHref && browse.category === null ? 'true' : undefined}
						aria-pressed={allCategoriesHref ? undefined : browse.category === null}
						onclick={(e: Event) => { if (allCategoriesHref) e.preventDefault(); browse.category = null; }}
					>
						{t.all}
						<span class="count">{browse.categoryAllCount}</span>
					</svelte:element>
					{#each categories as cat (cat)}
						{@const count = browse.categoryCounts.get(cat) ?? 0}
						{#if count > 0 || browse.category === cat}
							{@const active = browse.category === cat}
							{@const href = facetUrl('category', cat)}
							<svelte:element
								this={href ? 'a' : 'button'}
								role={href ? 'link' : 'button'}
								{href}
								class="option"
								class:active
								aria-current={href && active ? 'true' : undefined}
								aria-pressed={href ? undefined : active}
								onclick={(e: Event) => { if (href) e.preventDefault(); browse.category = active ? null : cat; }}
							>
								{cat}
								<span class="count">{count}</span>
							</svelte:element>
						{/if}
					{/each}
				</div>
			</div>
		</div>
	</div>

	<div class="section">
		<input type="checkbox" class="section-toggle" id="{sectionId}-tags" bind:checked={sectionOpen.tags} aria-label={t.keywords_label} />
		<label class="section-head" for="{sectionId}-tags">
			{t.keywords_label}
			<ChevronDown size={16} />
		</label>
		<div class="section-body">
			<div class="section-inner">
				<div class="chips">
					{#each visibleTags as [tag, count] (tag)}
						{@const active = browse.tags.has(tag)}
						{@const href = facetUrl('tag', tag, true)}
						<svelte:element
							this={href ? 'a' : 'button'}
							role={href ? 'link' : 'button'}
							{href}
							class="chip"
							class:active
							aria-current={href && active ? 'true' : undefined}
							aria-pressed={href ? undefined : active}
							onclick={(e: Event) => { if (href) e.preventDefault(); browse.toggleTag(tag); }}
						>{tag} <span class="count">{count}</span></svelte:element>
					{/each}
				</div>
				{#if rankedTags.length > TAG_PREVIEW}
					<button class="more" onclick={() => (allTagsShown = !allTagsShown)}>
						{allTagsShown
							? t.tags_show_fewer
							: `+ ${rankedTags.length - TAG_PREVIEW} ${t.tags_show_more_suffix}`}
					</button>
				{/if}
			</div>
		</div>
	</div>

	<div class="section">
		<input type="checkbox" class="section-toggle" id="{sectionId}-nutrition" bind:checked={sectionOpen.nutrition} aria-label={t.nutrition_section} />
		<label class="section-head" for="{sectionId}-nutrition">
			{t.nutrition_section}
			<ChevronDown size={16} />
		</label>
		<div class="section-body">
			<div class="section-inner">
				<div class="presets">
					{#each PRESETS as preset (preset.key)}
						{@const active = isPresetActive(browse.macro, preset.key)}
						{@const href = presetUrl(preset.key)}
						<svelte:element
							this={href ? 'a' : 'button'}
							role={href ? 'link' : 'button'}
							{href}
							class="chip"
							class:active
							aria-current={href && active ? 'true' : undefined}
							aria-pressed={href ? undefined : active}
							onclick={(e: Event) => { if (href) e.preventDefault(); browse.applyPreset(preset.key); }}
						>{preset.label()}</svelte:element>
					{/each}
				</div>
				<p class="axis-note">{t.macro_share_note}</p>

				<!--
					Each range is one control in two shapes: the dual-thumb track for a
					browser running script, and — directly under the same histogram — two
					native range inputs and a submit button for one that is not. The
					histogram and the readout above it belong to neither and stay.

					The native inputs keep the browser's own fill, which tracks the thumb
					as it moves; the styles below only swap which side of the lower one
					is coloured.
				-->
				{#snippet nativeRange(key: string, low: number, high: number, max: number, step: number, ticks: number[])}
					<fieldset class="range-inputs">
						<label class="bound">
							<span>{t.range_from}</span>
							<!--
								The lower bound runs on a reversed axis: its value is negated and
								the track is laid out right-to-left, which puts 0 on the left and
								the maximum on the right exactly as the upper slider has them —
								while the browser's own fill, which always runs from the track's
								minimum end, now covers everything to the right of the thumb.
								That is the half the filter keeps, and it follows the thumb live,
								with no script and no colour trickery. The negation is undone by
								the listing's redirect, so the URL never shows it.
							-->
							<input
								class="bound-min"
								type="range"
								dir="rtl"
								name="{key}minneg"
								value={-low}
								min={-max}
								max="0"
								{step}
								list="{sectionId}-ticks-{key}-neg"
								aria-label="{t.range_from} ({max === 100 ? '%' : 'kcal'})"
							/>
						</label>
						<label class="bound">
							<span>{t.range_to}</span>
							<input
								class="bound-max"
								type="range"
								name="{key}max"
								value={high}
								min="0"
								{max}
								{step}
								list="{sectionId}-ticks-{key}"
							/>
						</label>
						<datalist id="{sectionId}-ticks-{key}">
							{#each ticks as tick (tick)}<option value={tick}></option>{/each}
						</datalist>
						<datalist id="{sectionId}-ticks-{key}-neg">
							{#each ticks as tick (tick)}<option value={-tick}></option>{/each}
						</datalist>
						<p class="range-scale" aria-hidden="true">
							{#each ticks as tick (tick)}<span>{tick}</span>{/each}
						</p>
					</fieldset>
				{/snippet}

				{#if facetPath}
					<form class="range-form" method="get" action={facetPath}>
						{#each carriedFilters as [key, value] (key + value)}
							<input type="hidden" name={key} value={value} />
						{/each}

						<div class="sliders">
							<div class="range-field">
								<RangeSlider
									label={t.protein}
									min={0}
									max={100}
									step={5}
									format={pct}
									histogram={browse.macroHistograms.protein}
									bind:low={browse.macro.proteinMin}
									bind:high={browse.macro.proteinMax}
								/>
								{@render nativeRange('p', browse.macro.proteinMin, browse.macro.proteinMax, 100, 5, SHARE_TICKS)}
							</div>
							<div class="range-field">
								<RangeSlider
									label={t.carbs}
									min={0}
									max={100}
									step={5}
									format={pct}
									histogram={browse.macroHistograms.carbs}
									bind:low={browse.macro.carbsMin}
									bind:high={browse.macro.carbsMax}
								/>
								{@render nativeRange('c', browse.macro.carbsMin, browse.macro.carbsMax, 100, 5, SHARE_TICKS)}
							</div>
							<div class="range-field">
								<RangeSlider
									label={t.fat}
									min={0}
									max={100}
									step={5}
									format={pct}
									histogram={browse.macroHistograms.fat}
									bind:low={browse.macro.fatMin}
									bind:high={browse.macro.fatMax}
								/>
								{@render nativeRange('f', browse.macro.fatMin, browse.macro.fatMax, 100, 5, SHARE_TICKS)}
							</div>
							<div class="range-field">
								<RangeSlider
									label={t.kcal_per_portion}
									min={0}
									max={MACRO_KCAL_CEILING}
									step={50}
									format={kcal}
									histogram={browse.macroHistograms.energy}
									overflow={true}
									bind:low={browse.macro.kcalMin}
									bind:high={browse.macro.kcalMax}
								/>
								{@render nativeRange('kcal', browse.macro.kcalMin, browse.macro.kcalMax, MACRO_KCAL_CEILING, 50, KCAL_TICKS)}
							</div>
						</div>

						<button type="submit" class="range-submit">{t.filters_apply}</button>
					</form>
				{:else}
					<div class="sliders">
						<RangeSlider
							label={t.protein}
							min={0}
							max={100}
							step={5}
							format={pct}
							histogram={browse.macroHistograms.protein}
							bind:low={browse.macro.proteinMin}
							bind:high={browse.macro.proteinMax}
						/>
						<RangeSlider
							label={t.carbs}
							min={0}
							max={100}
							step={5}
							format={pct}
							histogram={browse.macroHistograms.carbs}
							bind:low={browse.macro.carbsMin}
							bind:high={browse.macro.carbsMax}
						/>
						<RangeSlider
							label={t.fat}
							min={0}
							max={100}
							step={5}
							format={pct}
							histogram={browse.macroHistograms.fat}
							bind:low={browse.macro.fatMin}
							bind:high={browse.macro.fatMax}
						/>
						<RangeSlider
							label={t.kcal_per_portion}
							min={0}
							max={MACRO_KCAL_CEILING}
							step={50}
							format={kcal}
							histogram={browse.macroHistograms.energy}
							overflow={true}
							bind:low={browse.macro.kcalMin}
							bind:high={browse.macro.kcalMax}
						/>
					</div>
				{/if}

				{#if browse.unknownNutritionCount > 0}
					<div class="switch-row unknown-row">
						<Toggle
							bind:checked={browse.macro.includeUnknown}
							label="{t.include_unknown_nutrition} ({browse.unknownNutritionCount})"
							href={facetUrl('unknown', '0')}
						/>
					</div>
				{/if}
			</div>
		</div>
	</div>

	<div class="done-bar">
		<label class="done" for={toggleId}>
			{t.filters_show_results} ({browse.results.length})
		</label>
	</div>
</div>
