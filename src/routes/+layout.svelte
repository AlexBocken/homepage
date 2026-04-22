<script>
	import '../app.css';
	import { onNavigate, invalidateAll } from '$app/navigation';
	import { onMount } from 'svelte';
	import Toast from '$lib/components/Toast.svelte';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	let { children } = $props();

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

{@render children()}
<Toast />
<ConfirmDialog />