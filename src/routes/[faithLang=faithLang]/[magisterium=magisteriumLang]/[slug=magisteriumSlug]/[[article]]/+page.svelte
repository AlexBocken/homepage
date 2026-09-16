<script lang="ts">
	import { resolve } from '$app/paths';
	import Seo from '$lib/components/Seo.svelte';
	import CouncilReader from '$lib/components/faith/council/CouncilReader.svelte';
	import { m, type FaithLang } from '$lib/js/faithI18n';
	import { kindLabel } from '$lib/faith/magisteriumLabels';
	import type { PageProps } from './$types';

	const { data }: PageProps = $props();
	const lang = $derived(data.lang as FaithLang);
	const t = $derived(m[lang]);

	const indexHref = $derived(
		resolve('/[faithLang=faithLang]/[magisterium=magisteriumLang]', { faithLang: data.faithLang, magisterium: data.magisterium })
	);

	// vatican.va does not publish every one of these in every language. Where
	// the reader's own is missing, the page says which it is showing instead of
	// letting them wonder why an encyclical is suddenly in Latin.
	const showing = $derived(data.shown === 'la' ? t.magisterium_showing_la : data.shown === 'en' ? t.magisterium_showing_en : t.magisterium_showing_de);
	const notice = $derived(
		[
			// Why another edition is on the page, which is one of two quite
			// different things: this language has no text at all, or it has one
			// that numbers nothing and so cannot answer a citation of an article.
			data.shown === lang ? null : data.published ? t.magisterium_unnumbered_here : t.magisterium_not_published,
			data.shown === lang ? null : showing,
			// And the older Latin texts are the acta as they were set. Say so,
			// rather than let a reader hunt for article 32.
			data.document.numbered ? null : t.magisterium_unnumbered
		]
			.filter(Boolean)
			.join(' ') || null
	);

	/** The first lines of the document, for a search engine and a link preview. */
	const summary = $derived(
		data.document.articles
			.slice(0, 2)
			.map((a) => a.html.replace(/<[^>]+>/g, ''))
			.join(' ')
			.slice(0, 300)
	);
</script>

<Seo title={`${data.document.title} — ${t.magisterium_title}`} description={summary} lang={lang} ogType="article" />

<div class="page">
	<p class="up"><a href={indexHref}>{t.magisterium_title}</a></p>

	<CouncilReader
		lang={data.shown as FaithLang}
		id={data.document.slug}
		kind={kindLabel(t, data.document.kind)}
		document={data.document}
		highlight={data.highlight}
		numbered={data.document.numbered}
		{notice}
	/>

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
