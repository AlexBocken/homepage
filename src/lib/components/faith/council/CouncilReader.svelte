<script lang="ts">
	/**
	 * One document of the Second Vatican Council: its articles with their
	 * numbers in the margin, the headings the council set between them, and each
	 * article's notes beside it — in the right-hand column on a wide screen,
	 * under the article on a narrow one, as the Catechism reader does.
	 *
	 * Everything works with no script running: a footnote marker is an anchor to
	 * its note and an article is addressable by `#a11`.
	 */
	import { m, type FaithLang } from '$lib/js/faithI18n';
	import { addressed } from '$lib/faith/councilText';
	import type { CouncilDocument, CouncilNote } from '$lib/faith/councilTypes';

	interface Props {
		lang: FaithLang;
		document: CouncilDocument;
		/** Articles a citation asked for, marked so the eye finds them. */
		highlight?: { from: number; to: number } | null;
	}
	const { lang, document: doc, highlight = null }: Props = $props();
	const t = $derived(m[lang]);
	const id = $derived(doc.abbr.toLowerCase());

	const kind = $derived(doc.kind === 'constitution' ? t.council_constitution : doc.kind === 'decree' ? t.council_decree : t.council_declaration);

	/** The notes an article cites, in the order its markers stand. */
	const notesOf = (html: string): CouncilNote[] => {
		const out: CouncilNote[] = [];
		for (const k of html.matchAll(/data-fn="(\d+)"/g)) {
			const note = doc.notes.find((n) => n.k === Number(k[1]));
			if (note && !out.includes(note)) out.push(note);
		}
		return out;
	};

	const shown = (html: string) => addressed(html, { notes: { kind: 'link', document: id } });
	const marked = (n: number) => !!highlight && n >= highlight.from && n <= highlight.to;

	// Hovering a marker lights its note up, so the eye finds it in the column.
	let lit = $state<string | null>(null);
	function onOver(e: Event) {
		const marker = (e.target as HTMLElement).closest<HTMLElement>('[data-fn]');
		lit = marker ? `${id}-${marker.dataset.fn}` : null;
	}
</script>

<article class="doc">
	<header>
		<p class="label">{kind}{doc.date ? ` · ${doc.date.slice(0, 4)}` : ''}</p>
		<h1>{doc.title}</h1>
		{#if doc.subtitle}<p class="sub">{doc.subtitle}</p>{/if}
	</header>

	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<div class="body" onmouseover={onOver} onfocusin={onOver} role="document">
		{#each doc.articles as article (article.n)}
			{@const notes = notesOf(article.html)}
			{#if article.heading}<h2 class="head">{article.heading}</h2>{/if}
			<div class="text" id="a{article.n}" class:marked={marked(article.n)}>
				<p class="para">
					<a class="n" href="#a{article.n}" aria-label="{t.council_article} {article.n}">{article.n}</a>{@html shown(article.html)}
				</p>
			</div>
			<aside class="notes" aria-label="{t.council_notes} {article.n}">
				{#each notes as note (note.k)}
					<p id="{id}-note-{note.k}" class:on={lit === `${id}-${note.k}`}>
						<a class="k" href="#{id}-ref-{note.k}" aria-label="{t.council_notes} {note.k}">{note.k}</a>{@html note.html}
					</p>
				{/each}
			</aside>
		{/each}
	</div>

	{#if !doc.notes.length}<p class="none">{t.council_no_notes}</p>{/if}
</article>

<style>
	.doc {
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
	.doc :global(*) {
		font-family: inherit;
	}

	header {
		max-width: var(--measure);
		margin: 0 auto 2.5rem;
		text-align: center;
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
	.sub {
		margin: 0.5rem 0 0;
		color: var(--color-text-secondary);
		line-height: 1.4;
	}

	.body {
		margin-inline: auto;
		padding-left: var(--gutter);
		max-width: calc(var(--gutter) + var(--measure));
	}
	.head,
	.text {
		grid-column: 1;
	}
	.notes {
		grid-column: 2;
	}

	.head {
		font-family: var(--font-ui);
		font-size: 1.05rem;
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
	/* The number sits in the margin; on a narrow screen there is no margin to
	   sit in, so it leads the line instead. */
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

	.doc :global(sup.cfn) {
		font-size: 0.7em;
		line-height: 0;
	}
	.doc :global(sup.cfn a) {
		color: var(--color-primary);
		text-decoration: none;
	}
	.doc :global(sup.cfn a:hover),
	.doc :global(sup.cfn a:focus-visible) {
		text-decoration: underline;
	}

	.none {
		max-width: var(--measure);
		margin: 2.5rem auto 0;
		font-family: var(--font-ui);
		font-size: var(--text-sm);
		color: var(--color-text-tertiary);
		text-align: center;
	}

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
		.doc {
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
