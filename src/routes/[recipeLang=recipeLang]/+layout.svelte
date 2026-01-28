<script>
import { page } from '$app/stores';
import Header from '$lib/components/Header.svelte'
import UserHeader from '$lib/components/UserHeader.svelte';
import LanguageSelector from '$lib/components/LanguageSelector.svelte';
import OfflineSyncButton from '$lib/components/OfflineSyncButton.svelte';
let { data, children } = $props();

let user = $derived(data.session?.user);

const isEnglish = $derived(data.lang === 'en');
const labels = $derived({
	allRecipes: isEnglish ? 'All Recipes' : 'Alle Rezepte',
	favorites: isEnglish ? 'Favorites' : 'Favoriten',
	inSeason: isEnglish ? 'Season' : 'Saison',
	category: isEnglish ? 'Category' : 'Kategorie',
	icon: 'Icon',
	keywords: 'Tags'
});

function isActive(path) {
	const currentPath = $page.url.pathname;
	// Exact match for recipe lang root
	if (path === `/${data.recipeLang}`) {
		return currentPath === `/${data.recipeLang}` || currentPath === `/${data.recipeLang}/`;
	}
	// For other paths, check if current path starts with the link path
	return currentPath.startsWith(path);
}
</script>

<Header>
	{#snippet links()}
		<ul class=site_header>
		<li><a href="/{data.recipeLang}" class:active={isActive(`/${data.recipeLang}`)}>{labels.allRecipes}</a></li>
		{#if user}
			<li><a href="/{data.recipeLang}/favorites" class:active={isActive(`/${data.recipeLang}/favorites`)}>{labels.favorites}</a></li>
		{/if}
		<li><a href="/{data.recipeLang}/season" class:active={isActive(`/${data.recipeLang}/season`)}>{labels.inSeason}</a></li>
		<li><a href="/{data.recipeLang}/category" class:active={isActive(`/${data.recipeLang}/category`)}>{labels.category}</a></li>
		<li><a href="/{data.recipeLang}/icon" class:active={isActive(`/${data.recipeLang}/icon`)}>{labels.icon}</a></li>
		<li><a href="/{data.recipeLang}/tag" class:active={isActive(`/${data.recipeLang}/tag`)}>{labels.keywords}</a></li>
		</ul>
	{/snippet}

	{#snippet language_selector_mobile()}
		<LanguageSelector />
	{/snippet}

	{#snippet language_selector_desktop()}
		<LanguageSelector />
	{/snippet}

	{#snippet right_side()}
		<OfflineSyncButton lang={data.lang} />
		<UserHeader {user} recipeLang={data.recipeLang} lang={data.lang}></UserHeader>
	{/snippet}

	{@render children()}
</Header>
