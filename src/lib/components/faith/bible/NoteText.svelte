<script lang="ts">
	// A footnote's text with its cross-references and "V. 12" verse links
	// turned into interactive spans. The reader decides what a click or hover
	// does (peek on desktop, sheet on a phone); this component only marks up.
	import { noteSegments } from '$lib/faith/bibleText';

	interface Props {
		text: string;
		onref?: (reference: string, el: HTMLElement) => void;
		onverse?: (verse: number, el: HTMLElement, to?: number) => void;
		/** "Anm. 12": a footnote of this chapter, or of `target`'s chapter ("[Mt 7,Anm.32]"). */
		onnote?: (number: number, el: HTMLElement, target?: { book: string; chapter: number }) => void;
		/** Where each kind of reference leads with no script running; given, the span is a link
		 * (the click still goes to the handler, and is prevented). Without one it stays a span. */
		refHref?: (reference: string) => string | undefined;
		verseHref?: (verse: number, to?: number) => string | undefined;
		noteHref?: (number: number, target?: { book: string; chapter: number }) => string | undefined;
	}
	const { text, onref, onverse, onnote, refHref, verseHref, noteHref }: Props = $props();
	const noteTarget = (seg: { book?: string; chapter?: number }) => (seg.book && seg.chapter ? { book: seg.book, chapter: seg.chapter } : undefined);
	const segments = $derived(noteSegments(text));

	function keyActivate(e: KeyboardEvent, fn: () => void) {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			fn();
		}
	}
</script>

{#each segments as seg, i (i)}
	{#if seg.kind === 'text'}{seg.text}{:else if seg.kind === 'ref'}{@const h = refHref?.(seg.reference)}<svelte:element
			this={h ? 'a' : 'span'}
			class="ref"
			role="link"
			tabindex={h ? undefined : 0}
			href={h}
			data-ref={seg.reference}
			onclick={(e: MouseEvent) => { if (h) e.preventDefault(); onref?.(seg.reference, e.currentTarget as HTMLElement); }}
			onkeydown={h ? undefined : (e: KeyboardEvent) => keyActivate(e, () => onref?.(seg.reference, e.currentTarget as HTMLElement))}>{seg.label ?? seg.reference}</svelte:element
		>{:else if seg.kind === 'note'}{@const h = noteHref?.(seg.number, noteTarget(seg))}<svelte:element
			this={h ? 'a' : 'span'}
			class="nref"
			role="link"
			tabindex={h ? undefined : 0}
			href={h}
			data-note={seg.number}
			onclick={(e: MouseEvent) => { if (h) e.preventDefault(); onnote?.(seg.number, e.currentTarget as HTMLElement, noteTarget(seg)); }}
			onkeydown={h ? undefined : (e: KeyboardEvent) => keyActivate(e, () => onnote?.(seg.number, e.currentTarget as HTMLElement, noteTarget(seg)))}>{seg.label}</svelte:element
		>{:else}{@const h = verseHref?.(seg.verse, seg.to)}<svelte:element
			this={h ? 'a' : 'span'}
			class="vref"
			role="link"
			tabindex={h ? undefined : 0}
			href={h}
			data-verse={seg.verse}
			data-to={seg.to}
			onclick={(e: MouseEvent) => { if (h) e.preventDefault(); onverse?.(seg.verse, e.currentTarget as HTMLElement, seg.to); }}
			onkeydown={h ? undefined : (e: KeyboardEvent) => keyActivate(e, () => onverse?.(seg.verse, e.currentTarget as HTMLElement, seg.to))}>{seg.label ?? `V. ${seg.verse}`}</svelte:element
		>{/if}
{/each}

<style>
	/* `:any-link` doubles the weight so the rubric beats app.css's colour for links. */
	.ref,
	.vref,
	.nref,
	.ref:any-link,
	.vref:any-link,
	.nref:any-link {
		text-decoration: none;
		color: var(--red);
		border-bottom: 1px dotted color-mix(in srgb, var(--red) 45%, transparent);
		cursor: pointer;
		white-space: nowrap;
	}
	.ref:hover,
	.vref:hover,
	.nref:hover,
	.ref:global(.on) {
		background: color-mix(in srgb, var(--red) 12%, transparent);
		border-bottom-style: solid;
	}
</style>
