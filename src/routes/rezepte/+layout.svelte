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
	<li><a href="/rezepte">Alle Rezepte</a></li>
	{#if user}
		<li><a href="/rezepte/favorites">Favoriten</a></li>
	{/if}
	<li><a href="/rezepte/season">In Saison</a></li>
	<li><a href="/rezepte/category">Kategorie</a></li>
	<li><a href="/rezepte/icon">Icon</a></li>
	<li><a href="/rezepte/tag">Stichwörter</a></li>
	<li><a href="/rezepte/tips-and-tricks">Tipps</a></li>
	</ul>
	<UserHeader slot=right_side {user}></UserHeader>
	<slot></slot>
</Header>
