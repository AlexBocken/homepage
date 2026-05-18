<script lang="ts">
	import Toggle from '$lib/components/Toggle.svelte';

	interface Props {
		enabled?: boolean;
	}

	let { enabled = $bindable(false) }: Props = $props();

	const STORAGE_KEY = 'hikes:gpsEnabled';

	let permissionError = $state<string | null>(null);

	// Initialise from localStorage on mount (browser only).
	$effect(() => {
		if (typeof window === 'undefined') return;
		const saved = window.localStorage.getItem(STORAGE_KEY);
		if (saved === '1') enabled = true;
	});

	$effect(() => {
		if (typeof window === 'undefined') return;
		window.localStorage.setItem(STORAGE_KEY, enabled ? '1' : '0');
	});

	function onChange() {
		if (!enabled) {
			permissionError = null;
			return;
		}
		// Light pre-flight: confirm the API exists. The actual permission grant
		// happens lazily inside HikeMap so users see the marker appear immediately
		// once they accept.
		if (typeof window === 'undefined') return;
		const hasTauri = '__TAURI_INTERNALS__' in window;
		const hasWebGeo = 'geolocation' in navigator;
		if (!hasTauri && !hasWebGeo) {
			enabled = false;
			permissionError = 'Geolocation steht in diesem Browser nicht zur Verfügung.';
		}
	}
</script>

<div class="user-loc">
	<Toggle bind:checked={enabled} label="Eigenen Standort auf der Karte anzeigen" onchange={onChange} />
	<p class="hint">
		Dein Standort wird auf deinem Gerät berechnet und nicht an Dritte gesendet.
	</p>
	{#if permissionError}
		<p class="err">{permissionError}</p>
	{/if}
</div>

<style>
	.user-loc {
		margin-top: 1rem;
		padding: 0.75rem 1rem;
		background: var(--color-surface);
		border-radius: var(--radius-md);
		box-shadow: var(--shadow-sm);
	}

	.hint {
		margin: 0.4rem 0 0;
		font-size: 0.8rem;
		color: var(--color-text-tertiary);
	}

	.err {
		margin: 0.4rem 0 0;
		font-size: 0.85rem;
		color: var(--red);
	}
</style>
