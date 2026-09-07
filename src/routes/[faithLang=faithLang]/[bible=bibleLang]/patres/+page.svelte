<script lang="ts">
	import { resolve } from '$app/paths';
	import Seo from '$lib/components/Seo.svelte';
	import FatherAvatar from '$lib/components/faith/bible/FatherAvatar.svelte';
	import { fatherLabel } from '$lib/faith/fathers';
	import { m, type FaithLang } from '$lib/js/faithI18n';
	import type { PageProps } from './$types';

	const { data }: PageProps = $props();
	const lang = $derived(data.lang as FaithLang);
	const t = $derived(m[lang]);
	const bioHref = (id: string) => resolve('/[faithLang=faithLang]/[bible=bibleLang]/patres/[author]', { faithLang: data.faithLang, bible: data.bibleLang, author: id });
	const bibleHref = $derived(resolve('/[faithLang=faithLang]/[bible=bibleLang]', { faithLang: data.faithLang, bible: data.bibleLang }));
	const groups = $derived([
		{ key: 'father', label: t.bible_authors_group_fathers, items: data.groups.father },
		{ key: 'medieval', label: t.bible_authors_group_medievals, items: data.groups.medieval },
		{ key: 'modern', label: t.bible_authors_group_moderns, items: data.groups.modern }
	]);
</script>

<Seo title={`${t.bible_fathers_index} — ${t.bible_title} — Bocken`} description={t.bible_fathers_index_intro} {lang} />

<article class="patres">
	<header class="head">
		<p class="kicker"><a href={bibleHref}>{t.bible_title}</a></p>
		<h1>{t.bible_fathers_index}</h1>
		<p class="intro">{t.bible_fathers_index_intro}</p>
	</header>

	{#each groups as g (g.key)}
		{#if g.items.length}
			<section class="group">
				<h2>{g.label}</h2>
				<ul class="list">
					{#each g.items as a (a.id)}
						<li>
							<a href={bioHref(a.id)} class="row" class:thin={!a.hasBio}>
								<FatherAvatar id={a.id} name={a.name.en} hasPortrait={a.hasPortrait} size={44} />
								<span class="who">
									<b>{fatherLabel(a, lang)}</b>
									<small>{a.died ? `${t.bible_died} ${a.died} · ` : ''}{a.n} {t.bible_entries}</small>
								</span>
							</a>
						</li>
					{/each}
				</ul>
			</section>
		{/if}
	{/each}
</article>

<style>
	.patres {
		--serif: 'Linux Libertine', Georgia, 'Times New Roman', serif;
		--font-ui: Helvetica, Arial, 'Noto Sans', sans-serif;
		--rubric: var(--red);
		max-width: 46rem;
		margin: 0 auto;
		padding: 1.5rem 1.25rem 4rem;
		font-family: var(--serif);
		color: var(--color-text-primary);
	}
	.patres :global(*) { font-family: inherit; }
	.head { margin-bottom: 2rem; }
	.kicker { margin: 0 0 0.25rem; font-family: var(--font-ui); font-size: 0.82rem; color: var(--color-text-secondary); }
	.kicker a { color: var(--rubric); text-decoration: none; }
	h1 { margin: 0 0 0.5rem; font-weight: 400; font-size: 2.1rem; line-height: 1.15; text-wrap: balance; }
	.intro { margin: 0; font-size: 1.05rem; line-height: 1.55; color: var(--color-text-secondary); max-width: 34rem; }
	.group { margin: 0 0 2.25rem; }
	.group h2 { font-weight: 400; font-size: 1.15rem; color: var(--rubric); margin: 0 0 0.75rem; padding-bottom: 0.35rem; border-bottom: 1px solid var(--color-border); }
	.list { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(15rem, 1fr)); gap: 0.25rem 1.5rem; }
	.row { display: flex; align-items: center; gap: 0.7rem; padding: 0.4rem 0.5rem; margin: 0 -0.5rem; border-radius: var(--radius-md); color: inherit; text-decoration: none; transition: background var(--transition-fast); }
	.row:hover { background: var(--color-bg-secondary); }
	.row:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 1px; }
	.row.thin b { font-weight: 400; }
	.who { display: flex; flex-direction: column; min-width: 0; line-height: 1.25; }
	.who b { font-weight: 500; }
	.who small { font-family: var(--font-ui); font-size: 0.74rem; color: var(--color-text-secondary); }
</style>
