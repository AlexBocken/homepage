<script lang="ts">
	/**
	 * One commentator's text on one chapter, or his preface to a book
	 * (chapter 0): the page behind the discs at a chapter's head and on the
	 * book's page. Both routes render this with the same data shape.
	 */
	import { resolve } from '$app/paths';
	import Seo from '$lib/components/Seo.svelte';
	import FatherAvatar from './FatherAvatar.svelte';
	import { fatherLabel, portraitUrl } from '$lib/faith/fathers';
	import { m, type FaithLang } from '$lib/js/faithI18n';
	import type { Entry } from '$lib/server/commentary';
	import type { FatherGroup } from '$lib/faith/fathers';

	export type CommentaryPageData = {
		lang: string;
		faithLang: string;
		bibleLang: string;
		slug: string;
		/** 0 for a preface to the book. */
		chapter: number;
		bookName: string;
		father: { id: string; name: { en: string; de: string }; saint: boolean; died: number | null; group: FatherGroup; portrait: { artist: string; title: string; year: string } | null };
		entries: Entry[];
		intro: Entry[];
		prev: number | null;
		next: number | null;
	};
	const { data }: { data: CommentaryPageData } = $props();
	const lang = $derived(data.lang as FaithLang);
	const t = $derived(m[lang]);
	const fa = $derived(data.father);
	const label = $derived(fatherLabel(fa, lang));
	const isPreface = $derived(data.chapter === 0);
	const groupLabel = $derived(fa.group === 'father' ? t.bible_father_group_father : fa.group === 'medieval' ? t.bible_father_group_medieval : t.bible_father_group_modern);
	const work = $derived(data.entries[0]?.work ?? data.intro[0]?.work ?? null);
	const chapterHref = (ch: number, verse?: number) =>
		resolve('/[faithLang=faithLang]/[bible=bibleLang]/[book]/[[chapter]]', { faithLang: data.faithLang, bible: data.bibleLang, book: data.slug, chapter: ch > 0 ? String(ch) : undefined }) + (verse ? `#${verse}` : '');
	const pageHref = (ch: number) =>
		resolve('/[faithLang=faithLang]/[bible=bibleLang]/[book]/[chapter]/kommentar/[author]', { faithLang: data.faithLang, bible: data.bibleLang, book: data.slug, chapter: String(ch), author: fa.id });
	const range = (e: { verse: number; verseEnd: number | null }) => (e.verse === 0 ? '' : e.verseEnd ? `${e.verse}–${e.verseEnd}` : String(e.verse));
	const allEnglish = $derived(lang !== 'en' && [...data.entries, ...data.intro].every((e) => e.lang === 'en'));
	const bioHref = $derived(resolve('/[faithLang=faithLang]/[bible=bibleLang]/patres/[author]', { faithLang: data.faithLang, bible: data.bibleLang, author: fa.id }));
	const where = $derived(isPreface ? data.bookName : `${data.bookName} ${data.chapter}`);
	const title = $derived(`${where} · ${label}`);
	// NPNF sections open with the printed reference ("John iii. 5"); the heading already says it.
	const paragraphs = (text: string) => {
		const ps = text.split(/\n{2,}/);
		return ps.length > 1 && /^[A-Z][a-z]+\.? [ivxlc]+\.? ?\d[\d, .]*$/i.test(ps[0].trim()) ? ps.slice(1) : ps;
	};
</script>

<Seo title={`${title} — ${t.bible_title} — Bocken`} description={`${t.bible_commentary_by} ${label}: ${where}${work ? ` (${work})` : ''}`} {lang} ogType="article" ogImage={fa.portrait ? portraitUrl(fa.id, 192) : undefined} />

<article class="commentary">
	<header class="head">
		<p class="kicker"><a href={chapterHref(data.chapter)}>{where}</a> · {isPreface ? t.bible_book_intro : t.bible_commentary}</p>
		<a class="who-link" href={bioHref} title={t.bible_bio_about}>
			<FatherAvatar id={fa.id} name={fa.name.en} hasPortrait={!!fa.portrait} size={96} />
			<div class="who">
				<h1>{label}</h1>
				<p class="meta">{groupLabel}{fa.died ? ` · ${t.bible_died} ${fa.died}` : ''}{work ? ` · ${work}` : ''}</p>
			</div>
		</a>
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

	<nav class="foot" aria-label={t.bible_chapter}>
		{#if data.prev}<a href={pageHref(data.prev)}>‹ {data.bookName} {data.prev}</a>{:else}<span></span>{/if}
		<a class="back" href={chapterHref(data.chapter)}>{isPreface ? `${t.bible_back_to_book}` : t.bible_back_to_chapter}</a>
		{#if data.next}<a href={pageHref(data.next)}>{data.bookName} {data.next} ›</a>{:else if isPreface}<a href={chapterHref(1)}>{data.bookName} 1 ›</a>{/if}
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
	.head { display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 1.5rem; }
	/* The whole card leads to the commentator's life. */
	.who-link { display: flex; align-items: center; gap: 1.25rem; color: inherit; text-decoration: none; margin: 0 -0.75rem; padding: 0.5rem 0.75rem; border-radius: var(--radius-lg); transition: background var(--transition-fast); }
	.who-link:hover { background: var(--color-bg-secondary); }
	.who-link:hover h1 { color: var(--rubric); }
	.who-link:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 1px; }
	.who { display: flex; flex-direction: column; gap: 0.2rem; min-width: 0; }
	.kicker, .meta { margin: 0; font-family: var(--font-ui); font-size: 0.82rem; color: var(--color-text-secondary); }
	.kicker a { color: var(--rubric); text-decoration: none; }
	h1 { margin: 0; font-weight: 400; font-size: 2rem; line-height: 1.15; text-wrap: balance; transition: color var(--transition-fast); }
	.lang-note { font-family: var(--font-ui); font-size: 0.82rem; color: var(--color-text-tertiary); margin: 0 0 1.5rem; }
	.section { margin: 0 0 2rem; }
	.section h2 { font-weight: 400; font-size: 1.25rem; margin: 0 0 0.5rem; color: var(--rubric); }
	.section h2 a { color: inherit; text-decoration: none; }
	.section h2 a:hover { text-decoration: underline; }
	.section h2 small { font-family: var(--font-ui); font-size: 0.78rem; color: var(--color-text-secondary); }
	.section h3 { font-weight: 400; font-size: 1.05rem; margin: 1rem 0 0.3rem; }
	.section p { margin: 0 0 0.9rem; }
	.foot { display: flex; justify-content: space-between; gap: 1rem; margin-top: 3rem; padding-top: 1.25rem; border-top: 1px solid var(--color-border); font-family: var(--font-ui); font-size: 0.9rem; }
	.foot a { color: var(--color-text-secondary); text-decoration: none; }
	.foot a:hover { color: var(--rubric); }
	.foot .back { color: var(--rubric); }
	.credit { margin-top: 2rem; font-family: var(--font-ui); font-size: 0.72rem; color: var(--color-text-tertiary); }
	@media (max-width: 560px) {
		.who-link { gap: 0.9rem; }
		h1 { font-size: 1.5rem; }
	}
</style>
