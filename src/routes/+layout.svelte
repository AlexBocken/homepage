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
			// Skip when offline — invalidateAll() forces every load() to refetch,
			// and a failed __data.json on a still-cached route renders the error
			// page instead of the perfectly viewable cached content.
			if (typeof navigator !== 'undefined' && !navigator.onLine) return;
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

		const fromId = navigation.from?.route.id ?? '';
		const toId = navigation.to?.route.id ?? '';
		const fromGroup = fromId.split('/')[1] ?? '';
		const toGroup = toId.split('/')[1] ?? '';

		// Skip same-group nav (recipe layout handles its own). Hikes is the
		// exception: we want the card↔hero morph for /hikes ↔ /hikes/[slug].
		if (fromGroup === toGroup && fromGroup !== 'hikes') return;

		// Tag <html> so scoped CSS can target each variant of hike nav:
		// - vt-enter-hikes: arriving at /hikes from any other route →
		//   non-paired cards + filter bar fly up from below the viewport.
		//   (Covers / → /hikes AND back-nav /hikes/[slug] → /hikes, where
		//   the clicked card pairs with the hero and the rest fly in.)
		// - vt-exit-hikes: leaving /hikes for any other route →
		//   non-paired cards + filter bar fly down off-screen.
		//   (Covers /hikes → / AND /hikes → /hikes/[slug], where the clicked
		//   card pairs into the hero and the rest fly out.)
		// - vt-enter-hike-detail: arriving at a hike detail page (card → zoom).
		const intoHikesIndex = toId === '/hikes' && fromId !== '/hikes';
		const outOfHikesIndex = fromId === '/hikes' && toId !== '/hikes';
		const intoHikeDetail = toId === '/hikes/[slug]';

		return new Promise((resolve) => {
			const root = document.documentElement;
			if (intoHikesIndex) root.classList.add('vt-enter-hikes');
			if (outOfHikesIndex) root.classList.add('vt-exit-hikes');
			if (intoHikeDetail) root.classList.add('vt-enter-hike-detail');
			const transition = (/** @type {any} */ (document)).startViewTransition(async () => {
				resolve();
				await navigation.complete;
			});
			transition.finished.finally(() => {
				root.classList.remove('vt-enter-hikes');
				root.classList.remove('vt-exit-hikes');
				root.classList.remove('vt-enter-hike-detail');
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