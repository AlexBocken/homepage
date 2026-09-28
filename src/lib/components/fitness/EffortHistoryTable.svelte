<script lang="ts" generics="T">
	import type { Snippet } from 'svelte';

	/**
	 * The "effort history" list of the segment and progress pages: a header row,
	 * then one link per attempt to the run it was set in, the best one marked.
	 *
	 * The cells are the page's (`head`, `row` snippets, styled by the page), and so
	 * is the grid: each page sets `grid-template-columns`, `gap` and `padding` on
	 * `.hist-head` / `.hist-row` for its own columns.
	 */
	let {
		rows,
		key,
		href,
		title,
		isBest,
		head,
		row
	}: {
		rows: T[];
		key: (r: T) => unknown;
		href: (r: T) => string;
		title?: (r: T) => string;
		isBest: (r: T) => boolean;
		head: Snippet;
		row: Snippet<[T, boolean]>;
	} = $props();
</script>

<div class="hist">
	<div class="hist-head">
		{@render head()}
	</div>
	{#each rows as r (key(r))}
		{@const best = isBest(r)}
		<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- the pages pass resolve()d hrefs -->
		<a class="hist-row" class:best href={href(r)} title={title?.(r)}>
			{@render row(r, best)}
		</a>
	{/each}
</div>

<style>
	.hist {
		display: flex;
		flex-direction: column;
		font-size: 0.85rem;
	}
	.hist-head,
	.hist-row {
		display: grid;
		align-items: center;
	}
	.hist-head {
		font-size: 0.7rem;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		color: var(--color-text-secondary);
		font-weight: 600;
	}
	.hist-row {
		border-top: 1px solid var(--color-border);
		font-variant-numeric: tabular-nums;
		color: inherit;
		text-decoration: none;
		cursor: pointer;
		transition: background var(--transition-fast, 100ms);
	}
	.hist-row:hover {
		background: var(--color-bg-elevated);
	}
</style>
