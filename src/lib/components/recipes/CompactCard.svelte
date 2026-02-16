<script lang="ts">
	import "$lib/css/shake.css";

	let {
		recipe,
		current_month = 0,
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

	const isInSeason = $derived(recipe.season?.includes(current_month));
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
}
.info {
	position: relative;
	padding: 0.8em 0.9em 0.7em;
	flex: 1;
}
.name {
	font-size: 0.95rem;
	font-weight: 600;
	line-height: 1.3;
	margin: 0;
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
	padding: 0.15em 0.6em;
}
.icon {
	position: absolute;
	top: -0.75em;
	right: 0.6em;
	width: 2em;
	height: 2em;
	font-size: 1rem;
	background-color: var(--color-primary);
	color: white;
	z-index: 3;
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

<div class="compact-card">
	<a href="{routePrefix}/{recipe.short_name}" class="card-link" aria-label={recipe.name}></a>
	{#if showFavoriteIndicator && isFavorite}
		<span class="favorite">❤️</span>
	{/if}
	<div class="img-wrap">
		<img
			src="https://bocken.org/static/rezepte/thumb/{img_name}"
			alt={img_alt}
			loading={loading_strat}
		/>
	</div>
	<div class="info">
		{#if isInSeason}
			<span class="icon g-icon-badge">{recipe.icon}</span>
		{/if}
		<p class="name">{@html recipe.name}</p>
		{#if recipe.tags?.length}
			<div class="tags">
				{#each recipe.tags as tag (tag)}
					<a href="{routePrefix}/tag/{tag}" class="tag g-tag">{tag}</a>
				{/each}
			</div>
		{/if}
	</div>
</div>
