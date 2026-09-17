<script>
	import '../app.css';
	import { onNavigate, invalidateAll } from '$app/navigation';
	import { dev } from '$app/environment';
	import { onMount } from 'svelte';
	import Toast from '$lib/components/Toast.svelte';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import { initExternalLinks } from '$lib/js/externalLinks';
	import { page } from '$app/state';
	import { getWorkout } from '$lib/js/workout.svelte';
	import { detectFitnessLang } from '$lib/js/fitnessI18n';
	import { attachWorkoutNotification } from '$lib/js/workoutNotification.svelte';
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

	/** Gate the service worker (offline caching) to the installed PWA / Tauri app.
	 *  SvelteKit's auto-register is off (svelte.config.js); we register manually only
	 *  in a standalone/app context. In a normal browser tab we actively unregister any
	 *  SW a previous build installed and drop its caches, so plain-web visitors stop
	 *  getting stale cached pages. */
	onMount(() => {
		if (!('serviceWorker' in navigator)) return;
		const isApp =
			window.matchMedia('(display-mode: standalone)').matches ||
			'__TAURI__' in window ||
			/** @type {any} */ (navigator).standalone === true;
		if (isApp) {
			if (!dev) navigator.serviceWorker.register('/service-worker.js');
		} else {
			navigator.serviceWorker.getRegistrations().then((regs) => {
				for (const reg of regs) reg.unregister();
			});
			if ('caches' in window) {
				caches.keys().then((keys) => {
					for (const key of keys) caches.delete(key);
				});
			}
		}
	});

	/** In the Tauri app / installed PWA, open external links in the system browser
	 *  instead of trapping them inside the app window. No-op in a normal browser tab. */
	onMount(() => initExternalLinks());

	/** Drive the native Android workout notification (persistent set card + rest
	 *  beep + "complete set" actions) for the whole session, so it survives
	 *  navigating away from the active-workout page. No-op outside the Android app. */
	onMount(() =>
		attachWorkoutNotification(getWorkout(), () =>
			/** @type {'en' | 'de'} */ (detectFitnessLang(page.url.pathname))
		)
	);

	onNavigate((navigation) => {
		if (!(/** @type {any} */ (document)).startViewTransition) return;

		const fromGroup = (navigation.from?.route.id ?? '').split('/')[1] ?? '';
		const toGroup = (navigation.to?.route.id ?? '').split('/')[1] ?? '';

		// Skip same-group nav (recipe layout handles its own). Hikes is the
		// exception: its listing and detail pages share a group, and the card ↔
		// hero-map morph between them is the point. The group is the route
		// id's first segment, i.e. the language-matched `[hikesLang=…]`.
		if (fromGroup === toGroup && fromGroup !== '[hikesLang=hikesLang]') return;

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