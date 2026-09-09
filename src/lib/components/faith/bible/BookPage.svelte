<script lang="ts">
	/**
	 * A book's own page, at /bibel/<book> without a chapter: the translator's
	 * introduction in the reader's chosen translation (Allioli's with its
	 * footnotes, Challoner's), every commentator's preface to the whole book
	 * in full, and the way into its chapters. With more than one preface a
	 * row of portraits under the title jumps to each. When the chosen
	 * translation has no introduction (the Vulgate never has one, Allioli
	 * introduces the Pentateuch under Genesis) the page lists instead who
	 * comments on the book and where, or says that no one does.
	 */
	import { resolve } from '$app/paths';
	import FatherAvatar from './FatherAvatar.svelte';
	import VerseText from './VerseText.svelte';
	import NoteText from './NoteText.svelte';
	import ReferencePeeks from './ReferencePeeks.svelte';
	import { fatherLabel, type FatherGroup } from '$lib/faith/fathers';
	import { parseReference, bookSlug } from '$lib/faith/bibleText';
	import type { BiblePrefs, Translation } from '$lib/faith/biblePrefs';
	import { m, type FaithLang } from '$lib/js/faithI18n';
	import type { BookPage } from '$lib/server/bibleBooks';
	import type { BookAuthor, Entry } from '$lib/server/commentary';

	type Preface = { author: { id: string; name: { en: string; de: string }; saint: boolean; hasPortrait: boolean; died: number | null; group: FatherGroup }; work: string | null; entries: Entry[] };
	interface Props {
		lang: FaithLang;
		faithLang: string;
		bibleLang: string;
		page: BookPage;
		/** The prefaces to the whole book, in full. */
		prefaces: Preface[];
		/** Everyone who comments anywhere in the book. */
		coverage: BookAuthor[];
		prefs: BiblePrefs;
		/** Signed in: the book's first unread chapter, where its reading continues. */
		firstUnread?: number | null;
	}
	const { lang, faithLang, bibleLang, page, prefaces, coverage, prefs, firstUnread = null }: Props = $props();
	const t = $derived(m[lang]);
	const book = $derived(page.book);
	// The translation the reader chose, falling back as the reader does.
	const tr = $derived<Translation>(prefs.tr === 'drb' && !page.has.english ? 'allioli' : prefs.tr === 'vulgata' && !page.has.latin ? 'allioli' : prefs.tr);
	const trLabel = $derived(tr === 'allioli' ? 'Allioli 1914' : tr === 'vulgata' ? 'Vulgata Clementina' : 'Douay-Rheims 1899');
	const heading = $derived(tr === 'drb' ? (book.canon?.en ?? book.name) : tr === 'vulgata' ? (book.canon?.la ?? book.name) : book.name);
	// The heading names the book as its edition does; the chrome around it — the
	// kicker, the notes' subtitle — names it in the reader's language.
	const bookLabel = $derived(book.canon?.[lang] ?? book.name);
	// The introduction in the chosen translation: its first paragraph is the title.
	const intro = $derived(tr === 'allioli' ? page.intro.de : tr === 'drb' ? page.intro.en : null);
	const introLang = $derived(tr === 'drb' ? 'en' : 'de');
	const hasIntro = $derived(!!intro);
	const paras = (text: string) => text.split(/\n{2,}/).filter((p) => p.trim());
	const notedParas = $derived((intro ?? []).filter((p) => p.footnotes.length));

	const chapterHref = (ch: number) => resolve('/[faithLang=faithLang]/[bible=bibleLang]/[book]/[[chapter]]', { faithLang, bible: bibleLang, book: book.slug, chapter: String(ch) });
	const pageHref = (author: string, ch: number) => resolve('/[faithLang=faithLang]/[bible=bibleLang]/[book]/[chapter]/kommentar/[author]', { faithLang, bible: bibleLang, book: book.slug, chapter: String(ch), author });
	const prefaceHref = (author: string) => resolve('/[faithLang=faithLang]/[bible=bibleLang]/[book]/kommentar/[author]', { faithLang, bible: bibleLang, book: book.slug, author });
	const bioHref = (author: string) => resolve('/[faithLang=faithLang]/[bible=bibleLang]/patres/[author]', { faithLang, bible: bibleLang, author });
	const chapters = $derived(Array.from({ length: book.chapters }, (_, i) => i + 1));
	const groupLabel = (g: FatherGroup) => (g === 'father' ? t.bible_father_group_father : g === 'medieval' ? t.bible_father_group_medieval : t.bible_father_group_modern);
	// Every preface in one language other than the page's: say which.
	const onlyIn = $derived.by(() => { const l = prefaces[0]?.entries[0]?.lang; return l && l !== lang && prefaces.every((p) => p.entries.every((e) => e.lang === l)) ? (l as 'de' | 'en' | 'la') : null; });

	/* The introduction's footnote markers and cross-references peek like the reader's. */
	let peeks = $state<ReturnType<typeof ReferencePeeks> | undefined>();
	let root = $state<HTMLElement>();
	const noteOf = (n: number, number: number) => {
		const f = intro?.find((p) => p.n === n)?.footnotes.find((x) => x.number === number);
		return f ? { title: `${t.bible_book_intro} · ${number}`, sub: bookLabel, text: f.text } : null;
	};
	const onRef = (reference: string, el: HTMLElement) => peeks?.openRef(reference, el);
	const onMarker = (n: number, number: number) => document.getElementById(`bn-${n}-${number}`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
	/* The addresses behind the introduction's references, for a reader without
	 * script — the same bargain the chapter reader strikes (see BibleReader's
	 * `refHref`): a cross-reference is a real link to its chapter and verse, a
	 * note reference a real link to the note at the foot of the introduction,
	 * and with script the click is prevented and a peek opens instead. Without
	 * these the spans are inert, and the introduction to a book was the one
	 * place in the reader where a reference led nowhere. */
	const verseHrefFor = (slug: string, ch: number, verse?: number) => {
		const path = resolve('/[faithLang=faithLang]/[bible=bibleLang]/[book]/[[chapter]]', { faithLang, bible: bibleLang, book: slug, chapter: String(ch) });
		return verse ? `${path}#v${verse}` : path;
	};
	const refHref = (reference: string): string | undefined => {
		const p = parseReference(reference);
		return p ? verseHrefFor(bookSlug(p.book), p.chapter, p.from) : undefined;
	};
	/* "Anm. 12" inside a note: this introduction's own note, whose <li> id
	 * carries the paragraph it hangs on — so the number alone has to be looked
	 * up. "[Mt 7,Anm.32]" names another book's chapter instead, and goes there
	 * the way the reader's cross-chapter note links do. */
	const noteHref = (number: number, target?: { book: string; chapter: number }): string | undefined => {
		if (target) return `${verseHrefFor(target.book, target.chapter)}#anm-${number}`;
		const p = intro?.find((x) => x.footnotes.some((f) => f.number === number));
		return p ? `#bn-${p.n}-${number}` : undefined;
	};
	const jump = (id: string) => document.getElementById(`preface-${id}`)?.scrollIntoView({ block: 'start', behavior: 'smooth' });
</script>

<article class="book" lang={tr === 'drb' ? 'en' : tr === 'vulgata' ? 'la' : 'de'} bind:this={root}>
	<header class="head">
		<p class="kicker" {lang}>{bookLabel} · {trLabel}</p>
		<h1>{heading}</h1>
		{#if prefaces.length > 1}
			<nav class="jump" aria-label={t.bible_book_commentaries} {lang}>
				<span class="label">{t.bible_commentaries}</span>
				{#each prefaces as p (p.author.id)}
					{@const label = fatherLabel(p.author, lang)}
					<a class="disc" href="#preface-{p.author.id}" title={label} aria-label={label} onclick={(e) => { e.preventDefault(); jump(p.author.id); }}>
						<FatherAvatar id={p.author.id} name={p.author.name.en} hasPortrait={p.author.hasPortrait} size={36} />
					</a>
				{/each}
			</nav>
		{/if}
		<nav class="chapters" aria-label={t.bible_chapter} {lang}>
			<div class="actions">
				<a class="first" href={chapterHref(1)}>{t.bible_book_read_first} ›</a>
				{#if firstUnread && firstUnread > 1}
					<a class="continue" href={chapterHref(firstUnread)}>{t.bible_continue}: {t.bible_chapter} {firstUnread} ›</a>
				{/if}
			</div>
			<ol>
				{#each chapters as c (c)}<li><a href={chapterHref(c)}>{c}</a></li>{/each}
			</ol>
		</nav>
	</header>

	{#if intro}
		<section class="section intro" lang={introLang}>
			<p class="label" {lang}>{t.bible_book_intro}</p>
			{#each intro as p, i (p.n)}
				{#if i === 0}
					<h2><VerseText text={p.text} verse={p.n} lang={introLang} onmarker={onMarker} onref={onRef} {refHref} /></h2>
				{:else}
					<p><VerseText text={p.text} verse={p.n} lang={introLang} onmarker={onMarker} onref={onRef} {refHref} /></p>
				{/if}
			{/each}
			{#if notedParas.length}
				<ol class="intro-notes">
					{#each notedParas as p (p.n)}
						{#each p.footnotes as f, i (i)}
							<li id="bn-{p.n}-{f.number}"><span class="nn">{f.number}</span><NoteText text={f.text} onref={onRef} {refHref} {noteHref} onnote={(n) => document.querySelector(`li[id^="bn-"][id$="-${n}"]`)?.scrollIntoView({ block: 'center', behavior: 'smooth' })} /></li>
						{/each}
					{/each}
				</ol>
			{/if}
		</section>
	{:else}
		<p class="none" {lang}>{t.bible_book_no_intro}</p>
	{/if}

	{#if onlyIn}<p class="lang-note" {lang}>{t[`bible_commentary_lang_note_${onlyIn}`]}</p>{/if}
	{#each prefaces as p (p.author.id)}
		<section class="section preface" id="preface-{p.author.id}">
			<a class="who-link" href={bioHref(p.author.id)} title={t.bible_bio_about} {lang}>
				<FatherAvatar id={p.author.id} name={p.author.name.en} hasPortrait={p.author.hasPortrait} size={56} />
				<span class="who">
					<b>{fatherLabel(p.author, lang)}</b>
					<small>{groupLabel(p.author.group)}{p.author.died ? ` · ${t.bible_died} ${p.author.died}` : ''}{p.work ? ` · ${p.work}` : ''}</small>
				</span>
			</a>
			{#each p.entries as e, i (i)}
				{#if e.title}<h3 lang={e.lang}>{e.title}</h3>{/if}
				{#each paras(e.text) as para, j (j)}<p lang={e.lang}>{para}</p>{/each}
			{/each}
			<p class="own-page" {lang}><a href={prefaceHref(p.author.id)}>{t.bible_to_commentary} ›</a></p>
		</section>
	{/each}

	{#if !hasIntro}
		{#if coverage.length}
			<section class="section" {lang}>
				<h2>{t.bible_book_commentaries}</h2>
				<ul class="who-list">
					{#each coverage as a (a.id)}
						<li>
							<a class="row" href={bioHref(a.id)}>
								<FatherAvatar id={a.id} name={a.name.en} hasPortrait={a.hasPortrait} size={32} />
								<span class="name"><b>{fatherLabel(a, lang)}</b><small>{a.died ? `${t.bible_died} ${a.died} · ` : ''}{a.n} {t.bible_entries}</small></span>
							</a>
							{#if a.intro || a.chapters.length}
								<span class="pages">
									{#if a.intro}<a class="chip" href="#preface-{a.id}" onclick={(e) => { e.preventDefault(); jump(a.id); }}>{t.bible_intro_short}</a>{/if}
									{#each a.chapters as c (c)}<a class="chip" href={pageHref(a.id, c)}>{c}</a>{/each}
								</span>
							{/if}
						</li>
					{/each}
				</ul>
			</section>
		{:else if !prefaces.length}
			<p class="none" {lang}>{t.bible_book_none} <a href={chapterHref(1)}>{t.bible_book_read_first} ›</a></p>
		{/if}
	{/if}
</article>

<ReferencePeeks bind:this={peeks} {lang} {faithLang} {bibleLang} root={root ?? null} source={lang === 'en' ? 'Douay-Rheims' : lang === 'la' ? 'Vulgata Clementina' : 'Allioli'} noteOf={intro ? noteOf : undefined} notesLang={introLang} />

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
	.head { margin-bottom: 2rem; display: flex; flex-direction: column; gap: 1rem; }
	.kicker { margin: 0; font-family: var(--font-ui); font-size: 0.82rem; color: var(--color-text-secondary); }
	h1 { margin: 0; font-weight: 400; font-size: 2.4rem; line-height: 1.1; text-wrap: balance; }
	/* The row of portraits under the title: one jump per preface. */
	.jump { display: flex; align-items: center; gap: 0.4rem; font-family: var(--font-ui); }
	.jump .label { font-size: 0.82rem; color: var(--color-text-secondary); margin-right: 0.3rem; }
	.jump .disc { display: inline-flex; border-radius: 50%; padding: 2px; border: 2px solid transparent; transition: border-color var(--transition-fast), transform var(--transition-fast); }
	.jump .disc:hover { border-color: var(--rubric); transform: scale(1.05); }
	.jump .disc:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 1px; }
	.chapters { display: flex; flex-direction: column; gap: 0.75rem; font-family: var(--font-ui); }
	.chapters .actions { display: flex; flex-wrap: wrap; align-items: center; gap: 0.6rem; }
	.chapters .first { padding: 0.5rem 1.1rem; border-radius: var(--radius-pill); background: var(--rubric); color: white; text-decoration: none; font-weight: 600; font-size: 0.9rem; }
	.chapters .first:hover { filter: brightness(1.08); }
	/* Quieter than "read chapter 1": an outline in the same shape. */
	.chapters .continue { padding: calc(0.5rem - 1px) 1.1rem; border: 1px solid var(--rubric); border-radius: var(--radius-pill); color: var(--rubric); text-decoration: none; font-weight: 600; font-size: 0.9rem; }
	.chapters .continue:hover { background: color-mix(in srgb, var(--red) 11%, transparent); }
	.chapters ol { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 0.3rem; }
	.chapters ol a { display: inline-block; min-width: 2.1rem; text-align: center; padding: 0.25rem 0.4rem; border-radius: var(--radius-sm); font-size: 0.86rem; color: var(--rubric); background: color-mix(in srgb, var(--red) 9%, transparent); text-decoration: none; }
	.chapters ol a:hover { background: color-mix(in srgb, var(--red) 20%, transparent); }
	.section { margin: 0 0 2.5rem; }
	.section h2 { font-weight: 400; font-size: 1.25rem; margin: 0 0 0.5rem; color: var(--rubric); }
	.intro .label { margin: 0 0 0.2rem; font-family: var(--font-ui); font-size: 0.78rem; color: var(--color-text-secondary); }
	.intro h2 { font-size: 1.35rem; line-height: 1.3; text-wrap: balance; }
	/* Challoner sets his titles in capitals; small capitals read better. */
	.intro[lang='en'] h2 { text-transform: lowercase; font-variant: small-caps; letter-spacing: 0.04em; }
	.section h3 { font-weight: 400; font-size: 1.05rem; margin: 1rem 0 0.3rem; }
	.section p { margin: 0 0 0.9rem; }
	/* Allioli's notes to the introduction, numbered as he numbers them. */
	.intro-notes { list-style: none; margin: 1.25rem 0 0; padding: 1rem 0 0; border-top: 1px solid var(--color-border); font-family: var(--font-ui); font-size: 0.85rem; line-height: 1.5; color: var(--color-text-secondary); }
	/* A note is reachable by its fragment (see `noteHref`), so clear the sticky header. */
	.intro-notes li { margin: 0 0 0.5rem; padding-left: 1.6rem; text-indent: -1.6rem; scroll-margin-top: 5rem; }
	.intro-notes .nn { display: inline-block; width: 1.6rem; text-indent: 0; color: var(--rubric); font-weight: 600; }
	.intro-notes :global(.ref) { color: var(--rubric); cursor: pointer; border-bottom: 1px dotted color-mix(in srgb, var(--red) 45%, transparent); }
	.lang-note, .none { font-family: var(--font-ui); font-size: 0.85rem; color: var(--color-text-tertiary); margin: 0 0 1.5rem; }
	.none { font-size: 0.9rem; color: var(--color-text-secondary); }
	.none a { color: var(--rubric); text-decoration: none; font-weight: 600; }
	/* A preface: the commentator's card, then his text. */
	.preface { scroll-margin-top: 5rem; padding-top: 1.5rem; border-top: 1px solid var(--color-border); }
	.who-link { display: flex; align-items: center; gap: 0.9rem; margin: 0 -0.6rem 1rem; padding: 0.4rem 0.6rem; border-radius: var(--radius-lg); color: inherit; text-decoration: none; transition: background var(--transition-fast); }
	.who-link:hover { background: var(--color-bg-secondary); }
	.who-link:hover b { color: var(--rubric); }
	.who { display: flex; flex-direction: column; line-height: 1.25; }
	.who b { font-weight: 400; font-size: 1.35rem; transition: color var(--transition-fast); }
	.who small { font-family: var(--font-ui); font-size: 0.78rem; color: var(--color-text-secondary); }
	.own-page { font-family: var(--font-ui); font-size: 0.85rem; }
	.own-page a { color: var(--rubric); text-decoration: none; }
	.who-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.35rem; }
	.who-list li { display: flex; flex-wrap: wrap; align-items: center; gap: 0.3rem 0.8rem; }
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
