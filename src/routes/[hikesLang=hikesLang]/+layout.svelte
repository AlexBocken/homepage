<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import Header from '$lib/components/Header.svelte';
	import UserHeader from '$lib/components/UserHeader.svelte';
	import LanguageSelector from '$lib/components/LanguageSelector.svelte';
	import MapIcon from '@lucide/svelte/icons/map';
	import Compass from '@lucide/svelte/icons/compass';
	import { convertHikesPath, m, type HikesLang } from '$lib/js/hikesI18n';

	let { data, children } = $props();
	let user = $derived(data.session?.user);
	const lang = $derived(data.lang as HikesLang);
	const hikesLang = $derived(data.hikesLang);
	const t = $derived(m[lang]);

	const indexHref = $derived(resolve('/[hikesLang=hikesLang]', { hikesLang }));
	const builderHref = $derived(resolve('/[hikesLang=hikesLang]/route-builder', { hikesLang }));

	function isActive(path: string) {
		const currentPath = page.url.pathname;
		if (path === indexHref) {
			return currentPath === indexHref || currentPath === `${indexHref}/`;
		}
		return currentPath.startsWith(path);
	}

	// Canonical + hreflang. The listing and the route builder exist in both
	// languages by construction; a detail page only once its `index.en.svx`
	// exists (`hasEnglish` from the manifest, via the page's load), otherwise
	// the English URL would just be German prose under a different address.
	const SITE = 'https://bocken.org';
	const isDetail = $derived(page.route.id === '/[hikesLang=hikesLang]/[slug]');
	const isBuilder = $derived(page.route.id === '/[hikesLang=hikesLang]/route-builder');
	const hasPair = $derived(
		!isBuilder && (!isDetail || (page.data.hike as { hasEnglish?: boolean } | undefined)?.hasEnglish === true)
	);
	const canonicalPath = $derived(page.url.pathname);
	const altDe = $derived(convertHikesPath(page.url.pathname, 'de'));
	const altEn = $derived(convertHikesPath(page.url.pathname, 'en'));
</script>

<svelte:head>
	<link rel="canonical" href={`${SITE}${canonicalPath}`} />
	{#if hasPair}
		<link rel="alternate" hreflang="de" href={`${SITE}${altDe}`} />
		<link rel="alternate" hreflang="en" href={`${SITE}${altEn}`} />
		<link rel="alternate" hreflang="x-default" href={`${SITE}${altEn}`} />
	{/if}
</svelte:head>

<Header>
	{#snippet links()}
		<ul class="site_header">
			<li style="--active-fill: var(--nord10)">
				<a href={indexHref} class:active={isActive(indexHref)}>
					<MapIcon size={16} strokeWidth={1.5} class="nav-icon" />
					<span class="nav-label">{t.nav_all_hikes}</span>
				</a>
			</li>
			<li style="--active-fill: var(--nord14)">
				<a href={builderHref} class:active={isActive(builderHref)}>
					<Compass size={16} strokeWidth={1.5} class="nav-icon" />
					<span class="nav-label">{t.nav_route_builder}</span>
				</a>
			</li>
		</ul>
	{/snippet}

	{#snippet language_selector_mobile()}
		<LanguageSelector {lang} />
	{/snippet}

	{#snippet language_selector_desktop()}
		<LanguageSelector {lang} />
	{/snippet}

	{#snippet right_side()}
		<UserHeader {user} />
	{/snippet}

	{@render children()}
</Header>
