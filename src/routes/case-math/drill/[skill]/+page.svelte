<script lang="ts">
	import { resolve } from '$app/paths';
	import { MAX_LEVEL, SKILLS, SKILL_BY_ID } from '$lib/js/caseMath/skills';
	import { TIPS } from '$lib/js/caseMath/tips';
	import { newSeed, pick } from '$lib/js/caseMath/rng';
	import type { PlannedQuestion } from '$lib/js/caseMath/adaptive';
	import Drill from '$lib/components/caseMath/Drill.svelte';
	import TipCard from '$lib/components/caseMath/TipCard.svelte';

	let { data } = $props();

	const skill = $derived(data.skill === 'mixed' ? null : SKILL_BY_ID[data.skill]);
	const title = $derived(skill?.title ?? 'Mixed free play');

	// The page is reused when moving between skills, so a picked level only
	// sticks for the skill it was picked on. null = each skill at its own level.
	let picked = $state<{ skill: string; level: number | null } | null>(null);
	const level = $derived(
		picked?.skill === data.skill ? picked.level : data.skill === 'mixed' ? null : data.levels[data.skill]
	);
	let run = $state(0);

	function next(): PlannedQuestion {
		const id = skill?.id ?? pick(Math.random, SKILLS).id;
		return { skill: id, level: level ?? data.levels[id], seed: newSeed() };
	}

	function setLevel(l: number | null) {
		picked = { skill: data.skill, level: l };
		run++;
	}
</script>

<svelte:head>
	<title>{title} · Case math</title>
</svelte:head>

<header class="head">
	<a class="back" href={resolve('/case-math')}>All skills</a>
	<h1>{title}</h1>
	{#if skill}<p class="blurb">{skill.blurb}</p>{/if}
	<div class="level-row">
		<span class="level-label" id="level-label">Level</span>
		<div class="levels" role="group" aria-labelledby="level-label">
			{#if !skill}
				<button type="button" class:on={level === null} aria-pressed={level === null} onclick={() => setLevel(null)}>
					Yours
				</button>
			{/if}
			{#each Array.from({ length: MAX_LEVEL }, (_, i) => i + 1) as l (l)}
				<button
					type="button"
					class:on={level === l}
					class:mine={skill && data.levels[skill.id] === l}
					aria-pressed={level === l}
					aria-label="Level {l}"
					onclick={() => setLevel(l)}>{l}</button
				>
			{/each}
		</div>
		{#if skill}
			<span class="level-note">
				{level === data.levels[skill.id]
					? 'Your current level. It moves up or down as you go.'
					: `You're at level ${data.levels[skill.id]}; practice here doesn't change it.`}
			</span>
		{/if}
	</div>
</header>

{#if skill}
	<div class="tip">
		<TipCard tip={TIPS[skill.id]} />
	</div>
{/if}

{#key `${data.skill}:${level}:${run}`}
	<Drill mode="free" {next} onrestart={() => run++}>
		{#snippet after()}<a href={resolve('/case-math')}>Back to practice</a>{/snippet}
	</Drill>
{/key}

<style>
	.head {
		max-width: 640px;
		margin: 0 auto 1rem;
	}
	.back {
		color: var(--color-text-secondary);
		text-decoration: none;
		font-size: 0.9rem;
	}
	h1 {
		margin: 0.3rem 0 0.2rem;
	}
	.blurb {
		margin: 0 0 0.8rem;
		color: var(--color-text-secondary);
	}
	.level-row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem 0.75rem;
	}
	.level-label {
		color: var(--color-text-secondary);
	}
	/* A segmented control: the levels are one scale, not five separate pills. */
	.levels {
		display: inline-flex;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-pill);
		overflow: hidden;
	}
	.levels button {
		min-width: 2.4rem;
		padding: 0.35rem 0.75rem;
		border: none;
		background: var(--color-surface);
		color: var(--color-text-primary);
		cursor: pointer;
		transition: background var(--transition-fast);
	}
	.levels button + button {
		border-left: 1px solid var(--color-border);
	}
	.levels button:hover {
		background: var(--color-bg-elevated);
	}
	.levels button.mine:not(.on) {
		box-shadow: inset 0 -3px 0 var(--color-primary);
	}
	.levels button.on {
		background: var(--color-primary);
		color: var(--color-text-on-primary);
	}
	.levels button:focus-visible {
		outline: 2px solid var(--color-primary);
		outline-offset: -4px;
	}
	.level-note {
		color: var(--color-text-secondary);
		font-size: 0.85rem;
	}
	.tip {
		max-width: 640px;
		margin: 0 auto 1.5rem;
	}
</style>
