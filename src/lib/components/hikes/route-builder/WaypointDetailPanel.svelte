<script lang="ts">
	import {
		builder,
		focusWaypoint,
		mapView,
		placedSequence,
		scheduleSave
	} from './builderStore.svelte';
	import { generateImageHashClient } from '$lib/imageHashClient';
	import { readThumbnail } from './imageThumbnail';
	import { dropFullImage, getFullImageUrl, setFullImage } from './fullImageCache.svelte';
	import DateTimePicker from '$lib/components/DateTimePicker.svelte';
	import MapPinned from '@lucide/svelte/icons/map-pinned';
	import ImagePlus from '@lucide/svelte/icons/image-plus';
	import LoaderCircle from '@lucide/svelte/icons/loader-circle';
	import Globe from '@lucide/svelte/icons/globe';
	import Lock from '@lucide/svelte/icons/lock';
	import X from '@lucide/svelte/icons/x';

	interface Props {
		onCancelPlacement?: () => void;
	}

	const { onCancelPlacement }: Props = $props();

	const NUDGE_MINUTES = [-10, -5, 5, 10];

	// Drive everything off the focus signal. The full waypoint array index
	// (`idx`) is used for in-place mutation; `wp` is a reactive reference into
	// the same store entry so writes propagate via Svelte 5 deep reactivity.
	const wpIdx = $derived(
		mapView.focusId ? builder.waypoints.findIndex((w) => w.id === mapView.focusId) : -1
	);
	const wp = $derived(wpIdx === -1 ? null : builder.waypoints[wpIdx]);
	const seq = $derived(wp ? placedSequence(wp.id) : null);

	const placed = $derived(builder.waypoints.filter((w) => !w.unplaced));

	const firstPlacedIdx = $derived(builder.waypoints.findIndex((w) => !w.unplaced));
	const lastPlacedIdx = $derived.by(() => {
		for (let i = builder.waypoints.length - 1; i >= 0; i--) {
			if (!builder.waypoints[i].unplaced) return i;
		}
		return -1;
	});
	const requiresTime = $derived(wpIdx !== -1 && (wpIdx === firstPlacedIdx || wpIdx === lastPlacedIdx));

	function nearestTimestamp(idx: number): number | undefined {
		const wps = builder.waypoints;
		for (let dist = 1; dist < wps.length; dist++) {
			const a = wps[idx - dist];
			if (a && typeof a.timestamp === 'number') return a.timestamp;
			const b = wps[idx + dist];
			if (b && typeof b.timestamp === 'number') return b.timestamp;
		}
		return undefined;
	}

	const inheritedTs = $derived.by(() => {
		if (!wp || wp.timestamp != null) return null;
		return nearestTimestamp(wpIdx) ?? null;
	});

	function updateLat(raw: string) {
		if (!wp) return;
		const n = parseFloat(raw);
		if (!isNaN(n)) {
			wp.lat = n;
			scheduleSave();
		}
	}

	function updateLng(raw: string) {
		if (!wp) return;
		const n = parseFloat(raw);
		if (!isNaN(n)) {
			wp.lng = n;
			scheduleSave();
		}
	}

	function setVisibility(value: 'public' | 'private') {
		if (!wp) return;
		wp.imageVisibility = value;
		scheduleSave();
	}

	function removeWaypoint() {
		if (!wp || wpIdx === -1) return;
		const id = wp.id;
		dropFullImage(id);
		builder.waypoints.splice(wpIdx, 1);
		scheduleSave();
		// Move focus to the next remaining placed waypoint, or clear it.
		const next = placed.find((w) => w.id !== id);
		focusWaypoint(next?.id ?? null);
	}

	function closePanel() {
		focusWaypoint(null);
	}

	let attachBusy = $state(false);
	let dragActive = $state(false);

	async function attachImage(fileList: FileList | null) {
		const file = fileList?.[0];
		if (!file || !wp) return;
		attachBusy = true;
		try {
			const exifr = (await import('exifr')).default;
			const exif = await exifr.parse(file, { gps: true, exif: true }).catch(() => null);
			const hash = await generateImageHashClient(file);
			let thumbnail: string | undefined;
			try {
				thumbnail = await readThumbnail(file);
			} catch { /* thumbnail is optional */ }
			wp.imageHash = hash;
			wp.thumbnail = thumbnail;
			wp.imageVisibility = 'public';
			setFullImage(wp.id, file);
			if (wp.timestamp == null && exif?.DateTimeOriginal instanceof Date) {
				wp.timestamp = exif.DateTimeOriginal.getTime();
			}
			scheduleSave();
		} finally {
			attachBusy = false;
		}
	}

	function onHeroDrop(e: DragEvent) {
		e.preventDefault();
		dragActive = false;
		const files = e.dataTransfer?.files;
		if (!files || files.length === 0) return;
		const imgs = [...files].filter((f) => f.type.startsWith('image/'));
		if (imgs.length === 0) return;
		const dt = new DataTransfer();
		dt.items.add(imgs[0]);
		attachImage(dt.files);
	}
</script>

<aside class="detail-panel" aria-label="Wegpunkt-Details">
	{#if !wp}
		<div class="empty">
			<MapPinned size={32} strokeWidth={1.5} />
			<p class="empty-title">Kein Wegpunkt ausgewählt</p>
			<p class="empty-sub">
				Klicke einen Pin auf der Karte oder einen Eintrag in der Liste an, um ihn
				hier zu bearbeiten. Mit ← / → kannst du die Route Wegpunkt für Wegpunkt
				durchgehen.
			</p>
		</div>
	{:else}
		<header class="panel-head">
			<span class="seq" class:unplaced={wp.unplaced}>{seq ?? '?'}</span>
			<h3 class="title">
				{#if wp.unplaced}
					Bild ohne Position
				{:else if wp.imageHash}
					Bild {seq}
				{:else}
					Wegpunkt {seq}
				{/if}
			</h3>
			<button
				type="button"
				class="close"
				onclick={closePanel}
				aria-label="Panel schließen"
				title="Schließen"
			>
				<X size={16} strokeWidth={2} />
			</button>
		</header>

		<div class="hero" class:empty={!wp.thumbnail && !getFullImageUrl(wp.id)} class:busy={attachBusy}>
			{#if wp.thumbnail || getFullImageUrl(wp.id)}
				<img src={getFullImageUrl(wp.id) ?? wp.thumbnail} alt="" />
			{:else}
				<!-- Same 4:3 box as the thumbnail variant so the rest of the panel
					 stays put when an image gets attached. The label fills the box,
					 acts as both click target and drop target. -->
				<label
					class="hero-upload"
					class:drag={dragActive}
					ondragenter={(e) => { e.preventDefault(); dragActive = true; }}
					ondragover={(e) => { e.preventDefault(); }}
					ondragleave={() => { dragActive = false; }}
					ondrop={onHeroDrop}
				>
					<input
						type="file"
						accept="image/*"
						disabled={attachBusy}
						onchange={(e) => attachImage(e.currentTarget.files)}
					/>
					<span class="hero-upload-inner">
						{#if attachBusy}
							<LoaderCircle size={28} strokeWidth={1.75} class="spin" />
							<span class="hero-upload-title">Bild wird gelesen…</span>
						{:else}
							<ImagePlus size={28} strokeWidth={1.75} />
							<span class="hero-upload-title">Bild anhängen</span>
							<span class="hero-upload-sub">
								Klicken oder hierher ziehen
							</span>
						{/if}
					</span>
				</label>
			{/if}
		</div>

		{#if wp.imageHash}
			<div class="vis-block" class:is-private={wp.imageVisibility === 'private'}>
				<div class="vis-head">
					<span class="label">Sichtbarkeit auf der Website</span>
					<span class="vis-state">
						{wp.imageVisibility === 'private'
							? 'Nur du siehst dieses Bild im veröffentlichten GPX.'
							: 'Dieses Bild wird öffentlich auf der Wandereintragsseite angezeigt.'}
					</span>
				</div>
				<div class="vis-segment" role="radiogroup" aria-label="Sichtbarkeit">
					<button
						type="button"
						class="vis-opt"
						class:active={wp.imageVisibility !== 'private'}
						aria-pressed={wp.imageVisibility !== 'private'}
						onclick={() => setVisibility('public')}
					>
						<Globe size={18} strokeWidth={2} />
						<span>Öffentlich</span>
					</button>
					<button
						type="button"
						class="vis-opt"
						class:active={wp.imageVisibility === 'private'}
						aria-pressed={wp.imageVisibility === 'private'}
						onclick={() => setVisibility('private')}
					>
						<Lock size={18} strokeWidth={2} />
						<span>Privat</span>
					</button>
				</div>
			</div>
		{/if}

		{#if !wp.unplaced}
			<div class="field">
				<span class="label">
					{requiresTime ? 'Zeit (Pflicht)' : 'Zeit'}
				</span>
				<DateTimePicker
					bind:value={builder.waypoints[wpIdx].timestamp}
					mode={wp.imageHash || requiresTime || wp.timestamp != null ? 'datetime' : 'date'}
					inheritedValue={inheritedTs}
					nudgeMinutes={NUDGE_MINUTES}
					required={requiresTime}
					lang="de"
				/>
			</div>
		{:else}
			<p class="placement-hint">
				Diese Position fehlt noch. Wähle den Eintrag in der Wegpunktliste unten und
				klicke „Auf Karte platzieren“ oder ziehe ein Bild mit GPS-EXIF in den
				Bildbereich.
			</p>
			<button type="button" class="ghost" onclick={() => onCancelPlacement?.()}>
				Platzierung abbrechen
			</button>
		{/if}

		{#if !wp.unplaced}
			<details class="coords-details">
				<summary>Koordinaten anpassen</summary>
				<div class="coords-grid">
					<div class="field">
						<label class="label" for="dp-lat">Breitengrad</label>
						<input
							id="dp-lat"
							type="number"
							step="0.000001"
							value={wp.lat}
							onchange={(e) => updateLat(e.currentTarget.value)}
						/>
					</div>
					<div class="field">
						<label class="label" for="dp-lng">Längengrad</label>
						<input
							id="dp-lng"
							type="number"
							step="0.000001"
							value={wp.lng}
							onchange={(e) => updateLng(e.currentTarget.value)}
						/>
					</div>
				</div>
			</details>
		{/if}

		<button type="button" class="danger" onclick={removeWaypoint}>
			Wegpunkt entfernen
		</button>
	{/if}
</aside>

<style>
	.detail-panel {
		background: var(--color-surface);
		border-radius: var(--radius-lg);
		padding: 1rem;
		box-shadow: var(--shadow-sm);
		display: flex;
		flex-direction: column;
		gap: 0.65rem;
		min-width: 0;
		/* Match the map's height so the column visually anchors next to it.
		 * The intrinsic content scrolls within so the panel itself stays the
		 * same shape regardless of waypoint state. */
		max-height: 640px;
		overflow-y: auto;
	}

	@media (max-width: 900px) {
		.detail-panel {
			max-height: none;
		}
	}

	.empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		gap: 0.4rem;
		padding: 1.5rem 0.75rem;
		color: var(--color-text-tertiary);
	}

	.empty-title {
		margin: 0.3rem 0 0;
		font-size: 0.95rem;
		color: var(--color-text-secondary);
		font-weight: 600;
	}

	.empty-sub {
		margin: 0;
		font-size: 0.8rem;
		line-height: 1.45;
	}

	.panel-head {
		display: flex;
		align-items: center;
		gap: 0.6rem;
	}

	.seq {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 28px;
		height: 28px;
		padding: 0 0.45em;
		background: var(--color-primary);
		color: var(--color-text-on-primary);
		border-radius: 14px;
		font-size: 0.8rem;
		font-weight: 700;
	}

	.seq.unplaced {
		background: var(--orange);
	}

	.title {
		flex: 1 1 auto;
		min-width: 0;
		margin: 0;
		font-size: 1rem;
		color: var(--color-text-primary);
		font-weight: 600;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.close {
		appearance: none;
		background: transparent;
		border: 0;
		color: var(--color-text-tertiary);
		padding: 0.25rem;
		border-radius: var(--radius-sm);
		cursor: pointer;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		line-height: 0;
	}

	.close:hover {
		color: var(--color-text-primary);
		background: var(--color-bg-elevated);
	}

	.hero {
		width: 100%;
		aspect-ratio: 4 / 3;
		border-radius: var(--radius-md);
		overflow: hidden;
		background: var(--color-bg-elevated);
	}

	.hero img {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	/* Empty-state variant occupies the SAME 4:3 box as the thumbnail
	 * variant — same width, same aspect-ratio, same border-radius — so
	 * dropping/attaching an image swaps the inner content without shifting
	 * any other panel section. */
	.hero.empty {
		background: linear-gradient(
				135deg,
				color-mix(in oklab, var(--color-primary) 6%, transparent),
				transparent 70%
			),
			var(--color-bg-tertiary);
		border: 1.5px dashed color-mix(in oklab, var(--color-primary) 32%, var(--color-border));
		transition: border-color var(--transition-fast), background var(--transition-fast);
	}

	.hero.empty:hover {
		border-color: var(--color-primary);
	}

	.hero-upload {
		display: flex;
		width: 100%;
		height: 100%;
		cursor: pointer;
	}

	.hero.busy .hero-upload {
		cursor: wait;
	}

	.hero-upload input[type='file'] {
		display: none;
	}

	.hero-upload.drag {
		background: color-mix(in oklab, var(--color-primary) 14%, transparent);
	}

	.hero-upload-inner {
		flex: 1 1 auto;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.4rem;
		padding: 0.75rem;
		color: var(--color-text-secondary);
		pointer-events: none;
	}

	.hero-upload-inner :global(svg) {
		color: var(--color-primary);
	}

	.hero-upload-title {
		font-size: 0.95rem;
		font-weight: 600;
		color: var(--color-text-primary);
	}

	.hero-upload-sub {
		font-size: 0.78rem;
		color: var(--color-text-tertiary);
	}

	.hero-upload :global(.spin) {
		animation: panel-spin 0.85s linear infinite;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
		min-width: 0;
	}

	.label {
		font-size: 0.72rem;
		color: var(--color-text-tertiary);
		letter-spacing: 0.04em;
		text-transform: uppercase;
		font-weight: 600;
	}

	.field input[type='number'] {
		width: 100%;
		padding: 0.45rem 0.6rem;
		background: var(--color-bg-tertiary);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		color: var(--color-text-primary);
		font: inherit;
		font-size: 0.85rem;
	}

	/* Visibility is the highest-stakes setting in the panel — privacy choice
	 * for the published GPX. Treat it as a primary action: card-like block
	 * with a short rationale + a wide two-segment toggle, tinted green for
	 * public and amber for private so the current state reads at a glance. */
	.vis-block {
		display: flex;
		flex-direction: column;
		gap: 0.55rem;
		padding: 0.75rem 0.85rem 0.85rem;
		background: color-mix(in oklab, var(--green) 8%, var(--color-bg-secondary));
		border: 1px solid color-mix(in oklab, var(--green) 30%, var(--color-border));
		border-left: 3px solid var(--green);
		border-radius: var(--radius-md);
		transition: background var(--transition-fast), border-color var(--transition-fast);
	}

	.vis-block.is-private {
		background: color-mix(in oklab, var(--orange) 8%, var(--color-bg-secondary));
		border-color: color-mix(in oklab, var(--orange) 35%, var(--color-border));
		border-left-color: var(--orange);
	}

	.vis-head {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
	}

	.vis-state {
		font-size: 0.78rem;
		color: var(--color-text-secondary);
		line-height: 1.35;
	}

	.vis-segment {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.4rem;
	}

	.vis-opt {
		appearance: none;
		background: var(--color-bg-tertiary);
		border: 1px solid var(--color-border);
		color: var(--color-text-secondary);
		font: inherit;
		font-size: 0.9rem;
		font-weight: 600;
		padding: 0.6rem 0.5rem;
		border-radius: var(--radius-md);
		cursor: pointer;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.45rem;
		transition: background var(--transition-fast), border-color var(--transition-fast),
			color var(--transition-fast), box-shadow var(--transition-fast);
	}

	.vis-opt:hover:not(.active) {
		background: var(--color-bg-elevated);
	}

	.vis-opt.active {
		color: white;
	}

	.vis-block:not(.is-private) .vis-opt.active {
		background: var(--green);
		border-color: var(--green);
		box-shadow: 0 0 0 2px color-mix(in oklab, var(--green) 30%, transparent);
	}

	.vis-block.is-private .vis-opt.active {
		background: var(--orange);
		border-color: var(--orange);
		box-shadow: 0 0 0 2px color-mix(in oklab, var(--orange) 30%, transparent);
	}

	/* Coords are a power-user adjustment — keep them out of the way unless
	 * the user explicitly opens the disclosure. Dragging the marker on the
	 * map is the primary editing affordance. */
	.coords-details {
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		background: var(--color-bg-secondary);
	}

	.coords-details > summary {
		cursor: pointer;
		padding: 0.5rem 0.75rem;
		font-size: 0.78rem;
		color: var(--color-text-secondary);
		font-weight: 600;
		letter-spacing: 0.01em;
		list-style: revert;
	}

	.coords-details[open] > summary {
		border-bottom: 1px solid var(--color-border);
	}

	.coords-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.5rem;
		padding: 0.6rem 0.75rem 0.7rem;
	}

	@media (max-width: 360px) {
		.coords-grid {
			grid-template-columns: 1fr;
		}
	}

	.placement-hint {
		margin: 0;
		padding: 0.5rem 0.7rem;
		background: color-mix(in oklab, var(--orange) 10%, var(--color-bg-secondary));
		border-left: 3px solid var(--orange);
		border-radius: var(--radius-sm);
		font-size: 0.8rem;
		color: var(--color-text-secondary);
		line-height: 1.45;
	}

	@keyframes panel-spin {
		to { transform: rotate(360deg); }
	}

	.ghost {
		appearance: none;
		font: inherit;
		font-size: 0.8rem;
		padding: 0.4rem 0.9rem;
		border-radius: var(--radius-pill);
		background: transparent;
		border: 1px solid var(--color-border);
		color: var(--color-text-secondary);
		cursor: pointer;
	}

	.danger {
		appearance: none;
		font: inherit;
		font-size: 0.8rem;
		padding: 0.5rem 0.9rem;
		margin-top: 0.25rem;
		border-radius: var(--radius-pill);
		background: transparent;
		border: 1px solid color-mix(in oklab, var(--red) 35%, var(--color-border));
		color: var(--red);
		cursor: pointer;
		transition: background var(--transition-fast), color var(--transition-fast);
	}

	.danger:hover {
		background: var(--red);
		color: white;
		border-color: var(--red);
	}
</style>
