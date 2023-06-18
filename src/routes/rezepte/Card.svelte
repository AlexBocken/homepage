<script>
export let recipe
export let current_month

import alragu from '$lib/assets/al_ragu.webp'
export let src
import './card.css'
// Winter: ❄️
// Weihnachten: 🎄
// Ostern: 🐇
// Fastenzeit: ✝️
// Herbst: 🍂
// Sommer: ☀️
</script>

<a class=card href="/rezepte/{recipe.short_name}">
	<img {src} alt="">
	<div class=title>
		{#if recipe.season.includes(current_month)}
			<div class=icon>{recipe.icon}</div>
		{/if}
		<div class=name>{recipe.name}</div>
		<div class=tags>
		{#each recipe.tags as tag}
			<a class=tag href="/rezepte/tag/{tag}">{tag}</a>
		{/each}
		</div>
	</div>
</a>
