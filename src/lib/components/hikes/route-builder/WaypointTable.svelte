<script lang="ts">
	import { flip } from 'svelte/animate';
	import { builder, scheduleSave } from './builderStore.svelte';
	import { generateImageHashClient } from '$lib/imageHashClient';
	import { readThumbnail } from './imageThumbnail';
	import { dropFullImage, getFullImageUrl, setFullImage } from './fullImageCache.svelte';
	import DateTimePicker from '$lib/components/DateTimePicker.svelte';
	import ImagePlus from '@lucide/svelte/icons/image-plus';
	import LoaderCircle from '@lucide/svelte/icons/loader-circle';

	const NUDGE_MINUTES = [-10, -5, 5, 10];

	interface Props {
		/** The id of the waypoint currently in "place me on the map" mode.
		 * Used to highlight the active row. */
		pendingPlacementId?: string | null;
		onRequestPlacement?: (waypointId: string) => void;
		onCancelPlacement?: () => void;
	}

	const { pendingPlacementId = null, onRequestPlacement, onCancelPlacement }: Props = $props();

	// Index of the first / last *placed* waypoint — those are the ones that
	// need a timestamp for the GPX export's interpolation.
	const firstPlacedIdx = $derived(
		builder.waypoints.findIndex((w) => !w.unplaced)
	);
	const lastPlacedIdx = $derived.by(() => {
		for (let i = builder.waypoints.length - 1; i >= 0; i--) {
			if (!builder.waypoints[i].unplaced) return i;
		}
		return -1;
	});

	/** Find the nearest waypoint *by index* that already carries a timestamp.
	 *  Used as the `inheritedValue` for click waypoints — searching by sequence
	 *  position (rather than geography) mirrors how authors typically insert
	 *  waypoints (between existing ones, in trail order). */
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

	// DateTimePicker mutates `builder.waypoints[i].timestamp` through $bindable
	// — there's no per-change callback, so persist via reactivity instead.
	// Reads every timestamp inside a tracked $effect; any write triggers the
	// re-run and a debounced localStorage save.
	$effect(() => {
		for (const wp of builder.waypoints) {
			void wp.timestamp;
		}
		scheduleSave();
	});

	function move(idx: number, delta: number) {
		const next = idx + delta;
		if (next < 0 || next >= builder.waypoints.length) return;
		const [w] = builder.waypoints.splice(idx, 1);
		builder.waypoints.splice(next, 0, w);
		scheduleSave();
	}

	function remove(idx: number) {
		const wp = builder.waypoints[idx];
		dropFullImage(wp.id);
		builder.waypoints.splice(idx, 1);
		scheduleSave();
	}

	function updateLat(idx: number, raw: string) {
		const n = parseFloat(raw);
		if (!isNaN(n)) {
			builder.waypoints[idx].lat = n;
			scheduleSave();
		}
	}

	function updateLng(idx: number, raw: string) {
		const n = parseFloat(raw);
		if (!isNaN(n)) {
			builder.waypoints[idx].lng = n;
			scheduleSave();
		}
	}

	function setVisibility(idx: number, value: 'public' | 'private') {
		builder.waypoints[idx].imageVisibility = value;
		scheduleSave();
	}

	let attachBusy = $state<Record<string, boolean>>({});

	async function attachImage(idx: number, fileList: FileList | null) {
		const file = fileList?.[0];
		if (!file) return;
		const wp = builder.waypoints[idx];
		attachBusy[wp.id] = true;
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
			// EXIF GPSAltitude is intentionally ignored — terrain-model altitude
			// from Swisstopo (already set when this waypoint was placed on the
			// map) is more accurate and avoids spikes in the elevation profile.
			scheduleSave();
		} finally {
			attachBusy[wp.id] = false;
		}
	}
</script>

<section class="wp-table">
	<header>
		<h2>Wegpunkte ({builder.waypoints.length})</h2>
	</header>

	{#if builder.waypoints.length === 0}
		<p class="empty">Klicke auf die Karte oder lade Bilder, um Wegpunkte zu setzen.</p>
	{:else}
		<p class="legend">* Erster und letzter platzierter Wegpunkt brauchen einen Zeitstempel.</p>
		<ol>
			{#each builder.waypoints as wp, idx (wp.id)}
				<li
					class="wp"
					class:unplaced={wp.unplaced}
					class:active={wp.id === pendingPlacementId}
					animate:flip={{ duration: 220 }}
				>
					{#if wp.thumbnail || getFullImageUrl(wp.id)}
						<div class="hero">
							<img
								src={getFullImageUrl(wp.id) ?? wp.thumbnail}
								alt=""
								loading="lazy"
							/>
							{#if wp.unplaced}
								<span class="hero-badge">📍 noch nicht platziert</span>
							{/if}
						</div>
					{/if}

					<div class="row title-row">
						<span class="idx" class:unplaced-idx={wp.unplaced}>
							{wp.unplaced ? '?' : idx + 1}
						</span>
						<span class="title">
							{#if wp.unplaced}
								Bild ohne Position
							{:else if wp.imageHash}
								Bild {idx + 1}
							{:else}
								Wegpunkt {idx + 1}
							{/if}
						</span>
						<div class="row-actions">
							<button type="button" onclick={() => move(idx, -1)} disabled={idx === 0} aria-label="Nach oben">↑</button>
							<button type="button" onclick={() => move(idx, 1)} disabled={idx === builder.waypoints.length - 1} aria-label="Nach unten">↓</button>
							<button type="button" class="del" onclick={() => remove(idx)} aria-label="Entfernen">✕</button>
						</div>
					</div>

					{#if wp.unplaced}
						<div class="row placement-row">
							{#if wp.id === pendingPlacementId}
								<span class="placing">Klicke auf die Karte…</span>
								<button type="button" class="ghost" onclick={() => onCancelPlacement?.()}>Abbrechen</button>
							{:else}
								<button type="button" class="primary" onclick={() => onRequestPlacement?.(wp.id)}>
									📍 Auf Karte platzieren
								</button>
							{/if}
						</div>
					{:else}
						<div class="row coords-row">
							<input
								type="number"
								step="0.000001"
								value={wp.lat}
								onchange={(e) => updateLat(idx, e.currentTarget.value)}
								aria-label="Breitengrad"
							/>
							<input
								type="number"
								step="0.000001"
								value={wp.lng}
								onchange={(e) => updateLng(idx, e.currentTarget.value)}
								aria-label="Längengrad"
							/>
						</div>
					{/if}

					{#if !wp.unplaced}
						{@const requiresTime = idx === firstPlacedIdx || idx === lastPlacedIdx}
						{@const isImage = !!wp.imageHash}
						{@const hasTimestamp = wp.timestamp != null}
						{@const inheritedTs = !hasTimestamp ? nearestTimestamp(idx) ?? null : null}
						{@const showTime = isImage || requiresTime || hasTimestamp}
						<div class="row sub time-row">
							<span class="time-cap">
								{showTime ? 'Zeit' : 'Datum'}{requiresTime ? ' *' : ''}
							</span>
							<DateTimePicker
								bind:value={builder.waypoints[idx].timestamp}
								mode={showTime ? 'datetime' : 'date'}
								inheritedValue={inheritedTs}
								nudgeMinutes={showTime ? NUDGE_MINUTES : []}
								required={requiresTime}
								lang="de"
							/>
						</div>
					{/if}

					{#if wp.imageHash}
						<div class="row image-visibility">
							<span class="vis-label">Sichtbarkeit</span>
							<div class="segment" role="radiogroup" aria-label="Sichtbarkeit">
								<button
									type="button"
									class:active={wp.imageVisibility !== 'private'}
									aria-pressed={wp.imageVisibility !== 'private'}
									onclick={() => setVisibility(idx, 'public')}
								>🌐 Öffentlich</button>
								<button
									type="button"
									class:active={wp.imageVisibility === 'private'}
									aria-pressed={wp.imageVisibility === 'private'}
									onclick={() => setVisibility(idx, 'private')}
								>🔒 Privat</button>
							</div>
						</div>
					{:else if !wp.unplaced}
						<label class="image-attach" class:busy={attachBusy[wp.id]}>
							<input
								type="file"
								accept="image/*"
								disabled={attachBusy[wp.id]}
								onchange={(e) => attachImage(idx, e.currentTarget.files)}
							/>
							<span class="attach-cta">
								{#if attachBusy[wp.id]}
									<LoaderCircle size={15} strokeWidth={2} class="spin" />
									<span>Bild wird gelesen…</span>
								{:else}
									<span class="attach-icon">
										<ImagePlus size={15} strokeWidth={1.75} />
									</span>
									<span>Bild anhängen</span>
								{/if}
							</span>
						</label>
					{/if}
				</li>
			{/each}
		</ol>
	{/if}
</section>

<style>
	.wp-table {
		background: var(--color-surface);
		border-radius: var(--radius-lg);
		padding: 1rem;
		box-shadow: var(--shadow-sm);
		max-height: 600px;
		overflow-y: auto;
	}

	header h2 {
		margin: 0 0 0.75rem;
		font-size: 1.1rem;
		color: var(--color-text-primary);
	}

	.empty {
		color: var(--color-text-tertiary);
		font-size: 0.9rem;
		margin: 0.5rem 0;
	}

	.legend {
		margin: 0 0 0.6rem;
		font-size: 0.75rem;
		color: var(--color-text-tertiary);
	}

	ol {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}

	.wp {
		padding: 0;
		background: var(--color-bg-secondary);
		border: 1px solid transparent;
		border-radius: var(--radius-md);
		overflow: hidden;
		display: flex;
		flex-direction: column;
		transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
	}

	.wp.unplaced {
		border-color: var(--orange);
		background: color-mix(in oklab, var(--orange) 6%, var(--color-bg-secondary));
	}

	.wp.active {
		border-color: var(--color-primary);
		box-shadow: 0 0 0 2px color-mix(in oklab, var(--color-primary) 30%, transparent);
	}

	.hero {
		position: relative;
		width: 100%;
		aspect-ratio: 4 / 3;
		background: var(--color-bg-elevated);
		overflow: hidden;
	}

	.hero img {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.hero-badge {
		position: absolute;
		top: 0.4rem;
		left: 0.4rem;
		padding: 0.15rem 0.5rem;
		background: var(--orange);
		color: white;
		font-size: 0.7rem;
		font-weight: 600;
		border-radius: var(--radius-pill);
		box-shadow: var(--shadow-sm);
	}

	.row {
		display: flex;
		gap: 0.5rem;
		align-items: center;
		padding: 0.4rem 0.6rem;
	}

	.row.title-row {
		gap: 0.55rem;
	}

	.title {
		flex: 1 1 0;
		min-width: 0;
		font-size: 0.85rem;
		color: var(--color-text-primary);
		font-weight: 500;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.idx {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 24px;
		height: 24px;
		padding: 0 0.4em;
		background: var(--color-primary);
		color: var(--color-text-on-primary);
		border-radius: 12px;
		font-size: 0.75rem;
		font-weight: 700;
	}

	.idx.unplaced-idx {
		background: var(--orange);
	}

	.coords-row {
		display: flex;
		gap: 0.3rem;
	}

	.coords-row input {
		flex: 1 1 0;
		min-width: 0;
	}

	.placement-row {
		gap: 0.6rem;
		flex-wrap: wrap;
	}

	.placement-row .placing {
		flex: 1 1 auto;
		font-size: 0.8rem;
		color: var(--color-primary);
	}

	.row.sub {
		flex-wrap: wrap;
		font-size: 0.78rem;
		color: var(--color-text-secondary);
	}

	.time-row {
		flex-wrap: wrap;
		row-gap: 0.4rem;
		align-items: center;
	}

	.time-cap {
		font-size: 0.72rem;
		color: var(--color-text-tertiary);
		letter-spacing: 0.02em;
		flex-shrink: 0;
	}

	input[type='number'] {
		width: 100%;
		min-width: 0;
		padding: 0.25rem 0.4rem;
		background: var(--color-bg-tertiary);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		color: var(--color-text-primary);
		font: inherit;
		font-size: 0.8rem;
	}

	.row-actions {
		display: flex;
		gap: 0.2rem;
	}

	.row-actions button {
		appearance: none;
		background: var(--color-bg-tertiary);
		border: 1px solid var(--color-border);
		color: var(--color-text-secondary);
		font: inherit;
		padding: 0.2rem 0.4rem;
		border-radius: var(--radius-sm);
		cursor: pointer;
		font-size: 0.85rem;
		line-height: 1;
	}

	.row-actions button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.row-actions button.del {
		color: var(--red);
	}

	.placement-row .primary,
	.placement-row .ghost {
		appearance: none;
		font: inherit;
		font-size: 0.8rem;
		padding: 0.3rem 0.8rem;
		border-radius: var(--radius-pill);
		cursor: pointer;
	}

	.placement-row .primary {
		background: var(--color-primary);
		color: var(--color-text-on-primary);
		border: 0;
	}

	.placement-row .primary:hover {
		background: var(--color-primary-hover);
	}

	.placement-row .ghost {
		background: transparent;
		color: var(--color-text-secondary);
		border: 1px solid var(--color-border);
	}

	.image-visibility {
		flex-wrap: wrap;
		font-size: 0.78rem;
		color: var(--color-text-secondary);
		gap: 0.4rem;
	}

	.vis-label {
		flex-shrink: 0;
	}

	.segment {
		display: inline-flex;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-pill);
		overflow: hidden;
	}

	.segment button {
		appearance: none;
		background: transparent;
		border: 0;
		color: var(--color-text-secondary);
		font: inherit;
		font-size: 0.78rem;
		padding: 0.2rem 0.6rem;
		cursor: pointer;
	}

	.segment button + button {
		border-left: 1px solid var(--color-border);
	}

	.segment button.active {
		background: var(--color-primary);
		color: var(--color-text-on-primary);
	}

	.image-attach {
		display: flex;
		padding: 0.5rem 0.6rem 0.65rem;
		cursor: pointer;
	}

	.image-attach.busy {
		cursor: wait;
	}

	.image-attach input[type='file'] {
		display: none;
	}

	.image-attach .attach-cta {
		flex: 1 1 auto;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 0.45rem 0.95rem;
		background:
			linear-gradient(
				135deg,
				color-mix(in oklab, var(--color-primary) 8%, transparent),
				transparent 70%
			),
			var(--color-bg-tertiary);
		border: 1px dashed color-mix(in oklab, var(--color-primary) 32%, var(--color-border));
		border-radius: var(--radius-pill);
		color: var(--color-text-secondary);
		font-size: 0.8rem;
		font-weight: 500;
		letter-spacing: 0.01em;
		transition:
			background var(--transition-fast),
			border-color var(--transition-fast),
			color var(--transition-fast),
			box-shadow var(--transition-fast),
			transform var(--transition-fast);
	}

	.attach-icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 1.55rem;
		height: 1.55rem;
		border-radius: 50%;
		background: color-mix(in oklab, var(--color-primary) 14%, var(--color-bg-elevated));
		color: var(--color-primary);
		flex-shrink: 0;
		transition:
			background var(--transition-fast),
			color var(--transition-fast),
			transform var(--transition-fast);
	}

	.image-attach:hover:not(.busy) .attach-cta {
		background: var(--color-primary);
		border-color: var(--color-primary);
		border-style: solid;
		color: var(--color-text-on-primary);
		box-shadow: 0 0 0 1px var(--color-primary),
			0 0.5em 1.2em -0.5em color-mix(in oklab, var(--color-primary) 60%, transparent);
		transform: translateY(-1px);
	}

	.image-attach:hover:not(.busy) .attach-icon {
		background: color-mix(in oklab, var(--color-text-on-primary) 18%, transparent);
		color: var(--color-text-on-primary);
		transform: rotate(-6deg) scale(1.05);
	}

	.image-attach.busy .attach-cta {
		opacity: 0.78;
		border-style: solid;
	}

	.image-attach :global(.spin) {
		animation: attach-spin 0.85s linear infinite;
		color: var(--color-primary);
	}

	@keyframes attach-spin {
		to {
			transform: rotate(360deg);
		}
	}
</style>
