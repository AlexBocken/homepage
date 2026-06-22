<script lang="ts">
	import { untrack, onMount } from 'svelte';
	import Route from '@lucide/svelte/icons/route';
	import Mountain from '@lucide/svelte/icons/mountain';
	import Repeat from '@lucide/svelte/icons/repeat';
	import X from '@lucide/svelte/icons/x';
	import { m, type FitnessLang } from '$lib/js/fitnessI18n';
	import { haversine } from '$lib/fitness/gpsSeries.js';
	import { TILE_URL, ROUTE_COLOR } from '$lib/data/mapTiles';
	import RangeSlider from '$lib/components/hikes/RangeSlider.svelte';
	import Toggle from '$lib/components/Toggle.svelte';

	interface GpsPoint {
		lat: number;
		lng: number;
		altitude?: number | null;
		timestamp: number;
	}
	interface RunSuggestion {
		routeHash: string;
		exerciseIndex: number | null;
		startIdx: number;
		endIdx: number;
		distance: number;
		seenCount: number;
	}

	let {
		track,
		exerciseIndex,
		sessionId,
		lang = 'en',
		oncreated,
		oncancel
	}: {
		track: GpsPoint[];
		exerciseIndex: number | null;
		sessionId: string;
		lang?: FitnessLang;
		oncreated?: (segment: { _id: string }) => void;
		oncancel?: () => void;
	} = $props();

	const t = $derived(m[lang]);

	// Cumulative distance (km) per track point — drives the slider readout.
	const cumDist = $derived.by(() => {
		const c = new Array(track.length).fill(0);
		for (let i = 1; i < track.length; i++) c[i] = c[i - 1] + haversine(track[i - 1], track[i]);
		return c;
	});

	let low = $state(untrack(() => Math.round((track.length - 1) * 0.25)));
	let high = $state(untrack(() => Math.round((track.length - 1) * 0.75)));
	let name = $state('');
	let isPublic = $state(true);
	let saving = $state(false);
	let error = $state('');

	const selDistance = $derived(Math.max(0, cumDist[high] - cumDist[low]));
	const selGain = $derived.by(() => {
		let gain = 0;
		let prev: number | null = null;
		for (let i = low; i <= high; i++) {
			const a = track[i]?.altitude;
			if (a == null) continue;
			if (prev != null && a > prev) gain += a - prev;
			prev = a;
		}
		return Math.round(gain);
	});

	// Suggested segments found within this run's track (this exercise only).
	let suggestions = $state<RunSuggestion[]>([]);
	onMount(async () => {
		try {
			const res = await fetch(`/api/fitness/segments/suggestions?sessionId=${sessionId}`);
			if (res.ok) {
				const all: RunSuggestion[] = (await res.json()).suggestions ?? [];
				suggestions = all.filter((s) => (s.exerciseIndex ?? null) === (exerciseIndex ?? null));
			}
		} catch {
			/* non-fatal */
		}
	});
	function loadSuggestion(s: RunSuggestion) {
		const lo = Math.max(0, Math.min(s.startIdx, track.length - 1));
		const hi = Math.max(lo + 1, Math.min(s.endIdx, track.length - 1));
		low = lo;
		high = hi;
	}

	function nearestIdx(lat: number, lng: number): number {
		let best = 0;
		let bd = Infinity;
		for (let i = 0; i < track.length; i++) {
			const d = haversine({ lat, lng }, track[i]);
			if (d < bd) {
				bd = d;
				best = i;
			}
		}
		return best;
	}

	// Leaflet map: full route + draggable start/end markers snapped to the track,
	// and a live-highlighted selected sub-polyline.
	function attachCreatorMap(node: HTMLElement) {
		let map: any;
		let stop: (() => void) | undefined;
		let detach: (() => void) | undefined;
		let cancelled = false;

		(async () => {
			const L = await import('leaflet');
			if (cancelled || !node.isConnected) return;

			map = L.map(node, { attributionControl: false, zoomControl: true });
			L.tileLayer(TILE_URL.karte, { maxZoom: 19 }).addTo(map);

			const latLngs = track.map((p) => [p.lat, p.lng] as [number, number]);
			L.polyline(latLngs, { color: '#888', weight: 4, opacity: 0.55 }).addTo(map);
			const sel = L.polyline([], { color: ROUTE_COLOR, weight: 5 }).addTo(map);
			map.fitBounds(L.polyline(latLngs).getBounds(), { padding: [20, 20] });

			const icon = (cls: string) =>
				L.divIcon({ className: `seg-handle ${cls}`, html: '', iconSize: [18, 18], iconAnchor: [9, 9] });
			const startM = L.marker(latLngs[low], { draggable: false, interactive: true, icon: icon('start'), zIndexOffset: 1000 }).addTo(map);
			const endM = L.marker(latLngs[high], { draggable: false, interactive: true, icon: icon('end'), zIndexOffset: 1000 }).addTo(map);

			// Custom drag (not Leaflet's marker drag): drive the handle purely from
			// the pointer's nearest recorded point, so the marker stays glued to the
			// route the entire drag. The effect below places it at that point.
			let dragging: 'start' | 'end' | null = null;
			const onPointerMove = (ev: PointerEvent) => {
				if (!dragging) return;
				const ll = map.mouseEventToLatLng(ev);
				const i = nearestIdx(ll.lat, ll.lng);
				if (dragging === 'start') low = Math.min(i, high - 1);
				else high = Math.max(i, low + 1);
			};
			const onPointerUp = () => {
				if (!dragging) return;
				dragging = null;
				map.dragging.enable();
			};
			const startDrag = (which: 'start' | 'end') => (ev: PointerEvent) => {
				ev.preventDefault();
				ev.stopPropagation();
				dragging = which;
				map.dragging.disable();
			};
			startM.getElement()?.addEventListener('pointerdown', startDrag('start'));
			endM.getElement()?.addEventListener('pointerdown', startDrag('end'));
			window.addEventListener('pointermove', onPointerMove);
			window.addEventListener('pointerup', onPointerUp);
			detach = () => {
				window.removeEventListener('pointermove', onPointerMove);
				window.removeEventListener('pointerup', onPointerUp);
			};

			stop = $effect.root(() => {
				$effect(() => {
					const lo = Math.min(low, high);
					const hi = Math.max(low, high);
					startM.setLatLng(latLngs[low]);
					endM.setLatLng(latLngs[high]);
					sel.setLatLngs(latLngs.slice(lo, hi + 1));
				});
			});
		})();

		return () => {
			cancelled = true;
			detach?.();
			stop?.();
			if (map) map.remove();
		};
	}

	async function save() {
		if (!name.trim() || saving || high <= low) return;
		saving = true;
		error = '';
		try {
			const res = await fetch('/api/fitness/segments', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					sessionId,
					exerciseIndex,
					startIdx: low,
					endIdx: high,
					name: name.trim(),
					public: isPublic
				})
			});
			const data = await res.json();
			if (!res.ok) {
				error = data.error || 'Failed';
				return;
			}
			oncreated?.(data.segment);
		} catch {
			error = 'Failed';
		} finally {
			saving = false;
		}
	}
</script>

<div class="creator">
	<div class="head">
		<h3>{t.create_segment}</h3>
		<button class="close" onclick={() => oncancel?.()} aria-label={t.cancel}><X size={18} /></button>
	</div>

	{#if suggestions.length > 0}
		<div class="run-suggestions">
			<span class="rs-label"><Repeat size={13} /> {t.suggested_segments}</span>
			<div class="rs-chips">
				{#each suggestions as s (s.routeHash)}
					<button class="rs-chip" onclick={() => loadSuggestion(s)}>
						{s.distance.toFixed(2)} {t.km} · {t.seen_in} {s.seenCount} {t.runs_word}
					</button>
				{/each}
			</div>
		</div>
	{/if}

	<div class="creator-map" {@attach attachCreatorMap}></div>

	<RangeSlider
		label={t.select_section}
		min={0}
		max={track.length - 1}
		step={1}
		bind:low
		bind:high
		format={(v) => `${(cumDist[v] ?? 0).toFixed(2)} ${t.km}`}
	/>

	<div class="sel-stats">
		<span class="stat"><Route size={14} /> {selDistance.toFixed(2)} {t.km}</span>
		{#if selGain > 0}<span class="stat"><Mountain size={14} /> +{selGain} m</span>{/if}
	</div>

	<input
		class="name-input"
		type="text"
		bind:value={name}
		maxlength="100"
		placeholder={t.segment_name_placeholder}
		aria-label={t.segment_name}
	/>

	<div class="public-row">
		<Toggle bind:checked={isPublic} label={t.public_segment} />
	</div>

	{#if error}<p class="error">{error === 'Selected section is too short' ? t.segment_too_short : error}</p>{/if}

	<button class="save" onclick={save} disabled={saving || !name.trim() || high <= low}>
		{saving ? t.creating : t.save_segment}
	</button>
</div>

<style>
	.creator {
		display: flex;
		flex-direction: column;
		gap: 0.7rem;
		background: var(--color-bg-secondary);
		border: 1px solid var(--color-border);
		border-radius: 12px;
		padding: 1rem;
	}
	.head {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}
	.head h3 {
		margin: 0;
		font-size: 0.95rem;
	}
	.close {
		display: flex;
		background: none;
		border: none;
		cursor: pointer;
		color: var(--color-text-secondary);
		padding: 0.2rem;
	}
	.close:hover {
		color: var(--color-text-primary);
	}
	.run-suggestions {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}
	.rs-label {
		display: flex;
		align-items: center;
		gap: 0.3rem;
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--color-text-secondary);
	}
	.rs-chips {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
	}
	.rs-chip {
		padding: 0.3rem 0.6rem;
		border: 1px solid var(--color-primary);
		border-radius: var(--radius-pill, 1000px);
		background: transparent;
		color: var(--color-primary);
		font-size: 0.78rem;
		font-weight: 600;
		cursor: pointer;
		transition: background var(--transition-fast, 100ms);
	}
	.rs-chip:hover {
		background: color-mix(in srgb, var(--color-primary) 12%, transparent);
	}
	.creator-map {
		width: 100%;
		height: 240px;
		border-radius: var(--radius-md, 0.5rem);
		overflow: hidden;
	}
	:global(.seg-handle) {
		border-radius: 50%;
		border: 2px solid #fff;
		box-shadow: 0 1px 4px rgb(0 0 0 / 0.4);
		cursor: grab;
		touch-action: none;
	}
	:global(.seg-handle.start) {
		background: var(--green, #a3be8c);
	}
	:global(.seg-handle.end) {
		background: var(--red, #bf616a);
	}
	.sel-stats {
		display: flex;
		gap: 1rem;
	}
	.stat {
		display: flex;
		align-items: center;
		gap: 0.3rem;
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--color-text-secondary);
	}
	.name-input {
		width: 100%;
		padding: 0.55rem 0.7rem;
		background: var(--color-bg-tertiary);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md, 0.5rem);
		color: var(--color-text-primary);
		font-size: 0.9rem;
	}
	.name-input:focus {
		outline: none;
		border-color: var(--color-primary);
	}
	.public-row {
		display: flex;
	}
	.error {
		margin: 0;
		color: var(--red);
		font-size: 0.82rem;
	}
	.save {
		padding: 0.6rem 1rem;
		background: var(--color-primary);
		color: var(--color-text-on-primary);
		border: none;
		border-radius: var(--radius-md, 0.5rem);
		font-weight: 600;
		cursor: pointer;
		transition: background var(--transition-normal, 200ms);
	}
	.save:hover:not(:disabled) {
		background: var(--color-primary-hover);
	}
	.save:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
