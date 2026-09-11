<script lang="ts">
	/**
	 * A Catechism citation in running text: hover shows the paragraph, a click
	 * goes to it in the reader. Needs a `ReferencePeeks` on the page, the same
	 * one `ScriptureRef` uses.
	 *
	 * `<CccRef n={2095} />` prints "KKK 2095" under /glaube, "CCC 2095" under
	 * /faith and "CEC 2095" under /fides; `n` may be a range, `2088-2089`.
	 */
	import { page } from '$app/state';
	import { cccPath } from '$lib/faith/cccText';
	import { cccLabel, parseCccRange, type CccLang } from '$lib/faith/cccTypes';
	import { langFromFaithSlug } from '$lib/js/faithI18n';
	import type { Snippet } from 'svelte';

	interface Props {
		n: number | string;
		/** Overrides the printed text; the citation itself is unchanged. */
		label?: string;
		class?: string;
		children?: Snippet;
	}
	const { n, label, class: cls = '', children }: Props = $props();

	const lang = $derived((page.data.lang as CccLang) ?? langFromFaithSlug(page.params.faithLang));
	const reference = $derived(String(n));
	const range = $derived(parseCccRange(reference));
	const printed = $derived(label ?? (range ? cccLabel(lang, range.from, range.to) : reference));
</script>

<a class="cref {cls}" data-ccc={reference} href={cccPath(lang, reference)}>{#if children}{@render children()}{:else}{printed}{/if}</a>

<style>
	.cref {
		color: inherit;
		text-decoration: none;
		border-bottom: 1px dotted color-mix(in srgb, var(--blue) 55%, transparent);
		white-space: nowrap;
	}
	.cref:hover,
	.cref:focus-visible,
	.cref:global(.on) {
		color: var(--blue);
		border-bottom-style: solid;
	}
	.cref:focus-visible {
		outline: 2px solid var(--color-primary);
		outline-offset: 2px;
	}
</style>
