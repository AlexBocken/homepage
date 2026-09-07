<script lang="ts">
	/**
	 * A book's own page, at /bibel/<book> without a chapter: the translator's
	 * introduction in the reader's chosen translation, the commentaries on the
	 * whole book (prefaces), and the way into its chapters. When the chosen
	 * translation has no introduction (the Vulgate never has one) the page
	 * lists instead who comments on the book and where, or says that no one
	 * does and points to the first chapter.
	 */
	import { resolve } from '$app/paths';
	import FatherAvatar from './FatherAvatar.svelte';
	import { fatherById, fatherLabel, type Father } from '$lib/faith/fathers';
	import { authorShown, type BiblePrefs, type Translation } from '$lib/faith/biblePrefs';
	import { m, type FaithLang } from '$lib/js/faithI18n';
	import type { BookPage } from '$lib/server/bibleBooks';
	import type { BookAuthor, ChapterAuthor } from '$lib/server/commentary';

	interface Props {
		lang: FaithLang;
		faithLang: string;
		bibleLang: string;
		page: BookPage;
		/** Authors with a preface to the book. */
		bookAuthors: ChapterAuthor[];
		/** Everyone who comments anywhere in the book. */
		coverage: BookAuthor[];
		prefs: BiblePrefs;
	}
	const { lang, faithLang, bibleLang, page, bookAuthors, coverage, prefs }: Props = $props();
	const t = $derived(m[lang]);
	const book = $derived(page.book);
	// The translation the reader chose, falling back as the reader does.
	const tr = $derived<Translation>(prefs.tr === 'drb' && !page.has.english ? 'allioli' : prefs.tr === 'vulgata' && !page.has.latin ? 'allioli' : prefs.tr);
	const trLabel = $derived(tr === 'allioli' ? 'Allioli 1914' : tr === 'vulgata' ? 'Vulgata Clementina' : 'Douay-Rheims 1899');
	const heading = $derived(tr === 'drb' ? (book.canon?.en ?? book.name) : tr === 'vulgata' ? (book.canon?.la ?? book.name) : book.name);
	const intro = $derived(tr === 'drb' ? (page.intro.en ? { title: page.intro.en.title, text: page.intro.en.text, lang: 'en' } : null) : tr === 'allioli' && page.intro.de ? { title: t.bible_book_intro, text: page.intro.de, lang: 'de' } : null);
	const paras = (text: string) => text.split(/\n{2,}/).filter((p) => p.trim());

	const chapterHref = (ch: number) => resolve('/[faithLang=faithLang]/[bible=bibleLang]/[book]/[[chapter]]', { faithLang, bible: bibleLang, book: book.slug, chapter: String(ch) });
	const pageHref = (author: string, ch: number) => resolve('/[faithLang=faithLang]/[bible=bibleLang]/[book]/[chapter]/kommentar/[author]', { faithLang, bible: bibleLang, book: book.slug, chapter: String(ch), author });
	const prefaceHref = (author: string) => resolve('/[faithLang=faithLang]/[bible=bibleLang]/[book]/kommentar/[author]', { faithLang, bible: bibleLang, book: book.slug, author });
	const bioHref = (author: string) => resolve('/[faithLang=faithLang]/[bible=bibleLang]/patres/[author]', { faithLang, bible: bibleLang, author });
	const chapters = $derived(Array.from({ length: book.chapters }, (_, i) => i + 1));
	// The prefaces the reader's author choice lets through, as discs.
	const prefaces = $derived(prefs.fathers ? bookAuthors.filter((a) => authorShown(prefs.authors, a.group, a.id)) : []);
	const lite = (id: string, name: string): Pick<Father, 'name' | 'saint' | 'portrait'> => fatherById(id) ?? { name: { en: name, de: name }, saint: false };
</script>

<article class="book" lang={tr === 'drb' ? 'en' : tr === 'vulgata' ? 'la' : 'de'}>
	<header class="head">
		<p class="kicker" {lang}>{book.canon?.[lang] ?? book.name} · {trLabel}</p>
		<h1>{heading}</h1>
		<nav class="chapters" aria-label={t.bible_chapter} {lang}>
			<a class="first" href={chapterHref(1)}>{t.bible_book_read_first} ›</a>
			<ol>
				{#each chapters as c (c)}<li><a href={chapterHref(c)}>{c}</a></li>{/each}
			</ol>
		</nav>
	</header>

	{#if intro}
		<section class="section intro" lang={intro.lang}>
			<h2>{intro.title}</h2>
			{#each paras(intro.text) as para, i (i)}<p>{para}</p>{/each}
		</section>
		{#if prefaces.length}
			<section class="section" {lang}>
				<h2>{t.bible_book_commentaries}</h2>
				<ul class="discs">
					{#each prefaces as a (a.id)}
						{@const fa = lite(a.id, a.name)}
						<li>
							<a class="disc" href={prefaceHref(a.id)}>
								<FatherAvatar id={a.id} name={fa.name.en} hasPortrait={!!fa.portrait} size={36} />
								<span><b>{fatherLabel(fa, lang)}</b>{#if a.work}<small>{a.work}</small>{/if}</span>
							</a>
						</li>
					{/each}
				</ul>
			</section>
		{/if}
	{:else}
		<p class="none" {lang}>{t.bible_book_no_intro}</p>
		{#if coverage.length}
			<section class="section" {lang}>
				<h2>{t.bible_book_commentaries}</h2>
				<ul class="who">
					{#each coverage as a (a.id)}
						<li>
							<a class="row" href={bioHref(a.id)}>
								<FatherAvatar id={a.id} name={a.name.en} hasPortrait={a.hasPortrait} size={32} />
								<span class="name"><b>{fatherLabel(a, lang)}</b><small>{a.died ? `${t.bible_died} ${a.died} · ` : ''}{a.n} {t.bible_entries}</small></span>
							</a>
							{#if a.intro || a.chapters.length}
								<span class="pages">
									{#if a.intro}<a class="chip" href={prefaceHref(a.id)}>{t.bible_intro_short}</a>{/if}
									{#each a.chapters as c (c)}<a class="chip" href={pageHref(a.id, c)}>{c}</a>{/each}
								</span>
							{/if}
						</li>
					{/each}
				</ul>
			</section>
		{:else}
			<p class="none" {lang}>{t.bible_book_none} <a href={chapterHref(1)}>{t.bible_book_read_first} ›</a></p>
		{/if}
	{/if}
</article>

<style>
	.book {
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
	.book :global(*) { font-family: inherit; }
	.head { margin-bottom: 2rem; }
	.kicker { margin: 0 0 0.25rem; font-family: var(--font-ui); font-size: 0.82rem; color: var(--color-text-secondary); }
	h1 { margin: 0 0 1rem; font-weight: 400; font-size: 2.4rem; line-height: 1.1; text-wrap: balance; }
	.chapters { display: flex; flex-direction: column; gap: 0.75rem; font-family: var(--font-ui); }
	.chapters .first { align-self: flex-start; padding: 0.5rem 1.1rem; border-radius: var(--radius-pill); background: var(--rubric); color: white; text-decoration: none; font-weight: 600; font-size: 0.9rem; }
	.chapters .first:hover { filter: brightness(1.08); }
	.chapters ol { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 0.3rem; }
	.chapters ol a { display: inline-block; min-width: 2.1rem; text-align: center; padding: 0.25rem 0.4rem; border-radius: var(--radius-sm); font-size: 0.86rem; color: var(--rubric); background: color-mix(in srgb, var(--red) 9%, transparent); text-decoration: none; }
	.chapters ol a:hover { background: color-mix(in srgb, var(--red) 20%, transparent); }
	.section { margin: 0 0 2rem; }
	.section h2 { font-weight: 400; font-size: 1.25rem; margin: 0 0 0.5rem; color: var(--rubric); }
	.section p { margin: 0 0 0.9rem; }
	.none { font-family: var(--font-ui); font-size: 0.9rem; color: var(--color-text-secondary); margin: 0 0 1.5rem; }
	.none a { color: var(--rubric); text-decoration: none; font-weight: 600; }
	.discs { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 0.5rem 1rem; }
	.disc { display: inline-flex; align-items: center; gap: 0.6rem; padding: 0.35rem 0.8rem 0.35rem 0.4rem; border: 1px solid var(--color-border); border-radius: var(--radius-pill); color: inherit; text-decoration: none; }
	.disc:hover { border-color: var(--rubric); }
	.disc span { display: flex; flex-direction: column; line-height: 1.2; }
	.disc b { font-weight: 400; }
	.disc small { font-family: var(--font-ui); font-size: 0.72rem; color: var(--color-text-secondary); }
	.who { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.35rem; }
	.who li { display: flex; flex-wrap: wrap; align-items: center; gap: 0.3rem 0.8rem; }
	.row { display: inline-flex; align-items: center; gap: 0.6rem; color: inherit; text-decoration: none; padding: 0.2rem 0.4rem; margin-left: -0.4rem; border-radius: var(--radius-md); }
	.row:hover { background: var(--color-bg-secondary); }
	.name { display: flex; flex-direction: column; line-height: 1.2; }
	.name b { font-weight: 400; }
	.name small { font-family: var(--font-ui); font-size: 0.72rem; color: var(--color-text-secondary); }
	.pages { display: inline-flex; flex-wrap: wrap; gap: 0.2rem; font-family: var(--font-ui); font-size: 0.74rem; }
	.chip { color: var(--rubric); text-decoration: none; padding: 0 0.35rem; border-radius: var(--radius-sm); background: color-mix(in srgb, var(--red) 10%, transparent); }
	.chip:hover { background: color-mix(in srgb, var(--red) 22%, transparent); }
	@media (max-width: 560px) {
		h1 { font-size: 1.9rem; }
	}
</style>
