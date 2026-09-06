<script lang="ts">
	/** The last fourteen days as dots: read, forgiven (outlined), missed, and today still open. */
	import { addDays } from '$lib/faith/readingPlan';
	import type { StreakInfo } from '$lib/faith/readingStreak';
	import { m, type FaithLang } from '$lib/js/faithI18n';

	interface Props {
		streak: StreakInfo;
		days: string[];
		today: string;
		lang: FaithLang;
	}
	const { streak, days, today, lang }: Props = $props();
	const t = $derived(m[lang]);
	const read = $derived(new Set(days));
	const bridged = $derived(new Set(streak.bridged));
	const dots = $derived(Array.from({ length: 14 }, (_, i) => addDays(today, i - 13)));
</script>

<div class="streak">
	<p class="count"><span class="label">{t.bible_plan_streak}</span> <b>{streak.current}</b> {t.bible_plan_days}<span class="longest"> · {t.bible_plan_streak_longest} {streak.longest}</span></p>
	<ol class="dots" aria-hidden="true">
		{#each dots as d (d)}
			<li class:on={read.has(d)} class:grace={bridged.has(d)} class:today={d === today} title={d}></li>
		{/each}
	</ol>
	{#if streak.heldByGrace}<p class="grace-note">{t.bible_plan_streak_grace}</p>{/if}
</div>

<style>
	.streak { display: flex; flex-direction: column; gap: 0.5rem; }
	.count { margin: 0; font-size: 0.95rem; color: var(--color-text-secondary); }
	.count b { font-size: 1.4rem; color: var(--color-text-primary); font-weight: 600; margin: 0 0.15rem; }
	.longest { font-size: 0.85rem; }
	.dots { list-style: none; margin: 0; padding: 0; display: flex; gap: 0.35rem; }
	.dots li { width: 0.7rem; height: 0.7rem; border-radius: 50%; background: var(--color-bg-tertiary); }
	.dots li.on { background: var(--red); }
	.dots li.grace { background: none; border: 2px solid var(--red); box-sizing: border-box; }
	.dots li.today:not(.on) { background: none; border: 1px dashed var(--color-text-tertiary); box-sizing: border-box; }
	.grace-note { margin: 0; font-size: 0.85rem; color: var(--color-text-secondary); }
</style>
