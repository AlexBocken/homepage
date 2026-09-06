<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import Header from '$lib/components/Header.svelte';
	import UserHeader from '$lib/components/UserHeader.svelte';
	import MapIcon from '@lucide/svelte/icons/map';
	import Compass from '@lucide/svelte/icons/compass';

	let { data, children } = $props();
	let user = $derived(data.session?.user);

	function isActive(path: string) {
		const currentPath = page.url.pathname;
		if (path === '/hikes') {
			return currentPath === '/hikes' || currentPath === '/hikes/';
		}
		return currentPath.startsWith(path);
	}
</script>

<Header>
	{#snippet links()}
		<ul class="site_header">
			<li style="--active-fill: var(--nord10)">
				<a href={resolve('/hikes')} class:active={isActive('/hikes')}>
					<MapIcon size={16} strokeWidth={1.5} class="nav-icon" />
					<span class="nav-label">Alle Touren</span>
				</a>
			</li>
			<li style="--active-fill: var(--nord14)">
				<a href={resolve('/hikes/route-builder')} class:active={isActive('/hikes/route-builder')}>
					<Compass size={16} strokeWidth={1.5} class="nav-icon" />
					<span class="nav-label">Routen-Builder</span>
				</a>
			</li>
		</ul>
	{/snippet}

	{#snippet right_side()}
		<UserHeader {user} />
	{/snippet}

	{@render children()}
</Header>
