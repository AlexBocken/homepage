<script lang="ts">
	/**
	 * The plan as one long spine: a segment per book, wide in proportion to
	 * its words, filled as far as its chapters are read. Abbreviations sit
	 * under the segments that have room for them.
	 */
	import { bookName } from '$lib/faith/bibleCanon';
	import type { FaithLang } from '$lib/js/faithI18n';

	interface Props {
		segments: { slug: string; words: number; read: number; period: string | null }[];
		lang: FaithLang;
	}
	const { segments, lang }: Props = $props();
	const total = $derived(segments.reduce((n, s) => n + s.words, 0));
	const abbr = (slug: string) => slug.replace(/[a-zäöü]/, (c) => c.toUpperCase());
</script>

<div class="spine" role="img" aria-label={segments.map((s) => `${bookName(s.slug, lang)} ${Math.round((100 * s.read) / Math.max(1, s.words))}%`).join(', ')}>
	{#each segments as s, i (s.slug + i)}
		{@const share = s.words / Math.max(1, total)}
		<div class="seg" class:new-period={i > 0 && s.period !== segments[i - 1].period} style="flex-basis: {share * 100}%" title="{bookName(s.slug, lang)} · {Math.round((100 * s.read) / Math.max(1, s.words))}%">
			<div class="bar"><div class="fill" style="width: {(100 * s.read) / Math.max(1, s.words)}%"></div></div>
			{#if share > 0.022}<span class="label">{abbr(s.slug)}</span>{/if}
		</div>
	{/each}
</div>

<style>
	.spine { display: flex; gap: 1px; width: 100%; }
	.seg { min-width: 0; display: flex; flex-direction: column; gap: 0.3rem; }
	.seg.new-period .bar { margin-left: 3px; }
	.bar { height: 0.55rem; background: var(--color-bg-tertiary); overflow: hidden; }
	.seg:first-child .bar { border-radius: 3px 0 0 3px; }
	.seg:last-child .bar { border-radius: 0 3px 3px 0; }
	.fill { height: 100%; background: var(--red); }
	.label { font-family: 'Linux Libertine', Georgia, serif; font-size: 0.68rem; color: var(--color-text-secondary); white-space: nowrap; overflow: hidden; }
	@media (prefers-reduced-motion: no-preference) {
		.fill { transition: width 600ms ease; }
	}
</style>
