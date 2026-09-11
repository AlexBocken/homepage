<script lang="ts">
	import { resolve } from '$app/paths';
	import Seo from '$lib/components/Seo.svelte';
	import CatechismReader from '$lib/components/faith/ccc/CatechismReader.svelte';
	import { m, type FaithLang } from '$lib/js/faithI18n';
	import type { PageProps } from './$types';

	const { data }: PageProps = $props();
	const lang = $derived(data.lang as FaithLang);
	const t = $derived(m[lang]);

	const sectionHref = (id: string) => resolve('/[faithLang=faithLang]/[catechism=catechismLang]/[ref=cccRef]', { faithLang: data.faithLang, catechism: data.catechism, ref: id });
	const indexHref = $derived(resolve('/[faithLang=faithLang]/[catechism=catechismLang]', { faithLang: data.faithLang, catechism: data.catechism }));

	/** The first lines of the section, for a search engine and a link preview. */
	const summary = $derived(
		data.section.blocks
			.filter((b) => b.t === 'p')
			.slice(0, 2)
			.map((b) => (b.t === 'p' ? b.html.replace(/<[^>]+>/g, '') : ''))
			.join(' ')
			.slice(0, 300)
	);
</script>

<Seo title={`${data.section.title} — ${t.ccc_title}`} description={summary} lang={lang} ogType="article" />

<div class="page">
	<p class="up"><a href={indexHref}>{t.ccc_contents}</a></p>

	<CatechismReader {lang} faithLang={data.faithLang} section={data.section} highlight={data.highlight} />

	<nav class="around" aria-label={t.ccc_contents}>
		{#if data.prev}
			<a class="prev" href={sectionHref(data.prev.id)}>
				<span class="dir">← {t.ccc_prev}</span>
				<span class="name">{data.prev.title}</span>
			</a>
		{:else}<span></span>{/if}
		{#if data.next}
			<a class="next" href={sectionHref(data.next.id)}>
				<span class="dir">{t.ccc_next} →</span>
				<span class="name">{data.next.title}</span>
			</a>
		{/if}
	</nav>

	<footer><p>{t.ccc_copyright}</p></footer>
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

	.around {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
		max-width: 46rem;
		margin: 3.5rem auto 0;
	}
	.around a {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		padding: 1rem;
		background: var(--color-surface);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-sm);
		color: inherit;
		text-decoration: none;
		transition: scale var(--transition-fast), box-shadow var(--transition-fast);
	}
	.around a:hover,
	.around a:focus-visible {
		scale: 1.02;
		box-shadow: var(--shadow-hover);
	}
	.next {
		text-align: right;
	}
	.dir {
		font-size: var(--text-sm);
		color: var(--color-text-tertiary);
	}
	.name {
		line-height: 1.35;
	}

	footer {
		margin-top: 3rem;
		text-align: center;
		font-size: var(--text-sm);
		color: var(--color-text-tertiary);
	}

	@media (max-width: 560px) {
		.around {
			grid-template-columns: 1fr;
		}
		.next {
			text-align: left;
		}
	}
</style>
