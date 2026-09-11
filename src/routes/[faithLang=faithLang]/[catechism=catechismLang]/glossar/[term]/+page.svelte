<script lang="ts">
	import { resolve } from '$app/paths';
	import Seo from '$lib/components/Seo.svelte';
	import ReferencePeeks from '$lib/components/faith/bible/ReferencePeeks.svelte';
	import { bibleSlug, m, type FaithLang } from '$lib/js/faithI18n';
	import type { PageProps } from './$types';

	const { data }: PageProps = $props();
	const lang = $derived(data.lang as FaithLang);
	const t = $derived(m[lang]);
	const bibleLang = $derived(bibleSlug(lang));

	const glossaryHref = $derived(resolve('/[faithLang=faithLang]/[catechism=catechismLang]/glossar', { faithLang: data.faithLang, catechism: data.catechism }));
	const paragraphHref = (n: number) => resolve('/[faithLang=faithLang]/[catechism=catechismLang]/[ref=cccRef]', { faithLang: data.faithLang, catechism: data.catechism, ref: String(n) });
	const termHref = (term: string) => resolve('/[faithLang=faithLang]/[catechism=catechismLang]/glossar/[term]', { faithLang: data.faithLang, catechism: data.catechism, term });

	const at = $derived(data.siblings.findIndex((s) => s.slug === data.term.slug));
	const summary = $derived(data.explained[0]?.html.replace(/<[^>]+>/g, '').slice(0, 300) ?? '');

	let root = $state<HTMLElement>();
</script>

<Seo title={`${data.term.label} — ${t.ccc_glossary}`} description={summary} lang={lang} />

<article bind:this={root}>
	<p class="up"><a href={glossaryHref}>{t.ccc_glossary}</a></p>
	<h1>{data.term.label}</h1>
	<p class="lead">{t.ccc_defines}</p>

	{#each data.explained as p, i (p.n)}
		<section>
			{#if data.explained[i - 1]?.where !== p.where}<p class="where">{p.where}</p>{/if}
			<p class="para"><a class="n" href={paragraphHref(p.n)}>{p.n}</a>{@html p.html}</p>
		</section>
	{/each}

	<nav class="around">
		{#if data.siblings[at - 1]}<a href={termHref(data.siblings[at - 1].slug)}>← {data.siblings[at - 1].label}</a>{:else}<span></span>{/if}
		{#if data.siblings[at + 1]}<a class="next" href={termHref(data.siblings[at + 1].slug)}>{data.siblings[at + 1].label} →</a>{/if}
	</nav>
</article>

<ReferencePeeks {lang} faithLang={data.faithLang} {bibleLang} {root} source={t.ccc_title} />

<style>
	article {
		max-width: 44rem;
		margin-inline: auto;
		padding-block: 1.5rem 4rem;
		padding-inline: 1rem;
	}
	.up {
		margin: 0 0 1.5rem;
		font-size: var(--text-sm);
	}
	.up a,
	.around a {
		color: var(--color-text-secondary);
		text-decoration: none;
	}
	.up a:hover,
	.up a:focus-visible,
	.around a:hover,
	.around a:focus-visible {
		color: var(--color-primary);
	}
	h1 {
		font-size: var(--text-2xl);
		margin: 0 0 0.3rem;
	}
	.lead {
		margin: 0 0 2rem;
		font-size: var(--text-sm);
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--color-text-tertiary);
	}
	section {
		margin-bottom: 2rem;
	}
	.where {
		margin: 0 0 0.3rem;
		font-size: var(--text-sm);
		color: var(--color-text-tertiary);
	}
	.para {
		position: relative;
		margin: 0;
		padding-left: 3.5rem;
		font-family: Georgia, 'Noto Serif', 'Times New Roman', serif;
		font-size: 1.05rem;
		line-height: 1.65;
	}
	.para :global(*) {
		font-family: inherit;
	}
	.n {
		position: absolute;
		left: 0;
		width: 3rem;
		text-align: right;
		font-family: Helvetica, Arial, 'Noto Sans', sans-serif;
		font-size: var(--text-sm);
		font-variant-numeric: tabular-nums;
		color: var(--color-text-tertiary);
		text-decoration: none;
		line-height: 1.9;
	}
	.n:hover,
	.n:focus-visible {
		color: var(--color-primary);
	}
	article :global(a.ref) {
		color: inherit;
		text-decoration: none;
		border-bottom: 1px dotted color-mix(in srgb, var(--red) 45%, transparent);
	}
	article :global(a.ref:hover) {
		color: var(--red);
		border-bottom-style: solid;
	}

	.around {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		margin-top: 3rem;
		padding-top: 1rem;
		border-top: 1px solid var(--color-border);
		font-size: var(--text-sm);
	}
	.next {
		text-align: right;
	}

	@media (max-width: 560px) {
		.para {
			padding-left: 0;
		}
		.n {
			position: static;
			display: inline;
			width: auto;
			margin-right: 0.5ch;
		}
	}
</style>
