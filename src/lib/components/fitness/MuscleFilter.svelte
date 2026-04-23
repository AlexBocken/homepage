<script>
	import { onMount } from 'svelte';
	import frontSvgRaw from '$lib/assets/muscle-front.svg?raw';
	import backSvgRaw from '$lib/assets/muscle-back.svg?raw';

	/**
	 * @typedef {{ groups: string[], label: { en: string, de: string } }} MuscleRegion
	 */

	/** @type {{ selectedGroups?: string[], lang?: string, split?: boolean }} */
	let { selectedGroups = $bindable([]), lang = 'en', split = false } = $props();

	const isEn = $derived(lang === 'en');

	/** @type {Record<string, MuscleRegion>} */
	const FRONT_MAP = {
		'traps':            { groups: ['traps'],                                   label: { en: 'Traps', de: 'Trapez' } },
		'front-shoulders':  { groups: ['anterior deltoids', 'lateral deltoids'],   label: { en: 'Front Delts', de: 'Vord. Schultern' } },
		'chest':            { groups: ['pectorals'],                               label: { en: 'Chest', de: 'Brust' } },
		'biceps':           { groups: ['biceps', 'brachioradialis'],               label: { en: 'Biceps', de: 'Bizeps' } },
		'forearms':         { groups: ['forearms'],                                label: { en: 'Forearms', de: 'Unterarme' } },
		'abdominals':       { groups: ['abdominals'],                              label: { en: 'Abs', de: 'Bauchmuskeln' } },
		'obliques':         { groups: ['obliques'],                                label: { en: 'Obliques', de: 'Seitl. Bauch' } },
		'quads':            { groups: ['quadriceps', 'hip flexors'],               label: { en: 'Quads', de: 'Quadrizeps' } },
		'calves':           { groups: ['calves'],                                  label: { en: 'Calves', de: 'Waden' } },
	};

	/** @type {Record<string, MuscleRegion>} */
	const BACK_MAP = {
		'traps':            { groups: ['traps'],                                   label: { en: 'Traps', de: 'Trapez' } },
		'traps-middle':     { groups: ['traps'],                                   label: { en: 'Mid Traps', de: 'Mittl. Trapez' } },
		'rear-shoulders':   { groups: ['rear deltoids', 'rotator cuff'],           label: { en: 'Rear Delts', de: 'Hint. Schultern' } },
		'lats':             { groups: ['lats'],                                    label: { en: 'Lats', de: 'Latissimus' } },
		'triceps':          { groups: ['triceps'],                                 label: { en: 'Triceps', de: 'Trizeps' } },
		'forearms':         { groups: ['forearms'],                                label: { en: 'Forearms', de: 'Unterarme' } },
		'lowerback':        { groups: ['erector spinae'],                          label: { en: 'Lower Back', de: 'Rückenstrecker' } },
		'glutes':           { groups: ['glutes'],                                  label: { en: 'Glutes', de: 'Gesäss' } },
		'hamstrings':       { groups: ['hamstrings'],                              label: { en: 'Hamstrings', de: 'Beinbeuger' } },
		'calves':           { groups: ['calves'],                                  label: { en: 'Calves', de: 'Waden' } },
	};

	/**
	 * Check if a region's groups overlap with selectedGroups
	 * @param {string[]} groups
	 */
	function isRegionSelected(groups) {
		if (selectedGroups.length === 0) return false;
		return groups.some(g => selectedGroups.includes(g));
	}

	/**
	 * Compute fill for a region based on selection state
	 * @param {string[]} groups
	 */
	function regionFill(groups) {
		if (isRegionSelected(groups)) return 'var(--color-primary)';
		return 'var(--color-bg-tertiary)';
	}

	/**
	 * Inject fill styles into SVG string
	 * @param {string} svgStr
	 * @param {Record<string, MuscleRegion>} map
	 */
	function injectFills(svgStr, map) {
		let result = svgStr;
		for (const [svgId, region] of Object.entries(map)) {
			const fill = regionFill(region.groups);
			const re = new RegExp(`(<g\\s+id="${svgId}")([^>]*>)`);
			result = result.replace(re, `$1 style="--region-fill: ${fill}; cursor: pointer;"$2`);
		}
		return result;
	}

	const frontSvg = $derived(injectFills(frontSvgRaw, FRONT_MAP));
	const backSvg = $derived(injectFills(backSvgRaw, BACK_MAP));

	/** Currently hovered region for tooltip */
	/** @type {MuscleRegion | null} */
	let hovered = $state(null);
	let hoveredSide = $state('front');

	const hoveredLabel = $derived.by(() => {
		if (!hovered) return null;
		return isEn ? hovered.label.en : hovered.label.de;
	});

	/** @type {HTMLDivElement | null} */
	let frontEl = $state(null);
	/** @type {HTMLDivElement | null} */
	let backEl = $state(null);

	/**
	 * Toggle a region's muscle groups in/out of selection
	 * @param {MuscleRegion} region
	 */
	function toggleRegion(region) {
		const groups = region.groups;
		const allSelected = groups.every(g => selectedGroups.includes(g));
		if (allSelected) {
			selectedGroups = selectedGroups.filter(g => !groups.includes(g));
		} else {
			const toAdd = groups.filter(g => !selectedGroups.includes(g));
			selectedGroups = [...selectedGroups, ...toAdd];
		}
	}

	/**
	 * @param {HTMLDivElement | null} container
	 * @param {Record<string, MuscleRegion>} map
	 * @param {string} side
	 */
	function setupEvents(container, map, side) {
		if (!container) return;

		container.addEventListener('mouseover', (/** @type {Event} */ e) => {
			const target = /** @type {Element | null} */ (e.target);
			const g = target?.closest('g[id]');
			if (g && map[g.id]) {
				hovered = map[g.id];
				hoveredSide = side;
				g.classList.add('highlighted');
			}
		});

		container.addEventListener('mouseout', (/** @type {Event} */ e) => {
			const target = /** @type {Element | null} */ (e.target);
			const g = target?.closest('g[id]');
			if (g) g.classList.remove('highlighted');
		});

		container.addEventListener('mouseleave', () => {
			hovered = null;
		});

		container.addEventListener('click', (/** @type {Event} */ e) => {
			const target = /** @type {Element | null} */ (e.target);
			const g = target?.closest('g[id]');
			if (g && map[g.id]) {
				toggleRegion(map[g.id]);
			}
		});
	}

	onMount(() => {
		setupEvents(frontEl, FRONT_MAP, 'front');
		setupEvents(backEl, BACK_MAP, 'back');
	});
</script>

{#if split}
	<div class="muscle-filter-split">
		<div class="split-left">
			<div class="figure">
				<div class="svg-wrap" bind:this={frontEl}>
					{@html frontSvg}
				</div>
			</div>
			{#if hoveredLabel && hoveredSide === 'front'}
				<div class="hover-label">{hoveredLabel}</div>
			{/if}
		</div>
		<div class="split-right">
			<div class="figure">
				<div class="svg-wrap" bind:this={backEl}>
					{@html backSvg}
				</div>
			</div>
			{#if hoveredLabel && hoveredSide === 'back'}
				<div class="hover-label">{hoveredLabel}</div>
			{/if}
		</div>
	</div>
{:else}
	<div class="muscle-filter">
		<div class="body-figures">
			<div class="figure">
				<div class="svg-wrap" bind:this={frontEl}>
					{@html frontSvg}
				</div>
			</div>
			<div class="figure">
				<div class="svg-wrap" bind:this={backEl}>
					{@html backSvg}
				</div>
			</div>
		</div>

		{#if hoveredLabel}
			<div class="hover-label">{hoveredLabel}</div>
		{/if}
	</div>
{/if}

<style>
	.muscle-filter {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.35rem;
	}

	.body-figures {
		display: flex;
		gap: 0.5rem;
		justify-content: center;
		width: 100%;
	}

	.figure {
		display: flex;
		flex-direction: column;
		align-items: center;
		flex: 1;
		max-width: 150px;
	}

	.svg-wrap {
		width: 100%;
	}

	.svg-wrap :global(svg) {
		width: 100%;
		height: auto;
		display: block;
	}

	.svg-wrap :global(g:not(#body):not(#head) path) {
		fill: var(--region-fill, var(--color-bg-tertiary));
		stroke: var(--color-text-primary);
		stroke-width: 0.5;
		stroke-linejoin: round;
		transition: fill 0.15s, stroke 0.15s, stroke-width 0.15s;
	}

	.svg-wrap :global(g.highlighted:not(#body):not(#head) path) {
		fill: color-mix(in srgb, var(--region-fill, var(--color-bg-tertiary)), var(--color-primary) 40%);
		stroke: var(--color-primary);
		stroke-width: 3;
	}

	.svg-wrap :global(#body path),
	.svg-wrap :global(#body line) {
		stroke: var(--color-text-primary) !important;
	}

	.hover-label {
		font-size: 0.7rem;
		font-weight: 600;
		color: var(--color-text-primary);
		text-align: center;
	}

	/* Split mode: two independent columns for parent to position */
	.muscle-filter-split {
		display: contents;
	}

	.split-left, .split-right {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.35rem;
	}

	.split-left .figure, .split-right .figure {
		max-width: none;
	}
</style>
