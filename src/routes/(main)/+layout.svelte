<script>
import Header from '$lib/components/Header.svelte'
import UserHeader from '$lib/components/UserHeader.svelte';
let { data } = $props();

let user = $derived(data.session?.user);
</script>

<Header>
	<ul class=site_header slot=links>
	</ul>
	<UserHeader {user} slot=right_side showLanguageSelector={true}></UserHeader>
	<slot></slot>
</Header>
