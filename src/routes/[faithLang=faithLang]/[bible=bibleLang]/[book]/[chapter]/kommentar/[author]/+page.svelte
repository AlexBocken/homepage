<script lang="ts">
	import { resolve } from '$app/paths';
	import Seo from '$lib/components/Seo.svelte';
	import FatherAvatar from '$lib/components/faith/bible/FatherAvatar.svelte';
	import { fatherLabel, portraitUrl } from '$lib/faith/fathers';
	import { m, type FaithLang } from '$lib/js/faithI18n';
	import type { PageProps } from './$types';

	const { data }: PageProps = $props();
	const lang = $derived(data.lang as FaithLang);
	const t = $derived(m[lang]);
	const fa = $derived(data.father);
	const label = $derived(fatherLabel(fa, lang));
	const groupLabel = $derived(fa.group === 'father' ? t.bible_father_group_father : fa.group === 'medieval' ? t.bible_father_group_medieval : t.bible_father_group_modern);
	const work = $derived(data.entries[0]?.work ?? data.chain[0]?.work ?? data.intro[0]?.work ?? (fa.id === 'aquinas' ? 'Catena Aurea' : null));
	const chapterHref = (ch: number, verse?: number) =>
		resolve('/[faithLang=faithLang]/[bible=bibleLang]/[book]/[[chapter]]', { faithLang: data.faithLang, bible: data.bibleLang, book: data.slug, chapter: String(ch) }) + (verse ? `#${verse}` : '');
	const pageHref = (ch: number) =>
		resolve('/[faithLang=faithLang]/[bible=bibleLang]/[book]/[chapter]/kommentar/[author]', { faithLang: data.faithLang, bible: data.bibleLang, book: data.slug, chapter: String(ch), author: fa.id });
	const range = (e: { verse: number; verseEnd: number | null }) => (e.verse === 0 ? '' : e.verseEnd ? `${e.verse}–${e.verseEnd}` : String(e.verse));
	const allEnglish = $derived(lang !== 'en' && [...data.entries, ...data.chain, ...data.intro].every((e) => e.lang === 'en'));
	// The chain: consecutive entries of one range form a section.
	const chainSections = $derived.by(() => {
		const out: { verse: number; verseEnd: number | null; items: typeof data.chain }[] = [];
		for (const e of data.chain) {
			const last = out[out.length - 1];
			if (last && last.verse === e.verse && last.verseEnd === e.verseEnd) last.items.push(e);
			else out.push({ verse: e.verse, verseEnd: e.verseEnd, items: [e] });
		}
		return out;
	});
	const title = $derived(`${data.bookName} ${data.chapter} · ${label}`);
	// NPNF sections open with the printed reference ("John iii. 5"); the heading already says it.
	const paragraphs = (text: string) => {
		const ps = text.split(/\n{2,}/);
		return ps.length > 1 && /^[A-Z][a-z]+\.? [ivxlc]+\.? ?\d[\d, .]*$/i.test(ps[0].trim()) ? ps.slice(1) : ps;
	};
</script>

<Seo title={`${title} — ${t.bible_title} — Bocken`} description={`${t.bible_commentary_by} ${label}: ${data.bookName} ${data.chapter}${work ? ` (${work})` : ''}`} {lang} ogType="article" ogImage={fa.portrait ? portraitUrl(fa.id, 192) : undefined} />

<article class="commentary">
	<header class="head">
		<FatherAvatar id={fa.id} name={fa.name.en} hasPortrait={!!fa.portrait} size={96} />
		<div class="who">
			<p class="kicker"><a href={chapterHref(data.chapter)}>{data.bookName} {data.chapter}</a> · {t.bible_commentary}</p>
			<h1>{label}</h1>
			<p class="meta">{groupLabel}{fa.died ? ` · ${t.bible_died} ${fa.died}` : ''}{work ? ` · ${work}` : ''}</p>
		</div>
	</header>

	{#if allEnglish}<p class="lang-note">{t.bible_commentary_lang_note}</p>{/if}

	{#if data.intro.length}
		<section class="section">
			<h2>{t.bible_book_intro}</h2>
			{#each data.intro as e, i (i)}
				{#if e.title}<h3>{e.title}</h3>{/if}
				{#each e.text.split(/\n{2,}/) as para, j (j)}<p lang={e.lang}>{para}</p>{/each}
			{/each}
		</section>
	{/if}

	{#each data.entries as e, i (i)}
		<section class="section" id={e.verse ? `v${e.verse}` : undefined}>
			{#if e.verse}
				<h2><a href={chapterHref(data.chapter, e.verse)}>{data.bookName} {data.chapter},{range(e)}</a>{#if e.title && !/^(John|Ver\.)/i.test(e.title)}<small> · {e.title}</small>{/if}</h2>
			{:else if e.title}
				<h2>{e.title}</h2>
			{/if}
			{#each paragraphs(e.text) as para, j (j)}<p lang={e.lang}>{para}</p>{/each}
		</section>
	{/each}

	{#each chainSections as sec, si (si)}
		<section class="section chain" id="v{sec.verse}">
			<h2><a href={chapterHref(data.chapter, sec.verse)}>{data.bookName} {data.chapter},{range(sec)}</a></h2>
			{#each sec.items as e, i (i)}
				{@const ca = data.chainAuthors[e.author]}
				<p lang={e.lang}><span class="speaker"><FatherAvatar id={e.author} name={ca?.name.en ?? e.author} hasPortrait={!!ca?.hasPortrait} size={20} /><b>{ca ? fatherLabel(ca, lang) : e.author}{e.work ? ` (${e.work})` : ''}:</b></span> {e.text}</p>
			{/each}
		</section>
	{/each}

	<nav class="foot" aria-label={t.bible_chapter}>
		{#if data.prev}<a href={pageHref(data.prev)}>‹ {data.bookName} {data.prev}</a>{:else}<span></span>{/if}
		<a class="back" href={chapterHref(data.chapter)}>{t.bible_back_to_chapter}</a>
		{#if data.next}<a href={pageHref(data.next)}>{data.bookName} {data.next} ›</a>{/if}
	</nav>
	{#if fa.portrait}<p class="credit">{t.bible_portrait_credit}: {fa.portrait.artist}, {fa.portrait.title}, {fa.portrait.year}</p>{/if}
</article>

<style>
	.commentary {
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
	.commentary :global(*) { font-family: inherit; }
	.head { display: flex; align-items: center; gap: 1.25rem; margin-bottom: 1.5rem; }
	.who { display: flex; flex-direction: column; gap: 0.2rem; min-width: 0; }
	.kicker, .meta { margin: 0; font-family: var(--font-ui); font-size: 0.82rem; color: var(--color-text-secondary); }
	.kicker a { color: var(--rubric); text-decoration: none; }
	h1 { margin: 0; font-weight: 400; font-size: 2rem; line-height: 1.15; text-wrap: balance; }
	.lang-note { font-family: var(--font-ui); font-size: 0.82rem; color: var(--color-text-tertiary); margin: 0 0 1.5rem; }
	.section { margin: 0 0 2rem; }
	.section h2 { font-weight: 400; font-size: 1.25rem; margin: 0 0 0.5rem; color: var(--rubric); }
	.section h2 a { color: inherit; text-decoration: none; }
	.section h2 a:hover { text-decoration: underline; }
	.section h2 small { font-family: var(--font-ui); font-size: 0.78rem; color: var(--color-text-secondary); }
	.section h3 { font-weight: 400; font-size: 1.05rem; margin: 1rem 0 0.3rem; }
	.section p { margin: 0 0 0.9rem; }
	.chain p { margin: 0 0 0.7rem; }
	.speaker { display: inline-flex; align-items: center; gap: 0.35rem; vertical-align: middle; margin-right: 0.2rem; }
	.speaker b { font-weight: 600; font-size: 0.92em; }
	.foot { display: flex; justify-content: space-between; gap: 1rem; margin-top: 3rem; padding-top: 1.25rem; border-top: 1px solid var(--color-border); font-family: var(--font-ui); font-size: 0.9rem; }
	.foot a { color: var(--color-text-secondary); text-decoration: none; }
	.foot a:hover { color: var(--rubric); }
	.foot .back { color: var(--rubric); }
	.credit { margin-top: 2rem; font-family: var(--font-ui); font-size: 0.72rem; color: var(--color-text-tertiary); }
	@media (max-width: 560px) {
		.head { gap: 0.9rem; }
		h1 { font-size: 1.5rem; }
	}
</style>
