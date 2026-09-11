<script lang="ts">
	import { resolve } from '$app/paths';
	import Seo from '$lib/components/Seo.svelte';
	import { m, type FaithLang } from '$lib/js/faithI18n';
	import type { PageProps } from './$types';

	const { data }: PageProps = $props();
	const lang = $derived(data.lang as FaithLang);
	const t = $derived(m[lang]);

	const indexHref = $derived(resolve('/[faithLang=faithLang]/katechese/[catechism=catechismLang]', { faithLang: data.faithLang, catechism: data.catechism }));
	const termHref = (term: string) => resolve('/[faithLang=faithLang]/katechese/[catechism=catechismLang]/glossar/[term]', { faithLang: data.faithLang, catechism: data.catechism, term });
</script>

<Seo title={`${t.ccc_glossary} — ${t.ccc_title}`} description={t.ccc_glossary_lead} lang={lang} />

<article>
	<p class="up"><a href={indexHref}>{t.ccc_contents}</a></p>
	<h1>{t.ccc_glossary}</h1>
	<p class="lead">{t.ccc_glossary_lead}</p>

	<ul>
		{#each data.terms as term (term.slug)}
			<li>
				<a href={termHref(term.slug)}>{term.label}</a>
				<span class="refs">{term.defines.slice(0, 4).join(', ')}</span>
			</li>
		{/each}
	</ul>
</article>

<style>
	article {
		max-width: 52rem;
		margin-inline: auto;
		padding-block: 1.5rem 4rem;
		padding-inline: 1rem;
	}
	.up {
		margin: 0 0 1.5rem;
		font-size: var(--text-sm);
	}
	.up a {
		color: var(--color-text-secondary);
		text-decoration: none;
	}
	.up a:hover,
	.up a:focus-visible {
		color: var(--color-primary);
	}
	h1 {
		font-size: var(--text-xl);
		margin: 0 0 0.4rem;
	}
	.lead {
		margin: 0 0 2rem;
		color: var(--color-text-secondary);
		max-width: 50ch;
	}
	ul {
		list-style: none;
		margin: 0;
		padding: 0;
		columns: 2;
		column-gap: 2.5rem;
	}
	li {
		break-inside: avoid;
		margin-bottom: 0.45rem;
		line-height: 1.4;
	}
	li a {
		color: inherit;
		text-decoration: none;
		border-bottom: 1px solid transparent;
	}
	li a:hover,
	li a:focus-visible {
		color: var(--color-primary);
		border-bottom-color: currentcolor;
	}
	.refs {
		margin-left: 0.5ch;
		font-size: var(--text-sm);
		color: var(--color-text-tertiary);
		font-variant-numeric: tabular-nums;
	}

	@media (max-width: 700px) {
		ul {
			columns: 1;
		}
	}
</style>
