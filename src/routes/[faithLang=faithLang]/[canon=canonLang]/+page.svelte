<script lang="ts">
	import { resolve } from '$app/paths';
	import Seo from '$lib/components/Seo.svelte';
	import { m, type FaithLang } from '$lib/js/faithI18n';
	import type { PageProps } from './$types';

	const { data }: PageProps = $props();
	const lang = $derived(data.lang as FaithLang);
	const t = $derived(m[lang]);

	const canonHref = (n: number) => resolve('/[faithLang=faithLang]/[canon=canonLang]/[ref=canonRef]', { faithLang: data.faithLang, canon: data.canon, ref: String(n) });
</script>

<Seo title={`${t.canon_title} — Bocken`} description={t.canon_description} lang={lang} />

<article>
	<header>
		<h1>{t.canon_title}</h1>
		<p class="lead">{t.canon_description}</p>

		<form class="jump" method="GET" action="">
			<label for="canon-jump">{t.canon_search}</label>
			<div class="field">
				<input id="canon-jump" name="n" type="text" inputmode="numeric" autocomplete="off" value={data.asked} placeholder={t.canon_search_placeholder} aria-describedby="canon-jump-hint" />
				<button type="submit">{t.canon_search_go}</button>
			</div>
			<p class="hint" id="canon-jump-hint">{data.notFound ? t.canon_not_found : t.canon_search_hint}</p>
		</form>
	</header>

	<nav aria-label={t.canon_contents}>
		{#each data.books as book (book.title)}
			<section class="book">
				<h2><a href={canonHref(book.first)}>{book.title}</a> <span class="span">{book.first}–{book.last}</span></h2>
				<ul>
					{#each book.titles as division (division.first)}
						<li><a href={canonHref(division.first)}>{division.title}</a> <span class="span">{division.first}–{division.last}</span></li>
					{/each}
				</ul>
			</section>
		{/each}
	</nav>

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

	.jump {
		margin: 1.5rem auto 0;
		max-width: 26rem;
		text-align: left;
	}
	.jump label {
		display: block;
		margin-bottom: 0.35rem;
		font-size: var(--text-sm);
		color: var(--color-text-secondary);
	}
	.field {
		display: flex;
		gap: 0.5rem;
	}
	input {
		flex: 1;
		min-width: 0;
		padding: 0.6rem 0.9rem;
		background: var(--color-bg-tertiary);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-pill);
		color: var(--color-text-primary);
	}
	button {
		padding: 0.6rem 1.1rem;
		background: var(--color-primary);
		color: var(--color-text-on-primary);
		border: none;
		border-radius: var(--radius-pill);
		cursor: pointer;
		transition: background var(--transition-fast);
	}
	button:hover,
	button:focus-visible {
		background: var(--color-primary-hover);
	}
	.hint {
		margin: 0.5rem 0 0;
		font-size: var(--text-sm);
		color: var(--color-text-tertiary);
		line-height: 1.4;
	}

	nav {
		max-width: 46rem;
		margin-inline: auto;
	}
	.book {
		margin-bottom: 2rem;
	}
	h2 {
		margin: 0 0 0.5rem;
		font-size: 1.1rem;
		line-height: 1.3;
	}
	h2 a,
	li a {
		color: inherit;
		text-decoration: none;
		border-bottom: 1px solid transparent;
	}
	h2 a:hover,
	h2 a:focus-visible,
	li a:hover,
	li a:focus-visible {
		color: var(--color-primary);
		border-bottom-color: currentcolor;
	}
	ul {
		list-style: none;
		margin: 0;
		padding: 0 0 0 1rem;
		display: grid;
		gap: 0.2rem;
		border-left: 1px solid var(--color-border);
	}
	li {
		line-height: 1.4;
	}
	.span {
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
</style>
