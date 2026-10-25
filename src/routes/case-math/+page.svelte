<script lang="ts">
	import { resolve } from '$app/paths';
	import { CATEGORIES, MAX_LEVEL, SKILLS, SKILL_BY_ID } from '$lib/js/caseMath/skills';
	import { DAILY_SIZE, streak } from '$lib/js/caseMath/adaptive';
	import { percent } from '$lib/js/caseMath/display';
	import { localDateStr } from '$lib/js/localDate';
	import Heatmap from '$lib/components/caseMath/Heatmap.svelte';
	import FitnessStreakAura from '$lib/components/fitness/FitnessStreakAura.svelte';

	let { data } = $props();
	const overview = $derived(data.overview);
	const today = localDateStr();
	const doneToday = $derived(overview.dailyDates.includes(today));
	const currentStreak = $derived(streak(overview.dailyDates, today));
	const todayStats = $derived(overview.days.find((d) => d.date === today));

	/** Practiced skills with the lowest recent accuracy, worst first. */
	const weakest = $derived(
		Object.values(overview.skills)
			.filter((s) => s.attempts >= 5 && s.accuracy !== null && s.accuracy < 0.85)
			.sort((a, b) => (a.accuracy ?? 0) - (b.accuracy ?? 0))
			.slice(0, 3)
	);
</script>

<svelte:head>
	<title>Case math</title>
</svelte:head>

<section class="today">
	<div class="lead">
		<h1>Case math</h1>
		{#if doneToday}
			<p>
				Today's set is done{#if todayStats}: {todayStats.correct} of {todayStats.count} right{/if}. Drill a weak spot
				or run another set.
			</p>
		{:else}
			<p>{DAILY_SIZE} questions, about ten minutes, weighted toward what you get wrong or slow.</p>
		{/if}
		<a class="start" href={resolve('/case-math/daily')}>{doneToday ? 'Run another set' : "Start today's set"}</a>
		{#if weakest.length}
			<p class="weak">
				Weakest right now:
				{#each weakest as s, i (s.id)}<a href={resolve('/case-math/drill/[skill]', { skill: s.id })}>{SKILL_BY_ID[s.id].title}</a>
					({percent(s.accuracy)}){i < weakest.length - 1 ? ', ' : ''}{/each}
			</p>
		{/if}
	</div>
	<div class="record">
		<div class="streak">
			<FitnessStreakAura value={currentStreak} steps={[3, 7, 14, 30, 60, 120]} />
			<span>{currentStreak === 1 ? 'day' : 'days'} in a row</span>
		</div>
		<Heatmap days={overview.days} {today} weeks={16} />
	</div>
</section>

<div class="ladders">
	{#each CATEGORIES as cat (cat.id)}
		<section class="ladder">
			<h2>{cat.title}</h2>
			<p class="blurb">{cat.blurb}</p>
			<ul>
				{#each SKILLS.filter((s) => s.category === cat.id) as skill (skill.id)}
					{@const s = overview.skills[skill.id]}
					<li>
						<a href={resolve('/case-math/drill/[skill]', { skill: skill.id })} aria-label={skill.title} title={skill.blurb}>
							<span class="name">{skill.title}</span>
							<span class="meter" role="img" aria-label="Level {s.level} of {MAX_LEVEL}">
								{#each Array.from({ length: MAX_LEVEL }, (_, i) => i) as i (i)}
									<span class:on={i < s.level}></span>
								{/each}
							</span>
							<span class="acc" class:low={s.accuracy !== null && s.accuracy < 0.7}>
								{s.attempts ? percent(s.accuracy) : 'new'}
							</span>
						</a>
					</li>
				{/each}
			</ul>
		</section>
	{/each}
</div>

<p class="mixed">
	Or <a href={resolve('/case-math/drill/[skill]', { skill: 'mixed' })}>drill everything mixed</a>, each skill at your level, for as long as you like.
</p>

<style>
	.today {
		display: flex;
		flex-wrap: wrap;
		gap: 2rem 3rem;
		align-items: flex-end;
		justify-content: space-between;
		padding-bottom: 2rem;
		border-bottom: 1px solid var(--color-border);
	}
	.lead {
		flex: 1 1 300px;
		max-width: 34rem;
	}
	h1 {
		margin: 0 0 0.4rem;
		font-size: var(--text-3xl, 2rem);
	}
	.lead p {
		margin: 0 0 1.25rem;
		color: var(--color-text-secondary);
		line-height: 1.5;
	}
	.start {
		display: inline-block;
		padding: 0.75rem 1.6rem;
		border-radius: var(--radius-pill);
		background: var(--color-primary);
		color: var(--color-text-on-primary);
		text-decoration: none;
		font-weight: 600;
		font-size: 1.05rem;
		transition: background var(--transition-fast);
	}
	.start:hover {
		background: var(--color-primary-hover);
	}
	.start:active {
		background: var(--color-primary-active);
	}
	.lead p.weak {
		margin: 1.25rem 0 0;
		font-size: 0.95rem;
	}
	.weak a {
		color: var(--color-text-primary);
	}
	.record {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
		min-width: 0;
		max-width: 100%;
	}
	.streak {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		color: var(--color-text-secondary);
	}

	/* Skills as a ladder per category: name, level rungs, recent accuracy. */
	.ladders {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
		gap: 2rem;
		margin-top: 2rem;
	}
	.ladder h2 {
		margin: 0;
		font-size: 1.2rem;
	}
	.blurb {
		margin: 0.2rem 0 0.75rem;
		color: var(--color-text-secondary);
		font-size: 0.9rem;
	}
	.ladder ul {
		list-style: none;
		margin: 0;
		padding: 0;
	}
	.ladder li a {
		display: grid;
		grid-template-columns: 1fr auto 3rem;
		align-items: center;
		gap: 0.75rem;
		padding: 0.5rem 0.5rem;
		margin-inline: -0.5rem;
		border-radius: var(--radius-md);
		color: var(--color-text-primary);
		text-decoration: none;
		transition: background var(--transition-fast);
	}
	.ladder li a:hover {
		background: var(--color-surface-hover, var(--color-bg-elevated));
	}
	.ladder li + li a {
		border-top: 1px solid color-mix(in srgb, var(--color-border) 60%, transparent);
	}
	.meter {
		display: flex;
		gap: 2px;
	}
	.meter span {
		width: 10px;
		height: 10px;
		border-radius: 2px;
		background: var(--color-bg-elevated);
	}
	.meter span.on {
		background: var(--color-primary);
	}
	.acc {
		text-align: right;
		font-size: 0.85rem;
		color: var(--color-text-secondary);
	}
	.acc.low {
		color: var(--orange);
		font-weight: 600;
	}
	.mixed {
		margin-top: 2.5rem;
		color: var(--color-text-secondary);
	}
	.mixed a {
		color: var(--color-text-primary);
	}
	@media (max-width: 560px) {
		.today {
			gap: 1.5rem;
		}
		.record {
			flex: 1 1 100%;
			align-items: center;
		}
		.ladders {
			gap: 1.5rem;
		}
	}
</style>
