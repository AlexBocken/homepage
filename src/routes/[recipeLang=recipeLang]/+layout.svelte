<script>
import { resolve } from '$app/paths';
import '$lib/css/recipe-links.css';
import { page } from '$app/state';
import { onNavigate } from '$app/navigation';
import Header from '$lib/components/Header.svelte'

onNavigate((navigation) => {
	if (!(/** @type {any} */ (document)).startViewTransition) return;

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
		const vt = (/** @type {any} */ (document)).startViewTransition(async () => {
			resolve();
			await navigation.complete;

			// Hide .image-wrap background so the color box doesn't show behind the morphing image
			const wrap = /** @type {HTMLElement | null} */ (document.querySelector('.image-wrap'));
			if (wrap) wrap.style.backgroundColor = 'transparent';

			// Set view-transition-name on the matching CompactCard/hero image for reverse morph
			if (fromRecipe) {
				const card = /** @type {HTMLElement | null} */ (document.querySelector(`img[data-recipe="${fromRecipe}"]`));
				if (card) /** @type {any} */ (card.style).viewTransitionName = `recipe-${fromRecipe}-img`;
			}
		});
		// Restore background color once transition finishes
		vt.finished.then(() => {
			const wrap = /** @type {HTMLElement | null} */ (document.querySelector('.image-wrap'));
			if (wrap) wrap.style.backgroundColor = '';
		});
	});
});
import UserHeader from '$lib/components/UserHeader.svelte';
import LanguageSelector from '$lib/components/LanguageSelector.svelte';
import OfflineSyncIndicator from '$lib/components/OfflineSyncIndicator.svelte';
import BookOpen from '@lucide/svelte/icons/book-open';
import Heart from '@lucide/svelte/icons/heart';
import Leaf from '@lucide/svelte/icons/leaf';
import LayoutGrid from '@lucide/svelte/icons/layout-grid';
import Palette from '@lucide/svelte/icons/palette';
import Tag from '@lucide/svelte/icons/tag';
let { data, children } = $props();

let user = $derived(data.session?.user);

import { m } from '$lib/js/recipesI18n';
/** @typedef {import('$lib/js/recipesI18n').RecipesLang} RecipesLang */
const lang = $derived(/** @type {RecipesLang} */ (data.lang));
const t = $derived(m[lang]);
const labels = $derived({
	allRecipes: t.all_recipes,
	favorites: t.favorites,
	inSeason: t.season_nav,
	category: t.category_nav,
	icon: t.icon_nav,
	keywords: t.tags_nav
});

/** @param {string} path */
function isActive(path) {
	const currentPath = page.url.pathname;
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
		<li style="--active-fill: var(--nord9)"><a href={resolve('/[recipeLang=recipeLang]', { recipeLang: data.recipeLang })} class:active={isActive(`/${data.recipeLang}`)} title={labels.allRecipes}><BookOpen size={16} strokeWidth={1.5} class="nav-icon" /><span class="nav-label">{labels.allRecipes}</span></a></li>
		{#if user}
			<li style="--active-fill: var(--nord11)"><a href={resolve('/[recipeLang=recipeLang]/favorites', { recipeLang: data.recipeLang })} class:active={isActive(`/${data.recipeLang}/favorites`)} title={labels.favorites}><Heart size={16} strokeWidth={1.5} class="nav-icon" /><span class="nav-label">{labels.favorites}</span></a></li>
		{/if}
		<li style="--active-fill: var(--nord14)"><a href={resolve('/[recipeLang=recipeLang]/season', { recipeLang: data.recipeLang })} class:active={isActive(`/${data.recipeLang}/season`)} title={labels.inSeason}><Leaf size={16} strokeWidth={1.5} class="nav-icon" /><span class="nav-label">{labels.inSeason}</span></a></li>
		<li style="--active-fill: var(--nord9)"><a href={resolve('/[recipeLang=recipeLang]/category', { recipeLang: data.recipeLang })} class:active={isActive(`/${data.recipeLang}/category`)} title={labels.category}><LayoutGrid size={16} strokeWidth={1.5} class="nav-icon" /><span class="nav-label">{labels.category}</span></a></li>
		<li style="--active-fill: var(--nord15)"><a href={resolve('/[recipeLang=recipeLang]/icon', { recipeLang: data.recipeLang })} class:active={isActive(`/${data.recipeLang}/icon`)} title={labels.icon}><Palette size={16} strokeWidth={1.5} class="nav-icon" /><span class="nav-label">{labels.icon}</span></a></li>
		<li style="--active-fill: var(--nord13)"><a href={resolve('/[recipeLang=recipeLang]/tag', { recipeLang: data.recipeLang })} class:active={isActive(`/${data.recipeLang}/tag`)} title={labels.keywords}><Tag size={16} strokeWidth={1.5} class="nav-icon" /><span class="nav-label">{labels.keywords}</span></a></li>
		</ul>
	{/snippet}

	{#snippet language_selector_mobile()}
		<LanguageSelector lang={data.lang} />
	{/snippet}

	{#snippet language_selector_desktop()}
		<LanguageSelector lang={data.lang} />
	{/snippet}

	{#snippet logo_overlay()}
		<div class="logo-pip">
			<OfflineSyncIndicator lang={data.lang} />
		</div>
	{/snippet}

	{#snippet right_side()}
		<UserHeader {user} recipeLang={data.recipeLang} lang={data.lang}></UserHeader>
	{/snippet}

	{@render children()}
</Header>

<style>
	:global(.logo-pip) {
		position: absolute;
		top: -8px;
		right: -7px;
		z-index: 2;
		pointer-events: auto;
	}
</style>
