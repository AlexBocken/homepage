<script>
import Header from '$lib/components/Header.svelte'
import UserHeader from '$lib/components/UserHeader.svelte';
export let data
let username = ""
if(data.session){
	username = data.session.user.name
}
console.log(data)
</script>

<Header>
	<ul class=site_header slot=links>
	<li><a href="/rezepte">Rezepte</a></li>
	<li><a href="/git">Git</a></li>
	<li><a href="https://stream.bocken.org">Streaming</a></li>
	<li><a href="/bilder">Bilder</a></li>
	<li><a href="https://meet.bocken.org">Jitsi</a></li>
	<li><a href="https://cloud.bocken.org">Cloud</a></li>
	<li><a href="/searx">Searx</a></li>
	</ul>
	<UserHeader {username} slot=right_side></UserHeader>
	<slot></slot>
</Header>
