<script lang="ts">
	import {
		builder,
		insertWaypointChronologically,
		nextWaypointId,
		requestFitBounds,
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
	import ImagePlus from '@lucide/svelte/icons/image-plus';
	import LoaderCircle from '@lucide/svelte/icons/loader-circle';
	import AlertTriangle from '@lucide/svelte/icons/triangle-alert';
	import X from '@lucide/svelte/icons/x';
	import '$lib/css/action_button.css';

	type Status = 'pending' | 'placed' | 'unplaced' | 'matched' | 'error';

	type Entry = {
		id: string;
		name: string;
		status: Status;
		message?: string;
	};

	interface Props {
		/** Called when the user picks/drops a `.gpx` file via the FAB.
		 * Owning page handles the import + draft-replacement confirm.
		 * When absent, GPX files are silently ignored. */
		onGpxImport?: (file: File) => void;
	}

	const { onGpxImport }: Props = $props();

	function isGpxFile(file: File): boolean {
		if (file.name.toLowerCase().endsWith('.gpx')) return true;
		return (
			file.type === 'application/gpx+xml' ||
			file.type === 'application/xml' ||
			file.type === 'text/xml'
		);
	}

	let entries = $state<Entry[]>([]);
	let isDragging = $state(false);
	let showFailDetails = $state(false);

	const orphanImageCount = $derived(
		builder.waypoints.filter((w) => w.imageHash && !w.thumbnail).length
	);
	const pendingCount = $derived(entries.filter((e) => e.status === 'pending').length);
	const failedEntries = $derived(
		entries.filter((e) => e.status === 'error' || e.status === 'unplaced')
	);
	const failCount = $derived(failedEntries.length);

	// Numeric badge on the FAB. Pending wins (in-flight work), then
	// failures (need attention), then orphan hash-only waypoints from a
	// GPX import (waiting for their source images).
	const badge = $derived(
		pendingCount > 0
			? pendingCount
			: failCount > 0
				? failCount
				: orphanImageCount > 0
					? orphanImageCount
					: 0
	);
	const badgeTone = $derived<'pending' | 'fail' | 'info'>(
		pendingCount > 0 ? 'pending' : failCount > 0 ? 'fail' : 'info'
	);

	type Prepared =
		| { ok: true; kind: 'new'; wp: Waypoint; hasGps: boolean; id: string; file: File }
		| { ok: true; kind: 'matched'; id: string; file: File }
		| { ok: false };

	// Auto-clear successful entries after 4s so the badge counter doesn't
	// pile up. Failures stay until the user dismisses them.
	function scheduleAutoDismiss(id: string, ms = 4000) {
		setTimeout(() => {
			const e = entries.find((x) => x.id === id);
			if (!e) return;
			if (e.status === 'placed' || e.status === 'matched') dismiss(id);
		}, ms);
	}

	async function handleFiles(files: File[]) {
		const exifr = (await import('exifr')).default;

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

					// Match path: re-attach to an existing waypoint with the
					// same content hash (covers the GPX-roundtrip flow).
					const existing = untrack(() =>
						builder.waypoints.find((w) => w.imageHash === imageHash)
					);
					if (existing) {
						if (thumbnail && !existing.thumbnail) existing.thumbnail = thumbnail;
						if (!existing.imageVisibility) existing.imageVisibility = 'public';
						scheduleSave();
						entries[entryIdx].status = 'matched';
						entries[entryIdx].message = existing.unplaced
							? 'noch nicht auf der Karte platziert'
							: undefined;
						scheduleAutoDismiss(entries[entryIdx].id);
						return { ok: true, kind: 'matched', id: existing.id, file };
					}

					const timestamp =
						exif?.DateTimeOriginal instanceof Date ? exif.DateTimeOriginal.getTime() : null;
					const hasGps =
						exif &&
						typeof exif.latitude === 'number' &&
						typeof exif.longitude === 'number';

					// EXIF GPSAltitude is intentionally ignored (too noisy);
					// terrain-model altitude from Swisstopo is backfilled later.
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
					if (hasGps) scheduleAutoDismiss(entries[entryIdx].id);
					return { ok: true, kind: 'new', wp, hasGps, id, file };
				} catch (err) {
					entries[entryIdx].status = 'error';
					entries[entryIdx].message = (err as Error).message;
					return { ok: false };
				}
			})
		);

		let placedAny = false;
		for (const p of prepared) {
			if (!p.ok) continue;
			if (p.kind === 'new') {
				insertWaypointChronologically(p.wp);
				if (p.hasGps) placedAny = true;
			}
			setFullImage(p.id, p.file);
		}
		if (placedAny) requestFitBounds();
	}

	function routeFiles(files: File[]) {
		const gpx = files.find(isGpxFile);
		if (gpx && onGpxImport) {
			// GPX import REPLACES the draft, so we hand off the first one
			// and ignore everything else in the batch — combining a GPX
			// import with an image batch would race the snap-to-route
			// reactor against a draft reset.
			onGpxImport(gpx);
			return;
		}
		const images = files.filter((f) => f.type.startsWith('image/'));
		if (images.length > 0) handleFiles(images);
	}

	function onDrop(e: DragEvent) {
		e.preventDefault();
		isDragging = false;
		const files = [...(e.dataTransfer?.files ?? [])];
		if (files.length > 0) routeFiles(files);
	}

	function onFileInput(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		const files = [...(input.files ?? [])];
		if (files.length > 0) routeFiles(files);
		input.value = '';
	}

	function dismiss(entryId: string) {
		const idx = entries.findIndex((e) => e.id === entryId);
		if (idx >= 0) entries.splice(idx, 1);
	}

	function clearFailed() {
		entries = entries.filter((e) => e.status !== 'error' && e.status !== 'unplaced');
		showFailDetails = false;
	}

	let fileInput: HTMLInputElement | undefined = $state();
	function openPicker() {
		fileInput?.click();
	}
</script>

<div
	class="bulk-fab-wrap"
	class:dragging={isDragging}
	role="region"
	aria-label="Bilder-Upload"
	ondragenter={(e) => {
		const types = e.dataTransfer?.types;
		if (types && Array.from(types).includes('Files')) {
			e.preventDefault();
			isDragging = true;
		}
	}}
	ondragover={(e) => {
		const types = e.dataTransfer?.types;
		if (types && Array.from(types).includes('Files')) {
			e.preventDefault();
		}
	}}
	ondragleave={(e) => {
		if (e.currentTarget === e.target) isDragging = false;
	}}
	ondrop={onDrop}
>
	<input
		bind:this={fileInput}
		type="file"
		accept="image/*,.gpx,application/gpx+xml,application/xml,text/xml"
		multiple
		onchange={onFileInput}
		hidden
	/>
	<button
		type="button"
		class="bulk-fab action_button"
		aria-label="Bilder oder GPX hinzufügen"
		title="Bilder oder GPX hinzufügen"
		onclick={openPicker}
	>
		{#if pendingCount > 0}
			<LoaderCircle size={30} strokeWidth={2.2} color="white" class="bulk-fab-icon spin" />
		{:else}
			<ImagePlus size={30} strokeWidth={2.2} color="white" class="bulk-fab-icon" />
		{/if}
	</button>
	{#if failCount > 0}
		<button
			type="button"
			class="bulk-fab-badge tone-fail"
			onclick={() => (showFailDetails = !showFailDetails)}
			aria-label="{failCount} {failCount === 1 ? 'Hinweis' : 'Hinweise'} anzeigen"
			aria-expanded={showFailDetails}
		>
			{badge}
		</button>
	{:else if badge > 0}
		<span class="bulk-fab-badge tone-{badgeTone}" aria-label="{badge} aktiv">
			{badge}
		</span>
	{/if}
</div>

{#if showFailDetails && failedEntries.length > 0}
	<aside class="bulk-fail-popover" aria-label="Bild-Hinweise">
		<header>
			<strong>Bild-Hinweise</strong>
			<button type="button" class="link" onclick={clearFailed}>Alle ausblenden</button>
		</header>
		<ul>
			{#each failedEntries as e (e.id)}
				<li class="bulk-fail status-{e.status}">
					<span class="status-icon" aria-hidden="true">
						<AlertTriangle size={12} strokeWidth={2} />
					</span>
					<span class="name">{e.name}</span>
					<span class="msg">
						{#if e.status === 'unplaced'}Position fehlt — Eintrag in der Wegpunktliste auf Karte platzieren.
						{:else}Fehler: {e.message ?? 'unbekannt'}
						{/if}
					</span>
					<button type="button" class="dismiss" aria-label="Schliessen" onclick={() => dismiss(e.id)}>
						<X size={13} strokeWidth={2} />
					</button>
				</li>
			{/each}
		</ul>
	</aside>
{/if}

<style>
	/* Wrapper holds the FAB + badge in a single positioning context so the
	 * drag-target (full wrapper bounds) is larger than the button itself —
	 * helps users dropping a stack of images. */
	.bulk-fab-wrap {
		position: fixed;
		bottom: 2rem;
		right: 2rem;
		width: 3.75rem;
		height: 3.75rem;
		z-index: 100;
		transition: transform var(--transition-normal);
	}

	.bulk-fab-wrap.dragging {
		transform: scale(1.08);
	}

	/* FAB — mirrors the recipes-style ActionButton (same shake + shadow
	 * via the shared action_button.css). */
	.bulk-fab {
		width: 100%;
		height: 100%;
		padding: 0;
		border-radius: var(--radius-pill);
		background-color: var(--red);
		display: inline-flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: var(--transition-normal);
	}

	.bulk-fab :global(.bulk-fab-icon) {
		pointer-events: none;
	}

	.bulk-fab :global(.bulk-fab-icon.spin) {
		animation: bulk-fab-spin 0.85s linear infinite;
	}

	@keyframes bulk-fab-spin {
		to { transform: rotate(360deg); }
	}

	.bulk-fab-wrap.dragging .bulk-fab {
		background-color: var(--nord0);
		box-shadow: 0 0 0 5px color-mix(in oklab, var(--red) 35%, transparent),
			0 0 1.6em 0.4em rgba(0, 0, 0, 0.35);
	}

	@media (max-width: 500px) {
		.bulk-fab-wrap {
			bottom: 1rem;
			right: 1rem;
			width: 3.25rem;
			height: 3.25rem;
		}
	}

	/* Numeric badge — pinned top-right of the FAB. Pending = primary blue,
	 * fail = orange, info (orphan hashes) = nord blue. */
	.bulk-fab-badge {
		position: absolute;
		top: -0.25rem;
		right: -0.25rem;
		min-width: 1.35rem;
		height: 1.35rem;
		padding: 0 0.35rem;
		border-radius: var(--radius-pill);
		background: var(--color-primary);
		color: var(--color-text-on-primary);
		font-size: 0.72rem;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border: 2px solid var(--color-surface);
		box-shadow: var(--shadow-sm);
		appearance: none;
		font-family: inherit;
	}

	button.bulk-fab-badge {
		cursor: pointer;
	}

	.bulk-fab-badge.tone-fail {
		background: var(--orange);
	}

	.bulk-fab-badge.tone-info {
		background: var(--blue);
	}

	/* Failure popover anchored above the FAB. Only opens when the user
	 * clicks the fail-tinted badge, so the FAB itself stays minimal. */
	.bulk-fail-popover {
		position: fixed;
		bottom: 6.5rem;
		right: 2rem;
		z-index: 101;
		max-width: min(360px, calc(100vw - 3rem));
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-left: 3px solid var(--orange);
		border-radius: var(--radius-md);
		box-shadow: var(--shadow-lg);
		padding: 0.6rem 0.7rem;
		animation: bulk-fail-in 200ms ease-out;
	}

	@keyframes bulk-fail-in {
		from {
			opacity: 0;
			transform: translateY(6px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.bulk-fail-popover header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-size: 0.85rem;
		color: var(--color-text-primary);
		padding-bottom: 0.4rem;
		border-bottom: 1px solid var(--color-border);
		margin-bottom: 0.4rem;
	}

	.bulk-fail-popover .link {
		appearance: none;
		background: transparent;
		border: 0;
		font: inherit;
		font-size: 0.75rem;
		color: var(--color-text-tertiary);
		cursor: pointer;
		text-decoration: underline;
	}

	.bulk-fail-popover ul {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
	}

	.bulk-fail {
		display: grid;
		grid-template-columns: auto 1fr auto;
		gap: 0.5rem;
		align-items: center;
		padding: 0.35rem 0.4rem;
		background: var(--color-bg-secondary);
		border-radius: var(--radius-sm);
		font-size: 0.78rem;
		color: var(--color-text-secondary);
	}

	.bulk-fail .status-icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 1.1rem;
		height: 1.1rem;
		border-radius: 50%;
		background: var(--orange);
		color: white;
		flex-shrink: 0;
	}

	.bulk-fail.status-error .status-icon {
		background: var(--red);
	}

	.bulk-fail .name {
		grid-column: 2;
		grid-row: 1;
		color: var(--color-text-primary);
		font-weight: 500;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.bulk-fail .msg {
		grid-column: 2;
		grid-row: 2;
		font-size: 0.72rem;
		color: var(--color-text-tertiary);
		line-height: 1.35;
	}

	.bulk-fail.status-error .msg {
		color: var(--red);
	}

	.bulk-fail .dismiss {
		grid-column: 3;
		grid-row: 1 / span 2;
		appearance: none;
		background: transparent;
		border: 0;
		color: var(--color-text-tertiary);
		padding: 0.2rem;
		border-radius: var(--radius-sm);
		cursor: pointer;
		display: inline-flex;
		align-items: center;
		justify-content: center;
	}

	.bulk-fail .dismiss:hover {
		color: var(--color-text-primary);
		background: var(--color-bg-elevated);
	}
</style>
