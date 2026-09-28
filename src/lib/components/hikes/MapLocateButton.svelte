<script lang="ts">
	import { page } from '$app/state';
	import { m, type HikesLang } from '$lib/js/hikesI18n';
	import { GPS_STORAGE_KEY, gpsStore, toggleLocation } from '$lib/hikes/userLocation';
	import Locate from '@lucide/svelte/icons/locate';
	import LocateOff from '@lucide/svelte/icons/locate-off';

	/**
	 * The user-location toggle of the hikes maps. Owns the on/off choice and
	 * where it is kept; the map draws the position (`watchUserLocation`) while
	 * `enabled` is set. A reader with no way to be located gets `error`, which
	 * `MapControls` shows under the stack.
	 */
	interface Props {
		enabled: boolean;
		error: string | null;
	}

	let { enabled = $bindable(), error = $bindable() }: Props = $props();

	const lang = $derived((page.data.lang as HikesLang | undefined) ?? 'de');
	const t = $derived(m[lang]);

	$effect(() => {
		if (gpsStore()?.getItem(GPS_STORAGE_KEY) === '1') enabled = true;
	});

	$effect(() => {
		gpsStore()?.setItem(GPS_STORAGE_KEY, enabled ? '1' : '0');
	});

	function toggle() {
		const next = toggleLocation(enabled);
		if (!next) return;
		error = next.unavailable ? t.geo_unavailable : null;
		enabled = next.enabled;
	}
</script>

<button
	type="button"
	class="round-btn"
	class:active={enabled}
	aria-pressed={enabled}
	title={enabled ? t.location_hide : t.location_show_title}
	aria-label={enabled ? t.location_hide : t.location_show}
	onclick={toggle}
>
	{#if enabled}
		<Locate size={20} strokeWidth={2} aria-hidden="true" />
	{:else}
		<LocateOff size={20} strokeWidth={2} aria-hidden="true" />
	{/if}
</button>
