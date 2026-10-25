<script lang="ts">
	import { resolve } from '$app/paths';
	import { CATEGORIES, SKILLS } from '$lib/js/caseMath/skills';
	import { TIPS } from '$lib/js/caseMath/tips';
	import TipCard from '$lib/components/caseMath/TipCard.svelte';
</script>

<svelte:head>
	<title>Rules of thumb · Case math</title>
</svelte:head>

<h1>Rules of thumb</h1>
<p class="intro">
	The shortcuts behind every drill. Read one, then practice it straight away: a rule sticks once you've used it ten
	times against the clock.
</p>

<nav class="toc" aria-label="Skills">
	{#each SKILLS as skill (skill.id)}
		<a href="#{skill.id}">{skill.title}</a>
	{/each}
</nav>

{#each CATEGORIES as cat (cat.id)}
	<section>
		<h2>{cat.title}</h2>
		{#each SKILLS.filter((s) => s.category === cat.id) as skill (skill.id)}
			<article id={skill.id}>
				<div class="head">
					<h3>{skill.title}</h3>
					<a class="practice" href={resolve('/case-math/drill/[skill]', { skill: skill.id })}>Practice this</a>
				</div>
				<TipCard tip={TIPS[skill.id]} collapsible={false} />
			</article>
		{/each}
	</section>
{/each}

<style>
	h1 {
		margin: 0 0 0.3rem;
	}
	.intro {
		margin: 0 0 1rem;
		color: var(--color-text-secondary);
		max-width: 60ch;
		line-height: 1.5;
	}
	.toc {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
		margin-bottom: 1rem;
	}
	.toc a {
		padding: 0.25rem 0.7rem;
		border-radius: var(--radius-pill);
		background: var(--color-surface);
		color: var(--color-text-primary);
		text-decoration: none;
		font-size: 0.85rem;
		transition: scale var(--transition-fast);
	}
	.toc a:hover {
		scale: 1.05;
	}
	section h2 {
		margin: 2rem 0 0.5rem;
	}
	article {
		margin-bottom: 1.25rem;
		scroll-margin-top: 5rem;
	}
	.head {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		gap: 1rem;
	}
	h3 {
		margin: 0 0 0.4rem;
	}
	.practice {
		color: var(--color-primary);
		text-decoration: none;
		white-space: nowrap;
	}
</style>
