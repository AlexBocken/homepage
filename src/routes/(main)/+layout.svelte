<script>
import Header from '$lib/components/Header.svelte'
import UserHeader from '$lib/components/UserHeader.svelte';
export let data
let username = ""
if(data.user){
	username = data.user.username
}
</script>

<Header>
	<ul class=site_header slot=links>
	<li><a href="/rezepte">Rezepte</a></li>
	<li><a href="/bilder">Bilder</a></li>
	<li><a href="/git">Git</a></li>
	<li><a href="/transmission">Transmission</a></li>
	</ul>
	<UserHeader {username} slot=right_side></UserHeader>
	<slot></slot>
</Header>
