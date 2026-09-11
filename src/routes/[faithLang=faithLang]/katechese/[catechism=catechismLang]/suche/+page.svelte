<script lang="ts">
	import { resolve } from '$app/paths';
	import Seo from '$lib/components/Seo.svelte';
	import { m, type FaithLang } from '$lib/js/faithI18n';
	import { foldUmlauts } from '$lib/faith/bibleCanon';
	import type { PageProps } from './$types';

	const { data }: PageProps = $props();
	const lang = $derived(data.lang as FaithLang);
	const t = $derived(m[lang]);

	const indexHref = $derived(resolve('/[faithLang=faithLang]/katechese/[catechism=catechismLang]', { faithLang: data.faithLang, catechism: data.catechism }));
	const paragraphHref = (n: number) => resolve('/[faithLang=faithLang]/katechese/[catechism=catechismLang]/[ref=cccRef]', { faithLang: data.faithLang, catechism: data.catechism, ref: String(n) });

	const escape = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

	/**
	 * The paragraph around the first match, with every match marked. The search
	 * folds umlauts, so a query typed on a plain keyboard can match a word the
	 * text spells with one; where that is what happened the marks are left off
	 * rather than put in the wrong place.
	 */
	function snippet(text: string, query: string): string {
		const q = query.trim();
		const at = text.toLowerCase().indexOf(q.toLowerCase());
		if (at < 0) {
			const folded = foldUmlauts(text).indexOf(foldUmlauts(q));
			const head = folded < 0 ? 0 : Math.max(0, folded - 90);
			return `${head ? '… ' : ''}${escape(text.slice(head, head + 260))}${text.length > head + 260 ? ' …' : ''}`;
		}
		const from = Math.max(0, at - 90);
		const cut = escape(text.slice(from, Math.min(text.length, at + 190)));
		const marked = cut.replace(new RegExp(escape(q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), (hit) => `<mark>${hit}</mark>`);
		return `${from ? '… ' : ''}${marked}${at + 190 < text.length ? ' …' : ''}`;
	}
</script>

<Seo title={`${data.q || t.ccc_search} — ${t.ccc_title}`} description={t.ccc_description} lang={lang} />

<article>
	<p class="up"><a href={indexHref}>{t.ccc_contents}</a></p>

	<form class="jump" method="GET" action="">
		<label for="ccc-q">{t.ccc_search}</label>
		<div class="field">
			<input id="ccc-q" name="q" type="search" autocomplete="off" value={data.q} placeholder={t.ccc_search_placeholder} />
			<button type="submit">{t.ccc_search_go}</button>
		</div>
	</form>

	{#if data.q}
		<p class="count">
			{data.hits.length}
			{t.ccc_search_results}
			{#if data.more}<span class="more">· {t.ccc_search_more}</span>{/if}
		</p>
		{#if data.hits.length === 0}
			<p class="none">{t.ccc_search_none}</p>
		{/if}
		<ol class="hits">
			{#each data.hits as hit (hit.n)}
				<li>
					<a href={paragraphHref(hit.n)}>
						<span class="n">{hit.n}</span>
						<span class="body">
							<span class="where">{hit.title}</span>
							<span class="text">{@html snippet(hit.text, data.q)}</span>
						</span>
					</a>
				</li>
			{/each}
		</ol>
	{/if}
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
		border-bottom: 1px solid transparent;
	}
	.up a:hover,
	.up a:focus-visible {
		color: var(--color-primary);
		border-bottom-color: currentcolor;
	}

	.jump label {
		display: block;
		font-size: var(--text-sm);
		color: var(--color-text-secondary);
		margin-bottom: 0.4rem;
	}
	.field {
		display: flex;
		gap: 0.5rem;
	}
	input {
		flex: 1;
		min-width: 0;
		padding: 0.6em 1em;
		font: inherit;
		color: var(--color-text-primary);
		background: var(--color-bg-tertiary);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-pill);
	}
	input:focus-visible {
		outline: 2px solid var(--color-primary);
		outline-offset: 1px;
	}
	button {
		padding: 0.6em 1.4em;
		font: inherit;
		cursor: pointer;
		color: var(--color-text-on-primary);
		background: var(--color-primary);
		border: none;
		border-radius: var(--radius-pill);
		transition: background var(--transition-fast);
	}
	button:hover {
		background: var(--color-primary-hover);
	}

	.count {
		margin: 1.5rem 0 0.5rem;
		font-size: var(--text-sm);
		color: var(--color-text-secondary);
	}
	.more {
		color: var(--color-text-tertiary);
	}
	.none {
		color: var(--color-text-secondary);
	}

	.hits {
		list-style: none;
		margin: 0;
		padding: 0;
	}
	.hits a {
		display: flex;
		gap: 1rem;
		padding: 0.8rem 1rem;
		border-radius: var(--radius-md);
		color: inherit;
		text-decoration: none;
		transition: background var(--transition-fast);
	}
	.hits a:hover,
	.hits a:focus-visible {
		background: var(--color-bg-elevated);
	}
	.hits .n {
		flex: none;
		width: 3rem;
		text-align: right;
		font-variant-numeric: tabular-nums;
		color: var(--color-text-tertiary);
		font-size: var(--text-sm);
		line-height: 1.7;
	}
	.hits .body {
		min-width: 0;
	}
	.hits .where {
		display: block;
		font-size: var(--text-sm);
		color: var(--color-text-tertiary);
	}
	.hits .text {
		display: block;
		font-family: Georgia, 'Noto Serif', 'Times New Roman', serif;
		line-height: 1.55;
	}
	.hits :global(mark) {
		background: color-mix(in srgb, var(--orange) 30%, transparent);
		color: inherit;
		border-radius: 2px;
	}

	@media (max-width: 560px) {
		.hits .n {
			width: 2.5rem;
		}
	}
</style>
