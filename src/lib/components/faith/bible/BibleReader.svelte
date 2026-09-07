<script lang="ts">
	/**
	 * The reading view: one chapter, the translator's notes in the margin on
	 * wide screens, a bottom sheet on phones, and hover peeks for the
	 * cross-references. Preferences (translation, Latin line, parallel columns,
	 * where the notes go, text size) arrive from the server's cookie read, so
	 * the SSR markup already matches them, and go back into the cookie on change.
	 */
	import { onMount, tick } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { browser } from '$app/environment';
	import { m, type FaithLang } from '$lib/js/faithI18n';
	import { CANON, CANON_BY_TESTAMENT, bookName, canonSlug, foldUmlauts } from '$lib/faith/bibleCanon';
	import { stripMarkers } from '$lib/faith/bibleText';
	import { PREFS_COOKIE, PREFS_STORAGE, SIZES, DEFAULT_AUTHORS, AUTHORS_FATHERS, AUTHORS_ALL, parsePrefs, type BiblePrefs, type NotesMode, type Translation } from '$lib/faith/biblePrefs';
	import type { ReaderChapter, SearchHit } from '$lib/server/bibleBooks';
	import { fetchPassage, type Passage } from '$lib/faith/passages';
	import ReferencePeeks from './ReferencePeeks.svelte';
	import FatherRow from './FatherRow.svelte';
	import FatherAvatar from './FatherAvatar.svelte';
	import { fatherById, fatherLabel, type Father } from '$lib/faith/fathers';
	import type { ChapterSummary } from '$lib/server/commentary';
	import Users from '@lucide/svelte/icons/users';
	import VerseText from './VerseText.svelte';
	import NoteText from './NoteText.svelte';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import Search from '@lucide/svelte/icons/search';
	import Columns2 from '@lucide/svelte/icons/columns-2';
	import AlignLeft from '@lucide/svelte/icons/align-left';
	import BookOpen from '@lucide/svelte/icons/book-open';
	import SlidersHorizontal from '@lucide/svelte/icons/sliders-horizontal';
	import X from '@lucide/svelte/icons/x';
	import Check from '@lucide/svelte/icons/check';
	import StreakAura from '$lib/components/faith/StreakAura.svelte';
	import type { ReadingState } from '$lib/server/bibleReading';
	import { WPM, chapterKey, chapterWords, type ReaderLang } from '$lib/faith/readingPlan';
	import { localDateStr } from '$lib/js/localDate';
	import { toast } from '$lib/js/toast.svelte';

	interface Props {
		lang: FaithLang;
		faithLang: string;
		bibleLang: string;
		chapter: ReaderChapter;
		availableBooks: string[];
		prefs: BiblePrefs;
		/** Signed-in readers only: read flag, streak, the plan's view of today. */
		reading?: ReadingState | null;
		/** The calendar day the server used, YYYY-MM-DD. */
		today?: string;
		/** Who commented where in this chapter (the Church Fathers layer). */
		commentary?: ChapterSummary | null;
	}
	const { lang, faithLang, bibleLang, chapter, availableBooks, prefs, reading = null, today = '', commentary = null }: Props = $props();
	const t = $derived(m[lang]);

	// Preferences, seeded from the cookie the server read. A reader from before
	// the cookie still has them in localStorage; those are adopted once.
	// svelte-ignore state_referenced_locally
	const initial = prefs;
	let tr = $state<Translation>(initial.tr);
	let latin = $state(initial.latin);
	let parallel = $state(initial.parallel);
	let notesMode = $state<NotesMode>(initial.notes);
	let sizeIdx = $state(initial.size);
	let fathers = $state(initial.fathers);
	let authors = $state<string[]>(initial.authors);

	onMount(() => {
		if (document.cookie.includes(`${PREFS_COOKIE}=`)) return;
		try {
			const legacy = parsePrefs(localStorage.getItem(PREFS_STORAGE), initial);
			tr = legacy.tr;
			latin = legacy.latin;
			parallel = legacy.parallel;
			notesMode = legacy.notes;
			sizeIdx = legacy.size;
			fathers = legacy.fathers;
			authors = legacy.authors;
		} catch {
			// no storage, the server's defaults stand
		}
	});
	$effect(() => {
		const snapshot: BiblePrefs = { tr, latin, parallel, notes: notesMode, size: sizeIdx, fathers, authors };
		const json = JSON.stringify(snapshot);
		document.cookie = `${PREFS_COOKIE}=${encodeURIComponent(json)}; path=/; max-age=31536000; SameSite=Lax`;
		// The reader's calendar day, so the server can say what "today" is.
		document.cookie = `bible_day=${localDateStr()}; path=/; max-age=86400; SameSite=Lax`;
		try {
			localStorage.setItem(PREFS_STORAGE, json);
		} catch {
			// private mode; the cookie carries it
		}
	});

	// A translation the chapter lacks falls back to Allioli rather than to nothing.
	const effectiveTr = $derived<Translation>(
		tr === 'drb' && !chapter.has.english ? 'allioli' : tr === 'vulgata' && !chapter.has.latin ? 'allioli' : tr
	);
	const primaryLang = $derived(effectiveTr === 'drb' ? 'en' : effectiveTr === 'vulgata' ? 'la' : 'de');
	const showLatinLine = $derived(latin && effectiveTr !== 'vulgata' && chapter.has.latin);
	const showParallel = $derived(parallel && effectiveTr !== 'vulgata' && chapter.has.latin);
	const trLabel = $derived(
		effectiveTr === 'allioli' ? 'Allioli 1914' : effectiveTr === 'vulgata' ? 'Vulgata Clementina' : 'Douay-Rheims 1899'
	);
	const heading = $derived(
		effectiveTr === 'drb' ? chapter.book.canon?.en ?? chapter.book.name : effectiveTr === 'vulgata' ? chapter.book.canon?.la ?? chapter.book.name : chapter.book.name
	);
	// Allioli and Challoner both annotate; the Vulgate has no notes.
	const notesAvailable = $derived(effectiveTr !== 'vulgata');
	const notesLang = $derived(effectiveTr === 'drb' ? 'en' : 'de');
	const notesOf = (v: ReaderChapter['verses'][number]) => (effectiveTr === 'drb' ? v.footnotesEn : v.footnotes);
	const notedVerses = $derived(chapter.verses.filter((v) => notesOf(v).length > 0));
	const activeIntro = $derived(effectiveTr === 'drb' ? chapter.introEn : effectiveTr === 'allioli' ? chapter.intro : null);
	const passageSource = $derived(lang === 'en' ? 'Douay-Rheims' : 'Allioli');

	function href(book: string, ch: number, verse?: number): string {
		const path = resolve('/[faithLang=faithLang]/[bible=bibleLang]/[book]/[[chapter]]', {
			faithLang,
			bible: bibleLang,
			book,
			chapter: String(ch)
		});
		return verse ? `${path}#${verse}` : path;
	}
	const prevHref = $derived(chapter.chapter > 1 ? href(chapter.book.slug, chapter.chapter - 1) : null);
	const nextHref = $derived(chapter.chapter < chapter.book.chapters ? href(chapter.book.slug, chapter.chapter + 1) : null);

	/* ---------- marginalia layout ---------- */
	let textEl = $state<HTMLElement>();
	let notesEl = $state<HTMLElement>();
	let wide = $state(false);
	onMount(() => {
		const mq = window.matchMedia('(min-width: 1024px)');
		const apply = () => (wide = mq.matches);
		apply();
		mq.addEventListener('change', apply);
		return () => mq.removeEventListener('change', apply);
	});
	// Whether the notes column exists in the markup. Wide or not is CSS's call,
	// so the server renders the same thing the client shows.
	const marginNotes = $derived(notesMode === 'margin' && notesAvailable);

	function layoutNotes() {
		if (!textEl || !notesEl || !marginNotes) return;
		const base = textEl.getBoundingClientRect().top;
		let floor = 0;
		for (const g of notesEl.querySelectorAll<HTMLElement>('.ng')) {
			const v = textEl.querySelector<HTMLElement>(`#v${g.dataset.v}`);
			if (!v) continue;
			const want = v.getBoundingClientRect().top - base;
			const top = Math.max(want, floor);
			g.style.top = `${top}px`;
			floor = top + g.offsetHeight + 10;
		}
		notesEl.style.minHeight = `${floor}px`;
	}
	$effect(() => {
		if (!textEl || !marginNotes || !wide) return;
		// Re-run whenever the text column changes size or the chapter/mode does.
		void chapter;
		void effectiveTr;
		void showLatinLine;
		void showParallel;
		void sizeIdx;
		const ro = new ResizeObserver(() => layoutNotes());
		ro.observe(textEl);
		tick().then(layoutNotes);
		return () => ro.disconnect();
	});

	/* ---------- footnote markers ---------- */
	let litNote = $state<{ v: number; n: number } | null>(null);
	function markerHover(v: number, n: number | null) {
		if (!wide) return;
		litNote = n === null ? null : { v, n };
	}
	function markerClick(v: number, n: number) {
		if (!wide || notesMode === 'hidden') {
			openSheet({ kind: 'notes', verse: v, number: n });
			return;
		}
		litNote = { v, n };
		const target = document.getElementById(notesMode === 'inline' ? `in-${v}-${n}` : `n-${v}-${n}`);
		target?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
	}

	/* ---------- peeks: the shared ReferencePeeks does the windows ---------- */
	let peeks = $state<ReturnType<typeof ReferencePeeks> | undefined>();
	let readerEl = $state<HTMLElement>();
	const onRef = (reference: string, el: HTMLElement) => peeks?.openRef(reference, el);
	const onVerseRef = (verse: number, el: HTMLElement) => peeks?.openVerse(verse, el);
	function verseOf(verse: number) {
		const v = chapter.verses.find((x) => x.verse === verse);
		if (!v) return null;
		return {
			title: `${chapter.book.name} ${chapter.chapter},${verse}`,
			sub: t.bible_this_chapter,
			verses: [{ verse, text: stripMarkers(v.german || v.english || '') }],
			goto: href(chapter.book.slug, chapter.chapter, verse)
		};
	}
	function noteOf(verse: number, number: number) {
		const v = chapter.verses.find((x) => x.verse === verse);
		const f = v && notesOf(v).find((x) => x.number === number);
		return f ? { title: `${chapter.book.name} ${chapter.chapter},${verse}`, sub: `${t.bible_note} ${number}`, text: f.text } : null;
	}

	/* ---------- bottom sheet (phones, and hidden-notes mode) ---------- */
	type SheetView =
		| { kind: 'notes'; verse: number; number: number }
		| { kind: 'ref'; reference: string }
		| { kind: 'verse'; verse: number }
		| { kind: 'books' }
		| { kind: 'chapters' }
		| { kind: 'settings' }
		| { kind: 'father'; verse: number; author: string }
		| { kind: 'fathers'; verse: number }
		| { kind: 'authors' }
		| { kind: 'search'; query: string; hits: SearchHit[] };
	let sheetStack = $state<SheetView[]>([]);
	let sheetIn = $state(false);
	let sheetPassage = $state<Passage | null | 'loading'>(null);
	const sheetView = $derived(sheetStack[sheetStack.length - 1] ?? null);

	async function openSheet(view: SheetView) {
		sheetStack = [...sheetStack, view];
		if (view.kind === 'father') loadSheetCommentary(view.verse, view.author);
		if (view.kind === 'authors') loadAuthors();
		if (view.kind === 'ref') {
			sheetPassage = 'loading';
			sheetPassage = await fetchPassage(faithLang, view.reference);
		}
		await tick();
		sheetIn = true;
		if (view.kind === 'search') searchInput?.focus();
	}
	/** Swaps the top view in place (search results replacing the empty search). */
	function replaceSheet(view: SheetView) {
		sheetStack = [...sheetStack.slice(0, -1), view];
	}
	function openSearch() {
		if (sheetView?.kind === 'search') {
			searchInput?.focus();
			return;
		}
		openSheet({ kind: 'search', query: '', hits: [] });
	}
	function sheetBack() {
		sheetStack = sheetStack.slice(0, -1);
		if (sheetStack.length === 0) sheetIn = false;
	}
	function closeSheet() {
		sheetIn = false;
		setTimeout(() => (sheetStack = []), 200);
	}
	const sheetTitle = $derived.by(() => {
		const v = sheetView;
		if (!v) return '';
		if (v.kind === 'notes') return `${chapter.book.name} ${chapter.chapter},${v.verse}`;
		if (v.kind === 'verse') return `${chapter.book.name} ${chapter.chapter},${v.verse}`;
		if (v.kind === 'ref') return sheetPassage && sheetPassage !== 'loading' ? sheetPassage.label : v.reference;
		if (v.kind === 'books') return t.bible_book;
		if (v.kind === 'chapters') return chapter.book.name;
		if (v.kind === 'settings') return t.bible_display;
		if (v.kind === 'father') return `${chapter.book.name} ${chapter.chapter},${v.verse}`;
		if (v.kind === 'fathers') return `${chapter.book.name} ${chapter.chapter},${v.verse}`;
		if (v.kind === 'authors') return t.bible_authors_pick;
		return v.query ? `«${v.query}»` : t.bible_search;
	});

	/* ---------- reference box ---------- */
	let query = $state('');
	let searching = $state(false);
	function bookByName(name: string): string | null {
		const direct = canonSlug(name.replace(/\s|\./g, ''));
		if (direct) return direct;
		const n = foldUmlauts(name.replace(/\s|\./g, ''));
		for (const [slug, e] of Object.entries(CANON)) {
			const forms = [e.de, e.en, e.la, e.tsv ?? '', e.drb ?? ''].map((f) => foldUmlauts(f.replace(/\s/g, '')));
			if (forms.includes(n)) return slug;
		}
		return null;
	}
	async function submitSearch(e: SubmitEvent) {
		e.preventDefault();
		const q = query.trim();
		if (!q) return;
		const m = q.match(/^(\d?\s?[A-Za-zÄÖÜäöü]+\.?)?\s*(\d+)(?:[,:.]\s*(\d+))?$/);
		if (m) {
			const slug = m[1] ? bookByName(m[1]) : chapter.book.slug;
			if (!slug) {
				toast.info(t.bible_not_available);
				return;
			}
			if (!availableBooks.includes(slug)) {
				toast.info(`${bookName(slug, lang)}: ${t.bible_not_available}`);
				return;
			}
			closeSheet();
			await goto(href(slug, Number(m[2]), m[3] ? Number(m[3]) : undefined));
			return;
		}
		searching = true;
		try {
			const res = await fetch(`/api/${faithLang}/bibel/suche?book=${chapter.book.slug}&q=${encodeURIComponent(q)}`);
			const hits = res.ok ? ((await res.json()) as { hits: SearchHit[] }).hits : [];
			if (sheetView?.kind === 'search') replaceSheet({ kind: 'search', query: q, hits });
			else openSheet({ kind: 'search', query: q, hits });
		} finally {
			searching = false;
		}
	}

	/* ---------- verse links ---------- */
	function copyVerseLink(verse: number) {
		const url = `${location.origin}${href(chapter.book.slug, chapter.chapter, verse)}`;
		history.replaceState(null, '', `#${verse}`);
		highlightTarget();
		navigator.clipboard?.writeText(url).catch(() => {});
		toast.info(`${chapter.book.abbreviation} ${chapter.chapter},${verse} — ${t.bible_link_copied}`);
	}
	let targetVerse = $state<number | null>(null);
	function highlightTarget() {
		const m = location.hash.match(/^#(\d+)$/);
		targetVerse = m ? Number(m[1]) : null;
		if (targetVerse) {
			tick().then(() => document.getElementById(`v${targetVerse}`)?.scrollIntoView({ block: 'center' }));
		}
	}
	onMount(() => {
		highlightTarget();
		const onHash = () => highlightTarget();
		window.addEventListener('hashchange', onHash);
		return () => window.removeEventListener('hashchange', onHash);
	});

	/* ---------- reading log (signed in) ---------- */
	// svelte-ignore state_referenced_locally
	let isRead = $state(reading?.read ?? false);
	// svelte-ignore state_referenced_locally
	let streak = $state(reading?.streak ?? null);
	// svelte-ignore state_referenced_locally
	let wordsToday = $state(reading?.plan?.wordsToday ?? 0);
	const thisKey = $derived(chapterKey({ slug: chapter.book.slug, ch: chapter.chapter }));
	const readerLang = $derived<ReaderLang>(effectiveTr === 'drb' ? 'en' : 'de');
	const thisWords = $derived(chapterWords(chapter.book.slug, chapter.chapter, readerLang));
	const planTarget = $derived(reading?.plan?.target ?? 0);
	const dayDone = $derived(planTarget > 0 && wordsToday >= 0.9 * planTarget);
	const planHref = $derived(resolve('/[faithLang=faithLang]/[bible=bibleLang]/plan', { faithLang, bible: bibleLang }));
	const nextPlan = $derived(reading?.plan?.next ?? null);
	const nextPlanIsBookNext = $derived(!!nextPlan && nextPlan.slug === chapter.book.slug && nextPlan.ch === chapter.chapter + 1);
	let marking = false;
	let streakBurst = $state(false);

	async function setRead(on: boolean, auto = false) {
		if (!reading || marking || on === isRead) return;
		marking = true;
		const day = localDateStr();
		try {
			const res = await fetch(`/api/${faithLang}/bibel/gelesen`, {
				method: on ? 'POST' : 'DELETE',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ key: thisKey, day, today: day })
			});
			if (!res.ok) return;
			const body = (await res.json()) as { streak: typeof streak };
			isRead = on;
			streak = body.streak;
			if (on) {
				streakBurst = true;
				setTimeout(() => (streakBurst = false), 300);
			}
			if (reading.plan?.inPlan) wordsToday = Math.max(0, wordsToday + (on ? thisWords : -thisWords));
			if (on) toast.success(`${chapter.book.name} ${chapter.chapter} · ${t.bible_plan_read}`, auto ? { action: { label: t.bible_plan_undo, run: () => setRead(false) } } : undefined);
		} finally {
			marking = false;
		}
	}

	// Auto-read: the end of the chapter was scrolled into view and the page
	// was visible for at least four tenths of the chapter's reading time.
	let endSentinel = $state<HTMLElement>();
	let reachedEnd = $state(false);
	let visibleSeconds = $state(0);
	$effect(() => {
		if (!reading || !endSentinel || isRead) return;
		const io = new IntersectionObserver((entries) => {
			if (entries.some((e) => e.isIntersecting)) reachedEnd = true;
		});
		io.observe(endSentinel);
		const tick = setInterval(() => {
			if (document.visibilityState === 'visible') visibleSeconds += 1;
		}, 1000);
		return () => {
			io.disconnect();
			clearInterval(tick);
		};
	});
	$effect(() => {
		if (!reading || isRead || !reachedEnd) return;
		const need = 0.4 * (thisWords / WPM[readerLang]) * 60;
		if (visibleSeconds >= need) setRead(true, true);
	});

	/* ---------- the Church Fathers ---------- */
	type FatherLite = Pick<Father, 'name' | 'saint' | 'portrait'>;
	const fatherLite = (id: string, name: string): FatherLite => fatherById(id) ?? { name: { en: name, de: name }, saint: false };
	const selected = $derived(new Set(authors));
	const showsAuthor = (group: string, id: string) => selected.has(AUTHORS_ALL) || (selected.has(AUTHORS_FATHERS) && group !== 'modern') || selected.has(id);
	const preset = $derived(selected.has(AUTHORS_ALL) ? 'all' : selected.has(AUTHORS_FATHERS) ? 'fathers' : authors.length === DEFAULT_AUTHORS.length && DEFAULT_AUTHORS.every((a) => selected.has(a)) ? 'min' : 'custom');
	function setPreset(p: 'min' | 'fathers' | 'all') {
		authors = p === 'min' ? [...DEFAULT_AUTHORS] : p === 'fathers' ? [AUTHORS_FATHERS] : [AUTHORS_ALL];
	}
	function toggleAuthor(id: string, group: string) {
		if (selected.has(AUTHORS_ALL) || selected.has(AUTHORS_FATHERS)) {
			// Leaving a preset: start from what the preset showed, minus this one.
			const base = authorList.filter((a) => showsAuthor(a.group, a.id) && a.id !== id).map((a) => a.id);
			authors = base;
			return;
		}
		authors = selected.has(id) ? authors.filter((a) => a !== id) : [...authors, id];
		void group;
	}
	// The picker's list of every commentator, fetched once when it opens.
	type AuthorInfo = { id: string; name: { en: string; de: string }; saint: boolean; died: number | null; group: string; hasPortrait: boolean; n: number };
	let authorList = $state<AuthorInfo[]>([]);
	let authorQuery = $state('');
	async function loadAuthors() {
		if (authorList.length) return;
		try {
			const res = await fetch(`/api/${faithLang}/bibel/kommentar/autoren`);
			if (res.ok) authorList = ((await res.json()) as { authors: AuthorInfo[] }).authors;
		} catch {
			// the picker stays empty
		}
	}
	const authorMatches = $derived.by(() => {
		const q = authorQuery.trim().toLowerCase();
		return authorList.filter((a) => !q || a.name.en.toLowerCase().includes(q) || a.name.de.toLowerCase().includes(q));
	});
	function authorsFor(verse: number) {
		if (!fathers || !commentary) return [];
		return (commentary.verses[verse] ?? []).filter((a) => showsAuthor(a.group, a.id)).map((a) => ({ id: a.id, n: a.n, father: fatherLite(a.id, a.name) }));
	}
	const chapterAuthors = $derived(!fathers || !commentary ? [] : [...commentary.chapter, ...(chapter.chapter === 1 ? commentary.book : [])].filter((a) => showsAuthor(a.group, a.id)));
	const hasChapterText = (id: string) => !!commentary && (commentary.chapter.some((a) => a.id === id) || (chapter.chapter === 1 && commentary.book.some((a) => a.id === id)));
	const commentaryHref = (author: string) =>
		resolve('/[faithLang=faithLang]/[bible=bibleLang]/[book]/[chapter]/kommentar/[author]', { faithLang, bible: bibleLang, book: chapter.book.slug, chapter: String(chapter.chapter), author });
	const commentaryApi = (verse: number, author: string) => `/api/${faithLang}/bibel/kommentar?book=${chapter.book.slug}&chapter=${chapter.chapter}&verse=${verse}&author=${author}`;
	function openFather(verse: number, author: string, el: HTMLElement) {
		peeks?.openCommentary({ anchor: el, title: `${chapter.book.name} ${chapter.chapter},${verse}`, verse, author, url: commentaryApi(verse, author), more: hasChapterText(author) ? commentaryHref(author) : null });
	}
	function openFathers(verse: number, el: HTMLElement) {
		peeks?.openAuthors({
			anchor: el,
			title: `${chapter.book.name} ${chapter.chapter},${verse}`,
			verse,
			items: authorsFor(verse).map((a) => ({ id: a.id, name: a.father.name, saint: !!a.father.saint, hasPortrait: !!a.father.portrait, n: a.n, open: (anchor: HTMLElement) => openFather(verse, a.id, anchor) }))
		});
	}
	// The phone sheet fetches the same endpoint as the peek.
	type SheetCommentary = { author: { id: string; name: { en: string; de: string }; saint: boolean; died: number | null; portrait: unknown }; entries: { verse: number; verseEnd: number | null; work: string | null; title: string | null; lang: string; text: string }[] };
	let sheetCommentary = $state<SheetCommentary | null | 'loading'>(null);
	async function loadSheetCommentary(verse: number, author: string) {
		sheetCommentary = 'loading';
		try {
			const res = await fetch(commentaryApi(verse, author));
			sheetCommentary = res.ok ? ((await res.json()) as SheetCommentary) : null;
		} catch {
			sheetCommentary = null;
		}
	}

	/** Two columns need the Latin: parallel on pulls Latin on, Latin off pulls parallel off. */
	function toggleParallel() {
		parallel = !parallel;
		if (parallel) latin = true;
	}
	function toggleLatin() {
		latin = !latin;
		if (!latin) parallel = false;
	}

	/* ---------- keyboard ---------- */
	let searchInput = $state<HTMLInputElement>();
	function onKey(e: KeyboardEvent) {
		if ((e.target as HTMLElement).matches('input, textarea')) return;
		if (e.key === 'Escape') {
			peeks?.closeAll();
			closeSheet();
			menuOpen = false;
			return;
		}
		if (e.key === 'ArrowLeft' && prevHref) goto(prevHref);
		if (e.key === 'ArrowRight' && nextHref) goto(nextHref);
		if (e.key === '/') {
			e.preventDefault();
			openSearch();
		}
		if (e.key === 'n') notesMode = notesMode === 'margin' ? 'inline' : notesMode === 'inline' ? 'hidden' : 'margin';
		if (e.key === 'l') toggleLatin();
		if (e.key === 'p') toggleParallel();
		if (e.key === 'k') fathers = !fathers;
	}

	let menuOpen = $state(false);

	/* ---------- bottom dock (narrow screens) ---------- */
	// Slides away while reading down, comes back on the first scroll up.
	let dockHidden = $state(false);
	let lastY = 0;
	function onScroll() {
		if (wide) return;
		const y = window.scrollY;
		const dy = y - lastY;
		if (Math.abs(dy) < 8) return;
		dockHidden = dy > 0 && y > 80;
		lastY = y;
	}

	const textSize = $derived(SIZES[sizeIdx]);
	const otBooks = CANON_BY_TESTAMENT.ot;
	const ntBooks = CANON_BY_TESTAMENT.nt;
	const oneChapterOfTotal = $derived(`${t.bible_chapter} ${chapter.chapter} / ${chapter.book.chapters}`);
</script>

<svelte:window onkeydown={onKey} onscroll={onScroll} />

<div
	bind:this={readerEl}
	class="reader"
	class:parallel={showParallel}
	class:margin-notes={marginNotes}
	class:inline-notes={notesMode === 'inline' && notesAvailable}
	class:no-markers={notesMode === 'hidden' || !notesAvailable}
	style="--text-size: {textSize}"
>
	<div class="page">
		<!-- Wide screens: a running head in the left margin, outside the measure. -->
		<aside class="rail" aria-label={t.bible_chapter}>
			<button class="book" onclick={() => openSheet({ kind: 'books' })} aria-haspopup="dialog">{chapter.book.name}</button>
			<div class="stepper" aria-label={t.bible_chapter}>
				{#if prevHref}
					<a href={prevHref} aria-label={t.bible_prev_chapter}><ChevronLeft size={16} strokeWidth={2.2} /></a>
				{:else}
					<span class="dead"><ChevronLeft size={16} strokeWidth={2.2} /></span>
				{/if}
				<button class="ch" onclick={() => openSheet({ kind: 'chapters' })} aria-haspopup="dialog" title={oneChapterOfTotal}>{chapter.chapter}</button>
				{#if nextHref}
					<a href={nextHref} aria-label={t.bible_next_chapter}><ChevronRight size={16} strokeWidth={2.2} /></a>
				{:else}
					<span class="dead"><ChevronRight size={16} strokeWidth={2.2} /></span>
				{/if}
			</div>

			<div class="seg" role="group" aria-label={t.bible_translation}>
				<button aria-pressed={effectiveTr === 'allioli'} onclick={() => (tr = 'allioli')}>Allioli</button>
				<button aria-pressed={effectiveTr === 'vulgata'} onclick={() => (tr = 'vulgata')} disabled={!chapter.has.latin}>Vulgata</button>
				<button aria-pressed={effectiveTr === 'drb'} onclick={() => (tr = 'drb')} disabled={!chapter.has.english}>Douay-Rheims</button>
			</div>

			<div class="tools">
				<button class="tool" aria-pressed={showLatinLine} disabled={effectiveTr === 'vulgata' || !chapter.has.latin} onclick={toggleLatin} title={t.bible_latin_title}>
					<AlignLeft size={15} strokeWidth={2} aria-hidden="true" /><span>{t.bible_latin}</span>
				</button>
				<button class="tool" aria-pressed={showParallel} disabled={effectiveTr === 'vulgata' || !chapter.has.latin} onclick={toggleParallel} title={t.bible_parallel_title}>
					<Columns2 size={15} strokeWidth={2} aria-hidden="true" /><span>{t.bible_parallel}</span>
				</button>
				<button class="tool" aria-pressed={fathers} onclick={() => (fathers = !fathers)} title={t.bible_fathers_title}>
					<Users size={15} strokeWidth={2} aria-hidden="true" /><span>{t.bible_fathers}</span>
				</button>
				<div class="menu" class:open={menuOpen}>
					<button class="tool" aria-haspopup="menu" aria-expanded={menuOpen} onclick={(e) => { e.stopPropagation(); menuOpen = !menuOpen; }} title={t.bible_display}>
						<SlidersHorizontal size={15} strokeWidth={2} aria-hidden="true" /><span>{t.bible_notes}</span>
					</button>
					{#if menuOpen}
						<div class="pop" role="menu">
							<button role="menuitemradio" aria-checked={notesMode === 'margin'} onclick={() => { notesMode = 'margin'; menuOpen = false; }}>{t.bible_notes_margin}</button>
							<button role="menuitemradio" aria-checked={notesMode === 'inline'} onclick={() => { notesMode = 'inline'; menuOpen = false; }}>{t.bible_notes_inline}</button>
							<button role="menuitemradio" aria-checked={notesMode === 'hidden'} onclick={() => { notesMode = 'hidden'; menuOpen = false; }}>{t.bible_notes_hidden}</button>
							<div class="pop-sep"></div>
							<button role="menuitem" disabled={!fathers} onclick={() => { menuOpen = false; openSheet({ kind: 'authors' }); }}>{t.bible_authors_pick}…</button>
						</div>
					{/if}
				</div>
				<div class="sizes" role="group" aria-label={t.bible_display}>
					<button onclick={() => (sizeIdx = Math.max(0, sizeIdx - 1))} title={t.bible_smaller} disabled={sizeIdx === 0}>A−</button>
					<button onclick={() => (sizeIdx = Math.min(SIZES.length - 1, sizeIdx + 1))} title={t.bible_larger} disabled={sizeIdx === SIZES.length - 1}>A+</button>
				</div>
				<button class="tool" onclick={openSearch} title={t.bible_search}>
					<Search size={15} strokeWidth={2} aria-hidden="true" /><span>{t.bible_keys_search}</span><kbd aria-hidden="true">/</kbd>
				</button>
			</div>

			{#if reading}
				<div class="log" aria-label={t.bible_plan}>
					{#if reading.plan && planTarget > 0}
						<div class="ring-row">
							<svg class="ring" viewBox="0 0 36 36" aria-hidden="true">
								<circle cx="18" cy="18" r="15.5" />
								<circle cx="18" cy="18" r="15.5" class="fill" style="stroke-dasharray: {Math.min(1, wordsToday / planTarget) * 97.4} 97.4" />
							</svg>
							<span class="ring-text">{t.bible_plan_today}<br /><b>{Math.round(wordsToday / WPM[readerLang])} / {reading.plan ? Math.round(planTarget / WPM[readerLang]) : 0} {t.bible_plan_min}</b></span>
						</div>
					{/if}
					<button class="tool read" aria-pressed={isRead} onclick={() => setRead(!isRead)}>
						<Check size={15} strokeWidth={2.4} aria-hidden="true" /><span>{isRead ? t.bible_plan_read : t.bible_plan_mark}</span>
					</button>
					{#if streak && (streak.current > 0 || streakBurst)}
						<div class="streak-row">
							<StreakAura value={streak.current} burst={streakBurst} />
							<span class="streak-line">{t.bible_plan_streak}<br /><b>{streak.current}</b> {t.bible_plan_days}</span>
						</div>
					{/if}
					{#if nextPlan && !nextPlanIsBookNext}
						<a class="next-plan" href={href(nextPlan.slug, nextPlan.ch)}>{t.bible_plan_next}: {bookName(nextPlan.slug, lang)} {nextPlan.ch}</a>
					{:else if !reading.plan}
						<a class="next-plan" href={planHref}>{t.bible_plan_begin_link}</a>
					{:else}
						<a class="next-plan" href={planHref}>{dayDone ? t.bible_plan_day_done : t.bible_plan_open}</a>
					{/if}
				</div>
			{/if}
		</aside>

		<article class="text" bind:this={textEl} lang={primaryLang}>
			<header class="chapter-head">
				<p class="kicker">{chapter.book.canon?.[lang] ?? chapter.book.name} · {trLabel}</p>
				<h1>{heading} <span class="num">{chapter.chapter}</span></h1>
				{#if chapterAuthors.length}
					<nav class="commentaries" aria-label={t.bible_commentaries}>
						<span class="label">{t.bible_commentaries}</span>
						{#each chapterAuthors as a (a.id)}
							{@const fa = fatherLite(a.id, a.name)}
							<a class="disc" href={commentaryHref(a.id)} title="{fatherLabel(fa, lang)}{a.work ? ` · ${a.work}` : ''}" aria-label="{t.bible_commentary_by} {fatherLabel(fa, lang)}">
								<FatherAvatar id={a.id} name={fa.name.en} hasPortrait={!!fa.portrait} size={36} />
								<span class="tip" aria-hidden="true">{fatherLabel(fa, lang)}</span>
							</a>
						{/each}
					</nav>
				{/if}
			</header>

			{#if effectiveTr === 'drb' && chapter.bookIntro}
				<details class="intro book-intro" open lang="en">
					<summary>{chapter.bookIntro.title}</summary>
					<p><NoteText text={chapter.bookIntro.text} onref={onRef} onverse={onVerseRef} /></p>
				</details>
			{/if}
			{#if activeIntro}
				<details class="intro" open>
					<summary>{t.bible_intro}</summary>
					<p lang={notesLang}><NoteText text={activeIntro} onref={onRef} onverse={onVerseRef} /></p>
				</details>
			{/if}

			{#each chapter.verses as v (v.verse)}
				<div class="v" id="v{v.verse}" class:target={targetVerse === v.verse} class:lit={litNote?.v === v.verse}>
					<button class="n" onclick={() => copyVerseLink(v.verse)} title={t.bible_copy_link}>{v.verse}</button>
					<div class="cols">
						<div class="primary">
							{#if effectiveTr === 'allioli'}
								{#if v.german}
									<VerseText text={v.german} verse={v.verse} lang="de" onmarker={markerClick} onmarkerhover={markerHover} onref={onRef} />
								{:else}
									<!-- Only the Douay-Rheims has this verse (the Greek Esther, say). -->
									<VerseText text={v.english ?? ''} verse={v.verse} lang="en" markers={false} onref={onRef} />
								{/if}
							{:else if effectiveTr === 'vulgata'}
								<VerseText text={v.latin ?? ''} verse={v.verse} lang="la" markers={false} />
							{:else}
								<VerseText text={v.english ?? ''} verse={v.verse} lang="en" onmarker={markerClick} onmarkerhover={markerHover} onref={onRef} />
							{/if}
							{#if showLatinLine && !showParallel && v.latin}
								<span class="la" lang="la">{v.latin}</span>
							{/if}
						</div>
						{#if showParallel && v.latin}
							<div class="secondary" lang="la">{v.latin}</div>
						{/if}
					</div>
					{#if fathers && authorsFor(v.verse).length}
						<div class="fathers"><FatherRow authors={authorsFor(v.verse)} {lang} moreLabel={t.bible_more_authors} onopen={(id, el) => openFather(v.verse, id, el)} onmore={(el) => openFathers(v.verse, el)} /></div>
					{/if}
					{#if notesAvailable && notesOf(v).length > 0}
						<div class="inline" lang={notesLang}>
							<ol>
								{#each notesOf(v) as f (f.number)}
									<li id="in-{v.verse}-{f.number}" class:on={litNote?.v === v.verse && litNote?.n === f.number}>
										<span class="nn">{f.number}</span><NoteText text={f.text} onref={onRef} onverse={onVerseRef} />
									</li>
								{/each}
							</ol>
						</div>
					{/if}
				</div>
			{/each}

			<div class="end-sentinel" bind:this={endSentinel} aria-hidden="true"></div>
			{#if reading}
				<div class="read-row">
					<button class="tool read" aria-pressed={isRead} onclick={() => setRead(!isRead)}>
						<Check size={15} strokeWidth={2.4} aria-hidden="true" /><span>{isRead ? t.bible_plan_read : t.bible_plan_mark}</span>
					</button>
				</div>
			{/if}
			<nav class="chapter-nav" aria-label={t.bible_chapter}>
				{#if prevHref}
					<a href={prevHref} class="prev">‹ {chapter.book.name} {chapter.chapter - 1}<small>{t.bible_prev_chapter}</small></a>
				{:else}<span></span>{/if}
				{#if nextPlan && !nextPlanIsBookNext}
					<span class="next-group">
						<a href={href(nextPlan.slug, nextPlan.ch)} class="next">{bookName(nextPlan.slug, lang)} {nextPlan.ch} ›<small>{t.bible_plan_next}</small></a>
						{#if nextHref}<a href={nextHref} class="next minor">{chapter.book.name} {chapter.chapter + 1} ›</a>{/if}
					</span>
				{:else if nextHref}
					<a href={nextHref} class="next">{chapter.book.name} {chapter.chapter + 1} ›<small>{t.bible_next_chapter}</small></a>
				{/if}
			</nav>
		</article>

		<aside class="notes" bind:this={notesEl} aria-label={t.bible_notes} lang={notesLang}>
			{#if notesAvailable}
				{#each notedVerses as v (v.verse)}
					<div class="ng" data-v={v.verse}>
						<span class="nv">{v.verse}</span>
						<ol>
							{#each notesOf(v) as f (f.number)}
								<li id="n-{v.verse}-{f.number}" class:on={litNote?.v === v.verse && litNote?.n === f.number}>
									<span class="nn">{f.number}</span><NoteText text={f.text} onref={onRef} onverse={onVerseRef} />
								</li>
							{/each}
						</ol>
					</div>
				{/each}
			{:else}
				<p class="notes-empty">{t.bible_notes_belong}</p>
			{/if}
		</aside>
	</div>

	<!-- Narrow screens: one floating pill at the bottom, thumbs' reach. -->
	<nav class="dock" class:away={dockHidden || sheetIn} aria-label={t.bible_chapter}>
		{#if prevHref}
			<a href={prevHref} class="step" aria-label={t.bible_prev_chapter}><ChevronLeft size={20} strokeWidth={2.2} /></a>
		{:else}
			<span class="step dead"><ChevronLeft size={20} strokeWidth={2.2} /></span>
		{/if}
		<button class="where" onclick={() => openSheet({ kind: 'books' })} aria-haspopup="dialog">{chapter.book.name} {chapter.chapter}</button>
		{#if nextHref}
			<a href={nextHref} class="step" aria-label={t.bible_next_chapter}><ChevronRight size={20} strokeWidth={2.2} /></a>
		{:else}
			<span class="step dead"><ChevronRight size={20} strokeWidth={2.2} /></span>
		{/if}
		<span class="sep" aria-hidden="true"></span>
		<button class="aa" onclick={() => openSheet({ kind: 'settings' })} aria-haspopup="dialog" aria-label={t.bible_display}>Aa</button>
		<button class="find" onclick={openSearch} aria-haspopup="dialog" aria-label={t.bible_search}><Search size={18} strokeWidth={2} /></button>
		{#if reading}
			<button class="mark" aria-pressed={isRead} onclick={() => setRead(!isRead)} aria-label={isRead ? t.bible_plan_unmark : t.bible_plan_mark}><Check size={18} strokeWidth={2.4} /></button>
		{/if}
	</nav>

	<ReferencePeeks
		bind:this={peeks}
		{lang}
		{faithLang}
		{bibleLang}
		root={readerEl}
		source={passageSource}
		{verseOf}
		noteOf={marginNotes ? noteOf : undefined}
		{notesLang}
		onNarrow={(view) => openSheet(view)}
	/>

	{#if sheetView}
		<button class="scrim" class:in={sheetIn} onclick={closeSheet} aria-label={t.bible_close} tabindex="-1"></button>
		<div class="sheet" class:in={sheetIn} role="dialog" aria-modal="true" aria-label={sheetTitle}>
			<div class="grab"></div>
			<header>
				{#if sheetStack.length > 1}
					<button class="back" onclick={sheetBack}>‹ {t.bible_back}</button>
				{/if}
				<strong>{sheetTitle}</strong>
				{#if sheetView.kind === 'notes'}<span>{t.bible_notes}</span>{/if}
				{#if sheetView.kind === 'search' && sheetView.query}<span>{sheetView.hits.length} {t.bible_hits}</span>{/if}
				<button class="close" onclick={closeSheet} aria-label={t.bible_close}><X size={18} strokeWidth={2} /></button>
			</header>
			<div class="body">
				{#if sheetView.kind === 'notes'}
					{@const v = chapter.verses.find((x) => x.verse === sheetView.verse)}
					<ol>
						{#each v ? notesOf(v) : [] as f (f.number)}
							<li class:on={f.number === sheetView.number}><span class="nn">{f.number}</span><NoteText text={f.text} onref={(r) => openSheet({ kind: 'ref', reference: r })} onverse={(n) => openSheet({ kind: 'verse', verse: n })} /></li>
						{/each}
					</ol>
				{:else if sheetView.kind === 'father'}
					{#if sheetCommentary === 'loading'}
						<p class="more">…</p>
					{:else if !sheetCommentary}
						<p class="more">{t.bible_ref_missing}</p>
					{:else}
						{@const a = sheetCommentary.author}
						<div class="father-head">
							<FatherAvatar id={a.id} name={a.name.en} hasPortrait={!!a.portrait} size={44} />
							<div><b>{fatherLabel(a, lang)}</b><br /><small>{a.died ? `${t.bible_died} ${a.died}` : ''}{sheetCommentary.entries[0]?.work ? ` · ${sheetCommentary.entries[0].work}` : ''}</small></div>
						</div>
						{#each sheetCommentary.entries as e, i (i)}
							{#if e.verseEnd && sheetCommentary.entries[i - 1]?.verseEnd !== e.verseEnd}<p class="range">V. {e.verse}–{e.verseEnd}</p>{/if}
							{#each e.text.split(/\n{2,}/) as para, j (j)}<p lang={e.lang}>{para}</p>{/each}
						{/each}
						{#if hasChapterText(sheetView.author)}<p><a class="jump" href={commentaryHref(sheetView.author)} onclick={closeSheet}>{t.bible_to_commentary} ›</a></p>{/if}
					{/if}
				{:else if sheetView.kind === 'authors'}
					<div class="picker">
						<div class="seg" role="group" aria-label={t.bible_authors_pick}>
							<button aria-pressed={preset === 'min'} onclick={() => setPreset('min')}>{t.bible_authors_preset_min}</button>
							<button aria-pressed={preset === 'fathers'} onclick={() => setPreset('fathers')}>{t.bible_authors_preset_fathers}</button>
							<button aria-pressed={preset === 'all'} onclick={() => setPreset('all')}>{t.bible_authors_preset_all}</button>
						</div>
						<input class="picker-search" type="search" bind:value={authorQuery} placeholder={t.bible_authors_search} aria-label={t.bible_authors_search} />
						{#if authors.length === 0}<p class="hint">{t.bible_authors_none}</p>{/if}
						<ul class="author-list">
							{#each authorMatches as a (a.id)}
								{@const on = showsAuthor(a.group, a.id)}
								<li>
									<button aria-pressed={on} onclick={() => toggleAuthor(a.id, a.group)}>
										<FatherAvatar id={a.id} name={a.name.en} hasPortrait={a.hasPortrait} size={32} />
										<span class="pick-name">{fatherLabel(a, lang)}<small>{a.died ? `${t.bible_died} ${a.died} · ` : ''}{a.n} {t.bible_entries}</small></span>
										<span class="check" aria-hidden="true">{on ? '✓' : ''}</span>
									</button>
								</li>
							{/each}
						</ul>
					</div>
				{:else if sheetView.kind === 'fathers'}
					<ul class="author-list">
						{#each authorsFor(sheetView.verse) as a (a.id)}
							<li><button onclick={() => openSheet({ kind: 'father', verse: sheetView.verse, author: a.id })}><FatherAvatar id={a.id} name={a.father.name.en} hasPortrait={!!a.father.portrait} size={32} /><span>{fatherLabel(a.father, lang)}</span>{#if a.n > 1}<small>{a.n}</small>{/if}</button></li>
						{/each}
					</ul>
				{:else if sheetView.kind === 'verse'}
					{@const v = chapter.verses.find((x) => x.verse === sheetView.verse)}
					{#if v}<p><span class="n">{v.verse}</span>{stripMarkers(v.german)}</p>{/if}
					<p><a class="jump" href={href(chapter.book.slug, chapter.chapter, sheetView.verse)} onclick={closeSheet}>{t.bible_jump} ›</a></p>
				{:else if sheetView.kind === 'ref'}
					{#if sheetPassage === 'loading'}
						<p class="more">…</p>
					{:else if !sheetPassage}
						<p class="more">{t.bible_ref_missing}</p>
					{:else}
						{#each sheetPassage.verses as pv (pv.verse)}<p><span class="n">{pv.verse}</span>{pv.text}</p>{/each}
						{#if sheetPassage.more}<p class="more">…</p>{/if}
						{#if sheetPassage.slug}<p><a class="jump" href={href(sheetPassage.slug, sheetPassage.chapter, sheetPassage.verses[0]?.verse)} onclick={closeSheet}>{t.bible_jump} ›</a></p>{/if}
					{/if}
				{:else if sheetView.kind === 'books'}
					<h4 class="sheet-h">{chapter.book.name} · {t.bible_chapter}</h4>
					<div class="chapters">
						{#each Array.from({ length: chapter.book.chapters }, (_, i) => i + 1) as c (c)}
							<a href={href(chapter.book.slug, c)} class:cur={c === chapter.chapter} onclick={closeSheet}>{c}</a>
						{/each}
					</div>
					<div class="books">
						<h4>{t.bible_old_testament}</h4>
						{#each otBooks as slug (slug)}
							{#if availableBooks.includes(slug)}
								<a href={href(slug, 1)} class:cur={slug === chapter.book.slug} onclick={closeSheet}>{bookName(slug, lang)}</a>
							{:else}
								<span class="soon" title={t.bible_not_available}>{bookName(slug, lang)}</span>
							{/if}
						{/each}
						<h4>{t.bible_new_testament}</h4>
						{#each ntBooks as slug (slug)}
							{#if availableBooks.includes(slug)}
								<a href={href(slug, 1)} class:cur={slug === chapter.book.slug} onclick={closeSheet}>{bookName(slug, lang)}</a>
							{:else}
								<span class="soon" title={t.bible_not_available}>{bookName(slug, lang)}</span>
							{/if}
						{/each}
					</div>
				{:else if sheetView.kind === 'chapters'}
					<div class="chapters">
						{#each Array.from({ length: chapter.book.chapters }, (_, i) => i + 1) as c (c)}
							<a href={href(chapter.book.slug, c)} class:cur={c === chapter.chapter} onclick={closeSheet}>{c}</a>
						{/each}
					</div>
				{:else if sheetView.kind === 'settings'}
					<div class="settings">
						<div class="row">
							<span>{t.bible_translation}</span>
							<div class="seg" role="group" aria-label={t.bible_translation}>
								<button aria-pressed={effectiveTr === 'allioli'} onclick={() => (tr = 'allioli')}>Allioli</button>
								<button aria-pressed={effectiveTr === 'vulgata'} onclick={() => (tr = 'vulgata')} disabled={!chapter.has.latin}>Vulgata</button>
								<button aria-pressed={effectiveTr === 'drb'} onclick={() => (tr = 'drb')} disabled={!chapter.has.english}>Douay-Rheims</button>
							</div>
						</div>
						<div class="row">
							<span>{t.bible_latin}</span>
							<button class="tool" aria-pressed={showLatinLine} disabled={effectiveTr === 'vulgata' || !chapter.has.latin} onclick={toggleLatin}>
								<AlignLeft size={15} strokeWidth={2} aria-hidden="true" /><span>{t.bible_latin_title}</span>
							</button>
						</div>
						<div class="row">
							<span>{t.bible_notes}</span>
							<div class="seg" role="group" aria-label={t.bible_notes}>
								<button aria-pressed={notesMode === 'margin'} onclick={() => (notesMode = 'margin')}>{t.bible_notes_tap}</button>
								<button aria-pressed={notesMode === 'inline'} onclick={() => (notesMode = 'inline')}>{t.bible_notes_inline_short}</button>
								<button aria-pressed={notesMode === 'hidden'} onclick={() => (notesMode = 'hidden')}>{t.bible_notes_hidden}</button>
							</div>
						</div>
						<div class="row">
							<span>{t.bible_fathers}</span>
							<button class="tool" aria-pressed={fathers} onclick={() => (fathers = !fathers)}>
								<Users size={15} strokeWidth={2} aria-hidden="true" /><span>{t.bible_fathers_title}</span>
							</button>
						</div>
						<div class="row">
							<span>{t.bible_authors_pick}</span>
							<div class="seg" role="group" aria-label={t.bible_authors_pick}>
								<button aria-pressed={preset === 'min'} disabled={!fathers} onclick={() => setPreset('min')}>{t.bible_authors_preset_min}</button>
								<button aria-pressed={preset === 'fathers'} disabled={!fathers} onclick={() => setPreset('fathers')}>{t.bible_authors_preset_fathers}</button>
								<button aria-pressed={preset === 'all'} disabled={!fathers} onclick={() => setPreset('all')}>{t.bible_authors_preset_all}</button>
							</div>
							<button class="tool" disabled={!fathers} onclick={() => openSheet({ kind: 'authors' })}><span>{t.bible_authors_pick}…</span></button>
						</div>
						<div class="row">
							<span>{t.bible_size}</span>
							<div class="sizes" role="group" aria-label={t.bible_size}>
								<button onclick={() => (sizeIdx = Math.max(0, sizeIdx - 1))} title={t.bible_smaller} disabled={sizeIdx === 0}>A−</button>
								<button onclick={() => (sizeIdx = Math.min(SIZES.length - 1, sizeIdx + 1))} title={t.bible_larger} disabled={sizeIdx === SIZES.length - 1}>A+</button>
							</div>
						</div>
					</div>
				{:else if sheetView.kind === 'search'}
					<form class="search" role="search" onsubmit={submitSearch}>
						<Search size={16} strokeWidth={2} aria-hidden="true" />
						<input bind:this={searchInput} bind:value={query} placeholder={t.bible_search_placeholder} aria-label={t.bible_search} disabled={searching} enterkeyhint="search" />
					</form>
					{#if !sheetView.query}
						<p class="hint">{t.bible_search_hint}</p>
					{:else if sheetView.hits.length === 0}
						<p>{t.bible_no_hits}</p>
					{:else}
						<ol>
							{#each sheetView.hits as h (`${h.chapter}.${h.verse}`)}
								<li><a class="hit" href={href(chapter.book.slug, h.chapter, h.verse)} onclick={closeSheet}><span class="n">{chapter.book.abbreviation} {h.chapter},{h.verse}</span>{h.text}</a></li>
							{/each}
						</ol>
					{/if}
				{/if}
			</div>
		</div>
	{/if}

</div>

<style>
	@font-face {
		font-family: 'Linux Libertine';
		src: url('/fonts/LinLibertine_Rah.woff2') format('woff2');
		font-weight: 400;
		font-display: swap;
	}

	.reader {
		--rubric: var(--red);
		--rubric-soft: color-mix(in srgb, var(--red) 11%, transparent);
		--serif: 'Linux Libertine', Georgia, 'Times New Roman', serif;
		--font-ui: Helvetica, Arial, 'Noto Sans', sans-serif;
		--measure: 40rem;
		--notes-w: 19rem;
		--rail-w: 9rem;
		font-family: var(--serif);
		font-size: var(--text-size, 1.0625rem);
		line-height: 1.65;
		color: var(--color-text-primary);
	}
	/* app.css sets the sans on `*`, which beats inheritance; the reader is serif
	   throughout and hands the sans out explicitly where the chrome needs it. */
	.reader :global(*) { font-family: inherit; }
	.reader.parallel { --measure: 58rem; }

	/* ---------- rail (wide screens) ---------- */
	.rail {
		display: none;
		position: sticky;
		top: calc(var(--header-h, 3rem) + 2rem);
		align-self: start;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.9rem;
		font-family: var(--font-ui);
		font-size: 0.82rem;
		color: var(--color-text-secondary);
	}
	.rail .book {
		font-family: var(--serif);
		font-size: 1.35rem;
		line-height: 1.15;
		text-align: left;
		padding: 0.2rem 0.4rem;
		margin-left: -0.4rem;
		border: 0;
		background: none;
		color: var(--color-text-primary);
		border-radius: var(--radius-md);
		cursor: pointer;
		text-wrap: balance;
	}
	.rail .book:hover { background: var(--color-bg-tertiary); }
	.stepper { display: inline-flex; align-items: center; border: 1px solid var(--color-border); border-radius: var(--radius-pill); overflow: hidden; }
	.stepper a, .stepper .dead, .stepper .ch { display: inline-flex; align-items: center; padding: 0.3rem 0.5rem; color: inherit; text-decoration: none; }
	.stepper a:hover { background: var(--color-bg-tertiary); }
	.stepper .dead { opacity: 0.3; }
	.stepper .ch { font-family: var(--serif); font-size: 1.05rem; min-width: 2.4rem; justify-content: center; font-variant-numeric: tabular-nums; border: 0; background: none; cursor: pointer; color: var(--color-text-primary); }
	.stepper .ch:hover { background: var(--color-bg-tertiary); }
	.seg { display: inline-flex; border: 1px solid var(--color-border); border-radius: var(--radius-pill); padding: 2px; }
	.rail .seg { flex-direction: column; border-radius: var(--radius-lg); align-self: stretch; }
	.seg button { padding: 0.25rem 0.7rem; border-radius: var(--radius-pill); border: 0; background: none; color: var(--color-text-secondary); font: inherit; cursor: pointer; text-align: left; }
	.rail .seg button { border-radius: calc(var(--radius-lg) - 2px); }
	.seg button[aria-pressed="true"] { background: var(--color-text-primary); color: var(--color-bg-primary); }
	.seg button:disabled { opacity: 0.4; cursor: default; }
	.tools { display: flex; flex-direction: column; align-items: flex-start; gap: 0.35rem; }
	.tool {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.3rem 0.6rem;
		border-radius: var(--radius-pill);
		border: 1px solid var(--color-border);
		background: none;
		color: var(--color-text-secondary);
		font: inherit;
		cursor: pointer;
	}
	.tool[aria-pressed="true"] { border-color: var(--rubric); color: var(--rubric); background: var(--rubric-soft); }
	.tool:disabled { opacity: 0.4; cursor: default; }
	.tool kbd { font: 0.68rem var(--font-ui); border: 1px solid var(--color-border); border-radius: 4px; padding: 0 0.3rem; margin-left: 0.15rem; }
	/* the reading log block in the rail */
	.log { display: flex; flex-direction: column; align-items: flex-start; gap: 0.45rem; padding-top: 0.75rem; border-top: 1px solid var(--color-border); align-self: stretch; }
	.ring-row { display: flex; align-items: center; gap: 0.5rem; }
	.ring { width: 2.4rem; height: 2.4rem; transform: rotate(-90deg); }
	.ring circle { fill: none; stroke: var(--color-border); stroke-width: 3; }
	.ring .fill { stroke: var(--rubric); stroke-linecap: round; transition: stroke-dasharray var(--transition-normal); }
	.ring-text { font-size: 0.75rem; line-height: 1.25; color: var(--color-text-secondary); }
	.ring-text b { color: var(--color-text-primary); font-weight: 600; }
	.tool.read[aria-pressed="true"] { border-color: var(--green); color: var(--green); background: color-mix(in srgb, var(--green) 12%, transparent); }
	.streak-row { display: flex; align-items: center; gap: 0.35rem; margin-left: -0.5rem; }
	.streak-line { margin: 0; font-size: 0.78rem; line-height: 1.3; color: var(--color-text-secondary); }
	.streak-line b { color: var(--color-text-primary); }
	.next-plan { font-size: 0.78rem; color: var(--rubric); text-decoration: none; }
	.next-plan:hover { text-decoration: underline; }
	.end-sentinel { height: 1px; }
	.read-row { display: flex; justify-content: flex-end; margin-top: 2rem; font-family: var(--font-ui); font-size: 0.9rem; }
	.chapter-nav .next-group { display: inline-flex; flex-direction: column; align-items: flex-end; gap: 0.35rem; }
	.chapter-nav .next.minor { font-size: 0.8rem; opacity: 0.7; }
	.dock .mark { width: 2.5rem; }
	.dock .mark[aria-pressed="true"] { color: var(--green); }
	.menu { position: relative; }
	.menu .pop {
		position: absolute;
		left: 0;
		top: calc(100% + 6px);
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		box-shadow: var(--shadow-md);
		padding: 0.35rem;
		min-width: 14rem;
		z-index: 40;
	}
	.pop button { display: flex; width: 100%; text-align: left; padding: 0.45rem 0.6rem; border-radius: var(--radius-sm); gap: 0.5rem; align-items: center; border: 0; background: none; color: var(--color-text-primary); font: inherit; cursor: pointer; }
	.pop button:hover { background: var(--color-bg-tertiary); }
	.pop button[role="menuitemradio"]::before { content: ''; width: 6px; height: 6px; border-radius: 50%; }
	.pop button[aria-checked="true"]::before { background: var(--rubric); }
	.sizes { display: inline-flex; border: 1px solid var(--color-border); border-radius: var(--radius-pill); overflow: hidden; }
	.sizes button { padding: 0.3rem 0.7rem; border: 0; background: none; color: var(--color-text-secondary); font: inherit; cursor: pointer; }
	.sizes button + button { border-left: 1px solid var(--color-border); }
	.sizes button:hover { background: var(--color-bg-tertiary); }
	.sizes button:disabled { opacity: 0.4; cursor: default; }

	/* ---------- dock (narrow screens) ---------- */
	.dock {
		display: none;
		position: fixed;
		left: 50%;
		bottom: max(12px, calc(env(safe-area-inset-bottom, 0px) + 8px));
		transform: translateX(-50%);
		z-index: 30;
		align-items: center;
		gap: 0.1rem;
		padding: 0.25rem 0.35rem;
		max-width: calc(100vw - 1.5rem);
		background: var(--glass-bg);
		backdrop-filter: blur(var(--glass-blur));
		border: 1px solid var(--glass-border);
		box-shadow: 0 4px 24px var(--glass-shadow);
		border-radius: var(--radius-pill);
		font-family: var(--font-ui);
		transition: transform var(--transition-normal), opacity var(--transition-normal);
	}
	.dock.away { transform: translate(-50%, calc(100% + 24px)); opacity: 0; pointer-events: none; }
	.dock .step, .dock .aa, .dock .find, .dock .mark, .dock .where {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-height: 2.5rem;
		border: 0;
		background: none;
		color: var(--color-text-primary);
		text-decoration: none;
		border-radius: var(--radius-pill);
		cursor: pointer;
	}
	.dock .step { width: 2.5rem; }
	.dock .dead { opacity: 0.3; }
	.dock .where { font-family: var(--serif); font-size: 1.1rem; padding: 0 0.5rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 11rem; }
	.dock .sep { width: 1px; height: 1.4rem; background: var(--color-border); margin: 0 0.3rem; }
	.dock .aa { font-family: var(--serif); font-size: 1.1rem; width: 2.5rem; }
	.dock .find { width: 2.5rem; }
	.dock .step:active, .dock .aa:active, .dock .find:active, .dock .where:active { background: var(--color-bg-tertiary); }

	/* ---------- page ---------- */
	.page {
		display: grid;
		grid-template-columns: minmax(0, var(--measure));
		gap: 3rem;
		justify-content: center;
		padding: 2.5rem 1.5rem 4rem;
		position: relative;
	}
	@media (min-width: 1024px) {
		.rail { display: flex; }
		.page { grid-template-columns: var(--rail-w) minmax(0, var(--measure)); gap: 2.5rem; }
		.margin-notes .page { grid-template-columns: var(--rail-w) minmax(0, var(--measure)) var(--notes-w); }
	}
	.text { min-width: 0; }

	.chapter-head { margin: 0 0 1.5rem; }
	.chapter-head .kicker { font-family: var(--font-ui); font-size: 0.8rem; color: var(--color-text-secondary); margin: 0 0 0.25rem; }
	.chapter-head h1 { font-weight: 400; font-size: 2.1rem; line-height: 1.15; margin: 0; text-wrap: balance; }
	.chapter-head h1 .num { color: var(--rubric); }
	.commentaries { display: flex; align-items: center; gap: 0.35rem; margin-top: 0.9rem; font-family: var(--font-ui); }
	.commentaries .label { font-size: 0.78rem; color: var(--color-text-secondary); margin-right: 0.35rem; }
	.commentaries .disc { position: relative; display: inline-flex; border-radius: 50%; transition: transform var(--transition-fast); }
	.commentaries .disc:hover { transform: translateY(-2px); }
	.commentaries .tip { position: absolute; bottom: calc(100% + 6px); left: 50%; transform: translateX(-50%); padding: 0.2rem 0.5rem; border-radius: var(--radius-sm); background: var(--color-text-primary); color: var(--color-bg-primary); font-size: 0.72rem; white-space: nowrap; opacity: 0; pointer-events: none; transition: opacity var(--transition-fast); }
	.commentaries .disc:hover .tip, .commentaries .disc:focus-visible .tip { opacity: 1; }
	.v .fathers { display: flex; justify-content: flex-end; margin-top: 0.2rem; }
	.pop .pop-sep { height: 1px; background: var(--color-border); margin: 0.25rem 0; }
	.pop button[role="menuitemcheckbox"]::before { content: ''; width: 6px; height: 6px; border-radius: 2px; }
	.pop button[role="menuitemcheckbox"][aria-checked="true"]::before { background: var(--rubric); }
	.pop button:disabled { opacity: 0.4; cursor: default; }
	.sheet .father-head { display: flex; align-items: center; gap: 0.7rem; margin-bottom: 0.8rem; }
	.sheet .father-head b { font-family: var(--serif); font-size: 1.05rem; font-weight: 400; color: var(--color-text-primary); }
	.sheet .father-head small { color: var(--color-text-secondary); }
	.sheet .range { font-size: 0.75rem; color: var(--rubric); margin: 0.6rem 0 0.2rem; }
	.sheet .author-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.3rem; }
	.sheet .author-list button { all: unset; cursor: pointer; display: flex; align-items: center; gap: 0.7rem; width: 100%; padding: 0.35rem 0.4rem; border-radius: var(--radius-sm); }
	.sheet .author-list button:hover { background: var(--color-bg-tertiary); }
	.sheet .author-list small { margin-left: auto; color: var(--color-text-tertiary); }
	.sheet .picker { display: flex; flex-direction: column; gap: 0.7rem; }
	.sheet .picker .seg { flex-wrap: wrap; align-self: flex-start; }
	.sheet .picker .seg button { padding: 0.35rem 0.7rem; font-size: 0.85rem; }
	.sheet .picker-search { border: 1px solid var(--color-border); border-radius: var(--radius-pill); padding: 0.45rem 0.9rem; background: var(--color-bg-tertiary); color: var(--color-text-primary); font: inherit; font-family: var(--font-ui); }
	.sheet .picker .hint { margin: 0; font-size: 0.85rem; color: var(--color-text-secondary); }
	.sheet .picker .author-list button { gap: 0.6rem; }
	.sheet .picker .author-list button[aria-pressed="true"] { background: var(--rubric-soft); }
	.sheet .pick-name { display: flex; flex-direction: column; line-height: 1.25; }
	.sheet .pick-name small { margin: 0; font-size: 0.72rem; color: var(--color-text-tertiary); }
	.sheet .picker .check { margin-left: auto; color: var(--rubric); font-weight: 700; }

	.intro {
		font-family: var(--font-ui);
		border-left: 2px solid color-mix(in srgb, var(--rubric) 40%, transparent);
		padding: 0.1rem 0 0.1rem 1rem;
		margin: 0 0 2rem;
		color: var(--color-text-secondary);
		font-size: 0.92em;
		line-height: 1.55;
	}
	.intro summary { cursor: pointer; font-family: var(--font-ui); font-size: 0.8rem; list-style: none; display: flex; gap: 0.4rem; align-items: center; }
	.intro summary::-webkit-details-marker { display: none; }
	.intro summary::before { content: '▸'; font-size: 0.75em; transition: transform var(--transition-fast); }
	.intro[open] summary::before { transform: rotate(90deg); }
	.intro p { margin: 0.5rem 0 0; }
	.book-intro summary { font-variant: small-caps; letter-spacing: 0.04em; text-transform: lowercase; }

	/* verses */
	.v { position: relative; margin: 0 0 0.6em; }
	.v .n {
		position: absolute;
		left: -3rem;
		width: 2.4rem;
		text-align: right;
		top: 0.1em;
		font-family: var(--font-ui);
		font-size: 0.82rem;
		font-weight: 700;
		color: var(--rubric);
		font-variant-numeric: tabular-nums;
		background: none;
		border: 0;
		padding: 0;
		cursor: pointer;
		line-height: inherit;
	}
	.v .n:hover { text-decoration: underline; }
	.v.target { background: var(--rubric-soft); box-shadow: 0 0 0 0.5rem var(--rubric-soft); border-radius: 2px; }
	.v.lit .primary { background: linear-gradient(transparent 62%, var(--rubric-soft) 62%); }
	.v .la { display: block; color: var(--color-text-secondary); font-size: 0.92em; line-height: 1.5; margin: 0.15em 0 0.55em; }
	.cols { display: block; }
	.parallel .cols { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; align-items: start; }
	.parallel .secondary { color: var(--color-text-secondary); }
	.no-markers :global(.fn) { display: none; }

	/* inline notes */
	.v .inline { display: none; }
	.inline-notes .v .inline {
		display: block;
		font-family: var(--font-ui);
		font-size: 0.86rem;
		line-height: 1.5;
		color: var(--color-text-secondary);
		margin: 0.3rem 0 0.9rem;
		padding-left: 1rem;
		border-left: 2px solid var(--color-border);
	}
	.inline ol, .notes ol, .sheet ol { list-style: none; margin: 0; padding: 0; }
	.inline li, .notes li { margin: 0 0 0.35rem; }
	.nn { color: var(--rubric); font-family: var(--font-ui); font-size: 0.7rem; font-weight: 700; margin-right: 0.35rem; vertical-align: 0.15em; }
	.notes li.on, .inline li.on, .sheet li.on { background: var(--rubric-soft); margin-left: -0.4rem; padding: 0.15rem 0.4rem; border-radius: var(--radius-sm); }

	/* marginalia */
	.notes { display: none; position: relative; font-family: var(--font-ui); font-size: 0.86rem; line-height: 1.5; color: var(--color-text-secondary); }
	@media (min-width: 1024px) {
		.margin-notes .notes { display: block; }
	}
	.notes .ng { position: absolute; left: 0; right: 0; padding-left: 1.9rem; transition: top 180ms ease; }
	.notes .ng .nv { position: absolute; left: 0; top: 0.1em; font-family: var(--font-ui); font-size: 0.78rem; font-weight: 700; color: var(--rubric); font-variant-numeric: tabular-nums; }
	.notes-empty { font-family: var(--font-ui); font-size: 0.8rem; }

	/* chapter footer nav */
	.chapter-nav { display: flex; justify-content: space-between; gap: 1rem; margin-top: 3rem; padding-top: 1.25rem; border-top: 1px solid var(--color-border); font-family: var(--font-ui); font-size: 0.9rem; }
	.chapter-nav a { text-decoration: none; color: var(--color-text-secondary); display: inline-flex; flex-direction: column; gap: 0.1rem; }
	.chapter-nav a small { font-size: 0.75rem; opacity: 0.8; }
	.chapter-nav a:hover { color: var(--rubric); }
	.chapter-nav .next { text-align: right; align-items: flex-end; }

	.sheet .n { font-family: var(--font-ui); font-size: 0.68rem; font-weight: 700; color: var(--rubric); margin-right: 0.35rem; vertical-align: 0.2em; }
	.sheet .more { color: var(--color-text-secondary); font-family: var(--font-ui); font-size: 0.78rem; }

	/* sheet */
	.scrim { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.35); z-index: 60; border: 0; opacity: 0; transition: opacity 200ms; }
	.scrim.in { opacity: 1; }
	.sheet {
		position: fixed;
		left: 0; right: 0; bottom: 0;
		z-index: 61;
		background: var(--color-surface);
		border-radius: var(--radius-lg) var(--radius-lg) 0 0;
		box-shadow: var(--shadow-lg);
		max-height: 78vh;
		display: flex;
		flex-direction: column;
		transform: translateY(100%);
		transition: transform 220ms ease;
	}
	.sheet.in { transform: translateY(0); }
	.sheet .grab { width: 2.4rem; height: 4px; border-radius: 2px; background: var(--color-border); margin: 0.55rem auto 0.25rem; }
	.sheet header { display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem 0.6rem; font-family: var(--font-ui); font-size: 0.85rem; color: var(--color-text-secondary); border-bottom: 1px solid var(--color-border); }
	.sheet header strong { font-family: var(--serif); font-size: 1.05rem; color: var(--color-text-primary); font-weight: 400; }
	.sheet header .back { padding: 0.3rem 0.5rem; margin-left: -0.5rem; border: 0; background: none; color: var(--rubric); font: inherit; cursor: pointer; }
	.sheet header .close { margin-left: auto; padding: 0.3rem; border: 0; background: none; color: inherit; cursor: pointer; display: inline-flex; }
	.sheet .body { font-family: var(--font-ui); overflow: auto; padding: 0.9rem 1rem calc(1.5rem + env(safe-area-inset-bottom)); font-size: 0.95rem; line-height: 1.55; color: var(--color-text-secondary); }
	.sheet .body li { margin: 0 0 0.6rem; }
	.sheet .jump, .sheet .hit { color: var(--rubric); text-decoration: none; }
	.sheet .hit { color: inherit; display: block; font-family: var(--serif); }
	.sheet .hit .n { color: var(--rubric); }
	.sheet .books { display: grid; grid-template-columns: repeat(auto-fill, minmax(9rem, 1fr)); gap: 0.25rem 1rem; }
	.sheet .books h4 { grid-column: 1 / -1; margin: 0.6rem 0 0.2rem; font-family: var(--font-ui); font-size: 0.75rem; color: var(--color-text-secondary); font-weight: 600; }
	.sheet .books a, .sheet .books .soon { text-align: left; padding: 0.35rem 0.4rem; border-radius: var(--radius-sm); font-family: var(--serif); text-decoration: none; color: var(--color-text-primary); }
	.sheet .books a:hover, .sheet .books a.cur { background: var(--rubric-soft); color: var(--rubric); }
	.sheet .books .soon { opacity: 0.4; }
	.sheet { max-width: 44rem; margin-inline: auto; }
	.sheet .sheet-h { margin: 0 0 0.4rem; font-family: var(--font-ui); font-size: 0.75rem; color: var(--color-text-secondary); font-weight: 600; }
	.sheet .chapters + .books { margin-top: 1rem; }
	.sheet .settings { display: flex; flex-direction: column; gap: 0.9rem; font-family: var(--font-ui); }
	.sheet .settings .row { display: flex; flex-direction: column; gap: 0.35rem; }
	.sheet .settings .row > span { font-size: 0.75rem; font-weight: 600; }
	.sheet .settings .seg { flex-wrap: wrap; align-self: flex-start; }
	.sheet .settings .seg button { padding: 0.4rem 0.8rem; }
	.sheet .settings .tool { align-self: flex-start; }
	.sheet .settings .sizes { align-self: flex-start; }
	.sheet .search {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-pill);
		padding: 0.5rem 1rem;
		background: var(--color-bg-tertiary);
		color: var(--color-text-secondary);
		font-family: var(--font-ui);
		margin-bottom: 0.9rem;
	}
	.sheet .search input { flex: 1; border: 0; background: none; font: inherit; font-size: 1rem; color: var(--color-text-primary); outline: none; min-width: 0; }
	.sheet .hint { font-family: var(--font-ui); font-size: 0.85rem; }
	.sheet .chapters { display: grid; grid-template-columns: repeat(auto-fill, minmax(2.8rem, 1fr)); gap: 0.35rem; }
	.sheet .chapters a { display: block; text-align: center; padding: 0.5rem 0; border: 1px solid var(--color-border); border-radius: var(--radius-sm); text-decoration: none; color: inherit; font-variant-numeric: tabular-nums; }
	.sheet .chapters a.cur { background: var(--rubric); color: var(--color-bg-primary); border-color: var(--rubric); }


	@media (max-width: 1023px) {
		.dock { display: flex; }
		.page { padding: 1.25rem 1rem calc(5.5rem + env(safe-area-inset-bottom, 0px)); }
		/* The number floats into the first line instead of sitting in a gutter. */
		.v .n { position: static; float: left; width: auto; font-size: 0.72rem; margin: 0.15em 0.4rem 0 0; line-height: 1.2; }
		.chapter-head h1 { font-size: 1.7rem; }
		.chapter-nav a small { display: none; }
	}
	@media (prefers-reduced-motion: reduce) {
		.sheet, .scrim, .dock, .notes .ng, .intro summary::before { transition: none; }
	}
</style>
