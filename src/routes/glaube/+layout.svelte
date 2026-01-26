<script>
import { page } from '$app/stores';
import Header from '$lib/components/Header.svelte'
import UserHeader from '$lib/components/UserHeader.svelte';
let { data, children } = $props();

function isActive(path) {
	const currentPath = $page.url.pathname;
	// Check if current path starts with the link path
	return currentPath.startsWith(path);
}
</script>
<svelte:head>
	<link rel="preload" href="/fonts/crosses.woff2" as="font" type="font/woff2" crossorigin>
</svelte:head>
<Header>
	{#snippet links()}
		<ul class=site_header>
		<li><a href="/glaube/gebete" class:active={isActive('/glaube/gebete')}>Gebete</a></li>
		<li><a href="/glaube/rosenkranz" class:active={isActive('/glaube/rosenkranz')}>Rosenkranz</a></li>
		</ul>
	{/snippet}

	{#snippet right_side()}
		<UserHeader user={data.session?.user}></UserHeader>
	{/snippet}

	{@render children()}
</Header>
