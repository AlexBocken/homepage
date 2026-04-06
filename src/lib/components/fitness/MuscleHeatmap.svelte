<script>
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { detectFitnessLang } from '$lib/js/fitnessI18n';
	import frontSvgRaw from '$lib/assets/muscle-front.svg?raw';
	import backSvgRaw from '$lib/assets/muscle-back.svg?raw';

	let { data } = $props();

	const lang = $derived(detectFitnessLang($page.url.pathname));
	const isEn = $derived(lang === 'en');
	const totals = $derived(data?.totals ?? {});

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

	/** Sum weeklyAvg across all muscle groups for a region */
	function regionScore(groups) {
		let score = 0;
		for (const g of groups) {
			score += totals[g]?.weeklyAvg ?? 0;
		}
		return score;
	}

	/** Max score across all regions for color scaling */
	const maxScore = $derived.by(() => {
		let max = 1;
		for (const r of [...Object.values(FRONT_MAP), ...Object.values(BACK_MAP)]) {
			const s = regionScore(r.groups);
			if (s > max) max = s;
		}
		return max;
	});

	/** Compute fill as a color-mix CSS value — resolved natively by the browser */
	function scoreFill(score) {
		if (score === 0) return 'var(--color-bg-tertiary)';
		const pct = Math.round(Math.min(score / maxScore, 1) * 100);
		return `color-mix(in srgb, var(--color-bg-tertiary), var(--color-primary) ${pct}%)`;
	}

	/**
	 * Preprocess an SVG string: inject fill styles into each muscle group.
	 * Replaces `<g id="groupId">` with `<g id="groupId" style="...">`.
	 */
	function injectFills(svgStr, map) {
		let result = svgStr;
		for (const [svgId, region] of Object.entries(map)) {
			const fill = scoreFill(regionScore(region.groups));
			// Match <g id="svgId"> or <g id="svgId" ...>
			const re = new RegExp(`(<g\\s+id="${svgId}")([^>]*>)`);
			result = result.replace(re, `$1 style="--region-fill: ${fill}; cursor: pointer;"$2`);
		}
		return result;
	}

	/** Reactively build SVG strings with fills baked in */
	const frontSvg = $derived(injectFills(frontSvgRaw, FRONT_MAP));
	const backSvg = $derived(injectFills(backSvgRaw, BACK_MAP));

	/** Currently selected region info */
	let selected = $state(null);

	const selectedInfo = $derived.by(() => {
		if (!selected) return null;
		const label = isEn ? selected.label.en : selected.label.de;
		let totalPrimary = 0, totalSecondary = 0, weeklyAvg = 0;
		for (const g of selected.groups) {
			totalPrimary += totals[g]?.primary ?? 0;
			totalSecondary += totals[g]?.secondary ?? 0;
			weeklyAvg += totals[g]?.weeklyAvg ?? 0;
		}
		return { label, weeklyAvg, totalPrimary, totalSecondary };
	});

	const hasData = $derived(Object.keys(totals).length > 0);

	/** DOM refs for event delegation */
	let frontEl = $state(null);
	let backEl = $state(null);

	function setupEvents(container, map) {
		if (!container) return;

		container.addEventListener('mouseover', (e) => {
			const g = e.target.closest('g[id]');
			if (g && map[g.id]) {
				selected = { ...map[g.id], svgId: g.id };
				g.classList.add('highlighted');
			}
		});

		container.addEventListener('mouseout', (e) => {
			const g = e.target.closest('g[id]');
			if (g) g.classList.remove('highlighted');
		});

		container.addEventListener('mouseleave', () => {
			selected = null;
		});

		container.addEventListener('click', (e) => {
			const g = e.target.closest('g[id]');
			if (g && map[g.id]) {
				selected = { ...map[g.id], svgId: g.id };
			}
		});
	}

	onMount(() => {
		setupEvents(frontEl, FRONT_MAP);
		setupEvents(backEl, BACK_MAP);
	});
</script>

{#if hasData}
	<div class="body-map">
		<div class="body-figures">
			<div class="figure">
				<span class="figure-label">{isEn ? 'Front' : 'Vorne'}</span>
				<div class="svg-wrap" bind:this={frontEl}>
					{@html frontSvg}
				</div>
			</div>

			<div class="figure">
				<span class="figure-label">{isEn ? 'Back' : 'Hinten'}</span>
				<div class="svg-wrap" bind:this={backEl}>
					{@html backSvg}
				</div>
			</div>
		</div>

		{#if selectedInfo}
			<div class="muscle-info">
				<span class="info-label">{selectedInfo.label}</span>
				<span class="info-score">{selectedInfo.weeklyAvg.toFixed(1)} {isEn ? 'sets/wk' : 'Sätze/Wo'}</span>
				<span class="info-detail">
					{selectedInfo.totalPrimary}&times; {isEn ? 'primary' : 'primär'}
					&middot;
					{selectedInfo.totalSecondary}&times; {isEn ? 'secondary' : 'sekundär'}
				</span>
			</div>
		{:else}
			<div class="muscle-info hint">
				<span class="info-hint">{isEn ? 'Tap a muscle to see details' : 'Muskel antippen für Details'}</span>
			</div>
		{/if}

		<div class="map-legend">
			<span class="legend-lo">0</span>
			<div class="legend-gradient"></div>
			<span class="legend-hi">{Math.round(maxScore)} {isEn ? 'sets/wk' : 'Sätze/Wo'}</span>
		</div>
	</div>
{:else}
	<p class="empty">{isEn ? 'No workout data yet' : 'Noch keine Trainingsdaten'}</p>
{/if}

<style>
	.body-map {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		align-items: center;
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
		gap: 0.25rem;
		flex: 1;
		max-width: 220px;
	}

	.figure-label {
		font-size: 0.6rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--color-text-primary);
	}

	.svg-wrap {
		width: 100%;
	}

	.svg-wrap :global(svg) {
		width: 100%;
		height: auto;
		display: block;
	}

	/* Muscle region fills: use the CSS variable injected per-group */
	.svg-wrap :global(g:not(#body):not(#head) path) {
		fill: var(--region-fill, var(--color-bg-tertiary));
		stroke: var(--color-text-primary);
		stroke-width: 0.5;
		stroke-linejoin: round;
		transition: stroke 0.15s, stroke-width 0.15s;
	}

	/* Highlight on hover */
	.svg-wrap :global(g.highlighted path) {
		stroke: var(--color-primary);
		stroke-width: 3;
	}

	/* Body wireframe outline */
	.svg-wrap :global(#body path),
	.svg-wrap :global(#body line) {
		stroke: var(--color-text-primary) !important;
	}

	/* Selected muscle info panel */
	.muscle-info {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.5rem 0.75rem;
		background: var(--color-bg-tertiary);
		border-radius: 8px;
		min-height: 2rem;
		width: 100%;
		justify-content: center;
		flex-wrap: wrap;
	}

	.muscle-info.hint {
		opacity: 0.6;
	}

	.info-label {
		font-weight: 700;
		font-size: 0.8rem;
	}

	.info-score {
		font-size: 0.8rem;
		font-weight: 600;
		color: var(--color-primary);
	}

	.info-detail {
		font-size: 0.7rem;
		color: var(--color-text-secondary);
	}

	.info-hint {
		font-size: 0.75rem;
		color: var(--color-text-primary);
	}

	/* Legend */
	.map-legend {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		align-self: flex-end;
	}

	.legend-lo, .legend-hi {
		font-size: 0.55rem;
		color: var(--color-text-primary);
	}

	.legend-gradient {
		width: 60px;
		height: 8px;
		border-radius: 4px;
		background: linear-gradient(to right, var(--color-bg-tertiary), var(--color-primary));
	}

	.empty {
		text-align: center;
		color: var(--color-text-secondary);
		padding: 1.5rem 0;
		font-size: 0.85rem;
	}
</style>
