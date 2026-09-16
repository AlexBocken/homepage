<script lang="ts">
	import { resolve } from '$app/paths';
	import Seo from '$lib/components/Seo.svelte';
	import { m, type FaithLang } from '$lib/js/faithI18n';
	import { AUTHORS, authorLabel, kindLabel } from '$lib/faith/magisteriumLabels';
	import type { PageProps } from './$types';

	const { data }: PageProps = $props();
	const lang = $derived(data.lang as FaithLang);
	const t = $derived(m[lang]);

	const docHref = (slug: string) =>
		resolve('/[faithLang=faithLang]/[magisterium=magisteriumLang]/[slug=magisteriumSlug]/[[article]]', {
			faithLang: data.faithLang,
			magisterium: data.magisterium,
			slug,
			article: undefined
		});

	/** By who issued it, oldest office first, and newest document first inside. */
	const groups = $derived(
		AUTHORS.map((author) => ({
			author,
			documents: data.documents.filter((d) => d.author === author).sort((a, b) => a.date.localeCompare(b.date))
		})).filter((g) => g.documents.length)
	);
</script>

<Seo title={`${t.magisterium_title} — Bocken`} description={t.magisterium_description} lang={lang} />

<article>
	<header>
		<h1>{t.magisterium_title}</h1>
		<p class="lead">{t.magisterium_description}</p>
	</header>

	{#each groups as group (group.author)}
		<section>
			<h2>{authorLabel(t, group.author)}</h2>
			<ul>
				{#each group.documents as doc (doc.slug)}
					<li>
						<a href={docHref(doc.slug)} aria-label={doc.title}>
							<span class="name">
								<b>{doc.title}</b>
								<span class="sub">{kindLabel(t, doc.kind)}</span>
							</span>
							<span class="meta">
								<span class="year">{doc.date.slice(0, 4)}</span>
								<!-- Which languages this one exists in: the corpus is ragged,
								     and it is fairer to say so on the way in than after a click.
								     One set without article numbers is marked, since a citation
								     of an article cannot be answered out of it. -->
								<span class="langs">
									{#each doc.langs as l, i (l)}{#if i}<span class="dot"> · </span>{/if}<span
											class="lang"
											class:loose={!doc.numbered.includes(l)}
											title={doc.numbered.includes(l) ? null : t.magisterium_unnumbered}>{l.toUpperCase()}</span
										>{/each}
								</span>
							</span>
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
		grid-template-columns: 1fr auto;
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
		display: grid;
		justify-items: end;
		gap: 0.15rem;
		font-size: var(--text-sm);
		font-variant-numeric: tabular-nums;
		color: var(--color-text-tertiary);
		white-space: nowrap;
	}
	.langs {
		letter-spacing: 0.06em;
		font-size: var(--text-xs);
	}
	/* An edition with no article numbers in it: readable, not citable. */
	.lang.loose {
		text-decoration: underline dotted;
		text-underline-offset: 0.2em;
		opacity: 0.7;
	}

	footer {
		margin-top: 3rem;
		text-align: center;
		font-size: var(--text-sm);
		color: var(--color-text-tertiary);
	}
</style>
