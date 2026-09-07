<script lang="ts">
	// A footnote's text with its cross-references and "V. 12" verse links
	// turned into interactive spans. The reader decides what a click or hover
	// does (peek on desktop, sheet on a phone); this component only marks up.
	import { noteSegments } from '$lib/faith/bibleText';

	interface Props {
		text: string;
		onref?: (reference: string, el: HTMLElement) => void;
		onverse?: (verse: number, el: HTMLElement, to?: number) => void;
	}
	const { text, onref, onverse }: Props = $props();
	const segments = $derived(noteSegments(text));

	function keyActivate(e: KeyboardEvent, fn: () => void) {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			fn();
		}
	}
</script>

{#each segments as seg, i (i)}
	{#if seg.kind === 'text'}{seg.text}{:else if seg.kind === 'ref'}<span
			class="ref"
			role="link"
			tabindex="0"
			data-ref={seg.reference}
			onclick={(e) => onref?.(seg.reference, e.currentTarget)}
			onkeydown={(e) => keyActivate(e, () => onref?.(seg.reference, e.currentTarget as HTMLElement))}>{seg.label ?? seg.reference}</span
		>{:else}<span
			class="vref"
			role="link"
			tabindex="0"
			data-verse={seg.verse}
			data-to={seg.to}
			onclick={(e) => onverse?.(seg.verse, e.currentTarget, seg.to)}
			onkeydown={(e) => keyActivate(e, () => onverse?.(seg.verse, e.currentTarget as HTMLElement, seg.to))}>{seg.label ?? `V. ${seg.verse}`}</span
		>{/if}
{/each}

<style>
	.ref,
	.vref {
		color: var(--red);
		border-bottom: 1px dotted color-mix(in srgb, var(--red) 45%, transparent);
		cursor: pointer;
		white-space: nowrap;
	}
	.ref:hover,
	.vref:hover,
	.ref:global(.on) {
		background: color-mix(in srgb, var(--red) 12%, transparent);
		border-bottom-style: solid;
	}
</style>
