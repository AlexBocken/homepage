<script lang="ts">
	import { resolve } from '$app/paths';
	import Seo from '$lib/components/Seo.svelte';
	import CanonReader from '$lib/components/faith/council/CanonReader.svelte';
	import { m, type FaithLang } from '$lib/js/faithI18n';
	import type { PageProps } from './$types';

	const { data }: PageProps = $props();
	const lang = $derived(data.lang as FaithLang);
	const t = $derived(m[lang]);

	const indexHref = $derived(resolve('/[faithLang=faithLang]/[canon=canonLang]', { faithLang: data.faithLang, canon: data.canon }));
	const canonHref = (n: number) => resolve('/[faithLang=faithLang]/[canon=canonLang]/[ref=canonRef]', { faithLang: data.faithLang, canon: data.canon, ref: String(n) });

	const summary = $derived(
		data.section.canons
			.slice(0, 2)
			.map((c) => c.html.replace(/<[^>]+>/g, ''))
			.join(' ')
			.slice(0, 300)
	);
	const title = $derived(data.section.where[data.section.where.length - 1] ?? t.canon_title);
</script>

<Seo title={`${t.canon_canon} ${data.section.asked} — ${t.canon_title}`} description={summary} lang={lang} ogType="article" />

<div class="page">
	<p class="up"><a href={indexHref}>{t.canon_title}</a></p>

	<CanonReader {lang} where={data.section.where} canons={data.section.canons} highlight={data.highlight} />

	<nav class="around" aria-label={title}>
		{#if data.section.previous}
			<a class="prev" href={canonHref(data.section.previous)}><span class="dir">← {t.canon_prev}</span><span class="name">{t.canon_canon} {data.section.previous}</span></a>
		{:else}<span></span>{/if}
		{#if data.section.next}
			<a class="next" href={canonHref(data.section.next)}><span class="dir">{t.canon_next} →</span><span class="name">{t.canon_canon} {data.section.next}</span></a>
		{/if}
	</nav>

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
