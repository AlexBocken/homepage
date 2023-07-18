<script lang="ts">
    import type { PageData } from './$types';
    import '$lib/components/nordtheme.css';
    import Recipes from '$lib/components/Recipes.svelte';
    import MediaScroller from '$lib/components/MediaScroller.svelte';
    import SeasonLayout from '$lib/components/SeasonLayout.svelte'
    import Card from '$lib/components/Card.svelte';
    import Search from '$lib/components/Search.svelte';
    export let data: PageData;
</script>
<style>
	a{
		font-size: 3rem;
		text-decoration: none;
		padding: 0.5em;
		background-color: var(--nord4);
		border-radius: 1000px;
    		box-shadow: 0em 0em 0.5em 0.2em rgba(0, 0, 0, 0.2);
	}
	a:hover,
	a:focus-visible
	{
		--angle: 15deg;
		animation: shake 0.5s ease forwards;
	}
	.flex{
		display:flex;
		flex-wrap:wrap;
		gap: 1rem;
		max-width: 500px;
		justify-content: center;
		margin:4rem auto;
	}

@keyframes shake{
    0%{
      transform: rotate(0)
		scale(1,1);
    }
    25%{
    	box-shadow: 0em 0em 0.6em 0.3em rgba(0, 0, 0, 0.2);
      	transform: rotate(var(--angle))
      		scale(1.2,1.2)
      ;
    }
    50%{

    	box-shadow: 0em 0em 0.6em 0.3em rgba(0, 0, 0, 0.2);
      	transform: rotate(calc(-1* var(--angle)))
      		scale(1.2,1.2);
    }
    74%{

    	box-shadow: 0em 0em 0.6em 0.3em rgba(0, 0, 0, 0.2);
  	transform: rotate(var(--angle))
  		scale(1.2, 1.2);
	}
	100%{
      transform: rotate(0)
      	scale(1.2,1.2);
      box-shadow: 0em 0em 0.6em 0.3em rgba(0, 0, 0, 0.2);

    }
  }

</style>
<div class=flex>
{#each data.icons as icon}
	<a href="/rezepte/icon/{icon}">{icon}</a>
{/each}
</div>
