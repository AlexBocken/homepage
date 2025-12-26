<script lang="ts">
    import '$lib/css/nordtheme.css';
    import Recipes from '$lib/components/Recipes.svelte';
    import Search from './Search.svelte';
    export let icons
    export let active_icon
    export let routePrefix = '/rezepte'
</script>

<style>
	a{
		font-family: "Noto Color Emoji", emoji, sans-serif;
		font-size: 2rem;
		text-decoration: none;
		padding: 0.5em;
		background-color: var(--nord4);
		border-radius: 1000px;
    		box-shadow: 0em 0em 0.5em 0.2em rgba(0, 0, 0, 0.2);
	}
	a:hover,
	a:focus-visible,
	.active
	{
		--angle: 15deg;
		animation: shake 0.5s ease forwards;
		background-color: var(--nord2);
	}
	.flex{
		display:flex;
		flex-wrap:wrap;
		gap: 1rem;
		max-width: 1000px;
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
{#each icons as icon, i}
	<a class:active={active_icon == icon} href="{routePrefix}/icon/{icon}">{icon}</a>
{/each}
</div>
<section>
<Search icon={active_icon}></Search>
</section>
<section>
<slot name=recipes></slot>
</section>
