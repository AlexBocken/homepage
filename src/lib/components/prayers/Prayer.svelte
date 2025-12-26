<script>
	import { getLanguageContext } from '$lib/contexts/languageContext.js';

	export let latinPrimary = true; // Controls which language is shown prominently

	// Get context if available (graceful fallback for standalone usage)
	let showLatinStore;
	try {
		const context = getLanguageContext();
		showLatinStore = context.showLatin;
	} catch {
		showLatinStore = null;
	}

	$: showLatin = showLatinStore ? $showLatinStore : true;
</script>

<style>
.prayer-wrapper :global(p) {
	display: flex;
	flex-direction: column;
}

/* Reverse order when German is primary */
.prayer-wrapper.german-primary :global(p) {
	flex-direction: column-reverse;
}

.prayer-wrapper :global(v) {
	margin: 0;
	display: block;
}

/* Latin primary (default) */
.prayer-wrapper :global(v:lang(la)) {
	color: var(--nord6);
}

.prayer-wrapper :global(v:lang(de)) {
	color: grey;
}

.prayer-wrapper :global(i) {
	font-style: normal;
	color: var(--nord11);
	font-weight: 900;
}

@media(prefers-color-scheme: light) {
	.prayer-wrapper :global(v:lang(la)) {
		color: black;
	}
}

/* German primary mode */
.prayer-wrapper.german-primary :global(v:lang(de)) {
	color: var(--nord6);
}

.prayer-wrapper.german-primary :global(v:lang(la)) {
	color: grey;
}

@media(prefers-color-scheme: light) {
	.prayer-wrapper.german-primary :global(v:lang(de)) {
		color: black;
	}
}

/* Mystery text styling */
.prayer-wrapper :global(v.mystery-text:lang(la)) {
	color: var(--nord11) !important;
	font-weight: 700;
	font-size: 1.1em;
}

.prayer-wrapper :global(v.mystery-text:lang(de)) {
	color: var(--nord12) !important;
	font-weight: 700;
	font-size: 0.95em;
}

.prayer-wrapper.german-primary :global(v.mystery-text:lang(de)) {
	color: var(--nord11) !important;
	font-weight: 700;
	font-size: 1.1em;
}

.prayer-wrapper.german-primary :global(v.mystery-text:lang(la)) {
	color: var(--nord12) !important;
	font-weight: 700;
	font-size: 0.95em;
}

/* Hide Latin in monolingual mode */
.prayer-wrapper.monolingual :global(v:lang(la)) {
	display: none;
}

/* German gets primary styling in monolingual mode */
.prayer-wrapper.monolingual :global(v:lang(de)) {
	color: var(--nord6);
}

@media(prefers-color-scheme: light) {
	.prayer-wrapper.monolingual :global(v:lang(de)) {
		color: black;
	}
}

/* Hide Latin mystery text in monolingual mode */
.prayer-wrapper.monolingual :global(v.mystery-text:lang(la)) {
	display: none;
}

/* German mystery text gets prominent styling in monolingual mode */
.prayer-wrapper.monolingual :global(v.mystery-text:lang(de)) {
	color: var(--nord11) !important;
	font-weight: 700;
	font-size: 1.1em;
}
</style>

<div class="prayer-wrapper" class:german-primary={!latinPrimary} class:monolingual={!showLatin}>
	<slot></slot>
</div>
