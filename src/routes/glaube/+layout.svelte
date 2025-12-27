<script>
import { page } from '$app/stores';
import Header from '$lib/components/Header.svelte'
import UserHeader from '$lib/components/UserHeader.svelte';
export let data

function isActive(path) {
	const currentPath = $page.url.pathname;
	// Check if current path starts with the link path
	return currentPath.startsWith(path);
}
</script>
<Header>
	<ul class=site_header slot=links>
	<li><a href="/glaube/gebete" class:active={isActive('/glaube/gebete')}>Gebete</a></li>
	<li><a href="/glaube/rosenkranz" class:active={isActive('/glaube/rosenkranz')}>Rosenkranz</a></li>
	<li><a href="/glaube/predigten" class:active={isActive('/glaube/predigten')}>Predigten</a></li>
	</ul>
	<UserHeader user={data.session?.user} slot=right_side></UserHeader>
	<slot></slot>
</Header>
