<script>
	import '../app.css';
	import { onNavigate, invalidateAll } from '$app/navigation';
	import { onMount } from 'svelte';
	import Toast from '$lib/components/Toast.svelte';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	let { children } = $props();

	const websiteJsonLd = {
		'@context': 'https://schema.org',
		'@graph': [
			{
				'@type': 'WebSite',
				'@id': 'https://bocken.org/#website',
				url: 'https://bocken.org/',
				name: 'Bocken',
				inLanguage: ['de', 'en', 'la'],
				publisher: { '@id': 'https://bocken.org/#person' },
				potentialAction: {
					'@type': 'SearchAction',
					target: { '@type': 'EntryPoint', urlTemplate: 'https://bocken.org/rezepte/search?q={search_term_string}' },
					'query-input': 'required name=search_term_string'
				}
			},
			{
				'@type': 'Person',
				'@id': 'https://bocken.org/#person',
				name: 'Alexander Bocken',
				url: 'https://bocken.org/',
				image: 'https://bocken.org/static/user/full/alexander.webp',
				sameAs: ['https://git.bocken.org', 'https://github.com/AlexBocken']
			}
		]
	};

	/** Refresh server data on resume — Tauri WebView and backgrounded browser tabs
	 *  don't re-run SvelteKit load() otherwise. Throttled: at most once per 5 min. */
	const REFRESH_MIN_GAP_MS = 5 * 60 * 1000;
	let lastRefreshAt = Date.now();
	onMount(() => {
		const refresh = () => {
			if (document.hidden) return;
			const now = Date.now();
			if (now - lastRefreshAt < REFRESH_MIN_GAP_MS) return;
			lastRefreshAt = now;
			invalidateAll();
		};
		document.addEventListener('visibilitychange', refresh);
		window.addEventListener('focus', refresh);
		return () => {
			document.removeEventListener('visibilitychange', refresh);
			window.removeEventListener('focus', refresh);
		};
	});

	onNavigate((navigation) => {
		if (!(/** @type {any} */ (document)).startViewTransition) return;

		// Skip if staying within the same route group (recipe layout handles its own)
		const fromGroup = navigation.from?.route.id?.split('/')[1] ?? '';
		const toGroup = navigation.to?.route.id?.split('/')[1] ?? '';
		if (fromGroup === toGroup) return;

		return new Promise((resolve) => {
			(/** @type {any} */ (document)).startViewTransition(async () => {
				resolve();
				await navigation.complete;
			});
		});
	});
</script>

<svelte:head>
	{@html `<script type="application/ld+json">${JSON.stringify(websiteJsonLd)}</script>`}
</svelte:head>

{@render children()}
<Toast />
<ConfirmDialog />