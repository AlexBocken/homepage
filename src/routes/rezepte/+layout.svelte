<script lang="ts">
	import { page } from '$app/stores';
	import Header from '$lib/components/Header.svelte';
	import UserHeader from '$lib/components/UserHeader.svelte';
	import LanguageSelector from '$lib/components/LanguageSelector.svelte';

	let { data, children } = $props();
	let user = $derived(data.session?.user);

	function isActive(path: string) {
		const currentPath = $page.url.pathname;
		return currentPath.startsWith(path);
	}
</script>

<Header>
	{#snippet links()}
		<ul class="site_header">
			<li><a href="/rezepte" class:active={isActive('/rezepte') && $page.url.pathname === '/rezepte'}>Alle Rezepte</a></li>
			{#if user}
				<li><a href="/rezepte/favorites" class:active={isActive('/rezepte/favorites')}>Favoriten</a></li>
			{/if}
			<li><a href="/rezepte/season" class:active={isActive('/rezepte/season')}>Saison</a></li>
			<li><a href="/rezepte/category" class:active={isActive('/rezepte/category')}>Kategorie</a></li>
			<li><a href="/rezepte/icon" class:active={isActive('/rezepte/icon')}>Icon</a></li>
			<li><a href="/rezepte/tag" class:active={isActive('/rezepte/tag')}>Tags</a></li>
			{#if user?.groups?.includes('rezepte_users')}
				<li><a href="/rezepte/untranslated" class:active={isActive('/rezepte/untranslated')}>Unübersetzt</a></li>
			{/if}
		</ul>
	{/snippet}

	{#snippet language_selector_mobile()}
		<LanguageSelector />
	{/snippet}

	{#snippet language_selector_desktop()}
		<LanguageSelector />
	{/snippet}

	{#snippet right_side()}
		<UserHeader {user}></UserHeader>
	{/snippet}

	{@render children()}
</Header>
