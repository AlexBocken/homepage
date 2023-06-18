<script lang="ts">
    import type { PageData } from './$types';
    import MultiImgWrapper from './MultiImgWrapper.svelte'
    export let data: PageData;
</script>

<h1>{data.name}</h1>

<MultiImgWrapper wrap={data.images.length>1} class=double>
{#each data.images as img}
	<figure>
	{#if img.caption}
		<caption>{img.caption}</caption>
	{/if}
	</figure>
{/each}
</MultiImgWrapper>

{#if data.ingredients}
<h2>Zutaten</h2>
{#each data.ingredients as list}
{#if list.name}
	<h3>{list.name}</h3>
{/if}
<ul>
	{#each list.list as item}
		<li>{item.amount} {item.unit} {item.name}</li>
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
