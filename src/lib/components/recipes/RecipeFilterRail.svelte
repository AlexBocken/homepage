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
	 * cards beside the rail — the column becomes a sheet: same markup, opened
	 * by a button that carries the active-filter count.
	 */
	import { slide } from 'svelte/transition';
	import { prefersReducedMotion } from 'svelte/motion';
	import { MediaQuery } from 'svelte/reactivity';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import X from '@lucide/svelte/icons/x';
	import RangeSlider from '$lib/components/hikes/RangeSlider.svelte';
	import Toggle from '$lib/components/Toggle.svelte';
	import { m, type RecipesLang } from '$lib/js/recipesI18n';
	import { getCategories } from '$lib/js/categories';
	import type { RecipeBrowse, RecipeSort } from '$lib/js/recipeBrowse.svelte';
	import { MACRO_KCAL_CEILING, isPresetActive, type MacroPresetKey } from '$lib/js/recipeMacros';

	interface Props {
		browse: RecipeBrowse;
		lang: RecipesLang;
		isLoggedIn?: boolean;
		/** Sheet visibility on narrow screens. Bindable. */
		open?: boolean;
	}

	let { browse, lang, isLoggedIn = false, open = $bindable(false) }: Props = $props();

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

	let sectionOpen = $state({
		season: true,
		category: true,
		tags: false,
		nutrition: false
	});

	function toggleSection(key: keyof typeof sectionOpen) {
		sectionOpen[key] = !sectionOpen[key];
	}

	// Wide: the dialog is opened non-modally and reads as a plain column.
	// Narrow: `showModal()` puts it in the top layer, which is the only way to
	// escape the hero's parallax transform (see the styles below), and brings
	// Esc-to-close and a focus trap along for free.
	let dialogEl = $state<HTMLDialogElement>();
	const narrow = new MediaQuery('(max-width: 1150px)');

	$effect(() => {
		const el = dialogEl;
		if (!el) return;
		if (narrow.current) {
			if (open && !el.open) el.showModal();
			else if (!open && el.open) el.close();
			return;
		}
		if (el.matches(':modal')) el.close();
		if (!el.open) el.show();
	});

	const slideOpts = $derived(prefersReducedMotion.current ? { duration: 0 } : { duration: 180 });
	const pct = (v: number) => `${v} %`;
	const kcal = (v: number) => (v >= MACRO_KCAL_CEILING ? `${v}+` : String(v));
</script>

<style>
	/* A <dialog> so the narrow-screen sheet can use the top layer; on wide
	   screens it is opened non-modally and stripped back to a plain column. */
	.rail {
		position: static;
		width: auto;
		max-width: none;
		max-height: none;
		margin: 0;
		padding: 0;
		border: none;
		background: var(--color-bg-primary);
		color: inherit;
		font-size: 0.9rem;
	}
	.rail[open] {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
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
	.section-head.open :global(svg) { transform: rotate(180deg); }
	.section-body { padding-top: 0.7rem; }

	/* ─── Order: one segmented control ─── */
	.segmented {
		display: flex;
		background: var(--color-bg-tertiary);
		border-radius: var(--radius-md);
		padding: 2px;
		gap: 2px;
	}
	.segmented button {
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
	.segmented button:hover { color: var(--color-text-primary); }
	.segmented button[aria-pressed='true'] {
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
	.months button {
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
	.months button:hover { background: var(--color-bg-elevated); }
	.months button[aria-pressed='true'] {
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
	.option[aria-pressed='true'] {
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
	.chip[aria-pressed='true'] {
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
		/* The listing lives inside a transformed ancestor (the hero's parallax
		   scaleY), which would make a `position: fixed` panel scroll and scale
		   with it. A modal <dialog> renders in the browser's top layer instead,
		   where no ancestor transform reaches it. */
		/* Server-rendered open-but-not-modal: no sheet until it is asked for. */
		.rail[open]:not(:modal) { display: none; }
		.rail[open] {
			position: fixed;
			inset: auto 0 0 0;
			width: 100%;
			max-width: 100%;
			max-height: 88vh;
			border-radius: var(--radius-card) var(--radius-card) 0 0;
			padding: 0 1.25rem;
			overflow-y: auto;
			overscroll-behavior: contain;
			animation: sheet-up 220ms ease-out;
		}
		.rail::backdrop {
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
		.done {
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
		.rail[open] { animation: none; }
	}
</style>

<!-- `open` is set in the markup so the column is there in the server-rendered
	 HTML; on narrow screens CSS hides the non-modal state until it is opened
	 properly, and the effect above closes it on hydration. -->
<dialog
	class="rail"
	open
	bind:this={dialogEl}
	onclose={() => (open = false)}
	aria-label={t.filters}
>
	<div class="sheet-head">
		<h2>{t.filters}</h2>
		<button class="icon-button" onclick={() => (open = false)} aria-label={t.filters_close}>
			<X size={20} />
		</button>
	</div>

	<div class="rail-head">
		<p class="rail-title">{t.filters}</p>
		{#if browse.activeCount > 0}
			<button class="reset" onclick={() => browse.reset()}>{t.filters_reset}</button>
		{/if}
	</div>

	<div class="section">
		<p class="section-head" aria-hidden="true">{t.sort_label}</p>
		<div class="section-body">
			<div class="segmented" role="group" aria-label={t.sort_label}>
				{#each SORTS as option (option.key)}
					<button
						aria-pressed={browse.sort === option.key}
						onclick={() => (browse.sort = option.key)}
					>{option.label()}</button>
				{/each}
			</div>
		</div>
	</div>

	<div class="section">
		<button class="section-head" class:open={sectionOpen.season} onclick={() => toggleSection('season')} aria-expanded={sectionOpen.season}>
			{t.season_section}
			<ChevronDown size={16} />
		</button>
		{#if sectionOpen.season}
			<div class="section-body" transition:slide={slideOpts}>
				<div class="switch-row">
					<Toggle bind:checked={browse.inSeasonOnly} label={t.season_only_now} />
				</div>
				{#if isLoggedIn}
					<div class="switch-row">
						<Toggle bind:checked={browse.favoritesOnly} label={t.favorites_only} />
					</div>
				{/if}
				<div class="months" role="group" aria-label={t.seasons_label}>
					{#each months as month (month.n)}
						<button
							aria-pressed={browse.months.has(month.n)}
							aria-label={month.name}
							title={month.name}
							onclick={() => browse.toggleMonth(month.n)}
						>{month.initial}</button>
					{/each}
				</div>
			</div>
		{/if}
	</div>

	<div class="section">
		<button class="section-head" class:open={sectionOpen.category} onclick={() => toggleSection('category')} aria-expanded={sectionOpen.category}>
			{t.category_section}
			<ChevronDown size={16} />
		</button>
		{#if sectionOpen.category}
			<div class="section-body" transition:slide={slideOpts}>
				<div class="options">
					<button
						class="option"
						aria-pressed={browse.category === null}
						onclick={() => (browse.category = null)}
					>
						{t.all}
						<span class="count">{browse.categoryAllCount}</span>
					</button>
					{#each categories as cat (cat)}
						{@const count = browse.categoryCounts.get(cat) ?? 0}
						{#if count > 0 || browse.category === cat}
							<button
								class="option"
								aria-pressed={browse.category === cat}
								onclick={() => (browse.category = browse.category === cat ? null : cat)}
							>
								{cat}
								<span class="count">{count}</span>
							</button>
						{/if}
					{/each}
				</div>
			</div>
		{/if}
	</div>

	<div class="section">
		<button class="section-head" class:open={sectionOpen.tags} onclick={() => toggleSection('tags')} aria-expanded={sectionOpen.tags}>
			{t.keywords_label}
			<ChevronDown size={16} />
		</button>
		{#if sectionOpen.tags}
			<div class="section-body" transition:slide={slideOpts}>
				<div class="chips">
					{#each visibleTags as [tag, count] (tag)}
						<button
							class="chip"
							aria-pressed={browse.tags.has(tag)}
							onclick={() => browse.toggleTag(tag)}
						>{tag} <span class="count">{count}</span></button>
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
		{/if}
	</div>

	<div class="section">
		<button class="section-head" class:open={sectionOpen.nutrition} onclick={() => toggleSection('nutrition')} aria-expanded={sectionOpen.nutrition}>
			{t.nutrition_section}
			<ChevronDown size={16} />
		</button>
		{#if sectionOpen.nutrition}
			<div class="section-body" transition:slide={slideOpts}>
				<div class="presets">
					{#each PRESETS as preset (preset.key)}
						<button
							class="chip"
							aria-pressed={isPresetActive(browse.macro, preset.key)}
							onclick={() => browse.applyPreset(preset.key)}
						>{preset.label()}</button>
					{/each}
				</div>
				<p class="axis-note">{t.macro_share_note}</p>
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
				{#if browse.unknownNutritionCount > 0}
					<div class="switch-row unknown-row">
						<Toggle
							bind:checked={browse.macro.includeUnknown}
							label="{t.include_unknown_nutrition} ({browse.unknownNutritionCount})"
						/>
					</div>
				{/if}
			</div>
		{/if}
	</div>

	<div class="done-bar">
		<button class="done" onclick={() => (open = false)}>
			{t.filters_show_results} ({browse.results.length})
		</button>
	</div>
</dialog>
