<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		children?: Snippet;
	}

	const { children }: Props = $props();
</script>

<article class="hike-prose">
	{@render children?.()}
</article>

<style>
	.hike-prose {
		max-width: 70ch;
		margin-inline: auto;
		color: var(--color-text-primary);
		line-height: 1.7;
		font-size: var(--text-base, 1rem);
	}

	.hike-prose :global(h2) {
		margin-top: 2.5rem;
		margin-bottom: 1rem;
		font-size: var(--text-2xl, 1.5rem);
		color: var(--color-text-primary);
	}

	.hike-prose :global(h3) {
		margin-top: 2rem;
		margin-bottom: 0.75rem;
		font-size: var(--text-xl, 1.25rem);
		color: var(--color-text-primary);
	}

	.hike-prose :global(p) {
		margin-block: 1rem;
	}

	.hike-prose :global(a) {
		color: var(--color-primary);
		text-decoration: underline;
		text-underline-offset: 0.15em;
	}

	.hike-prose :global(a:hover) {
		color: var(--color-primary-hover);
	}

	.hike-prose :global(blockquote) {
		margin-block: 1.5rem;
		padding: 0.75rem 1rem;
		border-inline-start: 3px solid var(--color-primary);
		background: var(--color-bg-secondary);
		border-radius: var(--radius-md);
		color: var(--color-text-secondary);
	}

	.hike-prose :global(img) {
		max-width: 100%;
		height: auto;
		display: block;
		margin-block: 1.5rem;
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-md);
	}

	.hike-prose :global(figure) {
		margin-block: 1.5rem;
	}

	.hike-prose :global(figcaption) {
		text-align: center;
		font-size: var(--text-sm, 0.875rem);
		color: var(--color-text-tertiary);
		margin-top: 0.5rem;
	}

	.hike-prose :global(ul),
	.hike-prose :global(ol) {
		padding-inline-start: 1.5rem;
		margin-block: 1rem;
	}

	.hike-prose :global(li) {
		margin-block: 0.4rem;
	}

	.hike-prose :global(code) {
		font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
		font-size: 0.9em;
		background: var(--color-bg-tertiary);
		padding: 0.1em 0.35em;
		border-radius: var(--radius-sm);
	}

	.hike-prose :global(pre) {
		background: var(--color-bg-tertiary);
		padding: 1rem;
		border-radius: var(--radius-md);
		overflow-x: auto;
	}

	.hike-prose :global(pre code) {
		background: transparent;
		padding: 0;
	}

	.hike-prose :global(hr) {
		margin-block: 2rem;
		border: 0;
		border-top: 1px solid var(--color-border);
	}
</style>
