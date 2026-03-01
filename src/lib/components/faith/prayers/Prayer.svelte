<script lang="ts">
	import type { Snippet } from 'svelte';
	import { getLanguageContext } from '$lib/contexts/languageContext.js';

	let { latinPrimary = true, hasLatin = true, children } = $props<{ latinPrimary?: boolean, hasLatin?: boolean, children?: Snippet<[boolean, string]> }>();

	// Get context if available (graceful fallback for standalone usage)
	let showLatinStore;
	let langStore;
	try {
		const context = getLanguageContext();
		showLatinStore = context.showLatin;
		langStore = context.lang;
	} catch {
		showLatinStore = null;
		langStore = null;
	}

	let showLatin = $derived(showLatinStore ? $showLatinStore : true);
	let urlLang = $derived(langStore ? $langStore : 'de');
</script>

<style>
/* === LAYOUT === */
.prayer-wrapper :global(p) {
	display: flex;
	flex-direction: column;
}
.prayer-wrapper.vernacular-primary :global(p) {
	flex-direction: column-reverse;
}

.prayer-wrapper :global(v) {
	display: block;
	margin: 0;
}

/* === LANGUAGE VISIBILITY === */
.prayer-wrapper.lang-de :global(v:lang(en)),
.prayer-wrapper.lang-en :global(v:lang(de)),
.prayer-wrapper.monolingual :global(v:lang(la)) {
	display: none;
}

/* === BASE COLORS (dark mode) === */
.prayer-wrapper :global(v:lang(la)) { color: var(--nord6); }
.prayer-wrapper :global(v:lang(de)),
.prayer-wrapper :global(v:lang(en)) { color: grey; }

/* No-Latin prayers: vernacular gets primary color */
.prayer-wrapper.no-latin :global(v:lang(de)),
.prayer-wrapper.no-latin :global(v:lang(en)) {
	color: var(--nord6);
}

/* Vernacular primary overrides */
.prayer-wrapper.vernacular-primary :global(v:lang(de)),
.prayer-wrapper.vernacular-primary :global(v:lang(en)) {
	color: var(--nord6);
}
.prayer-wrapper.vernacular-primary :global(v:lang(la)) {
	color: grey;
}

/* Monolingual spacing */
.prayer-wrapper.monolingual :global(v:not(:lang(la))) {
	color: var(--nord6);
	margin-bottom: 0.5em;
}

/* === LIGHT MODE === */
@media (prefers-color-scheme: light) {
    :global(:root:not([data-theme="dark"])) .prayer-wrapper :global(v:lang(la)),
:global(:root:not([data-theme="dark"])) .prayer-wrapper.vernacular-primary :global(v:lang(de)),
:global(:root:not([data-theme="dark"])) .prayer-wrapper.vernacular-primary :global(v:lang(en)),
:global(:root:not([data-theme="dark"])) .prayer-wrapper.monolingual :global(v:not(:lang(la))),
:global(:root:not([data-theme="dark"])) .prayer-wrapper.no-latin :global(v:lang(de)),
:global(:root:not([data-theme="dark"])) .prayer-wrapper.no-latin :global(v:lang(en)) {
		color: black;
	}
  }
:global(:root[data-theme="light"]) .prayer-wrapper :global(v:lang(la)),
:global(:root[data-theme="light"]) .prayer-wrapper.vernacular-primary :global(v:lang(de)),
:global(:root[data-theme="light"]) .prayer-wrapper.vernacular-primary :global(v:lang(en)),
:global(:root[data-theme="light"]) .prayer-wrapper.monolingual :global(v:not(:lang(la))),
:global(:root[data-theme="light"]) .prayer-wrapper.no-latin :global(v:lang(de)),
:global(:root[data-theme="light"]) .prayer-wrapper.no-latin :global(v:lang(en)) {
	color: black;
}

/* === INLINE / RUBRIC TEXT === */
/* Base: all vernacular inline text is grey */
.prayer-wrapper :global(v[lang=de] > i),
.prayer-wrapper :global(v[lang=en] > i) {
	color: grey;
}

/* Monolingual override */
.prayer-wrapper.monolingual :global(v[lang=de] > i),
.prayer-wrapper.monolingual :global(v[lang=en] > i) {
	color: var(--red);
}

/* Latin (always emphasized) */
.prayer-wrapper :global(v[lang=la] > i) {
	color: var(--nord11);
	font-weight: 900;
}
/* === MYSTERY TEXT (shared base) === */
.prayer-wrapper :global(v.mystery-text) {
	font-weight: 700;
}

/* Latin mystery — always primary */
.prayer-wrapper :global(v.mystery-text:lang(la)),
.prayer-wrapper :global(v.mystery-text:lang(la) > i) {
	color: var(--nord11) !important;
	font-size: 1.1em;
}

/* Vernacular mystery — bilingual only */
.prayer-wrapper:not(.monolingual)
	:global(v.mystery-text:lang(de)),
.prayer-wrapper:not(.monolingual)
	:global(v.mystery-text:lang(en)),
.prayer-wrapper:not(.monolingual)
	:global(v.mystery-text:lang(de) > i),
.prayer-wrapper:not(.monolingual)
	:global(v.mystery-text:lang(en) > i) {
	color: var(--nord12) !important;
	font-size: 0.95em;
}

/* Vernacular-primary emphasis */
	.prayer-wrapper.monolingual
	:global(v.mystery-text:lang(de)),
.prayer-wrapper.monolingual
	:global(v.mystery-text:lang(en)),
.prayer-wrapper.monolingual
	:global(v.mystery-text:lang(de) > i),
.prayer-wrapper.monolingual
	:global(v.mystery-text:lang(en) > i) {
	color: var(--nord11) !important;
	font-size: 1.1em;
}

.prayer-wrapper.vernacular-primary
	:global(v.mystery-text:lang(la)) {
	color: var(--nord12) !important;
	font-size: 0.95em;
}

/* Monolingual: hide Latin mystery */
.prayer-wrapper.monolingual
	:global(v.mystery-text:lang(la)) {
	display: none;
}
</style>

<div
	class="prayer-wrapper"
	class:vernacular-primary={!latinPrimary}
	class:monolingual={!showLatin}
	class:no-latin={!hasLatin}
	class:lang-de={urlLang === 'de'}
	class:lang-en={urlLang === 'en'}
>
	{@render children?.(showLatin, urlLang)}
</div>
