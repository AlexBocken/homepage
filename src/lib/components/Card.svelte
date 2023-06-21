<script lang="ts">
export let recipe
export let current_month
export let icon_override = false;

if(icon_override){
	current_month = recipe.season[0]
}

// Winter: ❄️
// Weihnachten: 🎄
// Ostern: 🐇
// Fastenzeit: ✝️
// Herbst: 🍂
// Sommer: ☀️
</script>
<style>
.card{
	--card-width: 300px;
	text-decoration: none;
	position: relative;
	box-sizing: border-box;
	font-family: sans-serif;
	cursor: pointer;
	width: var(--card-width);
	aspect-ratio: 4/7;
	border-radius: 20px;
	background-size: contain;
	display: flex;
	flex-direction: column;
	justify-content: end;
	transition: 200ms;
	background-color:  var(--blue);
	box-shadow: 0em 0em 2em 0.1em rgba(0, 0, 0, 0.3);
}
.card .icon{
	text-decoration: unset;
	transition: 100ms;
	position: absolute;
	font-size: 1.5rem;
	top:-0.5em;
	right:-0.5em;
	padding: 0.25em;
	background-color: var(--nord6);
	border-radius:1000px;
	box-shadow: 0em 0em 2em 0.1em rgba(0, 0, 0, 0.6);
}
.card .icon:hover,
.card .icon:focus-visible
{
	box-shadow: 0em 0em 1em 0.2em rgba(0, 0, 0, 0.6);
	transform:scale(1.2, 1.2)
}
.card:hover,
.card:focus-within{
	transform: scale(1.02,1.02);
	background-color: var(--red);
	box-shadow: 0.2em 0.2em 2em 1em rgba(0, 0, 0, 0.3);
}

.card img{
	height: 50%;
	object-fit: cover;
	border-top-left-radius: inherit;
	border-top-right-radius: inherit;
}
.card .title {
	position: relative;
	box-sizing: border-box;
	padding-top: 0.5em;
	height: 50%;
	width: 100% ;
	border-bottom-left-radius: inherit;
	border-bottom-right-radius: inherit;
	display: flex;
	flex-direction: column;
	justify-content: space-between;
	transition: 100ms;
}
.card .name{
	font-size: 2em;
	color: white;
	padding-inline: 0.5em;
	padding-block: 0.2em;
}
.card .description{
	padding-inline: 1em;
	color: var(--nord4);
}
.card .tags{
	display: flex;
	flex-wrap: wrap;
	overflow: hidden;
	column-gap: 0.25em;
	padding-inline: 0.5em;
	padding-top: 0.25em;
	margin-bottom:0.5em;
	flex-grow: 0;
}
.card .tag{
	cursor: pointer;
	text-decoration: unset;
	background-color: var(--nord4);
	color: var(--nord0);
	border-radius: 100px;
	padding-inline: 1em;
	line-height: 1.5em;
	margin-bottom: 0.5em;
	transition: 100ms;
	box-shadow: 0.2em 0.2em 0.2em 0.05em rgba(0, 0, 0, 0.3);
}
.card .tag:hover,
.card .tag:focus-visible
{
	transform: scale(1.04, 1.04);
	background-color: var(--orange);
	box-shadow: 0.2em 0.2em 0.2em 0.1em rgba(0, 0, 0, 0.3);
}

.card .title .category{
	position: absolute;
	box-shadow: 0em 0em 1em 0.1em rgba(0, 0, 0, 0.6);
	text-decoration: none;
	color: var(--nord6);
	font-size: 1.5rem;
	top: -0.8em;
	left: -0.5em;
	background-color: var(--nord0);
	padding-inline: 1em;
	border-radius: 1000px;
	transition: 100ms;

}
.card .title .category:hover,
.card .title .category:focus-within
{
	box-shadow: -0.2em 0.2em 1em 0.1em rgba(0, 0, 0, 0.6);
	background-color: var(--nord3);
	transform: scale(1.05, 1.05)
}
.card:hover .icon,
.card:focus-visible .icon
{
	animation:  shake 0.6s
}

  @keyframes shake{
    0%{
      transform: rotate(0)
		scale(1,1);
    }
    25%{
    	box-shadow: 0em 0em 1em 0.2em rgba(0, 0, 0, 0.6);
      	transform: rotate(30deg)
      		scale(1.2,1.2)
      ;
    }
    50%{

    	box-shadow: 0em 0em 1em 0.2em rgba(0, 0, 0, 0.6);
      	transform: rotate(-30deg)
      		scale(1.2,1.2);
    }
    74%{

    	box-shadow: 0em 0em 1em 0.2em rgba(0, 0, 0, 0.6);
  	transform: rotate(30deg)
  		scale(1.2, 1.2);
	}
	100%{
      transform: rotate(0)
      	scale(1,1);
    }
  }

</style>
<a class=card href="/rezepte/{recipe.short_name}" data-tags=[{recipe.tags}]>
{#if icon_override || recipe.season.includes(current_month)}
	<a class=icon href="/rezepte/season/{current_month}">{recipe.icon}</a>
{/if}
	<img width=300px height=300px src="/images/{recipe.images[0].mediapath}" alt="{recipe.alt}" />
	<div class=title>
		<a class=category href="/rezepte/category/{recipe.category}" >{recipe.category}</a>
		<div>
			<div class=name>{recipe.name}</div>
			<div class=description>{recipe.description}</div>
		</div>
		<div class=tags>
		{#each recipe.tags as tag}
			<a class=tag href="/rezepte/tag/{tag}">{tag}</a>
		{/each}
		</div>
	</div>
</a>
