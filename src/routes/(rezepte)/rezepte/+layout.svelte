<script>
import Header from '$lib/components/Header.svelte'
import UserHeader from '$lib/components/UserHeader.svelte';
export let data
let username = ""
if(data.user) username = data.user.username
</script>

<Header>
	<ul class=site_header slot=links>
	<li><a href="/rezepte">Alle Rezepte</a></li>
	<li><a href="/rezepte/season">In Saison</a></li>
	<li><a href="/rezepte/category">Kategorie</a></li>
	<li><a href="/rezepte/icon">Icon</a></li>
	<li><a href="/rezepte/tag">Stichwörter</a></li>
	</ul>
	<UserHeader {username} slot=right_side></UserHeader>
	<slot></slot>
</Header>
