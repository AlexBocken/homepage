<script lang="ts">
	import type { Snippet } from 'svelte';
	import { getLanguageContext } from '$lib/contexts/languageContext.js';

	let { latinPrimary = true, children } = $props<{ latinPrimary?: boolean, children?: Snippet }>();

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
.prayer-wrapper :global(p) {
	display: flex;
	flex-direction: column;
}

/* Reverse order when vernacular is primary */
.prayer-wrapper.vernacular-primary :global(p) {
	flex-direction: column-reverse;
}

.prayer-wrapper :global(v) {
	margin: 0;
	display: block;
}

/* === GERMAN MODE (default, /glaube/*) === */

/* Hide English in German mode */
.prayer-wrapper.lang-de :global(v:lang(en)) {
	display: none;
}

/* Latin primary styling (German mode) */
.prayer-wrapper.lang-de :global(v:lang(la)) {
	color: var(--nord6);
}

.prayer-wrapper.lang-de :global(v:lang(de)) {
	color: grey;
}

@media(prefers-color-scheme: light) {
	.prayer-wrapper.lang-de :global(v:lang(la)) {
		color: black;
	}
}

/* Vernacular primary mode (German) */
.prayer-wrapper.lang-de.vernacular-primary :global(v:lang(de)) {
	color: var(--nord6);
}

.prayer-wrapper.lang-de.vernacular-primary :global(v:lang(la)) {
	color: grey;
}

@media(prefers-color-scheme: light) {
	.prayer-wrapper.lang-de.vernacular-primary :global(v:lang(de)) {
		color: black;
	}
}

/* Monolingual mode (German) - hide Latin, show only German */
.prayer-wrapper.lang-de.monolingual :global(v:lang(la)) {
	display: none;
}

.prayer-wrapper.lang-de.monolingual :global(v:lang(de)) {
	color: var(--nord6);
	margin-bottom: 0.5em;
}

@media(prefers-color-scheme: light) {
	.prayer-wrapper.lang-de.monolingual :global(v:lang(de)) {
		color: black;
	}
}

/* === ENGLISH MODE (/faith/*) === */

/* Hide German in English mode */
.prayer-wrapper.lang-en :global(v:lang(de)) {
	display: none;
}

/* Latin primary styling (English mode) */
.prayer-wrapper.lang-en :global(v:lang(la)) {
	color: var(--nord6);
}

.prayer-wrapper.lang-en :global(v:lang(en)) {
	color: grey;
}

@media(prefers-color-scheme: light) {
	.prayer-wrapper.lang-en :global(v:lang(la)) {
		color: black;
	}
}

/* Vernacular primary mode (English) */
.prayer-wrapper.lang-en.vernacular-primary :global(v:lang(en)) {
	color: var(--nord6);
}

.prayer-wrapper.lang-en.vernacular-primary :global(v:lang(la)) {
	color: grey;
}

@media(prefers-color-scheme: light) {
	.prayer-wrapper.lang-en.vernacular-primary :global(v:lang(en)) {
		color: black;
	}
}

/* Monolingual mode (English) - hide Latin, show only English */
.prayer-wrapper.lang-en.monolingual :global(v:lang(la)) {
	display: none;
}

.prayer-wrapper.lang-en.monolingual :global(v:lang(en)) {
	color: var(--nord6);
	margin-bottom: 0.5em;
}

@media(prefers-color-scheme: light) {
	.prayer-wrapper.lang-en.monolingual :global(v:lang(en)) {
		color: black;
	}
}

/* === COMMON STYLES === */

.prayer-wrapper :global(i) {
	font-style: normal;
	color: var(--nord11);
	font-weight: 900;
}

/* Mystery text styling - German mode */
.prayer-wrapper.lang-de :global(v.mystery-text:lang(la)) {
	color: var(--nord11) !important;
	font-weight: 700;
	font-size: 1.1em;
}

.prayer-wrapper.lang-de :global(v.mystery-text:lang(de)) {
	color: var(--nord12) !important;
	font-weight: 700;
	font-size: 0.95em;
}

.prayer-wrapper.lang-de.vernacular-primary :global(v.mystery-text:lang(de)) {
	color: var(--nord11) !important;
	font-weight: 700;
	font-size: 1.1em;
}

.prayer-wrapper.lang-de.vernacular-primary :global(v.mystery-text:lang(la)) {
	color: var(--nord12) !important;
	font-weight: 700;
	font-size: 0.95em;
}

.prayer-wrapper.lang-de.monolingual :global(v.mystery-text:lang(la)) {
	display: none;
}

.prayer-wrapper.lang-de.monolingual :global(v.mystery-text:lang(de)) {
	color: var(--nord11) !important;
	font-weight: 700;
	font-size: 1.1em;
}

/* Mystery text styling - English mode */
.prayer-wrapper.lang-en :global(v.mystery-text:lang(la)) {
	color: var(--nord11) !important;
	font-weight: 700;
	font-size: 1.1em;
}

.prayer-wrapper.lang-en :global(v.mystery-text:lang(en)) {
	color: var(--nord12) !important;
	font-weight: 700;
	font-size: 0.95em;
}

.prayer-wrapper.lang-en.vernacular-primary :global(v.mystery-text:lang(en)) {
	color: var(--nord11) !important;
	font-weight: 700;
	font-size: 1.1em;
}

.prayer-wrapper.lang-en.vernacular-primary :global(v.mystery-text:lang(la)) {
	color: var(--nord12) !important;
	font-weight: 700;
	font-size: 0.95em;
}

.prayer-wrapper.lang-en.monolingual :global(v.mystery-text:lang(la)) {
	display: none;
}

.prayer-wrapper.lang-en.monolingual :global(v.mystery-text:lang(en)) {
	color: var(--nord11) !important;
	font-weight: 700;
	font-size: 1.1em;
}
</style>

<div
	class="prayer-wrapper"
	class:vernacular-primary={!latinPrimary}
	class:monolingual={!showLatin}
	class:lang-de={urlLang === 'de'}
	class:lang-en={urlLang === 'en'}
>
	{@render children?.()}
</div>
