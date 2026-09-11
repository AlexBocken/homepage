<script lang="ts">
	import { resolve } from '$app/paths';
	import Seo from '$lib/components/Seo.svelte';
	import CouncilReader from '$lib/components/faith/council/CouncilReader.svelte';
	import { m, type FaithLang } from '$lib/js/faithI18n';
	import type { PageProps } from './$types';

	const { data }: PageProps = $props();
	const lang = $derived(data.lang as FaithLang);
	const t = $derived(m[lang]);

	const indexHref = $derived(resolve('/[faithLang=faithLang]/[council=councilLang]', { faithLang: data.faithLang, council: data.council }));

	/** The first lines of the document, for a search engine and a link preview. */
	const summary = $derived(
		data.document.articles
			.slice(0, 2)
			.map((a) => a.html.replace(/<[^>]+>/g, ''))
			.join(' ')
			.slice(0, 300)
	);
</script>

<Seo title={`${data.document.title} — ${t.council_title}`} description={summary} lang={lang} ogType="article" />

<div class="page">
	<p class="up"><a href={indexHref}>{t.council_title}</a></p>

	<CouncilReader {lang} document={data.document} highlight={data.highlight} />

	<footer><p>{t.vatican_copyright}</p></footer>
</div>

<style>
	.page {
		max-width: 1240px;
		margin-inline: auto;
		padding-block: 1.5rem 4rem;
		padding-inline: 1rem;
	}
	.up {
		max-width: 46rem;
		margin: 0 auto 1.5rem;
		font-size: var(--text-sm);
	}
	.up a {
		color: var(--color-text-secondary);
		text-decoration: none;
		border-bottom: 1px solid transparent;
	}
	.up a:hover,
	.up a:focus-visible {
		color: var(--color-primary);
		border-bottom-color: currentcolor;
	}
	footer {
		margin-top: 3rem;
		text-align: center;
		font-size: var(--text-sm);
		color: var(--color-text-tertiary);
	}
</style>
