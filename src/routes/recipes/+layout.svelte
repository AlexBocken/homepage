<script>
import Header from '$lib/components/Header.svelte'
	import UserHeader from '$lib/components/UserHeader.svelte';
export let data
let user;
if(data.session){
	user = data.session.user
}
</script>

<Header>
	<ul class=site_header slot=links>
	<li><a href="/recipes">All Recipes</a></li>
	{#if user}
		<li><a href="/rezepte/favorites">Favorites</a></li>
	{/if}
	<li><a href="/recipes/season">In Season</a></li>
	<li><a href="/recipes/category">Category</a></li>
	<li><a href="/recipes/icon">Icon</a></li>
	<li><a href="/recipes/tag">Keywords</a></li>
	<li><a href="/rezepte/tips-and-tricks">Tips</a></li>
	</ul>
	<UserHeader slot=right_side {user}></UserHeader>
	<slot></slot>
</Header>
