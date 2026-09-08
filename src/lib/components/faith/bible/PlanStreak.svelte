<script lang="ts">
	/**
	 * The reading streak as the flame with its count, "days" under it as the
	 * rosary shows it, the longest run beneath, and beside it the last
	 * fourteen days as dots: read, forgiven (outlined), missed, today still open.
	 */
	import StreakAura from '$lib/components/faith/StreakAura.svelte';
	import { addDays } from '$lib/faith/readingPlan';
	import type { StreakInfo } from '$lib/faith/readingStreak';
	import { m, type FaithLang } from '$lib/js/faithI18n';

	interface Props {
		streak: StreakInfo;
		days: string[];
		today: string;
		lang: FaithLang;
		/** Pulse the flame once, after a chapter was just marked. */
		burst?: boolean;
		/** Today's reading against the plan's daily target, in minutes: the ring the desktop rail shows. */
		minutes?: { read: number; target: number } | null;
	}
	const { streak, days, today, lang, burst = false, minutes = null }: Props = $props();
	const share = $derived(minutes && minutes.target > 0 ? Math.min(1, minutes.read / minutes.target) : 0);
	const t = $derived(m[lang]);
	const read = $derived(new Set(days));
	const bridged = $derived(new Set(streak.bridged));
	const dots = $derived(Array.from({ length: 14 }, (_, i) => addDays(today, i - 13)));
	const dayLabel = $derived(streak.current === 1 ? t.day_singular : t.day_plural);
</script>

<div class="streak">
	<div class="flame">
		<StreakAura value={streak.current} {burst} />
		<span class="label">{dayLabel}</span>
		<span class="longest">{t.bible_plan_streak_longest} {streak.longest}</span>
	</div>
	{#if minutes}
		<div class="ring-row">
			<svg class="ring" viewBox="0 0 36 36" aria-hidden="true">
				<circle cx="18" cy="18" r="15.5" />
				<circle cx="18" cy="18" r="15.5" class="fill" class:done={share >= 1} style="stroke-dasharray: {share * 97.4} 97.4" />
			</svg>
			<span class="ring-text">{t.bible_plan_today}<br /><b>{minutes.read} / {minutes.target} {t.bible_plan_min}</b></span>
		</div>
	{/if}
	<div class="days">
		<ol class="dots" aria-hidden="true">
			{#each dots as d (d)}
				<li class:on={read.has(d)} class:grace={bridged.has(d)} class:today={d === today} title={d}></li>
			{/each}
		</ol>
		{#if streak.heldByGrace}<p class="grace-note">{t.bible_plan_streak_grace}</p>{/if}
		<p class="rule">{t.bible_plan_streak_rule}</p>
	</div>
</div>

<style>
	/* Flame and dots side by side, both centred on one line. */
	.streak { display: flex; align-items: center; gap: 1.25rem; }
	.flame { display: flex; flex-direction: column; align-items: center; line-height: 1.2; }
	.label { font-size: 0.85rem; color: var(--color-text-secondary); text-transform: uppercase; letter-spacing: 0.05em; }
	.longest { margin-top: 0.15rem; font-size: 0.75rem; color: var(--color-text-tertiary); }
	/* Today's minutes as the rail's ring, between the flame and the days. */
	.ring-row { display: flex; align-items: center; gap: 0.6rem; }
	.ring { width: 3rem; height: 3rem; transform: rotate(-90deg); flex: none; }
	.ring circle { fill: none; stroke: var(--color-border); stroke-width: 3; }
	.ring .fill { stroke: var(--red); stroke-linecap: round; transition: stroke-dasharray var(--transition-normal); }
	.ring .fill.done { stroke: var(--green); }
	.ring-text { font-size: 0.8rem; line-height: 1.25; color: var(--color-text-secondary); }
	.ring-text b { color: var(--color-text-primary); font-weight: 600; }
	.days { display: flex; flex-direction: column; justify-content: center; gap: 0.4rem; min-width: 0; }
	.dots { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 0.35rem; }
	.dots li { width: 0.7rem; height: 0.7rem; border-radius: 50%; background: var(--color-bg-tertiary); }
	.dots li.on { background: var(--red); }
	.dots li.grace { background: none; border: 2px solid var(--red); box-sizing: border-box; }
	.dots li.today:not(.on) { background: none; border: 1px dashed var(--color-text-tertiary); box-sizing: border-box; }
	.grace-note { margin: 0; font-size: 0.85rem; color: var(--color-text-secondary); }
	.rule { margin: 0; font-size: 0.72rem; color: var(--color-text-tertiary); }
</style>
