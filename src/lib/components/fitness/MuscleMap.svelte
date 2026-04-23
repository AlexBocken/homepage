<script>
	import { onMount } from 'svelte';
	import frontSvgRaw from '$lib/assets/muscle-front.svg?raw';
	import backSvgRaw from '$lib/assets/muscle-back.svg?raw';

	/**
	 * @typedef {{ groups: string[], label: { en: string, de: string } }} MuscleRegion
	 */

	/** @type {{ primaryGroups?: string[], secondaryGroups?: string[], lang?: string }} */
	let { primaryGroups = [], secondaryGroups = [], lang = 'en' } = $props();

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

	const primarySet = $derived(new Set(primaryGroups));
	const secondarySet = $derived(new Set(secondaryGroups));

	/** @param {string[]} groups */
	function regionState(groups) {
		if (groups.some(g => primarySet.has(g))) return 'primary';
		if (groups.some(g => secondarySet.has(g))) return 'secondary';
		return 'inactive';
	}

	/** @param {string[]} groups */
	function regionFill(groups) {
		const state = regionState(groups);
		if (state === 'primary') return 'var(--color-primary)';
		if (state === 'secondary') return 'var(--color-primary-secondary, color-mix(in srgb, var(--color-primary) 40%, var(--color-bg-tertiary)))';
		return 'var(--color-bg-tertiary)';
	}

	/**
	 * @param {string} svgStr
	 * @param {Record<string, MuscleRegion>} map
	 */
	function injectFills(svgStr, map) {
		let result = svgStr;
		for (const [svgId, region] of Object.entries(map)) {
			const fill = regionFill(region.groups);
			const re = new RegExp(`(<g\\s+id="${svgId}")([^>]*>)`);
			result = result.replace(re, `$1 style="--region-fill: ${fill};"$2`);
		}
		return result;
	}

	const frontSvg = $derived(injectFills(frontSvgRaw, FRONT_MAP));
	const backSvg = $derived(injectFills(backSvgRaw, BACK_MAP));

	/** @type {MuscleRegion | null} */
	let hovered = $state(null);
	let hoveredSide = $state('front');
	const hoveredLabel = $derived.by(() => {
		if (!hovered) return null;
		const state = regionState(hovered.groups);
		const label = isEn ? hovered.label.en : hovered.label.de;
		const suffix = state === 'primary' ? '' : state === 'secondary' ? (isEn ? ' (secondary)' : ' (sekundär)') : '';
		return label + suffix;
	});

	/** @type {HTMLDivElement | null} */
	let frontEl = $state(null);
	/** @type {HTMLDivElement | null} */
	let backEl = $state(null);

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
		container.addEventListener('mouseleave', () => { hovered = null; });
	}

	onMount(() => {
		setupEvents(frontEl, FRONT_MAP, 'front');
		setupEvents(backEl, BACK_MAP, 'back');
	});

	/**
	 * Check if any muscles are on front/back to decide which to show
	 * @param {Record<string, MuscleRegion>} map
	 */
	function hasActiveRegions(map) {
		return Object.values(map).some(r => regionState(r.groups) !== 'inactive');
	}
	const hasFront = $derived(hasActiveRegions(FRONT_MAP));
	const hasBack = $derived(hasActiveRegions(BACK_MAP));
</script>

<div class="muscle-map">
	<div class="body-figures">
		{#if hasFront}
			<div class="figure">
				<div class="svg-wrap" bind:this={frontEl}>
					{@html frontSvg}
				</div>
				<span class="side-label">{isEn ? 'Front' : 'Vorne'}</span>
			</div>
		{/if}
		{#if hasBack}
			<div class="figure">
				<div class="svg-wrap" bind:this={backEl}>
					{@html backSvg}
				</div>
				<span class="side-label">{isEn ? 'Back' : 'Hinten'}</span>
			</div>
		{/if}
	</div>

	{#if hoveredLabel}
		<div class="hover-label">{hoveredLabel}</div>
	{/if}
</div>

<style>
	.muscle-map {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.25rem;
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
		max-width: 120px;
	}

	.side-label {
		font-size: 0.6rem;
		color: var(--color-text-tertiary);
		text-transform: uppercase;
		letter-spacing: 0.08em;
		font-weight: 600;
		margin-top: 0.15rem;
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
		transition: fill 0.15s;
	}

	.svg-wrap :global(g.highlighted:not(#body):not(#head) path) {
		stroke: var(--color-primary);
		stroke-width: 2;
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
</style>
