<script lang="ts">
	import { resolve } from '$app/paths';
	import Seo from '$lib/components/Seo.svelte';
	import { m, type FaithLang } from '$lib/js/faithI18n';
	import { CANON_BY_TESTAMENT, bookName } from '$lib/faith/bibleCanon';
	import type { PageProps } from './$types';

	const { data }: PageProps = $props();
	const lang = $derived(data.lang as FaithLang);
	const t = $derived(m[lang]);
	const available = $derived(new Set(data.books.map((b) => b.slug)));
	const href = (slug: string) =>
		resolve('/[faithLang=faithLang]/[bible=bibleLang]/[book]/[[chapter]]', {
			faithLang: data.faithLang,
			bible: data.bibleLang,
			book: slug,
			chapter: '1'
		});
</script>

<Seo title={`${t.bible_title} — Bocken`} description={t.bible_description} {lang} />

<section class="bible-index">
	<h1>{t.bible_title}</h1>
	<p class="lede">{t.bible_description}</p>

	{#each [['ot', t.bible_old_testament], ['nt', t.bible_new_testament]] as [test, label] (test)}
		<h2>{label}</h2>
		<ul class="books">
			{#each CANON_BY_TESTAMENT[test as 'ot' | 'nt'] as slug (slug)}
				{#if available.has(slug)}
					<li><a href={href(slug)}>{bookName(slug, lang)}</a></li>
				{:else}
					<li class="soon"><span title={t.bible_not_available}>{bookName(slug, lang)}</span></li>
				{/if}
			{/each}
		</ul>
	{/each}
</section>

<style>
	.bible-index { max-width: 60rem; margin: 0 auto; padding: 1rem 1.25rem 3rem; }
	h1 { text-align: center; font-size: 2.6em; margin: 0.5em 0 0.2em; }
	.lede { max-width: 600px; margin: 0 auto 2rem; text-align: center; font-size: 1.05em; color: var(--color-text-secondary); }
	h2 { font-size: 1.1rem; margin: 1.5rem 0 0.5rem; color: var(--color-text-secondary); font-weight: 600; }
	.books { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(11rem, 1fr)); gap: 0.25rem 1rem; }
	.books a { display: block; padding: 0.4rem 0.5rem; border-radius: var(--radius-sm); color: var(--color-text-primary); text-decoration: none; }
	.books a:hover { background: color-mix(in srgb, var(--red) 11%, transparent); color: var(--red); }
	.books .soon span { display: block; padding: 0.4rem 0.5rem; opacity: 0.4; }
</style>
