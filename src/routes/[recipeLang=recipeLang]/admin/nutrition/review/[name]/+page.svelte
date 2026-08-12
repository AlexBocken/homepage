<script>
	/**
	 * One recipe of the review walk.
	 *
	 * The editor's nutrition section, on its own, with the queue's progress above
	 * it and the way onward below. Nothing about the recipe itself can be changed
	 * here — that is what the full editor is for, one click away — so a session is
	 * only ever about the mappings.
	 */
	import PencilLine from '@lucide/svelte/icons/pencil-line';
	import NutritionReviewForm from '$lib/components/recipes/NutritionReviewForm.svelte';
	import { toast } from '$lib/js/toast.svelte';

	let { data, form } = $props();

	const lang = $derived(data.recipeLang);
	const base = $derived(`/${lang}/admin/nutrition/review`);

	$effect(() => {
		if (form?.error) toast.error(form.error);
		else if (form?.saved) toast.success('Gespeichert');
	});
</script>

<svelte:head>
	<title>Prüfen: {data.recipe.name}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="page">
	<nav class="crumbs">
		<a href={base}>← Nährwert-Prüfung</a>
		<span class="progress-note">
			{data.queue.green} von {data.queue.total} geprüft ({data.queue.greenPercent}%) ·
			{data.queue.pending} offen
			{#if data.position > 0}
				· Nr. {data.position} der offenen
			{/if}
		</span>
	</nav>

	<div class="bar" aria-hidden="true">
		<div class="bar-fill" style="width: {data.queue.greenPercent}%"></div>
	</div>

	<header class="head">
		<h1>
			{data.recipe.name}
			{#if data.summary}
				<span class="state" data-clean={data.summary.clean}>
					{data.summary.clean ? 'geprüft' : `${data.summary.todo} offen`}
				</span>
			{/if}
		</h1>
		<div class="head-links">
			<a class="ghost" href="/{lang}/{data.recipe.short_name}">Rezept ansehen</a>
			<a class="ghost" href="/rezepte/edit/{data.recipe.short_name}">
				<PencilLine size={14} /> Im Editor öffnen
			</a>
		</div>
	</header>

	<!-- Keyed: the route component survives a change of `[name]`, so without this
	     the mapper would keep the state it seeded from the recipe before. -->
	{#key data.recipe.short_name}
		<NutritionReviewForm recipe={data.recipe} {base} next={data.next} previous={data.previous} />
	{/key}
</div>

<style>
	.page {
		max-width: 1000px;
		margin: 1.5rem auto 4rem;
		padding: 0 1rem;
	}

	.crumbs {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		justify-content: space-between;
		gap: 0.5rem;
		margin-bottom: 0.5rem;
	}
	.crumbs a {
		color: var(--color-text-secondary);
		text-decoration: none;
		font-size: var(--text-sm);
	}
	.crumbs a:hover {
		color: var(--color-text-primary);
	}
	.progress-note {
		font-size: 0.75rem;
		color: var(--color-text-secondary);
		font-variant-numeric: tabular-nums;
	}

	.bar {
		height: 6px;
		border-radius: var(--radius-pill);
		background: var(--color-bg-tertiary);
		overflow: hidden;
		margin-bottom: 1.5rem;
	}
	.bar-fill {
		height: 100%;
		background: var(--green);
		transition: width var(--transition-normal);
	}

	.head {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		justify-content: space-between;
		gap: 0.75rem;
		margin-bottom: 1.5rem;
	}
	.head h1 {
		margin: 0;
		color: var(--color-text-primary);
	}
	.head-links {
		display: flex;
		gap: 0.5rem;
	}

	/* What this recipe still needs, in the queue's own words — the numbers below
	   are per ingredient line, this one is the recipe's verdict. */
	.state {
		display: inline-block;
		margin-left: 0.5rem;
		padding: 0.1rem 0.6rem;
		border-radius: var(--radius-pill);
		font-size: 0.7rem;
		font-weight: 600;
		vertical-align: middle;
		background: color-mix(in srgb, var(--orange) 15%, transparent);
		border: 1px solid var(--orange);
		color: var(--color-text-primary);
	}
	.state[data-clean='true'] {
		background: color-mix(in srgb, var(--green) 15%, transparent);
		border-color: var(--green);
	}
	.ghost {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.4rem 0.9rem;
		border-radius: var(--radius-pill);
		border: 1px solid var(--color-border);
		background: transparent;
		color: var(--color-text-secondary);
		font-size: var(--text-sm);
		font-weight: 600;
		text-decoration: none;
		transition: color var(--transition-fast), border-color var(--transition-fast);
	}
	.ghost:hover {
		color: var(--color-text-primary);
		border-color: var(--color-text-tertiary);
	}

	@media (max-width: 560px) {
		.head-links {
			flex-wrap: wrap;
		}
	}
</style>
