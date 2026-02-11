<script>
	let { images, isEnglish } = $props();
</script>
<style>
@media (min-width: 1200px) {
	.mystery-image-pad {
		height: calc(100vh - 5rem);
	}
	.mystery-image-pad[data-target="before"],
	.mystery-image-pad[data-target="after"] {
		height: 100vh;
	}
	figure {
		margin: 0;
		margin-right: 2rem;
	}
	img {
		max-height: calc(100vh - 5rem);
		width: auto;
		max-width: 25vw;
		object-fit: contain;
		border-radius: 6px;
		display: block;
	}
	figcaption {
		font-size: 0.8rem;
		color: var(--nord4);
		margin-top: 0.4rem;
		max-width: 25vw;
	}
}
@media (min-width: 1200px) and (prefers-color-scheme: light) {
	figcaption {
		color: var(--nord2);
	}
}
</style>

<div class="mystery-image-pad" data-target="before"></div>
{#each [...images.entries()] as [num, img], i (num)}
	{#if i > 0}<div class="mystery-image-pad" data-target="between{i}"></div>{/if}
	<figure data-target={num}>
		<img src={img.src} alt="{img.artist ? `${img.artist} — ` : ''}{isEnglish ? img.title : img.titleDe}">
		<figcaption>{#if img.artist}{img.artist}, {/if}<em>{isEnglish ? img.title : img.titleDe}</em>{#if img.year}, {img.year}{/if}</figcaption>
	</figure>
{/each}
<div class="mystery-image-pad" data-target="after"></div>
