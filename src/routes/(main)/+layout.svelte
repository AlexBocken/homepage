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
	</ul>
	<UserHeader {user} slot=right_side></UserHeader>
	<slot></slot>
</Header>
