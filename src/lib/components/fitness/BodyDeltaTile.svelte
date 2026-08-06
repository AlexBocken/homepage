<script>
	import TrendingDown from '@lucide/svelte/icons/trending-down';
	import TrendingUp from '@lucide/svelte/icons/trending-up';
	import MinusIcon from '@lucide/svelte/icons/minus';

	/**
	 * Change tile beside a body chart: how much came off (or went on) since the
	 * reference point. Sits next to the weight / body-fat charts the way the
	 * streak tile sits next to the workouts-per-week chart.
	 *
	 * @type {{
	 *   value: number | null,
	 *   unit: string,
	 *   label: string,
	 *   period: string,
	 *   decimals?: number,
	 *   accent?: string,
	 *   editLabel: string,
	 *   onedit: () => void
	 * }}
	 *
	 * `accent` is the tile's chart colour — the trend-line colour of the chart it
	 * sits beside, so weight reads blue and body fat purple on both halves of the
	 * row. It tints the resting badge and the hover ring only: a change that has a
	 * direction keeps the green/orange sign colours, which mean something.
	 */
	let { value, unit, label, period, decimals = 1, accent = 'var(--color-primary)', editLabel, onedit } = $props();

	// Below half a display unit the number would render as "0.0" — call that flat
	// rather than dressing rounding noise up as a loss or a gain.
	const dir = $derived.by(() => {
		if (value == null || !Number.isFinite(value)) return 'none';
		if (Math.abs(value) < 0.5 * Math.pow(10, -decimals)) return 'flat';
		return value < 0 ? 'down' : 'up';
	});

	const text = $derived(
		value == null || !Number.isFinite(value)
			? '—'
			// U+2212 minus, not a hyphen: it lines up with the digits.
			: `${dir === 'down' ? '−' : dir === 'up' ? '+' : ''}${Math.abs(value).toFixed(decimals)}`
	);
</script>

<button class="delta-tile" style:--tile-accent={accent} onclick={onedit} aria-label={editLabel}>
	<span class="delta-icon {dir}">
		{#if dir === 'down'}
			<TrendingDown size={22} />
		{:else if dir === 'up'}
			<TrendingUp size={22} />
		{:else}
			<MinusIcon size={22} />
		{/if}
	</span>
	<span class="delta-meta">
		<span class="delta-value {dir}">{text}<span class="delta-unit">{unit}</span></span>
		<span class="delta-label">{label}</span>
		<span class="delta-period">{period}</span>
	</span>
</button>

<style>
	.delta-tile {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.6rem;
		padding: 1rem 0.75rem;
		/* Fixed, not content-sized: the weight and body-fat tiles sit on opposite
		   sides of two stacked charts, and unequal widths there read as sloppy.
		   Longer labels wrap instead of widening the tile. */
		flex: 0 0 8.5rem;
		width: 8.5rem;
		background: var(--color-surface);
		border: none;
		border-radius: 12px;
		box-shadow: var(--shadow-sm);
		cursor: pointer;
		font-family: inherit;
		color: inherit;
		transition: box-shadow 0.15s;
	}
	.delta-tile:hover,
	.delta-tile:focus-visible {
		box-shadow: var(--shadow-sm), 0 0 0 2px var(--tile-accent);
	}
	.delta-icon {
		display: grid;
		place-items: center;
		width: 40px;
		height: 40px;
		border-radius: 50%;
		background: color-mix(in srgb, var(--tile-accent) 16%, transparent);
		color: var(--tile-accent);
	}
	.delta-icon.down {
		background: color-mix(in srgb, var(--green) 18%, transparent);
		color: var(--green);
	}
	.delta-icon.up {
		background: color-mix(in srgb, var(--orange) 18%, transparent);
		color: var(--orange);
	}
	.delta-meta {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.1rem;
	}
	.delta-value {
		font-size: 1.5rem;
		font-weight: 800;
		line-height: 1.1;
		color: var(--color-text-primary);
	}
	.delta-value.down { color: var(--green); }
	.delta-value.up { color: var(--orange); }
	.delta-unit {
		font-size: 0.8rem;
		font-weight: 600;
		margin-left: 0.15rem;
	}
	.delta-label {
		font-size: 0.8rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--color-text-secondary);
		text-align: center;
	}
	.delta-period {
		font-size: 0.7rem;
		color: var(--color-text-secondary);
		opacity: 0.7;
		text-align: center;
	}

	@media (max-width: 600px) {
		.delta-tile {
			flex-direction: row;
			gap: 1rem;
			flex: initial;
			width: auto;
			padding: 1rem 1.25rem;
		}
		.delta-meta {
			align-items: flex-start;
		}
		.delta-label,
		.delta-period {
			text-align: left;
		}
	}
</style>
