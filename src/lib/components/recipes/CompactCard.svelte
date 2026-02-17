<script lang="ts">
	import "$lib/css/shake.css";

	let {
		recipe,
		current_month = 0,
		icon_override = false,
		isFavorite = false,
		showFavoriteIndicator = false,
		loading_strat = "lazy",
		routePrefix = '/rezepte'
	} = $props();

	const img_name = $derived(
		recipe.images?.[0]?.mediapath ||
		`${recipe.germanShortName || recipe.short_name}.webp`
	);

	const img_alt = $derived(
		recipe.images?.[0]?.alt || recipe.name
	);

	const img_color = $derived(recipe.images?.[0]?.color || '');

	const isInSeason = $derived(icon_override || recipe.season?.includes(current_month));

	function activateTransitions(event) {
		const img = event.currentTarget.querySelector('.img-wrap img');
		if (img) img.style.viewTransitionName = `recipe-${recipe.short_name}-img`;
	}
</script>
<style>
.compact-card {
	position: relative;
	display: flex;
	flex-direction: column;
	border-radius: var(--radius-card);
	overflow: hidden;
	background: var(--color-surface);
	box-shadow: 0 1px 4px rgba(0,0,0,0.08);
	transition: transform var(--transition-normal), box-shadow var(--transition-normal);
	cursor: pointer;
}
.compact-card:hover,
.compact-card:focus-within {
	transform: translateY(-5px);
	box-shadow: 0 8px 24px rgba(0,0,0,0.12);
}
.compact-card:hover .img-wrap img {
	transform: scale(1.05);
}
.compact-card:hover .icon,
.compact-card:focus-within .icon {
	animation: shake 0.6s;
}
.card-link {
	position: absolute;
	inset: 0;
	z-index: 1;
}
.img-wrap {
	aspect-ratio: 3 / 2;
	overflow: hidden;
}
.img-wrap img {
	display: block;
	width: 100%;
	height: 100%;
	object-fit: cover;
	transition: transform 0.4s ease;
	border-radius: var(--radius-card) var(--radius-card) 0 0;
}
.info {
	position: relative;
	padding: 0.5em 0.6em 0.5em;
	flex: 1;
}
.name {
	font-size: 0.85rem;
	font-weight: 600;
	line-height: 1.3;
	margin: 0;
}
@media (min-width: 600px) {
	.info {
		padding: 0.8em 0.9em 0.7em;
	}
	.name {
		font-size: 1.1rem;
	}
}
.tags {
	display: flex;
	flex-wrap: wrap;
	gap: 0.3em;
	margin-top: 0.5em;
	position: relative;
	z-index: 2;
}
.tag {
	font-size: 0.7rem;
	padding: 0.1rem 0.4rem;
	border-radius: var(--radius-pill);
	background-color: var(--nord5);
	color: var(--nord3);
	text-decoration: none;
	cursor: pointer;
	transition: transform var(--transition-fast), background-color var(--transition-fast), box-shadow var(--transition-fast), color var(--transition-fast);
	box-shadow: var(--shadow-sm);
	border: none;
	display: inline-block;
}
.tag:hover,
.tag:focus-visible {
	transform: scale(1.05);
	background-color: var(--nord8);
	box-shadow: var(--shadow-hover);
	color: var(--nord0);
}
@media (min-width: 600px) {
	.tag {
		font-size: 0.9rem;
		padding: 0.15rem 0.55rem;
	}
}
@media (prefers-color-scheme: dark) {
	.tag,
	.tag:visited,
	.tag:link {
		background-color: var(--nord0);
		color: var(--nord4);
	}
	.tag:hover,
	.tag:focus-visible {
		background-color: var(--nord8);
		color: var(--nord0);
	}
}
.icon {
	position: absolute;
	top: -1.2em;
	right: 0.6em;
	width: 2em;
	height: 2em;
	font-size: 1rem;
	background-color: var(--nord0);
	color: white;
	z-index: 3;
}
@media (min-width: 600px) {
	.icon {
		font-size: 1.2rem;
	}
}
.favorite {
	position: absolute;
	top: 0.5em;
	left: 0.5em;
	font-size: 1.1rem;
	filter: drop-shadow(0 0 3px rgba(0,0,0,0.8));
	z-index: 2;
	pointer-events: none;
}
</style>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="compact-card" onclick={activateTransitions}>
	<a href="{routePrefix}/{recipe.short_name}" class="card-link" aria-label={recipe.name}></a>
	{#if showFavoriteIndicator && isFavorite}
		<span class="favorite">❤️</span>
	{/if}
	<div class="img-wrap" style:background-color={img_color}>
		<img
			src="https://bocken.org/static/rezepte/thumb/{img_name}"
			alt={img_alt}
			loading={loading_strat}
			data-recipe={recipe.short_name}
		/>
	</div>
	<div class="info">
		{#if isInSeason}
			<a href="{routePrefix}/icon/{recipe.icon}" class="icon g-icon-badge">{recipe.icon}</a>
		{/if}
		<p class="name">{@html recipe.name}</p>
		{#if recipe.tags?.length}
			<div class="tags">
				{#each recipe.tags as tag (tag)}
					<a href="{routePrefix}/tag/{tag}" class="tag">{tag}</a>
				{/each}
			</div>
		{/if}
	</div>
</div>
