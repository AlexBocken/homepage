<script lang="ts">
	import { page } from '$app/state';
	import { m, type HikesLang } from '$lib/js/hikesI18n';
	import type { BaseLayer } from '$lib/hikes/mapLayers';
	import MapIcon from '@lucide/svelte/icons/map';
	import Satellite from '@lucide/svelte/icons/satellite';
	import Landmark from '@lucide/svelte/icons/landmark';
	import Layers from '@lucide/svelte/icons/layers';

	/**
	 * The base-layer picker of the hikes maps: a round button that opens a
	 * popover of layers to its left. Sits in a `MapControls` stack.
	 */
	interface Props {
		/** The layers offered, in menu order. */
		layers: readonly BaseLayer[];
		/** The layer shown. */
		value: BaseLayer;
	}

	let { layers, value = $bindable() }: Props = $props();

	const lang = $derived((page.data.lang as HikesLang | undefined) ?? 'de');
	const t = $derived(m[lang]);

	const LAYER_DEFS = $derived({
		schematic: { label: t.layer_map, icon: MapIcon },
		aerial: { label: t.layer_aerial, icon: Satellite },
		dufour: { label: t.layer_dufour, icon: Landmark }
	});

	let open = $state(false);

	// Close the popover on outside click. The opening click on the button calls
	// stopPropagation, so this never sees the click that opened it.
	$effect(() => {
		if (!open) return;
		function onAway(e: MouseEvent) {
			const target = e.target as HTMLElement | null;
			if (target && !target.closest('.layer-menu')) open = false;
		}
		window.addEventListener('click', onAway);
		return () => window.removeEventListener('click', onAway);
	});
</script>

<div class="layer-menu" class:open>
	<button
		type="button"
		class="round-btn"
		aria-label={t.choose_layer}
		aria-haspopup="menu"
		aria-expanded={open}
		onclick={(e) => {
			e.stopPropagation();
			open = !open;
		}}
	>
		<Layers size={20} strokeWidth={2} aria-hidden="true" />
	</button>
	{#if open}
		<div class="layer-popover" role="menu">
			{#each layers as key (key)}
				{@const def = LAYER_DEFS[key]}
				<button
					type="button"
					role="menuitemradio"
					aria-checked={value === key}
					class:active={value === key}
					onclick={() => {
						value = key;
						open = false;
					}}
				>
					<def.icon size={14} strokeWidth={1.75} aria-hidden="true" />
					{def.label}
				</button>
			{/each}
		</div>
	{/if}
</div>

<style>
	.layer-menu {
		position: relative;
	}

	.layer-popover {
		position: absolute;
		right: calc(100% + 0.5rem);
		bottom: 0;
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
		padding: 0.3rem;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		box-shadow: var(--shadow-lg);
		min-width: 9.5rem;
		white-space: nowrap;
	}

	.layer-popover button {
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
		padding: 0.45rem 0.7rem;
		border: 0;
		background: transparent;
		color: var(--color-text-primary);
		font: inherit;
		font-size: 0.85rem;
		border-radius: var(--radius-sm);
		cursor: pointer;
		text-align: left;
		transition: background var(--transition-fast), color var(--transition-fast);
	}

	.layer-popover button :global(svg) {
		color: var(--color-text-tertiary);
		flex: 0 0 auto;
	}

	.layer-popover button:hover {
		background: var(--color-bg-elevated);
	}

	.layer-popover button.active {
		background: var(--color-primary);
		color: var(--color-text-on-primary);
	}

	.layer-popover button.active :global(svg) {
		color: var(--color-text-on-primary);
	}
</style>
