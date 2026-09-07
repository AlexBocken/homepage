<script lang="ts">
	/**
	 * Bible references as peeks: hover a reference (an element with class
	 * `ref` and `data-ref`) and a small window shows the passage; a reference
	 * inside that window opens another on top; a click pins a window and its
	 * ancestors; leaving closes what was opened from there. On narrow screens
	 * a bottom sheet takes the place of the window, unless the host handles
	 * narrow screens itself (`onNarrow`).
	 *
	 * The Bible reader and the rosary share this; the reader adds in-chapter
	 * verse links (`vref`, via `verseOf`) and footnote markers (`fn`, via
	 * `noteOf`). Hover is delegated on `root` (the document body by default).
	 */
	import { tick } from 'svelte';
	import { MediaQuery } from 'svelte/reactivity';
	import { resolve } from '$app/paths';
	import { m, type FaithLang } from '$lib/js/faithI18n';
	import { fetchPassage } from '$lib/faith/passages';
	import { registerPeeks } from '$lib/faith/peeks.svelte';
	import NoteText from './NoteText.svelte';
	import FatherAvatar from './FatherAvatar.svelte';
	import { fatherLabel } from '$lib/faith/fathers';
	import X from '@lucide/svelte/icons/x';

	type Verses = { verse: number; text: string }[];
	interface Props {
		lang: FaithLang;
		faithLang: string;
		bibleLang: string;
		/** Where hover and click are listened for; the body when absent. */
		root?: HTMLElement | null;
		/** Label under a passage's title: which text it is. */
		source?: string;
		/** In-chapter "V. n" links: title, text and reader address of a verse. */
		verseOf?: (verse: number) => { title: string; sub: string; verses: Verses; goto: string } | null;
		/** Footnote markers: the note at verse n, number k. Absent when notes are not peeked. */
		noteOf?: (verse: number, number: number) => { title: string; sub: string; text: string } | null;
		/** Language of note text, for hyphenation and screen readers. */
		notesLang?: string;
		/** Narrow screens: the host shows its own sheet when given. */
		onNarrow?: (view: { kind: 'ref'; reference: string } | { kind: 'verse'; verse: number } | { kind: 'father'; verse: number; author: string } | { kind: 'fathers'; verse: number }) => void;
	}
	const { lang, faithLang, bibleLang, root = null, source = 'Allioli', verseOf, noteOf, notesLang = 'de', onNarrow }: Props = $props();
	const t = $derived(m[lang]);

	function href(book: string, ch: number, verse?: number): string {
		const path = resolve('/[faithLang=faithLang]/[bible=bibleLang]/[book]/[[chapter]]', { faithLang, bible: bibleLang, book, chapter: String(ch) });
		return verse ? `${path}#${verse}` : path;
	}

	/* ---------- wide or narrow ---------- */
	const wideQuery = new MediaQuery('(min-width: 1024px)', true);
	const wide = $derived(wideQuery.current);

	/* ---------- the stack ---------- */
	export type CommentaryAuthor = { id: string; name: { en: string; de: string }; saint: boolean; died: number | null; group: string; portrait: { artist: string; title: string; year: string } | null };
	export type CommentaryEntry = { verse: number; verseEnd: number | null; work: string | null; title: string | null; lang: string; text: string };
	type AuthorItem = { id: string; name: { en: string; de: string }; saint: boolean; hasPortrait: boolean; n: number; open: (anchor: HTMLElement) => void };
	type PeekBody =
		| { kind: 'passage'; verses: Verses; more: boolean }
		| { kind: 'note'; text: string }
		| { kind: 'commentary'; author: CommentaryAuthor; entries: CommentaryEntry[]; more: string | null }
		| { kind: 'authors'; items: AuthorItem[] };
	type Peek = {
		id: number;
		depth: number;
		anchor: HTMLElement;
		title: string;
		sub: string;
		goto: string | null;
		missing: boolean;
		loading: boolean;
		body: PeekBody | null;
		pinned: boolean;
		left: number;
		top: number;
	};
	let peeks = $state<Peek[]>([]);
	let seq = 0;
	let peekTimer: ReturnType<typeof setTimeout> | null = null;
	let hideTimer: ReturnType<typeof setTimeout> | null = null;

	/** 0 for an anchor in the page, n+1 for one inside the peek at depth n. */
	function depthOf(anchor: HTMLElement): number {
		const host = anchor.closest<HTMLElement>('.peek');
		return host ? Number(host.dataset.depth) + 1 : 0;
	}
	function place(id: number) {
		const p = peeks.find((x) => x.id === id);
		const el = document.querySelector<HTMLElement>(`.peek[data-id="${id}"]`);
		if (!p || !el) return;
		const r = p.anchor.getBoundingClientRect();
		p.left = Math.min(Math.max(12, r.left), window.innerWidth - el.offsetWidth - 12);
		// Below the anchor, else above it; never under the floating site header.
		const HEADER = 76;
		let top = r.bottom + 8;
		if (top + el.offsetHeight > window.innerHeight - 12) top = Math.max(HEADER, r.top - el.offsetHeight - 8);
		p.top = top;
	}
	type Init = Pick<Peek, 'title' | 'sub' | 'goto' | 'missing' | 'loading' | 'body'>;
	function open(anchor: HTMLElement, init: Init, pinned: boolean): number {
		const depth = depthOf(anchor);
		closeFrom(depth, true);
		if (pinned) for (const p of peeks) p.pinned = true;
		const id = ++seq;
		peeks = [...peeks, { ...init, id, depth, anchor, pinned, left: 0, top: 0 }];
		anchor.classList.add('on');
		tick().then(() => place(id));
		return id;
	}
	function update(id: number, patch: Partial<Init>) {
		const p = peeks.find((x) => x.id === id);
		if (!p) return;
		Object.assign(p, patch);
		tick().then(() => place(id));
	}
	/** Closes the peeks at `depth` and above; pinned ones stay unless forced. */
	function closeFrom(depth: number, force: boolean) {
		const keep = peeks.filter((p) => p.depth < depth || (!force && p.pinned));
		for (const p of peeks) if (!keep.includes(p)) p.anchor.classList.remove('on');
		if (keep.length !== peeks.length) peeks = keep;
	}
	function pinChain(depth: number) {
		for (const p of peeks) if (p.depth <= depth) p.pinned = true;
	}

	async function showRef(reference: string, anchor: HTMLElement, pinned: boolean) {
		const id = open(anchor, { title: reference, sub: source, goto: null, missing: false, loading: true, body: null }, pinned);
		const p = await fetchPassage(faithLang, reference);
		update(
			id,
			p
				? { title: p.label, goto: p.slug ? href(p.slug, p.chapter, p.verses[0]?.verse) : null, loading: false, body: { kind: 'passage', verses: p.verses, more: p.more } }
				: { sub: '', missing: true, loading: false }
		);
	}
	function showVerse(verse: number, anchor: HTMLElement, pinned: boolean) {
		const v = verseOf?.(verse) ?? null;
		open(anchor, { title: v?.title ?? `V. ${verse}`, sub: v?.sub ?? '', goto: v?.goto ?? null, missing: !v, loading: false, body: v ? { kind: 'passage', verses: v.verses, more: false } : null }, pinned);
	}
	function showNote(verse: number, number: number, anchor: HTMLElement) {
		const n = noteOf?.(verse, number) ?? null;
		open(anchor, { title: n?.title ?? '', sub: n?.sub ?? '', goto: null, missing: !n, loading: false, body: n ? { kind: 'note', text: n.text } : null }, false);
	}

	/* ---------- the narrow-screen sheet ---------- */
	let sheet = $state<{ reference: string; passage: Awaited<ReturnType<typeof fetchPassage>> | 'loading' } | null>(null);
	async function openSheet(reference: string) {
		sheet = { reference, passage: 'loading' };
		const p = await fetchPassage(faithLang, reference);
		if (sheet?.reference === reference) sheet = { reference, passage: p };
	}

	/** A Father's excerpts on a verse: fetched from `url`, shown with his portrait. */
	export async function openCommentary(opts: { anchor: HTMLElement; title: string; verse: number; author: string; url: string; more: string | null }) {
		if (!wide) {
			onNarrow?.({ kind: 'father', verse: opts.verse, author: opts.author });
			return;
		}
		const already = peeks.find((p) => p.anchor === opts.anchor);
		if (already) {
			pinChain(already.depth);
			return;
		}
		const id = open(opts.anchor, { title: opts.title, sub: '', goto: null, missing: false, loading: true, body: null }, true);
		try {
			const res = await fetch(opts.url);
			if (!res.ok) throw new Error(String(res.status));
			const data = (await res.json()) as { author: CommentaryAuthor; entries: CommentaryEntry[] };
			update(id, { loading: false, body: { kind: 'commentary', author: data.author, entries: data.entries, more: opts.more } });
		} catch {
			update(id, { loading: false, missing: true });
		}
	}
	/** All commentators of a verse as a list; each row opens its own peek. */
	export function openAuthors(opts: { anchor: HTMLElement; title: string; verse: number; items: AuthorItem[] }) {
		if (!wide) {
			onNarrow?.({ kind: 'fathers', verse: opts.verse });
			return;
		}
		const already = peeks.find((p) => p.anchor === opts.anchor);
		if (already) {
			pinChain(already.depth);
			return;
		}
		open(opts.anchor, { title: opts.title, sub: '', goto: null, missing: false, loading: false, body: { kind: 'authors', items: opts.items } }, true);
	}

	/* ---------- what the host calls ---------- */
	export function openRef(reference: string, anchor: HTMLElement) {
		if (!wide) {
			if (onNarrow) onNarrow({ kind: 'ref', reference });
			else openSheet(reference);
			return;
		}
		const already = peeks.find((p) => p.anchor === anchor);
		if (already) pinChain(already.depth);
		else showRef(reference, anchor, true);
	}
	export function openVerse(verse: number, anchor: HTMLElement) {
		if (!wide) {
			onNarrow?.({ kind: 'verse', verse });
			return;
		}
		const already = peeks.find((p) => p.anchor === anchor);
		if (already) pinChain(already.depth);
		else showVerse(verse, anchor, true);
	}
	export function closeAll() {
		closeFrom(0, true);
		sheet = null;
	}

	/* ---------- hover and clicks, delegated ---------- */
	function onOver(e: Event) {
		if (!wide) return;
		const target = e.target as HTMLElement;
		const hot = target.closest<HTMLElement>('.ref, .vref, .fn');
		const host = target.closest<HTMLElement>('.peek');
		if (!hot && !host) return;
		if (hideTimer) clearTimeout(hideTimer);
		if (peekTimer) clearTimeout(peekTimer);
		const hostDepth = host ? Number(host.dataset.depth) : -1;
		if (hot) {
			peekTimer = setTimeout(() => {
				if (peeks.some((p) => p.anchor === hot)) return;
				// A pinned peek at this depth or above stays put; hover cannot replace it.
				if (peeks.some((p) => p.depth > hostDepth && p.pinned)) return;
				if (hot.classList.contains('fn')) {
					if (noteOf) showNote(Number(hot.dataset.verse), Number(hot.dataset.n), hot);
				} else if (hot.dataset.ref) showRef(hot.dataset.ref, hot, false);
				else if (hot.dataset.verse) showVerse(Number(hot.dataset.verse), hot, false);
			}, 160);
		} else {
			// Back on a peek's own text: whatever was opened from it goes.
			hideTimer = setTimeout(() => closeFrom(hostDepth + 1, false), 220);
		}
	}
	function onOut(e: Event) {
		if (!wide) return;
		if (peekTimer) clearTimeout(peekTimer);
		if ((e.target as HTMLElement).closest('.ref, .vref, .fn, .peek')) {
			if (hideTimer) clearTimeout(hideTimer);
			hideTimer = setTimeout(() => closeFrom(0, false), 220);
		}
	}
	function onDocClick(e: MouseEvent) {
		if (peeks.length === 0) return;
		const target = e.target as HTMLElement;
		if (target.closest('.peek, .ref, .vref, .fn')) return;
		// The click that opened a peek (a commentator's disc, say) must not close it.
		if (peeks.some((p) => p.anchor.contains(target))) return;
		closeFrom(0, true);
	}
	function onKey(e: KeyboardEvent) {
		if (e.key === 'Escape') closeAll();
	}
	$effect(() => registerPeeks({ openRef, closeAll }));
	$effect(() => {
		const el = root ?? document.body;
		el.addEventListener('mouseover', onOver);
		el.addEventListener('mouseout', onOut);
		return () => {
			el.removeEventListener('mouseover', onOver);
			el.removeEventListener('mouseout', onOut);
		};
	});
	// Refs inside a peek are NoteText spans; the callbacks land here.
	const onRefInside = (reference: string, el: HTMLElement) => openRef(reference, el);
	const onVerseInside = (verse: number, el: HTMLElement) => openVerse(verse, el);
</script>

<svelte:window onclick={onDocClick} onkeydown={onKey} />

{#each peeks as p (p.id)}
	<div class="peek" data-id={p.id} data-depth={p.depth} style="left: {p.left}px; top: {p.top}px; z-index: {50 + p.depth}" role="dialog" aria-label={p.title}>
		<header>
			<strong>{p.title}</strong>
			{#if p.goto}<a href={p.goto} onclick={() => closeFrom(0, true)}>{t.bible_jump} ›</a>{:else if p.sub}<span>{p.sub}</span>{/if}
		</header>
		{#if p.loading}
			<p class="more">…</p>
		{:else if p.missing || !p.body}
			<p class="more">{t.bible_ref_missing}</p>
		{:else if p.body.kind === 'note'}
			<p class="note" lang={notesLang}><NoteText text={p.body.text} onref={onRefInside} onverse={onVerseInside} /></p>
		{:else if p.body.kind === 'commentary'}
			{@const a = p.body.author}
			<div class="father">
				<FatherAvatar id={a.id} name={a.name.en} hasPortrait={!!a.portrait} size={40} />
				<div class="who">
					<b>{fatherLabel(a, lang)}</b>
					<span>{a.died ? `${t.bible_died} ${a.died}` : ''}{p.body.entries[0]?.work ? ` · ${p.body.entries[0].work}` : ''}</span>
				</div>
			</div>
			{#each p.body.entries as e, i (i)}
				{@const prev = p.body.entries[i - 1]}
				{#if e.verseEnd && (!prev || prev.verseEnd !== e.verseEnd)}<p class="range">V. {e.verse}–{e.verseEnd}</p>{/if}
				{#each e.text.split(/\n{2,}/) as para, j (j)}<p class="excerpt" lang={e.lang}>{para}</p>{/each}
			{/each}
			{#if p.body.more}<p class="more-link"><a href={p.body.more} onclick={() => closeFrom(0, true)}>{t.bible_to_commentary} ›</a></p>{/if}
			{#if a.portrait}<p class="credit">{t.bible_portrait_credit}: {a.portrait.artist}, {a.portrait.title}, {a.portrait.year}</p>{/if}
		{:else if p.body.kind === 'authors'}
			<ul class="authors">
				{#each p.body.items as it (it.id)}
					<li><button type="button" onclick={(e) => it.open(e.currentTarget)}><FatherAvatar id={it.id} name={it.name.en} hasPortrait={it.hasPortrait} size={28} /><span>{fatherLabel(it, lang)}</span>{#if it.n > 1}<small>{it.n}</small>{/if}</button></li>
				{/each}
			</ul>
		{:else}
			{#each p.body.verses as pv (pv.verse)}
				<p><span class="n">{pv.verse}</span>{pv.text}</p>
			{/each}
			{#if p.body.more}<p class="more">…</p>{/if}
		{/if}
	</div>
{/each}

{#if sheet}
	<button class="scrim" onclick={closeAll} aria-label={t.bible_close} tabindex="-1"></button>
	<div class="sheet" role="dialog" aria-modal="true" aria-label={sheet.passage && sheet.passage !== 'loading' ? sheet.passage.label : sheet.reference}>
		<div class="grab"></div>
		<header>
			<strong>{sheet.passage && sheet.passage !== 'loading' ? sheet.passage.label : sheet.reference}</strong>
			<button class="close" onclick={closeAll} aria-label={t.bible_close}><X size={18} strokeWidth={2} /></button>
		</header>
		<div class="body">
			{#if sheet.passage === 'loading'}
				<p class="more">…</p>
			{:else if !sheet.passage}
				<p class="more">{t.bible_ref_missing}</p>
			{:else}
				{#each sheet.passage.verses as pv (pv.verse)}<p><span class="n">{pv.verse}</span>{pv.text}</p>{/each}
				{#if sheet.passage.more}<p class="more">…</p>{/if}
				{#if sheet.passage.slug}<p><a class="jump" href={href(sheet.passage.slug, sheet.passage.chapter, sheet.passage.verses[0]?.verse)} onclick={closeAll}>{t.bible_jump} ›</a></p>{/if}
			{/if}
		</div>
	</div>
{/if}

<style>
	.peek,
	.sheet {
		--rubric: var(--red);
		--pk-serif: var(--serif, 'Linux Libertine', Georgia, 'Times New Roman', serif);
		--pk-ui: var(--font-ui, Helvetica, Arial, 'Noto Sans', sans-serif);
		font-family: var(--pk-serif);
		color: var(--color-text-primary);
	}
	.peek {
		position: fixed;
		z-index: 50;
		width: min(24rem, calc(100vw - 2rem));
		max-height: 60vh;
		overflow: auto;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		box-shadow: var(--shadow-lg);
		padding: 0.75rem 0.95rem 0.85rem;
		font-size: 0.92rem;
		line-height: 1.5;
	}
	.peek header { display: flex; justify-content: space-between; align-items: baseline; gap: 0.5rem; margin-bottom: 0.4rem; font-family: var(--pk-ui); font-size: 0.78rem; color: var(--color-text-secondary); }
	.peek header strong { font-family: var(--pk-serif); font-size: 1rem; color: var(--color-text-primary); font-weight: 400; }
	.peek header a { color: var(--rubric); text-decoration: none; white-space: nowrap; }
	.peek p { margin: 0 0 0.35rem; }
	.peek p.note { font-family: var(--pk-ui); font-size: 0.88rem; }
	.peek .father { display: flex; align-items: center; gap: 0.6rem; margin-bottom: 0.6rem; }
	.peek .who { display: flex; flex-direction: column; font-family: var(--pk-ui); font-size: 0.78rem; color: var(--color-text-secondary); }
	.peek .who b { font-family: var(--pk-serif); font-size: 1rem; font-weight: 400; color: var(--color-text-primary); }
	.peek .range { font-family: var(--pk-ui); font-size: 0.72rem; color: var(--rubric); margin: 0.5rem 0 0.2rem; }
	.peek .excerpt { font-size: 0.9rem; }
	.peek .more-link { margin-top: 0.5rem; font-family: var(--pk-ui); font-size: 0.8rem; }
	.peek .more-link a { color: var(--rubric); text-decoration: none; }
	.peek .credit { margin-top: 0.6rem; font-family: var(--pk-ui); font-size: 0.68rem; color: var(--color-text-tertiary); }
	.peek .authors { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.2rem; }
	.peek .authors button { all: unset; cursor: pointer; display: flex; align-items: center; gap: 0.55rem; width: 100%; padding: 0.25rem 0.35rem; border-radius: var(--radius-sm); font-family: var(--pk-ui); font-size: 0.85rem; }
	.peek .authors button:hover { background: var(--color-bg-tertiary); }
	.peek .authors small { margin-left: auto; color: var(--color-text-tertiary); }
	.n { font-family: var(--pk-ui); font-size: 0.68rem; font-weight: 700; color: var(--rubric); margin-right: 0.35rem; vertical-align: 0.2em; }
	.more { color: var(--color-text-secondary); font-family: var(--pk-ui); font-size: 0.78rem; }

	.scrim { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.35); z-index: 60; border: 0; }
	.sheet {
		position: fixed;
		left: 0; right: 0; bottom: 0;
		z-index: 61;
		max-width: 44rem;
		margin-inline: auto;
		background: var(--color-surface);
		border-radius: var(--radius-lg) var(--radius-lg) 0 0;
		box-shadow: var(--shadow-lg);
		max-height: 78vh;
		display: flex;
		flex-direction: column;
	}
	.sheet .grab { width: 2.4rem; height: 4px; border-radius: 2px; background: var(--color-border); margin: 0.55rem auto 0.25rem; }
	.sheet header { display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem 0.6rem; font-family: var(--pk-ui); font-size: 0.85rem; color: var(--color-text-secondary); border-bottom: 1px solid var(--color-border); }
	.sheet header strong { font-family: var(--pk-serif); font-size: 1.05rem; color: var(--color-text-primary); font-weight: 400; }
	.sheet .close { margin-left: auto; padding: 0.3rem; border: 0; background: none; color: inherit; cursor: pointer; display: inline-flex; }
	.sheet .body { overflow: auto; padding: 0.9rem 1rem calc(1.5rem + env(safe-area-inset-bottom)); font-size: 0.95rem; line-height: 1.55; }
	.sheet .body p { margin: 0 0 0.5rem; }
	.sheet .jump { color: var(--rubric); text-decoration: none; }

	@media (max-width: 1023px) {
		.peek { display: none; }
	}
</style>
