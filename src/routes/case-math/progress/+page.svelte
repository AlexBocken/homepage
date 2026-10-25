<script lang="ts">
	import { resolve } from '$app/paths';
	import { CATEGORIES, SKILLS, SKILL_BY_ID } from '$lib/js/caseMath/skills';
	import { streak } from '$lib/js/caseMath/adaptive';
	import { percent, secs } from '$lib/js/caseMath/display';
	import { localDateStr } from '$lib/js/localDate';
	import Heatmap from '$lib/components/caseMath/Heatmap.svelte';
	import TrendChart from '$lib/components/caseMath/TrendChart.svelte';

	let { data } = $props();
	const overview = $derived(data.overview);
	const today = localDateStr();

	let focus = $state('all');
	const weeks = $derived(focus === 'all' ? data.trends.overall : (data.trends.perSkill[focus] ?? []));

	const totals = $derived.by(() => {
		const count = overview.days.reduce((s, d) => s + d.count, 0);
		const correct = overview.days.reduce((s, d) => s + d.correct, 0);
		return { count, correct, days: overview.days.length };
	});
	const currentStreak = $derived(streak(overview.dailyDates, today));
	const best = $derived.by(() => {
		let run = 0;
		let max = 0;
		let prev = '';
		for (const d of overview.dailyDates) {
			const gap = prev ? (Date.parse(d) - Date.parse(prev)) / 86_400_000 : 1;
			run = gap === 1 ? run + 1 : 1;
			max = Math.max(max, run);
			prev = d;
		}
		return max;
	});
</script>

<svelte:head>
	<title>Progress · Case math</title>
</svelte:head>

<h1>Progress</h1>

<p class="summary">
	{#if totals.count}
		<strong>{currentStreak}</strong> {currentStreak === 1 ? 'day' : 'days'} in a row, best run {best}.
		{totals.count} questions over {totals.days} {totals.days === 1 ? 'day' : 'days'},
		{percent(totals.correct / totals.count)} of them right.
	{:else}
		Nothing yet. <a href={resolve('/case-math/daily')}>Start today's set</a> and this page fills in.
	{/if}
</p>

<section class="card">
	<h2>Last year</h2>
	<Heatmap days={overview.days} {today} weeks={52} />
	<p class="legend">Greener = more questions. Outlined = daily set done.</p>
</section>

<section class="card">
	<div class="card-head">
		<h2>Weekly trend</h2>
		<select bind:value={focus} aria-label="Skill">
			<option value="all">All skills</option>
			{#each SKILLS as skill (skill.id)}
				{#if data.trends.perSkill[skill.id]}
					<option value={skill.id}>{skill.title}</option>
				{/if}
			{/each}
		</select>
	</div>
	{#if weeks.length}
		<TrendChart {weeks} />
		<p class="legend">Time is the median answer time ÷ the target for that level, so &lt; 1× is on pace.</p>
	{:else}
		<p class="empty">No answers in this range yet.</p>
	{/if}
</section>

<section class="card">
	<h2>Skills</h2>
	<div class="table-scroll">
		<table>
			<thead>
				<tr><th>Skill</th><th>Level</th><th>Recent accuracy</th><th>Median time</th><th>Target</th><th>Done</th></tr>
			</thead>
			{#each CATEGORIES as cat (cat.id)}
				<tbody>
					<tr class="cat"><td colspan="6">{cat.title}</td></tr>
					{#each SKILLS.filter((s) => s.category === cat.id) as skill (skill.id)}
						{@const s = overview.skills[skill.id]}
						<tr>
							<td><a href={resolve('/case-math/drill/[skill]', { skill: skill.id })}>{skill.title}</a></td>
							<td class="num">{s.level}</td>
							<td class="num" class:weak={s.accuracy !== null && s.accuracy < 0.7}>{percent(s.accuracy)}</td>
							<td class="num" class:weak={s.speed !== null && s.speed > 1}>{s.medianMs === null ? '—' : secs(s.medianMs)}</td>
							<td class="num muted">{secs(s.targetMs)}</td>
							<td class="num muted">{s.attempts}</td>
						</tr>
					{/each}
				</tbody>
			{/each}
		</table>
	</div>
</section>

{#if overview.recent.length}
	<section class="card">
		<h2>Recent sessions</h2>
		<ul class="sessions">
			{#each overview.recent as s (s.id)}
				<li>
					<span class="date">{s.date}</span>
					<span class="mode">{s.mode === 'daily' ? 'Daily set' : 'Free play'}</span>
					<span class="num">{s.correct}/{s.count}</span>
					<span class="muted">{Math.round(s.durationMs / 60000)} min</span>
					{#each Object.entries(s.levelChanges) as [id, [from, to]] (id)}
						<span class="change" class:up={to > from}>{SKILL_BY_ID[id]?.title} {from}→{to}</span>
					{/each}
				</li>
			{/each}
		</ul>
	</section>
{/if}

<style>
	h1 {
		margin: 0 0 1rem;
	}
	.summary {
		margin: 0;
		max-width: 60ch;
		font-size: 1.1rem;
		line-height: 1.6;
		color: var(--color-text-secondary);
	}
	.summary strong {
		font-size: 1.6rem;
		color: var(--color-text-primary);
	}
	.legend,
	.muted,
	.empty {
		color: var(--color-text-secondary);
		font-size: 0.85rem;
	}
	.card {
		margin-top: 1.5rem;
		padding: 1.25rem;
		background: var(--color-surface);
		border-radius: var(--radius-card);
		min-width: 0;
	}
	.card h2 {
		margin: 0 0 0.75rem;
		font-size: 1.2rem;
	}
	.card-head {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		gap: 1rem;
		flex-wrap: wrap;
	}
	select {
		background: var(--color-bg-tertiary);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		color: var(--color-text-primary);
		padding: 0.3rem 0.5rem;
	}
	.legend {
		margin: 0.6rem 0 0;
	}
	.table-scroll {
		overflow-x: auto;
	}
	table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.92rem;
	}
	th {
		text-align: left;
		color: var(--color-text-secondary);
		font-weight: 500;
		padding: 0.4rem 0.6rem;
		border-bottom: 1px solid var(--color-border);
		white-space: nowrap;
	}
	td {
		padding: 0.4rem 0.6rem;
		border-bottom: 1px solid var(--color-border);
	}
	td a {
		color: var(--color-text-primary);
	}
	tr.cat td {
		padding-top: 1rem;
		font-weight: 600;
		color: var(--color-text-secondary);
		border-bottom: none;
	}
	.num {
		white-space: nowrap;
	}
	td.weak {
		color: var(--orange);
	}
	.sessions {
		list-style: none;
		margin: 0;
		padding: 0;
	}
	.sessions li {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem 1rem;
		align-items: baseline;
		padding: 0.5rem 0;
		border-bottom: 1px solid var(--color-border);
	}
	.sessions li:last-child {
		border-bottom: none;
	}
	.date {
		color: var(--color-text-secondary);
	}
	.change {
		font-size: 0.8rem;
		color: var(--orange);
	}
	.change.up {
		color: var(--green);
	}
	@media (max-width: 560px) {
		.card {
			padding: 1rem 0.75rem;
		}
	}
</style>
