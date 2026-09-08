<script lang="ts">
	// One verse's prose with its footnote markers as small tappable
	// superscripts, and the bracketed parallel passages ("[Mt 3,1, Mk 1,2]")
	// as references. Markers are numbered per chapter, as Allioli prints them.
	//
	// A marker must never open a line on its own. The word joiner (U+2060)
	// before it is not enough: the marker is a <button>, an atomic inline
	// whatever its `display`, and Chromium takes a break opportunity before
	// an atomic inline regardless of the joiner (seen on phones, "ihn,|³").
	// So the word the marker hangs on is cut off its run and wrapped with
	// the marker in a no-wrap span; the joiner stays for copy and paste.
	import { splitMarkers, type TextSegment } from '$lib/faith/bibleText';

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
	type Item = Exclude<TextSegment, { kind: 'marker' }> | { kind: 'marker'; number: number; lead: string };
	const segments = $derived.by((): Item[] => {
		const out: Item[] = [];
		for (const seg of splitMarkers(text)) {
			if (seg.kind !== 'marker') {
				out.push(seg);
				continue;
			}
			let lead = '';
			const prev = out[out.length - 1];
			if (prev?.kind === 'text') {
				const m = /^([\s\S]*?)(\S+)$/.exec(prev.text);
				if (m) {
					lead = m[2];
					if (m[1]) out[out.length - 1] = { kind: 'text', text: m[1] };
					else out.pop();
				}
			}
			out.push({ kind: 'marker', number: seg.number, lead });
		}
		return out;
	});

	function keyActivate(e: KeyboardEvent, fn: () => void) {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			fn();
		}
	}
</script>

<span class="t" {lang}>
	{#each segments as seg, i (i)}
		{#if seg.kind === 'text'}{seg.text}{:else if seg.kind === 'marker'}<span class="nb">{seg.lead}{#if markers}&#8288;<button
					type="button"
					class="fn"
					aria-label="Anmerkung {seg.number}"
					data-verse={verse}
					data-n={seg.number}
					onclick={(e) => onmarker?.(verse, seg.number, e.currentTarget)}
					onmouseenter={() => onmarkerhover?.(verse, seg.number)}
					onmouseleave={() => onmarkerhover?.(verse, null)}>{seg.number}</button
				>{/if}</span
			>{:else if seg.kind === 'refs'}{' '}<span class="refs">{#each seg.refs as r, j (j)}{#if j > 0}{', '}{/if}<span
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
	/* The word and its marker stay on one line (see the note at the top). */
	.nb { white-space: nowrap; }
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
	   verse, the colour tells them apart. A real space precedes the run and
	   separates the references, so copied text reads "Jünger.³¹ Mk 4,36, Lk 8,22". */
	/* The run may wrap between references (three of them overflow a phone), never inside one. */
	.refs {
		color: var(--color-text-secondary);
		margin-left: 0.15em;
	}
	.refs .ref {
		white-space: nowrap;
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
