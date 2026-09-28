<script>
	import Flame from '@lucide/svelte/icons/flame';
	import Info from '@lucide/svelte/icons/info';
	import { clampToViewport } from '$lib/js/clampToViewport';

	/**
	 * A session's server-computed kcal estimate (stored at save/recalculate time)
	 * as a stat pill, with a toggle that lists the studies each method comes from.
	 * @type {{ estimate: { kcal: number, lower: number, methods: string[] } }}
	 */
	let { estimate } = $props();

	let showInfo = $state(false);

	/** @type {Record<string, { label: string, doi?: string }>} */
	const METHOD_CITATIONS = {
		'lytle':           { label: 'Lytle et al. (2019)', doi: '10.1249/MSS.0000000000001925' },
		'minetti-gps':     { label: 'Minetti et al. (2002)', doi: '10.1152/japplphysiol.01177.2001' },
		'cycling-physics': { label: 'Cycling physics model' },
		'met-speed':       { label: 'Ainsworth et al. (2011)', doi: '10.1249/MSS.0b013e31821ece12' },
		'met-fixed':       { label: 'Ainsworth et al. (2011)', doi: '10.1249/MSS.0b013e31821ece12' },
		'flat-rate':       { label: 'Flat-rate estimate' }
	};
</script>

<div class="stat-pill kcal has-info">
	<Flame size={14} />
	<span>{estimate.kcal} &plusmn; {estimate.kcal - estimate.lower} kcal</span>
	<button class="kcal-info-trigger" onclick={() => showInfo = !showInfo} aria-label="Show estimation sources">
		<Info size={12} />
	</button>
	{#if showInfo}
		<div class="kcal-info-tooltip" {@attach clampToViewport}>
			{#each estimate.methods as method (method)}
				{@const cite = METHOD_CITATIONS[method]}
				{#if cite}
					<span class="cite-line">
						{#if cite.doi}
							<a href="https://doi.org/{cite.doi}" target="_blank" rel="noopener">{cite.label}</a>
						{:else}{cite.label}{/if}
					</span>
				{/if}
			{/each}
		</div>
	{/if}
</div>

<style>
	/* The base pill matches the other stat pills beside it on the session pages. */
	.stat-pill {
		display: flex;
		align-items: center;
		gap: 0.3rem;
		padding: 0.35rem 0.7rem;
		background: var(--color-surface);
		border-radius: 20px;
		box-shadow: var(--shadow-sm);
		font-size: 0.8rem;
		color: var(--color-text-secondary);
	}
	.stat-pill.kcal {
		color: var(--orange);
		border-color: var(--orange);
		background: color-mix(in srgb, var(--orange) 10%, transparent);
	}
	.stat-pill.has-info {
		position: relative;
	}
	.kcal-info-trigger {
		display: flex;
		align-items: center;
		opacity: 0.5;
		cursor: pointer;
		margin-left: 0.15rem;
		background: none;
		border: none;
		padding: 0;
		color: inherit;
	}
	.kcal-info-trigger:hover {
		opacity: 0.9;
	}
	.kcal-info-tooltip {
		position: absolute;
		top: 100%;
		left: 0;
		margin-top: 0.35rem;
		background: var(--color-surface);
		border: 1px solid var(--color-border, var(--nord3));
		border-radius: 8px;
		padding: 0.45rem 0.6rem;
		font-size: 0.65rem;
		font-weight: 400;
		line-height: 1.5;
		color: var(--color-text-secondary);
		/* Sentence-length citations: wrapped and capped, because a nowrap panel is as
		   wide as its longest line and hangs a phone-width page off its own right
		   edge. clampToViewport then moves what is left of the overhang. */
		width: max-content;
		max-width: min(24rem, calc(100vw - 2rem));
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
		z-index: 20;
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
	}
	.kcal-info-tooltip a {
		color: var(--orange);
		text-decoration: underline;
	}
</style>
