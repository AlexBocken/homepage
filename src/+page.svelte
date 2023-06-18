<script>
    /** @type {import('./$types').PageData} */
    export let data;
    import MultiImgWrapper from './MultiImgWrapper.svelte'
    import Property from './Property.svelte'
    console.log("#################")
    console.log(data.recipe)
</script>

<h1>{data.name}</h1>

{#if data.images.length > 0}
	<MultiImgWrapper wrap={data.images.length > 1} class='double'>
	{#each data.images as media}
	<figure>
		<img src="{media.mediapath}" alt="{media.alt}">
		<figcaption>{media.caption}</figcaption>
	</figure>
	{/each}
	</MultiImgWrapper>
{/if}

<Property id=backen populated={data.baking}>{data.recipe.baking.length} bei {data.recipe.baking.temperature} °C
{#if data.baking.mode}
	{data.baking.mode}
{:else}
	Ober-/Unterhitze
{/if}
</Property>
<Property id=vorbereitung>data.preparation</Property>
<Property id=gesamtzeit>data.total_time</Property>
<Property id=portionen>data.portions</Property>

{#if data.ingredients}
<h2>Zutaten</h2>
{#each data.ingredients as list}
{#if list.name}
	<h3>{list.name}</h3>
{/if}
<ul>
	{#each list.list as item}
		<li>{item.amount} {item.unit} {item.ingredient_name}</li>
	{/each}
</ul>
{/each}
{/if}


{#if data.instructions}
<h2>Zubereitung</h2>
{#each data.instructions as list}
{#if list.name}
	<h3>{list.name}</h3>
{/if}
<ol>
	{#each list.steps as step}
		<li>{step}</li>
	{/each}
</ol>
{/each}
{/if}
