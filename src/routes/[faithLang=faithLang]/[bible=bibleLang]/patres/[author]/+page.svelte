<script lang="ts">
	import { resolve } from '$app/paths';
	import Seo from '$lib/components/Seo.svelte';
	import FatherAvatar from '$lib/components/faith/bible/FatherAvatar.svelte';
	import { fatherLabel, portraitUrl } from '$lib/faith/fathers';
	import { bookName } from '$lib/faith/bibleCanon';
	import { m, type FaithLang } from '$lib/js/faithI18n';
	import type { PageProps } from './$types';

	const { data }: PageProps = $props();
	const lang = $derived(data.lang as FaithLang);
	const t = $derived(m[lang]);
	const fa = $derived(data.father);
	const bio = $derived(data.bio);
	const label = $derived(fatherLabel(fa, lang));
	const groupLabel = $derived(fa.group === 'father' ? t.bible_father_group_father : fa.group === 'medieval' ? t.bible_father_group_medieval : t.bible_father_group_modern);
	const indexHref = $derived(resolve('/[faithLang=faithLang]/[bible=bibleLang]/patres', { faithLang: data.faithLang, bible: data.bibleLang }));
	const chapterHref = (slug: string, ch: number) => resolve('/[faithLang=faithLang]/[bible=bibleLang]/[book]/[[chapter]]', { faithLang: data.faithLang, bible: data.bibleLang, book: slug, chapter: String(ch) });
	const pageHref = (slug: string, ch: number) =>
		resolve('/[faithLang=faithLang]/[bible=bibleLang]/[book]/[chapter]/kommentar/[author]', { faithLang: data.faithLang, bible: data.bibleLang, book: slug, chapter: String(ch), author: fa.id });
	type Section = { key: string; heading: string; text: string };
	const sections = $derived.by((): Section[] => {
		if (!bio) return [];
		const all: [string, string, string | undefined][] = [
			['life', t.bible_bio_life, bio.life],
			['teaching', t.bible_bio_teaching, bio.teaching],
			['church', t.bible_bio_church, bio.church],
			['particular', t.bible_bio_particular, bio.particular]
		];
		return all.flatMap(([key, heading, text]) => (text ? [{ key, heading, text }] : []));
	});
	const paras = (text: string) => text.split(/\n{2,}/);
	const description = $derived(bio ? `${label}, ${bio.dates}. ${paras(bio.life)[0].slice(0, 160)}…` : `${label}: ${groupLabel}`);
</script>

<Seo title={`${label} — ${t.bible_fathers_index} — Bocken`} {description} {lang} ogType="article" ogImage={fa.portrait ? portraitUrl(fa.id, 192) : undefined} />

<article class="bio" lang={bio?.lang ?? lang}>
	<header class="head">
		<FatherAvatar id={fa.id} name={fa.name.en} hasPortrait={!!fa.portrait} size={112} />
		<div class="who">
			<p class="kicker" lang={lang}><a href={indexHref}>{t.bible_fathers_index}</a></p>
			<h1>{label}</h1>
			{#if bio}<p class="dates">{bio.dates}</p>{/if}
			<p class="meta" lang={lang}>{groupLabel}{fa.died && !bio ? ` · ${t.bible_died} ${fa.died}` : ''}{bio?.titles ? ` · ${bio.titles}` : ''}</p>
		</div>
	</header>

	{#if bio && bio.lang !== lang && lang !== 'en'}<p class="lang-note" lang={lang}>{t.bible_bio_lang_note}</p>{/if}

	{#if bio}
		{#each sections as sec (sec.key)}
			<section class="section" id={sec.key}>
				{#if sections.length > 1}<h2 lang={lang}>{sec.heading}</h2>{/if}
				{#each paras(sec.text) as para, i (i)}<p>{para}</p>{/each}
			</section>
		{/each}
		{#if bio.feast}
			<p class="feast"><span lang={lang}>{t.bible_bio_feast}:</span> {bio.feast}</p>
		{/if}
	{:else}
		<p class="none" lang={lang}>{t.bible_bio_none}</p>
	{/if}

	{#if data.books.length}
		<section class="section reader" lang={lang}>
			<h2>{t.bible_bio_in_reader}</h2>
			<p class="sum">{data.total} {t.bible_entries}</p>
			<ul class="books">
				{#each data.books as b (b.slug)}
					<li>
						<a class="book" href={chapterHref(b.slug, b.chapters[0] ?? 1)}>{bookName(b.slug, lang)}</a>
						{#if b.n}<small>{b.n} {t.bible_entries}</small>{/if}
						{#if b.chapters.length}
							<span class="chapters">
								{#each b.chapters as c (c)}<a href={pageHref(b.slug, c)}>{c}</a>{/each}
							</span>
						{/if}
					</li>
				{/each}
			</ul>
		</section>
	{/if}

	{#if bio?.sources.length}
		<section class="section sources" lang="en">
			<h2 lang={lang}>{t.bible_bio_sources}</h2>
			<ul>
				{#each bio.sources as s (s.url)}<li><a href={s.url} rel="noopener">{s.label}</a></li>{/each}
			</ul>
		</section>
	{/if}
	{#if fa.portrait}<p class="credit" lang={lang}>{t.bible_portrait_credit}: {fa.portrait.artist}, {fa.portrait.title}, {fa.portrait.year}</p>{/if}
</article>

<style>
	.bio {
		--serif: 'Linux Libertine', Georgia, 'Times New Roman', serif;
		--font-ui: Helvetica, Arial, 'Noto Sans', sans-serif;
		--rubric: var(--red);
		max-width: 42rem;
		margin: 0 auto;
		padding: 1.5rem 1.25rem 4rem;
		font-family: var(--serif);
		font-size: 1.0625rem;
		line-height: 1.65;
		color: var(--color-text-primary);
	}
	.bio :global(*) { font-family: inherit; }
	.head { display: flex; align-items: center; gap: 1.5rem; margin-bottom: 2rem; }
	.who { display: flex; flex-direction: column; gap: 0.15rem; min-width: 0; }
	.kicker, .meta { margin: 0; font-family: var(--font-ui); font-size: 0.82rem; color: var(--color-text-secondary); }
	.kicker a { color: var(--rubric); text-decoration: none; }
	h1 { margin: 0; font-weight: 400; font-size: 2.1rem; line-height: 1.15; text-wrap: balance; }
	.dates { margin: 0; font-size: 1rem; color: var(--color-text-secondary); }
	.lang-note, .none { font-family: var(--font-ui); font-size: 0.82rem; color: var(--color-text-tertiary); margin: 0 0 1.5rem; }
	.section { margin: 0 0 2rem; }
	.section h2 { font-weight: 400; font-size: 1.25rem; margin: 0 0 0.5rem; color: var(--rubric); }
	.section p { margin: 0 0 0.9rem; }
	.feast { margin: -0.75rem 0 2rem; font-family: var(--font-ui); font-size: 0.86rem; color: var(--color-text-secondary); }
	.feast span { color: var(--rubric); }
	.reader .sum { font-family: var(--font-ui); font-size: 0.82rem; color: var(--color-text-secondary); margin: 0 0 0.5rem; }
	.books { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.3rem; }
	.books li { display: flex; flex-wrap: wrap; align-items: baseline; gap: 0.25rem 0.6rem; }
	.books .book { color: var(--color-text-primary); text-decoration: none; border-bottom: 1px dotted var(--color-border); }
	.books .book:hover { color: var(--rubric); border-bottom-color: currentColor; }
	.books small { font-family: var(--font-ui); font-size: 0.74rem; color: var(--color-text-secondary); }
	.chapters { display: inline-flex; flex-wrap: wrap; gap: 0.2rem; font-family: var(--font-ui); font-size: 0.74rem; }
	.chapters a { color: var(--rubric); text-decoration: none; padding: 0 0.3rem; border-radius: var(--radius-sm); background: color-mix(in srgb, var(--red) 10%, transparent); }
	.chapters a:hover { background: color-mix(in srgb, var(--red) 22%, transparent); }
	.sources ul { margin: 0; padding-left: 1.1rem; font-family: var(--font-ui); font-size: 0.82rem; line-height: 1.6; }
	.sources a { color: var(--color-text-secondary); }
	.sources a:hover { color: var(--rubric); }
	.credit { font-family: var(--font-ui); font-size: 0.74rem; color: var(--color-text-tertiary); margin: 2rem 0 0; }
	@media (max-width: 560px) {
		.head { gap: 1rem; }
		h1 { font-size: 1.7rem; }
	}
</style>
