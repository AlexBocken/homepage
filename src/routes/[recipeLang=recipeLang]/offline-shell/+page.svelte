<script lang="ts">
import { onMount, tick } from 'svelte';
import { goto } from '$app/navigation';
import { page } from '$app/stores';

let { data } = $props();

// This page serves as an "app shell" that gets cached by the service worker.
// When a user directly navigates to a recipe page while offline and that exact
// page isn't cached, the service worker serves this shell instead.
// On mount, we redirect to the actual requested URL using client-side navigation.

onMount(() => {
	// Only proceed if we're actually offline or have a redirect target
	// This prevents issues if someone navigates here directly while online
	const targetUrl = $page.url.searchParams.get('redirect');

	if (!targetUrl) {
		// No redirect target - just go to main recipe list
		goto(`/${data.recipeLang}`, { replaceState: true });
		return;
	}

	// Wait for hydration to complete, then navigate
	tick().then(() => {
		// Add _offline marker to prevent service worker redirect loop
		const urlWithMarker = new URL(targetUrl, window.location.origin);
		urlWithMarker.searchParams.set('_offline', '1');

		// Navigate to the actual requested page using client-side routing
		// This will trigger the +page.ts which loads data from IndexedDB
		goto(urlWithMarker.pathname + urlWithMarker.search, { replaceState: true });
	});
});
</script>

<div class="offline-shell">
	<div class="loading-spinner"></div>
	<p>{data.lang === 'en' ? 'Loading offline content...' : 'Lade Offline-Inhalte...'}</p>
</div>

<style>
.offline-shell {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	min-height: 50vh;
	gap: 1rem;
}

.loading-spinner {
	width: 40px;
	height: 40px;
	border: 3px solid var(--nord4, #d8dee9);
	border-top-color: var(--nord10, #5e81ac);
	border-radius: 50%;
	animation: spin 1s linear infinite;
}

@keyframes spin {
	to { transform: rotate(360deg); }
}

p {
	color: var(--nord4, #d8dee9);
}
</style>
