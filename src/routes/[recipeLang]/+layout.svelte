<script>
import Header from '$lib/components/Header.svelte'
    import UserHeader from '$lib/components/UserHeader.svelte';
let { data } = $props();

let user = $derived(data.session?.user);

const isEnglish = $derived(data.lang === 'en');
const labels = $derived({
	allRecipes: isEnglish ? 'All Recipes' : 'Alle Rezepte',
	favorites: isEnglish ? 'Favorites' : 'Favoriten',
	inSeason: isEnglish ? 'In Season' : 'In Saison',
	category: isEnglish ? 'Category' : 'Kategorie',
	icon: 'Icon',
	keywords: isEnglish ? 'Keywords' : 'Stichwörter',
	tips: isEnglish ? 'Tips' : 'Tipps'
});
</script>

<Header>
	<ul class=site_header slot=links>
	<li><a href="/{data.recipeLang}">{labels.allRecipes}</a></li>
	{#if user}
		<li><a href="/{data.recipeLang}/favorites">{labels.favorites}</a></li>
	{/if}
	<li><a href="/{data.recipeLang}/season">{labels.inSeason}</a></li>
	<li><a href="/{data.recipeLang}/category">{labels.category}</a></li>
	<li><a href="/{data.recipeLang}/icon">{labels.icon}</a></li>
	<li><a href="/{data.recipeLang}/tag">{labels.keywords}</a></li>
	<li><a href="/rezepte/tips-and-tricks">{labels.tips}</a></li>
	</ul>
	<UserHeader slot=right_side {user} showLanguageSelector={true}></UserHeader>
	<slot></slot>
</Header>
