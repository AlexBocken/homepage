<script lang="ts">
export let recipe
export let current_month
export let icon_override = false;

if(icon_override){
	current_month = recipe.season[0]
}

import src from '$lib/assets/img/al_ragu.webp'
import '$lib/components/card.css'
//import src from './aelplermagronen.js'
// Winter: ❄️
// Weihnachten: 🎄
// Ostern: 🐇
// Fastenzeit: ✝️
// Herbst: 🍂
// Sommer: ☀️
</script>
<a class=card href="/rezepte/{recipe.short_name}" data-tags=[{recipe.tags}]>
{#if icon_override || recipe.season.includes(current_month)}
	<a class=icon href="/rezepte/season/{current_month}">{recipe.icon}</a>
{/if}
	<img src="/images/{recipe.images[0].mediapath}" alt="{recipe.alt}" />
	<div class=title>
		<a class=category href="/rezepte/category/{recipe.category}" >{recipe.category}</a>
		<div class=name>{recipe.name}</div>
		<div class=tags>
		{#each recipe.tags as tag}
			<a class=tag href="/rezepte/tag/{tag}">{tag}</a>
		{/each}
		</div>
	</div>
</a>
