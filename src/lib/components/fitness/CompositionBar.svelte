<script>
	/**
	 * A single stacked bar breaking a macro down into its measured parts.
	 *
	 * Segments carrying no mass are dropped rather than rendered at zero width, so
	 * the legend only ever names things the food actually contained. The `unknown`
	 * segment is styled apart from the rest: it is not a component of the macro but
	 * the share of it that no source characterised, and reading it as a real slice
	 * would overstate how much is known.
	 */
	import { formatGrams } from '$lib/fitness/nutritionMath';

	/**
	 * @typedef {Object} Segment
	 * @property {string} key
	 * @property {string} label
	 * @property {number} value grams
	 * @property {string} color any CSS colour, normally a theme variable
	 * @property {boolean} [unknown] mass no source characterised, styled apart
	 */

	/** @type {{ title: string, total: number, segments: Segment[], note?: string }} */
	let {
		title,
		total,
		segments,
		note = '',
	} = $props();

	const shown = $derived(segments.filter(/** @param {Segment} s */ s => (s.value ?? 0) > 0.005));
	const sum = $derived(shown.reduce(/** @param {number} a @param {Segment} s */ (a, s) => a + s.value, 0));
	// Widths are taken against the summed segments rather than the macro total: the
	// two agree when a breakdown is complete, and when it is not, a bar that stops
	// short of the track reads as a rendering bug rather than as missing data.
	const scale = $derived(sum > 0 ? sum : 1);
</script>

<div class="composition">
	<div class="comp-head">
		<span class="comp-title">{title}</span>
		<span class="comp-total">{formatGrams(total)} g</span>
	</div>

	{#if shown.length === 0}
		<p class="comp-empty">{note}</p>
	{:else}
		<div class="comp-track" role="img" aria-label={shown.map(/** @param {Segment} s */ s => `${s.label} ${formatGrams(s.value)} g`).join(', ')}>
			{#each shown as seg (seg.key)}
				<span
					class="comp-seg"
					class:is-unknown={seg.unknown}
					style="width: {(seg.value / scale) * 100}%; --seg-color: {seg.color}"
				></span>
			{/each}
		</div>

		<ul class="comp-legend">
			{#each shown as seg (seg.key)}
				<li>
					<span class="swatch" class:is-unknown={seg.unknown} style="--seg-color: {seg.color}"></span>
					<span class="seg-label">{seg.label}</span>
					<span class="seg-value">{formatGrams(seg.value)} g</span>
					<span class="seg-pct">{Math.round((seg.value / scale) * 100)}%</span>
				</li>
			{/each}
		</ul>
		{#if note}
			<p class="comp-note">{note}</p>
		{/if}
	{/if}
</div>

<style>
	.composition {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}

	.comp-head {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 1rem;
	}

	.comp-title {
		font-weight: 600;
		color: var(--color-text-primary);
	}

	.comp-total {
		font-variant-numeric: tabular-nums;
		color: var(--color-text-secondary);
		font-size: var(--text-sm);
	}

	.comp-track {
		display: flex;
		width: 100%;
		height: 1.1rem;
		border-radius: var(--radius-pill);
		overflow: hidden;
		background: var(--color-bg-tertiary);
	}

	.comp-seg {
		background: var(--seg-color);
		transition: width var(--transition-normal);
	}

	/* Unmeasured mass reads as absence, not as another component. */
	.comp-seg.is-unknown {
		background: repeating-linear-gradient(
			45deg,
			var(--color-bg-elevated),
			var(--color-bg-elevated) 4px,
			var(--color-bg-tertiary) 4px,
			var(--color-bg-tertiary) 8px
		);
	}

	.comp-legend {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(11rem, 1fr));
		gap: 0.2rem 1rem;
	}

	.comp-legend li {
		display: grid;
		grid-template-columns: 0.7rem 1fr auto auto;
		align-items: center;
		gap: 0.45rem;
		font-size: var(--text-sm);
	}

	.swatch {
		width: 0.7rem;
		height: 0.7rem;
		border-radius: var(--radius-sm);
		background: var(--seg-color);
	}

	.swatch.is-unknown {
		background: repeating-linear-gradient(
			45deg,
			var(--color-bg-elevated),
			var(--color-bg-elevated) 3px,
			var(--color-bg-tertiary) 3px,
			var(--color-bg-tertiary) 6px
		);
	}

	.seg-label {
		color: var(--color-text-secondary);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.seg-value {
		font-variant-numeric: tabular-nums;
		color: var(--color-text-primary);
	}

	.seg-pct {
		font-variant-numeric: tabular-nums;
		color: var(--color-text-tertiary);
		min-width: 2.5rem;
		text-align: right;
	}

	.comp-note,
	.comp-empty {
		margin: 0;
		font-size: var(--text-sm);
		color: var(--color-text-tertiary);
	}

	@media (max-width: 560px) {
		.comp-legend {
			grid-template-columns: 1fr;
		}
	}
</style>
