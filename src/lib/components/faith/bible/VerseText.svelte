<script lang="ts">
	// One verse's prose with its footnote markers as small tappable
	// superscripts, and the bracketed parallel passages ("[Mt 3,1, Mk 1,2]")
	// as references. Markers are numbered per chapter, as Allioli prints them.
	// A word joiner (U+2060) sits between a word and its marker so a line
	// never breaks with the digit alone at its start.
	import { splitMarkers } from '$lib/faith/bibleText';

	interface Props {
		text: string;
		verse: number;
		lang: string;
		/** Render the markers at all (the Latin and English texts have none). */
		markers?: boolean;
		onmarker?: (verse: number, number: number, el: HTMLElement) => void;
		onmarkerhover?: (verse: number, number: number | null) => void;
		onref?: (reference: string, el: HTMLElement) => void;
	}
	const { text, verse, lang, markers = true, onmarker, onmarkerhover, onref }: Props = $props();
	const segments = $derived(splitMarkers(text));

	function keyActivate(e: KeyboardEvent, fn: () => void) {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			fn();
		}
	}
</script>

<span class="t" {lang}>
	{#each segments as seg, i (i)}
		{#if seg.kind === 'text'}{seg.text}{:else if seg.kind === 'marker' && markers}&#8288;<button
				type="button"
				class="fn"
				aria-label="Anmerkung {seg.number}"
				data-verse={verse}
				data-n={seg.number}
				onclick={(e) => onmarker?.(verse, seg.number, e.currentTarget)}
				onmouseenter={() => onmarkerhover?.(verse, seg.number)}
				onmouseleave={() => onmarkerhover?.(verse, null)}>{seg.number}</button
			>{:else if seg.kind === 'refs'}<span class="refs">{#each seg.refs as r, j (j)}{#if j > 0},
					{/if}<span
						class="ref"
						role="link"
						tabindex="0"
						data-ref={r}
						onclick={(e) => onref?.(r, e.currentTarget)}
						onkeydown={(e) => keyActivate(e, () => onref?.(r, e.currentTarget as HTMLElement))}>{r}</span
					>{/each}</span
			>{/if}
	{/each}
</span>

<style>
	/* A button, for the keyboard and screen readers, drawn as a superscript. */
	.t .fn {
		all: unset;
		display: inline;
		font-family: var(--font-ui, Helvetica, Arial, sans-serif);
		font-size: 0.56em;
		font-weight: 500;
		line-height: 0;
		vertical-align: 0.6em;
		margin-left: 0.04em;
		padding: 0.25em 0.12em;
		border-radius: 3px;
		cursor: pointer;
		color: color-mix(in srgb, var(--red) 72%, var(--color-text-secondary));
	}
	.t .fn:focus-visible {
		outline: 2px solid var(--color-primary);
		outline-offset: 1px;
	}
	/* Parallel passages after the sentence, each one a link: same size as the
	   verse, the colour tells them apart. */
	.refs {
		color: var(--color-text-secondary);
		margin-left: 0.45em;
		white-space: nowrap;
	}
	.refs .ref {
		color: var(--red);
		border-bottom: 1px dotted color-mix(in srgb, var(--red) 45%, transparent);
		cursor: pointer;
	}
	.refs .ref:hover,
	.refs .ref:global(.on) {
		background: color-mix(in srgb, var(--red) 12%, transparent);
		border-bottom-style: solid;
	}
	.t .fn:hover,
	.t .fn:global(.on) {
		background: color-mix(in srgb, var(--red) 12%, transparent);
		color: var(--red);
	}
</style>
