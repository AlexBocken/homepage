<script>
import { page } from '$app/stores';
import Header from '$lib/components/Header.svelte'
import UserHeader from '$lib/components/UserHeader.svelte';
import LanguageSelector from '$lib/components/LanguageSelector.svelte';
let { data, children } = $props();

const isEnglish = $derived(data.lang === 'en');
const prayersPath = $derived(isEnglish ? 'prayers' : 'gebete');
const rosaryPath = $derived(isEnglish ? 'rosary' : 'rosenkranz');

const labels = $derived({
	prayers: isEnglish ? 'Prayers' : 'Gebete',
	rosary: isEnglish ? 'Rosary' : 'Rosenkranz'
});

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
		<li><a href="/{data.faithLang}/{prayersPath}" class:active={isActive(`/${data.faithLang}/${prayersPath}`)}>{labels.prayers}</a></li>
		<li><a href="/{data.faithLang}/{rosaryPath}" class:active={isActive(`/${data.faithLang}/${rosaryPath}`)}>{labels.rosary}</a></li>
		<li><a href="/{data.faithLang}/{prayersPath}/angelus" class:active={isActive(`/${data.faithLang}/${prayersPath}/angelus`)}>Angelus</a></li>
		</ul>
	{/snippet}

	{#snippet language_selector_mobile()}
		<LanguageSelector lang={data.lang} />
	{/snippet}

	{#snippet language_selector_desktop()}
		<LanguageSelector lang={data.lang} />
	{/snippet}

	{#snippet right_side()}
		<UserHeader user={data.session?.user}></UserHeader>
	{/snippet}

	{@render children()}
</Header>
