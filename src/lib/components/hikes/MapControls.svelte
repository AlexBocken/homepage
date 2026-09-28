<script lang="ts">
	import type { Snippet } from 'svelte';

	/**
	 * The vertical stack of round controls at the bottom-right of a hikes map —
	 * `LayerMenu` on top, the map's own buttons, `MapLocateButton` at the bottom —
	 * plus the location error just above it. Every button in the stack is a
	 * `.round-btn`, styled here so the detail, overview and route-builder maps
	 * share one visual language.
	 */
	interface Props {
		children: Snippet;
		/** The location error, shown above the stack while set. */
		error?: string | null;
		/** Where the error sits: clear of the tallest stack this map shows. */
		errorBottom?: string;
	}

	let { children, error = null, errorBottom = '14rem' }: Props = $props();
</script>

<div class="map-controls">
	{@render children()}
</div>

{#if error}
	<p class="gps-error" role="status" style:bottom={errorBottom}>{error}</p>
{/if}

<style>
	/* Positioned against the map's wrapper, which is `position: relative`. */
	.map-controls {
		position: absolute;
		bottom: 1rem;
		right: 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		align-items: flex-end;
		z-index: 500;
	}

	.map-controls :global(.round-btn) {
		display: grid;
		place-items: center;
		width: 44px;
		height: 44px;
		background: var(--color-surface);
		color: var(--color-text-secondary);
		border: 1px solid var(--color-border);
		border-radius: 50%;
		box-shadow: var(--shadow-md);
		cursor: pointer;
		transition:
			color var(--transition-fast),
			background var(--transition-fast),
			transform var(--transition-fast),
			box-shadow var(--transition-fast);
	}

	.map-controls :global(.round-btn:hover) {
		color: var(--color-primary);
		transform: scale(1.05);
		box-shadow: var(--shadow-hover);
	}

	.map-controls :global(.round-btn.active) {
		background: var(--color-primary);
		color: var(--color-text-on-primary);
		border-color: var(--color-primary);
	}

	.map-controls :global(.round-btn.active:hover) {
		color: var(--color-text-on-primary);
	}

	/* GPS-permission error toast, above the stack of 44 px round controls. */
	.gps-error {
		position: absolute;
		right: 1rem;
		max-width: 18rem;
		margin: 0;
		padding: 0.5rem 0.75rem;
		background: var(--color-surface);
		color: var(--red);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		box-shadow: var(--shadow-md);
		font-size: 0.78rem;
		z-index: 500;
	}
</style>
