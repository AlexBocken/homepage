<script lang="ts">
	/**
	 * One section of the Catechism: its heading, its paragraphs with their
	 * numbers in the margin, the KURZTEXTE / IN BRIEF summary set apart, and each
	 * paragraph's footnotes beside it — in the right-hand column on a wide
	 * screen, under the paragraph on a narrow one, as the Bible reader does.
	 *
	 * Everything works with no script running: a footnote marker is an anchor to
	 * its note, a Scripture citation is a link into the Bible, a paragraph is
	 * addressable by `#n1322`. `ReferencePeeks` turns the citations into hover
	 * windows when script is available.
	 */
	import ReferencePeeks from '$lib/components/faith/bible/ReferencePeeks.svelte';
	import { bibleSlug, m, type FaithLang } from '$lib/js/faithI18n';
	import { addressed } from '$lib/faith/cccText';
	import type { CccNote, CccSection } from '$lib/faith/cccTypes';

	interface Props {
		lang: FaithLang;
		faithLang: string;
		section: CccSection;
		/** Paragraphs a citation asked for, marked so the eye finds them. */
		highlight?: { from: number; to: number } | null;
	}
	const { lang, faithLang, section, highlight = null }: Props = $props();
	const t = $derived(m[lang]);
	const bibleLang = $derived(bibleSlug(lang));

	/**
	 * A paragraph, the quotations that continue it and the notes all of them
	 * cite — one row of the reader. Headings stand between rows.
	 */
	type Unit = { kind: 'h'; text: string } | { kind: 'p'; n: number; html: string; brief: boolean; revised: string | null; quotes: string[]; notes: CccNote[] };

	const units = $derived.by(() => {
		const out: Unit[] = [];
		let current: Extract<Unit, { kind: 'p' }> | null = null;
		const collect = (html: string) => {
			if (!current) return;
			for (const k of html.matchAll(/data-fn="(\d+)"/g)) {
				const note = section.notes.find((n) => n.k === Number(k[1]));
				if (note && !current.notes.includes(note)) current.notes.push(note);
			}
		};
		for (const block of section.blocks) {
			if (block.t === 'h') {
				current = null;
				out.push({ kind: 'h', text: block.text });
			} else if (block.t === 'p') {
				current = { kind: 'p', n: block.n, html: block.html, brief: block.brief === true, revised: block.revised ?? null, quotes: [], notes: [] };
				collect(block.html);
				out.push(current);
			} else if (current) {
				current.quotes.push(block.html);
				collect(block.html);
			} else {
				out.push({ kind: 'p', n: 0, html: block.html, brief: false, revised: null, quotes: [], notes: [] });
			}
		}
		return out;
	});

	/** Footnote markers point at the notes of this section; citations at the Bible. */
	const shown = (html: string) => addressed(lang, html, { notes: { kind: 'link', section: section.id } });

	const marked = (n: number) => !!highlight && n >= highlight.from && n <= highlight.to;

	// Hovering a marker lights its note up, so the eye finds it in the column.
	let lit = $state<string | null>(null);
	function onOver(e: Event) {
		const marker = (e.target as HTMLElement).closest<HTMLElement>('[data-fn]');
		lit = marker ? `${marker.id.replace(/-ref-\d+$/, '')}-${marker.dataset.fn}` : null;
	}

	let readerEl = $state<HTMLElement>();
</script>

<article class="ccc" bind:this={readerEl}>
	<header>
		<p class="crumbs">
			{#each section.breadcrumb.slice(0, -1) as crumb, i (i)}<span>{crumb.title}</span>{/each}
		</p>
		{#if section.label}<p class="label">{section.label}</p>{/if}
		<h1>{section.title}</h1>
	</header>

	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<div class="body" onmouseover={onOver} onfocusin={onOver} role="document">
		{#each units as unit, i (i)}
			{#if unit.kind === 'h'}
				<h2 class="sub">{unit.text}</h2>
			{:else}
				<div class="text" id={unit.n ? `n${unit.n}` : undefined} class:brief={unit.brief} class:marked={marked(unit.n)}>
					<p class="para">
						{#if unit.n}<a class="n" href="#n{unit.n}" aria-label="{t.ccc_paragraph} {unit.n}">{unit.n}</a>{/if}{@html shown(unit.html)}{#if unit.revised}<span class="revised">{t.ccc_revised}</span>{/if}
					</p>
					{#each unit.quotes as quote, q (q)}
						<blockquote>{@html shown(quote)}</blockquote>
					{/each}
				</div>
				<aside class="notes" aria-label={unit.n ? `${t.ccc_notes} ${unit.n}` : t.ccc_notes}>
					{#each unit.notes as note (note.k)}
						<p id="{section.id}-note-{note.k}" class:on={lit === `${section.id}-${note.k}`}>
							<a class="k" href="#{section.id}-ref-{note.k}" aria-label="{t.ccc_note} {note.k}">{note.k}</a>{@html shown(note.html)}
						</p>
					{/each}
				</aside>
			{/if}
		{/each}
	</div>
</article>

<ReferencePeeks {lang} {faithLang} {bibleLang} root={readerEl} source={t.ccc_title} />

<style>
	.ccc {
		--serif: Georgia, 'Noto Serif', 'Times New Roman', serif;
		--font-ui: Helvetica, Arial, 'Noto Sans', sans-serif;
		--measure: 40rem;
		--notes-w: 17rem;
		--gutter: 3.5rem;
		font-family: var(--serif);
		font-size: 1.05rem;
		line-height: 1.65;
		color: var(--color-text-primary);
	}
	/* app.css sets the sans on `*`, which beats inheritance; the text is serif
	   throughout and the chrome asks for the sans by name. */
	.ccc :global(*) {
		font-family: inherit;
	}

	header {
		max-width: var(--measure);
		margin: 0 auto 2.5rem;
		text-align: center;
	}
	.crumbs {
		margin: 0 0 0.75rem;
		font-family: var(--font-ui);
		font-size: var(--text-sm);
		color: var(--color-text-tertiary);
		line-height: 1.5;
	}
	.crumbs span:not(:last-child)::after {
		content: ' › ';
	}
	.label {
		margin: 0 0 0.25rem;
		font-family: var(--font-ui);
		font-size: var(--text-sm);
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--color-text-secondary);
	}
	h1 {
		font-size: var(--text-xl);
		font-weight: 600;
		line-height: 1.3;
		margin: 0;
		text-wrap: balance;
	}

	.body {
		margin-inline: auto;
		padding-left: var(--gutter);
		max-width: calc(var(--gutter) + var(--measure));
	}
	.sub,
	.text {
		grid-column: 1;
	}
	.notes {
		grid-column: 2;
	}

	.sub {
		font-size: 1.15rem;
		font-weight: 600;
		line-height: 1.4;
		margin: 2.5rem 0 1rem;
	}
	.text {
		scroll-margin-top: 6rem;
	}
	.para {
		position: relative;
		margin: 0 0 1.1rem;
	}
	/* The number sits in the margin, as it does in the book; on a narrow
	   screen there is no margin to sit in, so it leads the line instead. */
	.n {
		position: absolute;
		left: calc(var(--gutter) * -1);
		width: calc(var(--gutter) - 0.5rem);
		text-align: right;
		font-family: var(--font-ui);
		font-size: var(--text-sm);
		font-variant-numeric: tabular-nums;
		color: var(--color-text-tertiary);
		text-decoration: none;
		line-height: 1.9;
	}
	.n:hover,
	.n:focus-visible {
		color: var(--color-primary);
	}

	.text.marked,
	.text:target {
		background: color-mix(in srgb, var(--orange) 16%, transparent);
		border-radius: var(--radius-sm);
		box-shadow: 0 0 0 0.4rem color-mix(in srgb, var(--orange) 16%, transparent);
	}

	.brief {
		font-style: italic;
	}

	blockquote {
		margin: 0 0 1.1rem 1.5rem;
		padding-left: 1rem;
		border-left: 2px solid var(--color-border);
		color: var(--color-text-secondary);
	}

	.revised {
		margin-left: 0.5ch;
		padding: 0.1em 0.6em;
		font-family: var(--font-ui);
		font-size: var(--text-sm);
		font-style: normal;
		white-space: nowrap;
		color: var(--color-text-secondary);
		background: var(--color-bg-tertiary);
		border-radius: var(--radius-pill);
	}

	/* ---- the notes column ---- */
	.notes {
		font-family: var(--font-ui);
		font-size: 0.82rem;
		line-height: 1.5;
		color: var(--color-text-secondary);
	}
	.notes p {
		position: relative;
		margin: 0 0 0.4rem;
		padding-left: 1.6rem;
		scroll-margin-top: 6rem;
	}
	.notes p.on {
		color: var(--color-text-primary);
	}
	.notes .k {
		position: absolute;
		left: 0;
		width: 1.2rem;
		text-align: right;
		font-variant-numeric: tabular-nums;
		color: var(--color-text-tertiary);
		text-decoration: none;
	}
	.notes p.on .k,
	.notes .k:hover,
	.notes .k:focus-visible {
		color: var(--color-primary);
	}

	.ccc :global(sup.cfn) {
		font-size: 0.7em;
		line-height: 0;
	}
	.ccc :global(sup.cfn a) {
		color: var(--color-primary);
		text-decoration: none;
	}
	.ccc :global(sup.cfn a:hover),
	.ccc :global(sup.cfn a:focus-visible) {
		text-decoration: underline;
	}
	.ccc :global(a.ref) {
		color: inherit;
		text-decoration: none;
		border-bottom: 1px dotted color-mix(in srgb, var(--red) 45%, transparent);
	}
	.ccc :global(a.ref:hover),
	.ccc :global(a.ref:focus-visible) {
		color: var(--red);
		border-bottom-style: solid;
	}
	/* The council and the Code: the same quiet underline as Scripture, in the
	   other accent, so the eye can tell a source from a source. */
	.ccc :global(a.dref) {
		color: inherit;
		text-decoration: none;
		border-bottom: 1px dotted color-mix(in srgb, var(--blue) 50%, transparent);
	}
	.ccc :global(a.dref:hover),
	.ccc :global(a.dref:focus-visible) {
		color: var(--blue);
		border-bottom-style: solid;
	}

	/* Wide enough for a margin: the notes take the right-hand column, each
	   beside the paragraph that cites it. */
	@media (min-width: 1100px) {
		.body {
			display: grid;
			grid-template-columns: minmax(0, var(--measure)) var(--notes-w);
			column-gap: 2.5rem;
			max-width: calc(var(--gutter) + var(--measure) + 2.5rem + var(--notes-w));
		}
	}

	@media (max-width: 1099px) {
		.notes {
			margin: 0 0 1.5rem 1.5rem;
			padding-left: 1rem;
			border-left: 1px solid var(--color-border);
		}
		.notes:empty {
			display: none;
		}
	}

	@media (max-width: 900px) {
		.ccc {
			--gutter: 0rem;
			font-size: 1rem;
		}
		.n {
			position: static;
			display: inline;
			width: auto;
			margin-right: 0.5ch;
			line-height: inherit;
		}
	}
</style>
