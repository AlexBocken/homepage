<script>
import '$lib/css/recipe-links.css';
import { page } from '$app/stores';
import { onNavigate } from '$app/navigation';
import Header from '$lib/components/Header.svelte'

onNavigate((navigation) => {
	if (!document.startViewTransition) return;

	// Only use view transitions when navigating to/from a recipe detail page
	const toRecipe = navigation.to?.params?.name;
	const fromRecipe = navigation.from?.params?.name;
	if (!toRecipe && !fromRecipe) return;
	if (fromRecipe && toRecipe) return; // recipe-to-recipe: no view transition

	// Measure title block position so the slide animation covers exactly the right distance
	const title = document.querySelector('[style*="view-transition-name: recipe-title"]');
	if (title) {
		const dist = window.innerHeight - title.getBoundingClientRect().top;
		document.documentElement.style.setProperty('--title-slide', `${dist}px`);
	}

	return new Promise((resolve) => {
		const vt = document.startViewTransition(async () => {
			resolve();
			await navigation.complete;

			// Hide .image-wrap background so the color box doesn't show behind the morphing image
			const wrap = document.querySelector('.image-wrap');
			if (wrap) wrap.style.backgroundColor = 'transparent';

			// Set view-transition-name on the matching CompactCard/hero image for reverse morph
			if (fromRecipe) {
				const card = document.querySelector(`img[data-recipe="${fromRecipe}"]`);
				if (card) card.style.viewTransitionName = `recipe-${fromRecipe}-img`;
			}
		});
		// Restore background color once transition finishes
		vt.finished.then(() => {
			const wrap = document.querySelector('.image-wrap');
			if (wrap) wrap.style.backgroundColor = '';
		});
	});
});
import UserHeader from '$lib/components/UserHeader.svelte';
import LanguageSelector from '$lib/components/LanguageSelector.svelte';
import OfflineSyncButton from '$lib/components/OfflineSyncButton.svelte';
import { BookOpen, Heart, Leaf, LayoutGrid, Palette, Tag } from 'lucide-svelte';
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
		<li><a href="/{data.recipeLang}" class:active={isActive(`/${data.recipeLang}`)} title={labels.allRecipes}><BookOpen size={16} strokeWidth={1.5} class="nav-icon" /><span class="nav-label">{labels.allRecipes}</span></a></li>
		{#if user}
			<li><a href="/{data.recipeLang}/favorites" class:active={isActive(`/${data.recipeLang}/favorites`)} title={labels.favorites}><Heart size={16} strokeWidth={1.5} class="nav-icon" /><span class="nav-label">{labels.favorites}</span></a></li>
		{/if}
		<li><a href="/{data.recipeLang}/season" class:active={isActive(`/${data.recipeLang}/season`)} title={labels.inSeason}><Leaf size={16} strokeWidth={1.5} class="nav-icon" /><span class="nav-label">{labels.inSeason}</span></a></li>
		<li><a href="/{data.recipeLang}/category" class:active={isActive(`/${data.recipeLang}/category`)} title={labels.category}><LayoutGrid size={16} strokeWidth={1.5} class="nav-icon" /><span class="nav-label">{labels.category}</span></a></li>
		<li><a href="/{data.recipeLang}/icon" class:active={isActive(`/${data.recipeLang}/icon`)} title={labels.icon}><Palette size={16} strokeWidth={1.5} class="nav-icon" /><span class="nav-label">{labels.icon}</span></a></li>
		<li><a href="/{data.recipeLang}/tag" class:active={isActive(`/${data.recipeLang}/tag`)} title={labels.keywords}><Tag size={16} strokeWidth={1.5} class="nav-icon" /><span class="nav-label">{labels.keywords}</span></a></li>
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
