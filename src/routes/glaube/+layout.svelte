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
	<li><a href="/glaube/gebete">Gebete</a></li>
	<li><a href="/glaube/rosenkranz">Rosenkranz</a></li>
	<li><a href="/glaube/predigten">Predigten</a></li>
	</ul>
	<UserHeader {username} slot=right_side></UserHeader>
	<slot></slot>
</Header>
