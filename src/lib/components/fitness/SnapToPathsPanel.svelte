<script>
	import Route from '@lucide/svelte/icons/route';
	import Check from '@lucide/svelte/icons/check';
	import { m } from '$lib/js/fitnessI18n';
	import { TILE_URL, ROUTE_COLOR, tileLayerOptions } from '$lib/data/mapTiles';

	/**
	 * "Snap track to paths": a map of the recorded GPS track, a BRouter-snapped
	 * preview drawn over it on request, and the choice to keep the recorded track
	 * or save the snapped one in its place.
	 *
	 * Used on the workout completion screen and in the history page's edit mode.
	 * What each does once the snapped track is saved differs, so that is
	 * `onsaved(d)`, called with the snap endpoint's response. The panel shows
	 * "saved" first; an error thrown by `onsaved` still turns it into the error
	 * state.
	 *
	 * The completion screen draws the map shorter and adds a bottom margin; it
	 * does so from its own stylesheet, so the markup here is the same on both.
	 *
	 * @type {{
	 *   sessionId: string,
	 *   exerciseIndex: number,
	 *   track: Array<{ lat: number, lng: number }>,
	 *   recordedDistance?: number | null,
	 *   lang?: 'en' | 'de',
	 *   onsaved?: (d: any) => void | Promise<void>
	 * }}
	 */
	let { sessionId, exerciseIndex, track, recordedDistance = null, lang = 'en', onsaved } = $props();

	const t = $derived(m[lang]);

	/** @type {'idle' | 'loading' | 'preview' | 'saving' | 'saved' | 'kept' | 'error'} */
	let snapState = $state('idle');
	/** @type {Array<{lat:number,lng:number,altitude?:number}>|null} */
	let snappedTrack = $state(null);
	let snappedDistance = $state(0);
	let snapError = $state('');

	// --- Comparison map (recorded vs snapped track) ---
	/** @type {any} */ let map = null;
	/** @type {any} */ let recordedLine = null;
	/** @type {any} */ let snappedLine = null;
	/** @type {any} */ let leaflet = null;

	/** @type {import('svelte/attachments').Attachment<HTMLElement>} */
	function mountSnapMap(node) {
		initSnapMap(node);
		return () => {
			if (map) map.remove();
			map = null;
			recordedLine = null;
			snappedLine = null;
			leaflet = null;
		};
	}

	/** @param {HTMLElement} node */
	async function initSnapMap(node) {
		leaflet = await import('leaflet');
		if (!node.isConnected) return;
		map = leaflet.map(node, { attributionControl: false, zoomControl: false });
		leaflet.tileLayer(TILE_URL.karte, tileLayerOptions(19)).addTo(map);
		const latlngs = track.map((p) => [p.lat, p.lng]);
		recordedLine = leaflet.polyline(latlngs, { color: ROUTE_COLOR, weight: 4 }).addTo(map);
		if (latlngs.length) map.fitBounds(recordedLine.getBounds(), { padding: [20, 20] });
		// Re-draw a snapped overlay if one was already fetched before remount.
		if (snappedTrack) drawSnappedLine();
	}

	function drawSnappedLine() {
		if (!map || !leaflet || !snappedTrack) return;
		if (snappedLine) snappedLine.remove();
		const ll = snappedTrack.map((p) => [p.lat, p.lng]);
		snappedLine = leaflet.polyline(ll, { color: '#5e81ac', weight: 4 }).addTo(map);
	}

	/** @param {boolean} persist */
	async function postSnap(persist) {
		const res = await fetch(`/api/fitness/sessions/${sessionId}/snap`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ exerciseIndex, profile: 'trekking', persist })
		});
		if (!res.ok) throw new Error('snap failed');
		return res.json();
	}

	/** Fetch a BRouter-snapped preview of the recorded track. */
	async function snapToPaths() {
		snapState = 'loading';
		snapError = '';
		try {
			const d = await postSnap(false);
			snappedTrack = d.track;
			snappedDistance = d.distance;
			drawSnappedLine();
			snapState = 'preview';
		} catch {
			snapState = 'error';
			snapError = t.snap_failed;
		}
	}

	/** Persist the snapped track in place of the recorded one. */
	async function useSnappedTrack() {
		snapState = 'saving';
		try {
			const d = await postSnap(true);
			snapState = 'saved';
			await onsaved?.(d);
		} catch {
			snapState = 'error';
			snapError = t.snap_failed;
		}
	}
</script>

<div class="snap-section">
	<h2><Route size={16} /> {t.snap_heading}</h2>
	<div class="snap-map" {@attach mountSnapMap}></div>
	<div class="snap-legend">
		<span class="snap-legend-item">
			<span class="snap-swatch recorded"></span>
			{t.snap_recorded}{recordedDistance != null ? ` · ${recordedDistance.toFixed(2)} km` : ''}
		</span>
		{#if snappedTrack}
			<span class="snap-legend-item">
				<span class="snap-swatch snapped"></span>
				{t.snap_snapped} · {snappedDistance.toFixed(2)} km
			</span>
		{/if}
	</div>

	{#if snapState === 'idle'}
		<button class="snap-btn" onclick={snapToPaths}>{t.snap_to_paths}</button>
	{:else if snapState === 'loading'}
		<button class="snap-btn" disabled>{t.snapping}</button>
	{:else if snapState === 'preview'}
		<p class="snap-hint">{t.snap_choose}</p>
		<div class="snap-choice">
			<button class="snap-choice-btn keep" onclick={() => (snapState = 'kept')}>{t.snap_keep_recorded}</button>
			<button class="snap-choice-btn use" onclick={useSnappedTrack}>{t.snap_use_snapped}</button>
		</div>
	{:else if snapState === 'saving'}
		<button class="snap-btn" disabled>{t.snap_saving}</button>
	{:else if snapState === 'saved'}
		<p class="snap-result"><Check size={16} /> {t.snap_saved}</p>
	{:else if snapState === 'kept'}
		<p class="snap-result"><Check size={16} /> {t.snap_kept}</p>
	{:else if snapState === 'error'}
		<p class="snap-error">{snapError}</p>
		<button class="snap-btn" onclick={snapToPaths}>{t.snap_retry}</button>
	{/if}
</div>

<style>
	.snap-section {
		background: var(--color-surface);
		border-radius: 12px;
		padding: 1rem;
	}
	.snap-section h2 {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.95rem;
		margin: 0 0 0.6rem;
	}
	.snap-map {
		width: 100%;
		height: 240px;
		border-radius: var(--radius-md);
		overflow: hidden;
		margin-bottom: 0.6rem;
	}
	.snap-legend {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem 1.25rem;
		font-size: 0.8rem;
		color: var(--color-text-secondary);
		margin-bottom: 0.75rem;
	}
	.snap-legend-item {
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}
	.snap-swatch {
		width: 1rem;
		height: 0.25rem;
		border-radius: 1000px;
	}
	.snap-swatch.recorded {
		background: #f4511e;
	}
	.snap-swatch.snapped {
		background: #5e81ac;
	}
	.snap-hint {
		font-size: 0.8rem;
		color: var(--color-text-secondary);
		margin: 0 0 0.6rem;
	}
	.snap-btn {
		width: 100%;
		padding: 0.6rem;
		background: transparent;
		border: 1.5px solid var(--color-primary);
		border-radius: 10px;
		color: var(--color-primary);
		font-weight: 700;
		font-size: 0.85rem;
		cursor: pointer;
	}
	.snap-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	.snap-choice {
		display: flex;
		gap: 0.6rem;
	}
	.snap-choice-btn {
		flex: 1;
		padding: 0.6rem;
		border-radius: 10px;
		font-weight: 700;
		font-size: 0.85rem;
		cursor: pointer;
	}
	.snap-choice-btn.keep {
		background: transparent;
		border: 1.5px solid var(--color-border);
		color: var(--color-text-secondary);
	}
	.snap-choice-btn.use {
		background: var(--color-primary);
		border: 1.5px solid var(--color-primary);
		color: var(--color-text-on-primary);
	}
	.snap-result {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.4rem;
		color: var(--green);
		font-weight: 600;
		font-size: 0.9rem;
		margin: 0;
		padding: 0.4rem;
	}
	.snap-error {
		font-size: 0.85rem;
		color: var(--red);
		margin: 0 0 0.6rem;
	}
</style>
