<script lang="ts">
	import {
		builder,
		insertWaypointChronologically,
		nextWaypointId,
		scheduleSave,
		type Waypoint
	} from './builderStore.svelte';
	// `untrack` keeps the in-loop `builder.waypoints.find(...)` from
	// registering as a dep on a non-reactive call site, avoiding effect
	// loops when we patch the matched waypoint's `thumbnail`.
	import { untrack } from 'svelte';
	import { generateImageHashClient } from '$lib/imageHashClient';
	import { readThumbnail } from './imageThumbnail';
	import { setFullImage } from './fullImageCache.svelte';

	type Status = 'pending' | 'placed' | 'unplaced' | 'matched' | 'error';

	type Entry = {
		id: string;
		name: string;
		status: Status;
		message?: string;
	};

	let entries = $state<Entry[]>([]);
	let isDragging = $state(false);

	// Counts hash-only image waypoints (typically restored from a GPX
	// import) that don't yet have a thumbnail — surfaces a contextual
	// hint in the dropzone header so the user knows that dropping the
	// source JPEGs here will attach previews to those rows in the table.
	const orphanImageCount = $derived(
		builder.waypoints.filter((w) => w.imageHash && !w.thumbnail).length
	);

	type Prepared =
		| { ok: true; kind: 'new'; wp: Waypoint; hasGps: boolean; id: string; file: File }
		| { ok: true; kind: 'matched'; id: string; file: File }
		| { ok: false };

	async function handleFiles(files: File[]) {
		const exifr = (await import('exifr')).default;

		// Prep every file in parallel (EXIF + hash + thumbnail). The result
		// is staged in `prepared` rather than pushed into `builder.waypoints`
		// one at a time — that way the snap-to-route effect (which fires on
		// every waypoint insertion) sees a single synchronous batch insertion
		// at the end instead of N consecutive ones. The Brouter / Swisstopo
		// routing API only gets hit once per bulk upload.
		const prepared = await Promise.all(
			files.map(async (file): Promise<Prepared> => {
				const id = nextWaypointId();
				const entryIdx = entries.length;
				entries.push({ id, name: file.name, status: 'pending' });
				try {
					const exif = await exifr
						.parse(file, { gps: true, exif: true })
						.catch(() => null);
					let thumbnail: string | undefined;
					try {
						thumbnail = await readThumbnail(file);
					} catch { /* preview is optional */ }
					const imageHash = await generateImageHashClient(file);

					// Match path: if a previously-imported (or earlier-dropped)
					// waypoint already carries this content hash, attach the
					// thumbnail to it instead of creating a duplicate marker.
					// Covers the GPX-roundtrip flow where the user loads an
					// existing GPX (image hashes restored as bare waypoints)
					// and then drops the source images to give them previews.
					const existing = untrack(() =>
						builder.waypoints.find((w) => w.imageHash === imageHash)
					);
					if (existing) {
						if (thumbnail && !existing.thumbnail) existing.thumbnail = thumbnail;
						// Trust the imported visibility if the existing waypoint
						// already has one set — re-dropping shouldn't silently
						// flip a private photo to public.
						if (!existing.imageVisibility) existing.imageVisibility = 'public';
						scheduleSave();
						entries[entryIdx].status = 'matched';
						entries[entryIdx].message = existing.unplaced
							? 'noch nicht auf der Karte platziert'
							: undefined;
						return { ok: true, kind: 'matched', id: existing.id, file };
					}

					const timestamp =
						exif?.DateTimeOriginal instanceof Date ? exif.DateTimeOriginal.getTime() : null;

					const hasGps =
						exif &&
						typeof exif.latitude === 'number' &&
						typeof exif.longitude === 'number';

					// Note: we deliberately ignore `exif.GPSAltitude` even when
					// present. Phone GPS altitude has metre-scale noise; we backfill
					// the terrain-model altitude from Swisstopo after insertion.
					const wp: Waypoint = hasGps
						? {
								id,
								lat: exif.latitude,
								lng: exif.longitude,
								timestamp,
								thumbnail,
								imageHash,
								imageVisibility: 'public'
							}
						: {
								id,
								lat: 0,
								lng: 0,
								timestamp,
								thumbnail,
								imageHash,
								imageVisibility: 'public',
								unplaced: true
							};

					entries[entryIdx].status = hasGps ? 'placed' : 'unplaced';
					return { ok: true, kind: 'new', wp, hasGps, id, file };
				} catch (err) {
					entries[entryIdx].status = 'error';
					entries[entryIdx].message = (err as Error).message;
					return { ok: false };
				}
			})
		);

		// One synchronous batch of waypoint insertions → one snap-to-route
		// debounce cycle for the whole upload. No per-image altitude fetch:
		// image waypoints inherit the elevation of the routed segment they
		// sit on once the route is snapped — Swisstopo's profile.json (used
		// by snap-to-route enrichment) is the only reliable elevation
		// source against WGS-84 inputs, and its single-point variant kept
		// returning 0 even with workaround attempts.
		for (const p of prepared) {
			if (!p.ok) continue;
			if (p.kind === 'new') insertWaypointChronologically(p.wp);
			// Cache the original file so the waypoint table can show a
			// full-resolution preview this session (for both new + matched
			// waypoints). Persistence to localStorage keeps only the small
			// thumbnail.
			setFullImage(p.id, p.file);
		}
	}

	function onDrop(e: DragEvent) {
		e.preventDefault();
		isDragging = false;
		const files = [...(e.dataTransfer?.files ?? [])].filter((f) => f.type.startsWith('image/'));
		if (files.length > 0) handleFiles(files);
	}

	function onFileInput(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		const files = [...(input.files ?? [])];
		if (files.length > 0) handleFiles(files);
		input.value = '';
	}

	function dismiss(entryId: string) {
		const idx = entries.findIndex((e) => e.id === entryId);
		if (idx >= 0) entries.splice(idx, 1);
	}
</script>

<section
	class="dropzone"
	class:active={isDragging}
	aria-label="Bild-Drop"
	ondragenter={(e) => {
		e.preventDefault();
		isDragging = true;
	}}
	ondragover={(e) => {
		e.preventDefault();
	}}
	ondragleave={() => {
		isDragging = false;
	}}
	ondrop={onDrop}
>
	<header>
		<h2>Bilder</h2>
		<p class="hint">
			Bilder mit GPS-EXIF werden chronologisch platziert. Bilder ohne GPS
			erscheinen in der Wegpunkt-Liste und können dort auf der Karte platziert
			werden. Die Bilder verlassen dein Gerät nicht.
		</p>
		{#if orphanImageCount > 0}
			<p class="hint import-hint">
				<strong>{orphanImageCount}</strong>
				{orphanImageCount === 1 ? 'Bild-Wegpunkt' : 'Bild-Wegpunkte'} aus der
				geladenen GPX warten auf eine Vorschau — die Original-Bilder hier ablegen,
				um sie über den Inhalts-Hash automatisch zuzuordnen.
			</p>
		{/if}
	</header>

	<label class="file-input">
		<input type="file" accept="image/*" multiple onchange={onFileInput} />
		<span>Bilder auswählen oder hierher ziehen</span>
	</label>

	{#if entries.length > 0}
		<ul class="list">
			{#each entries as e (e.id)}
				<li class="entry status-{e.status}">
					<span class="dot"></span>
					<span class="name">{e.name}</span>
					<span class="msg">
						{#if e.status === 'pending'}wird gelesen…
						{:else if e.status === 'placed'}✓ chronologisch platziert
						{:else if e.status === 'matched'}✓ Bildvorschau ergänzt{e.message ? ` (${e.message})` : ''}
						{:else if e.status === 'unplaced'}⚠ Position fehlt — in Liste platzieren
						{:else if e.status === 'error'}Fehler: {e.message ?? 'unbekannt'}
						{/if}
					</span>
					<button type="button" class="dismiss" aria-label="Schließen" onclick={() => dismiss(e.id)}>×</button>
				</li>
			{/each}
		</ul>
	{/if}
</section>

<style>
	.dropzone {
		margin-top: 1rem;
		padding: 1rem;
		background: var(--color-surface);
		border: 2px dashed var(--color-border);
		border-radius: var(--radius-lg);
		transition: border-color var(--transition-fast), background-color var(--transition-fast);
	}

	.dropzone.active {
		border-color: var(--color-primary);
		background: var(--color-bg-elevated);
	}

	h2 {
		margin: 0;
		font-size: 1rem;
		color: var(--color-text-primary);
	}

	.hint {
		margin: 0.25rem 0 0.75rem;
		font-size: 0.8rem;
		color: var(--color-text-tertiary);
	}

	.import-hint {
		margin: 0 0 0.75rem;
		padding: 0.5rem 0.75rem;
		background: color-mix(in oklab, var(--blue) 12%, var(--color-surface));
		border-left: 3px solid var(--blue);
		border-radius: var(--radius-sm);
		color: var(--color-text-secondary);
	}

	.import-hint strong {
		color: var(--blue);
		font-variant-numeric: tabular-nums;
	}

	.file-input {
		display: block;
		text-align: center;
		padding: 0.65rem 1rem;
		background: var(--color-bg-tertiary);
		border-radius: var(--radius-md);
		cursor: pointer;
		font-size: 0.9rem;
		color: var(--color-text-secondary);
	}

	.file-input input {
		display: none;
	}

	.file-input:hover {
		background: var(--color-bg-elevated);
	}

	.list {
		list-style: none;
		padding: 0;
		margin: 0.75rem 0 0;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.entry {
		display: grid;
		grid-template-columns: auto 1fr auto auto;
		gap: 0.6rem;
		align-items: center;
		padding: 0.35rem 0.5rem;
		background: var(--color-bg-secondary);
		border-radius: var(--radius-sm);
		font-size: 0.78rem;
		color: var(--color-text-secondary);
	}

	.dot {
		width: 0.55rem;
		height: 0.55rem;
		border-radius: 50%;
		background: var(--color-text-tertiary);
		flex-shrink: 0;
	}

	.status-placed .dot { background: var(--green); }
	.status-matched .dot { background: var(--blue); }
	.status-unplaced .dot { background: var(--orange); }
	.status-error .dot { background: var(--red); }
	.status-pending .dot {
		background: var(--color-primary);
		animation: pulse 1.2s ease-in-out infinite;
	}

	@keyframes pulse {
		0%, 100% { opacity: 0.4; }
		50% { opacity: 1; }
	}

	.name {
		color: var(--color-text-primary);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.msg {
		text-align: right;
		font-size: 0.75rem;
		color: var(--color-text-tertiary);
		white-space: nowrap;
	}

	.status-error .msg { color: var(--red); }
	.status-unplaced .msg { color: var(--orange); }
	.status-placed .msg { color: var(--green); }
	.status-matched .msg { color: var(--blue); }

	.dismiss {
		appearance: none;
		background: transparent;
		border: 0;
		color: var(--color-text-tertiary);
		font-size: 1.1rem;
		line-height: 1;
		padding: 0 0.2rem;
		cursor: pointer;
	}

	.dismiss:hover {
		color: var(--color-text-primary);
	}
</style>
