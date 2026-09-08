<script lang="ts">
	/**
	 * The commentators of a verse as a row of small overlapping discs: at
	 * most `max` of them, then a "+n" disc. Hover names one; a click hands
	 * the author to the reader, which opens the peek or the sheet.
	 */
	import FatherAvatar from './FatherAvatar.svelte';
	import { fatherLabel, type Father } from '$lib/faith/fathers';
	import type { FaithLang } from '$lib/js/faithI18n';

	interface Props {
		authors: { id: string; n: number; father: Pick<Father, 'name' | 'saint' | 'portrait'>; /** The language the excerpts are in; named in the tooltip when not the page's. */ lang?: string }[];
		lang: FaithLang;
		size?: number;
		max?: number;
		moreLabel: string;
		onopen: (id: string, el: HTMLElement) => void;
		onmore: (el: HTMLElement) => void;
	}
	const { authors, lang, size = 22, max = 5, moreLabel, onopen, onmore }: Props = $props();
	const shown = $derived(authors.slice(0, authors.length > max ? max - 1 : max));
	const rest = $derived(authors.length - shown.length);
</script>

{#if authors.length}
	<div class="row" style="--size: {size}px">
		{#each shown as a (a.id)}
			{@const label = fatherLabel(a.father, lang)}
			{@const foreign = a.lang && a.lang !== lang ? a.lang.toUpperCase() : null}
			<button type="button" class="disc" data-father={a.id} data-lang={foreign ? a.lang : undefined} title="{label}{a.n > 1 ? ` (${a.n})` : ''}{foreign ? ` · ${foreign}` : ''}" aria-label="{label}{foreign ? ` (${foreign})` : ''}" onclick={(e) => onopen(a.id, e.currentTarget)}>
				<FatherAvatar id={a.id} name={a.father.name.en} hasPortrait={!!a.father.portrait} {size} />
				<span class="tip" aria-hidden="true">{label}{foreign ? ` · ${foreign}` : ''}</span>
			</button>
		{/each}
		{#if rest > 0}
			<button type="button" class="disc more" title="{rest} {moreLabel}" aria-label="{rest} {moreLabel}" onclick={(e) => onmore(e.currentTarget)}>+{rest}</button>
		{/if}
	</div>
{/if}

<style>
	.row {
		display: inline-flex;
		align-items: center;
		padding-left: calc(var(--size) * 0.25);
	}
	.disc {
		position: relative;
		all: unset;
		cursor: pointer;
		display: inline-flex;
		border-radius: 50%;
		margin-left: calc(var(--size) * -0.25);
		box-shadow: 0 0 0 2px var(--color-bg-primary);
		transition: transform var(--transition-fast, 100ms);
	}
	.disc:hover,
	.disc:focus-visible {
		transform: translateY(-2px);
		z-index: 1;
	}
	.disc:focus-visible {
		outline: 2px solid var(--color-primary);
		outline-offset: 2px;
	}
	.disc.more {
		width: var(--size);
		height: var(--size);
		align-items: center;
		justify-content: center;
		font-family: var(--font-ui, Helvetica, Arial, sans-serif);
		font-size: calc(var(--size) * 0.42);
		font-weight: 600;
		color: var(--color-text-secondary);
		background: var(--color-bg-tertiary);
	}
	/* The name, above the disc, on hover. */
	.tip {
		position: absolute;
		bottom: calc(100% + 6px);
		left: 50%;
		transform: translateX(-50%) translateY(2px);
		padding: 0.2rem 0.5rem;
		border-radius: var(--radius-sm);
		background: var(--color-text-primary);
		color: var(--color-bg-primary);
		font-family: var(--font-ui, Helvetica, Arial, sans-serif);
		font-size: 0.72rem;
		white-space: nowrap;
		opacity: 0;
		pointer-events: none;
		transition: opacity var(--transition-fast, 100ms), transform var(--transition-fast, 100ms);
	}
	.disc:hover .tip,
	.disc:focus-visible .tip {
		opacity: 1;
		transform: translateX(-50%) translateY(0);
	}
	@media (hover: none) {
		.tip { display: none; }
	}
</style>
