<script lang="ts">
	import type { PageData } from './$types';
	import Recipes from '$lib/components/recipes/Recipes.svelte';
	import Card from '$lib/components/recipes/Card.svelte';

	let { data } = $props<{ data: PageData }>();
	let current_month = new Date().getMonth() + 1;

	// Calculate statistics
	const stats = $derived.by(() => {
		const noTranslation = data.untranslated.filter(r => !r.translationStatus).length;
		const pending = data.untranslated.filter(r => r.translationStatus === 'pending').length;
		const needsUpdate = data.untranslated.filter(r => r.translationStatus === 'needs_update').length;

		return {
			total: data.untranslated.length,
			noTranslation,
			pending,
			needsUpdate
		};
	});
</script>

<style>
h1 {
	text-align: center;
	margin-bottom: 0;
	font-size: 4rem;
}
.subheading {
	text-align: center;
	margin-top: 0;
	font-size: 1.5rem;
	color: var(--nord3);
}
.stats-container {
	max-width: 800px;
	margin: 2rem auto;
	padding: 1.5rem;
	background: var(--nord1);
	border-radius: 8px;
	box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}
@media(prefers-color-scheme: light) {
	.stats-container {
		background: var(--nord6);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
	}
}
.stats-grid {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
	gap: 1rem;
	margin-top: 1rem;
}
.stat-item {
	text-align: center;
	padding: 1rem;
	background: var(--nord0);
	border-radius: 6px;
}
@media(prefers-color-scheme: light) {
	.stat-item {
		background: var(--nord5);
	}
}
.stat-value {
	font-size: 2rem;
	font-weight: bold;
	color: var(--nord14);
}
.stat-label {
	font-size: 0.9rem;
	color: var(--nord4);
	margin-top: 0.25rem;
}
@media(prefers-color-scheme: light) {
	.stat-label {
		color: var(--nord2);
	}
}
.empty-state {
	text-align: center;
	margin-top: 3rem;
	color: var(--nord3);
}
.empty-state p {
	font-size: 1.5rem;
}
</style>

<svelte:head>
	<title>Unübersetzte Rezepte - Bocken Rezepte</title>
	<meta name="description" content="Verwaltung unübersetzter Rezepte" />
</svelte:head>

<h1>Unübersetzte Rezepte</h1>

{#if data.error}
	<p class="subheading">{data.error}</p>
{:else if data.untranslated.length > 0}
	<p class="subheading">
		{stats.total} {stats.total === 1 ? 'Rezept benötigt' : 'Rezepte benötigen'} Übersetzung oder Überprüfung
	</p>

	<div class="stats-container">
		<h3 style="text-align: center; margin-top: 0;">Statistik</h3>
		<div class="stats-grid">
			<div class="stat-item">
				<div class="stat-value">{stats.noTranslation}</div>
				<div class="stat-label">Keine Übersetzung</div>
			</div>
			<div class="stat-item">
				<div class="stat-value">{stats.pending}</div>
				<div class="stat-label">Freigabe ausstehend</div>
			</div>
			<div class="stat-item">
				<div class="stat-value">{stats.needsUpdate}</div>
				<div class="stat-label">Aktualisierung erforderlich</div>
			</div>
		</div>
	</div>

	<Recipes>
		{#each data.untranslated as recipe}
			<Card
				{recipe}
				{current_month}
				routePrefix="/{data.recipeLang}"
				translationStatus={recipe.translationStatus}
			></Card>
		{/each}
	</Recipes>
{:else}
	<div class="empty-state">
		<p>Alle Rezepte sind übersetzt!</p>
		<p style="font-size: 1rem; margin-top: 1rem;">
			<a href="/{data.recipeLang}">Zurück zu den Rezepten</a>
		</p>
	</div>
{/if}
