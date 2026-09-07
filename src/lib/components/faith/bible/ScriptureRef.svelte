<script lang="ts">
	/**
	 * A Bible citation in running text: hover shows the passage, a click pins
	 * it, with a link into the reader. Needs a `ReferencePeeks` on the page.
	 * The reference is shown as written; `label` overrides the text.
	 */
	import { openReference } from '$lib/faith/peeks.svelte';
	import type { Snippet } from 'svelte';

	interface Props {
		reference: string;
		label?: string;
		class?: string;
		children?: Snippet;
	}
	const { reference, label, class: cls = '', children }: Props = $props();
</script>

<button type="button" class="ref {cls}" data-ref={reference} onclick={(e) => openReference(reference, e.currentTarget)}>
	{#if children}{@render children()}{:else}{label ?? reference}{/if}
</button>

<style>
	.ref {
		all: unset;
		cursor: pointer;
		border-bottom: 1px dotted color-mix(in srgb, var(--red) 45%, transparent);
		color: inherit;
	}
	.ref:hover,
	.ref:focus-visible,
	.ref:global(.on) {
		color: var(--red);
		border-bottom-style: solid;
	}
	.ref:focus-visible {
		outline: 2px solid var(--color-primary);
		outline-offset: 2px;
	}
</style>
