<script lang="ts">
	import { resolve } from '$app/paths';
	import Seo from '$lib/components/Seo.svelte';
	import { m, type FaithLang } from '$lib/js/faithI18n';
	import type { PageProps } from './$types';

	const { data }: PageProps = $props();
	const lang = $derived(data.lang as FaithLang);
	const t = $derived(m[lang]);

	const docHref = (abbr: string) =>
		resolve('/[faithLang=faithLang]/[council=councilLang]/[abbr=councilAbbr]/[[article]]', { faithLang: data.faithLang, council: data.council, abbr: abbr.toLowerCase(), article: undefined });

	const kindOf = (kind: string) => (kind === 'constitution' ? t.council_constitution : kind === 'decree' ? t.council_decree : t.council_declaration);

	/** Constitutions first, as the council's own editions arrange them. */
	const order = ['constitution', 'decree', 'declaration'];
	const groups = $derived(order.map((kind) => ({ kind, documents: data.documents.filter((d) => d.kind === kind) })).filter((g) => g.documents.length));
</script>

<Seo title={`${t.council_title} — Bocken`} description={t.council_description} lang={lang} />

<article>
	<header>
		<h1>{t.council_title}</h1>
		<p class="lead">{t.council_description}</p>
	</header>

	{#each groups as group (group.kind)}
		<section>
			<h2>{kindOf(group.kind)}</h2>
			<ul>
				{#each group.documents as doc (doc.abbr)}
					<li>
						<a href={docHref(doc.abbr)}>
							<span class="abbr">{doc.abbr}</span>
							<span class="name">
								<b>{doc.title}</b>
								{#if doc.subtitle}<span class="sub">{doc.subtitle}</span>{/if}
							</span>
							<span class="meta">{doc.date.slice(0, 4)} · {doc.articles}</span>
						</a>
					</li>
				{/each}
			</ul>
		</section>
	{/each}

	<footer><p>{t.vatican_copyright}</p></footer>
</article>

<style>
	article {
		max-width: 1000px;
		margin-inline: auto;
		padding-block: 1.5rem 4rem;
		padding-inline: 1rem;
	}
	header {
		max-width: 46rem;
		margin: 0 auto 2.5rem;
		text-align: center;
	}
	h1 {
		margin: 0 0 0.5rem;
		font-size: var(--text-2xl);
		line-height: 1.2;
		text-wrap: balance;
	}
	.lead {
		margin: 0;
		color: var(--color-text-secondary);
		line-height: 1.5;
	}

	section {
		max-width: 46rem;
		margin: 0 auto 2.5rem;
	}
	h2 {
		margin: 0 0 0.75rem;
		font-size: var(--text-sm);
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--color-text-secondary);
	}
	ul {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 0.5rem;
	}
	/* app.css colours every link with `a:not(:visited)`, which has exactly the
	   specificity of a Svelte-scoped `a` rule; matching its shape keeps these
	   cards from flickering to link-blue once the page hydrates. */
	a:not(:visited),
	a:visited {
		display: grid;
		grid-template-columns: 3rem 1fr auto;
		align-items: baseline;
		gap: 0.75rem;
		padding: 0.75rem 1rem;
		background: var(--color-surface);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-sm);
		color: inherit;
		text-decoration: none;
		transition: scale var(--transition-fast), box-shadow var(--transition-fast);
	}
	a:hover,
	a:focus-visible {
		scale: 1.02;
		box-shadow: var(--shadow-hover);
	}
	.abbr {
		font-variant-numeric: tabular-nums;
		font-size: var(--text-sm);
		letter-spacing: 0.06em;
		color: var(--color-text-tertiary);
	}
	.name {
		display: grid;
		gap: 0.15rem;
		min-width: 0;
	}
	.sub {
		font-size: var(--text-sm);
		color: var(--color-text-secondary);
		line-height: 1.4;
	}
	.meta {
		font-size: var(--text-sm);
		font-variant-numeric: tabular-nums;
		color: var(--color-text-tertiary);
		white-space: nowrap;
	}

	footer {
		margin-top: 3rem;
		text-align: center;
		font-size: var(--text-sm);
		color: var(--color-text-tertiary);
	}

	@media (max-width: 560px) {
		a {
			grid-template-columns: 2.5rem 1fr;
		}
		.meta {
			grid-column: 2;
		}
	}
</style>
