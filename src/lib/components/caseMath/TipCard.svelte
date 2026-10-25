<script lang="ts">
	import type { Tip } from '$lib/js/caseMath/tips';
	import Lightbulb from '@lucide/svelte/icons/lightbulb';

	let {
		tip,
		title = 'Rule of thumb',
		open = $bindable(false),
		collapsible = true
	}: { tip: Tip; title?: string; open?: boolean; collapsible?: boolean } = $props();
</script>

{#snippet body()}
	<ul class="points">
		{#each tip.points as point (point)}
			<li>{point}</li>
		{/each}
	</ul>
	<div class="example" aria-label="Worked example">
		{#each tip.example as line, i (i)}
			<div class:first={i === 0}>{line}</div>
		{/each}
	</div>
	{#if tip.table}
		<dl class="table">
			{#each tip.table as [frac, pct] (frac)}
				<div><dt>{frac}</dt><dd>{pct}</dd></div>
			{/each}
		</dl>
	{/if}
{/snippet}

{#if collapsible}
	<details class="tip" bind:open>
		<summary>
			<Lightbulb size={16} strokeWidth={1.75} />
			<span class="label">{title}:</span>
			<span class="rule">{tip.rule}</span>
		</summary>
		<div class="content">{@render body()}</div>
	</details>
{:else}
	<div class="tip">
		<p class="rule standalone">{tip.rule}</p>
		<div class="content">{@render body()}</div>
	</div>
{/if}

<style>
	.tip {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		padding: 0.75rem 1rem;
	}
	summary {
		display: flex;
		align-items: baseline;
		gap: 0.4rem;
		cursor: pointer;
		list-style: none;
		color: var(--color-text-primary);
	}
	summary::-webkit-details-marker {
		display: none;
	}
	summary :global(svg) {
		flex-shrink: 0;
		color: var(--orange);
		align-self: center;
	}
	.label {
		color: var(--color-text-secondary);
		white-space: nowrap;
	}
	.rule {
		font-weight: 600;
	}
	.rule.standalone {
		margin: 0;
	}
	.content {
		margin-top: 0.6rem;
	}
	.points {
		margin: 0;
		padding-left: 1.2rem;
		color: var(--color-text-tertiary);
		line-height: 1.55;
	}
	.example {
		margin-top: 0.75rem;
		padding: 0.6rem 0.8rem;
		background: var(--color-bg-tertiary);
		border-radius: var(--radius-md);
		font-size: 0.92rem;
		color: var(--color-text-secondary);
	}
	.example .first {
		color: var(--color-text-primary);
		font-weight: 600;
	}
	.table {
		margin: 0.75rem 0 0;
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(6.5rem, 1fr));
		gap: 0.4rem;
		font-size: 0.9rem;
	}
	.table div {
		display: flex;
		justify-content: space-between;
		gap: 0.5rem;
		padding: 0.3rem 0.6rem;
		background: var(--color-bg-tertiary);
		border-radius: var(--radius-sm);
	}
	.table dt {
		color: var(--color-text-primary);
	}
	.table dd {
		margin: 0;
		color: var(--color-text-secondary);
	}
</style>
