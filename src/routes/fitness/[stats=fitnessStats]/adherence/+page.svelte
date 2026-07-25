<script>
	import { page } from '$app/state';
	import ActivityGrid from '$lib/components/fitness/ActivityGrid.svelte';
	import { detectFitnessLang, m } from '$lib/js/fitnessI18n';

	let { data } = $props();

	const lang = $derived(detectFitnessLang(page.url.pathname));
	const t = $derived(m[lang]);
	const isEn = $derived(lang === 'en');

	const balance = $derived(data.balance ?? { series: [], goalCalories: null, start: '', end: '' });
	const hasGoal = $derived(balance.goalCalories != null);

	/** @type {Record<string, any>} */
	const byDate = $derived(Object.fromEntries((balance.series ?? []).map((/** @type {any} */ d) => [d.date, d])));

	/** @param {any} day → true when logged under 90% of that day's goal */
	const isUnder = (/** @type {any} */ day) => day.goal != null && !day.adhered && day.calories < day.goal * 0.9;
	/** @param {any} day → true when logged over 110% of that day's goal */
	const isOver = (/** @type {any} */ day) => day.goal != null && !day.adhered && day.calories > day.goal * 1.1;

	const summary = $derived.by(() => {
		const series = balance.series ?? [];
		if (!series.length) return null;
		const logged = series.length;
		const adhered = series.filter((/** @type {any} */ d) => d.adhered).length;
		const under = series.filter(isUnder).length;
		const over = series.filter(isOver).length;
		// Calendar days from the first logged day to the window end — untracked days
		// in between count against adherence, same rule as the stats card.
		const first = series[0].date;
		const totalDays = Math.round((new Date(balance.end + 'T00:00:00Z').getTime() - new Date(first + 'T00:00:00Z').getTime()) / 86400000) + 1;
		return { logged, adhered, under, over, totalDays, pct: Math.round(adhered / totalDays * 100) };
	});

	/** @param {any} day */
	function colorOf(day) {
		if (!day) return 'var(--color-bg-tertiary)';
		if (day.goal == null) return 'var(--color-bg-elevated)';
		if (day.adhered) return 'var(--green)';
		return isUnder(day) ? 'var(--blue)' : 'var(--orange)';
	}
	/** @param {any} day @param {string} date */
	function labelOf(day, date) {
		if (!day) return `${date} · ${isEn ? 'not logged' : 'nicht erfasst'}`;
		const status = day.adhered
			? (isEn ? 'on target' : 'im Ziel')
			: isUnder(day) ? (isEn ? 'too low' : 'zu wenig') : (isEn ? 'too high' : 'zu viel');
		return `${date} · ${day.calories} / ${day.goal ?? '?'} kcal · ${status}`;
	}
</script>

<svelte:head><title>{t.diet_adherence} - Bocken</title></svelte:head>

<div class="page">
	<h1>{t.diet_adherence}</h1>

	{#if !hasGoal}
		<p class="empty">{t.no_calorie_goal}</p>
	{:else if !summary}
		<p class="empty">{t.no_nutrition_data}</p>
	{:else}
		<div class="stat-row">
			<div class="stat"><span class="num">{summary.pct}%</span><span class="lbl">{isEn ? 'on target' : 'im Ziel'}</span></div>
			<div class="stat"><span class="num">{summary.adhered}</span><span class="lbl">{isEn ? 'days on target' : 'Tage im Ziel'}</span></div>
			<div class="stat"><span class="num num-under">{summary.under}</span><span class="lbl">{isEn ? 'days too low' : 'Tage zu wenig'}</span></div>
			<div class="stat"><span class="num num-over">{summary.over}</span><span class="lbl">{isEn ? 'days too high' : 'Tage zu viel'}</span></div>
			<div class="stat"><span class="num">{summary.logged}</span><span class="lbl">{isEn ? 'days logged' : 'Tage erfasst'}</span></div>
		</div>

		<p class="note">
			{isEn
				? 'A day counts as on target when its intake lands within ±10% of that day’s calorie goal (goal plus any workout burn). Days you didn’t log count against the total.'
				: 'Ein Tag zählt als im Ziel, wenn die Zufuhr innerhalb ±10% des Tagesziels liegt (Ziel plus Trainingsverbrauch). Nicht erfasste Tage zählen gegen den Schnitt.'}
		</p>

		<!-- The whole window, not just the logged stretch: a blank run of squares is
		     itself the answer to "did I track this?" -->
		<ActivityGrid start={balance.start} end={balance.end} {byDate} {colorOf} {labelOf} {lang} />

		<div class="legend">
			<span class="key"><i style="background: var(--green)"></i>{isEn ? 'on target' : 'im Ziel'}</span>
			<span class="key"><i style="background: var(--blue)"></i>{isEn ? 'too low' : 'zu wenig'}</span>
			<span class="key"><i style="background: var(--orange)"></i>{isEn ? 'too high' : 'zu viel'}</span>
			<span class="key"><i style="background: var(--color-bg-tertiary)"></i>{isEn ? 'not logged' : 'nicht erfasst'}</span>
		</div>
	{/if}
</div>

<style>
	.page { max-width: 1000px; margin-inline: auto; padding: 1rem; width: 100%; }
	h1 { margin: 0 0 1rem; font-size: 1.4rem; }
	.empty { color: var(--color-text-secondary); }
	.stat-row { display: flex; flex-wrap: wrap; gap: 1.5rem; margin-bottom: 0.75rem; }
	.stat { display: flex; flex-direction: column; }
	.num { font-size: 1.5rem; font-weight: 700; font-variant-numeric: tabular-nums; }
	.num-under { color: var(--blue); }
	.num-over { color: var(--orange); }
	.lbl { font-size: 0.8rem; color: var(--color-text-secondary); }
	.note { font-size: 0.85rem; color: var(--color-text-secondary); line-height: 1.5; max-width: 60ch; }
	.legend { display: flex; flex-wrap: wrap; gap: 1rem; margin-top: 0.75rem; font-size: 0.8rem; color: var(--color-text-secondary); }
	.key { display: inline-flex; align-items: center; gap: 0.4rem; }
	.key i { width: 11px; height: 11px; border-radius: 2px; display: inline-block; }
</style>
