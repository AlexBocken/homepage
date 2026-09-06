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
	import { page } from '$app/state';
	import { fmt, m, type HikesLang } from '$lib/js/hikesI18n';

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
	const lang = $derived((page.data.lang as HikesLang | undefined) ?? 'de');
	const t = $derived(m[lang]);

	function isGpxFile(file: File): boolean {
		if (file.name.toLowerCase().endsWith('.gpx')) return true;
		return (
			file.type === 'application/gpx+xml' ||
			file.type === 'application/xml' ||
			file.type === 'text/xml'
		);
	}

	// Only Safari decodes HEIC in an <img>, so the canvas thumbnail and the blob
	// preview both come up empty. The server (sharp, built against a libvips
	// with libheif) renders a JPEG stand-in instead — see
	// `/api/hikes/route-builder/heic-preview`. The original file stays the
	// source of truth: it is what gets hashed into the GPX and what belongs in
	// the hike's `images/` dir.
	function isHeicFile(file: File): boolean {
		if (/\.(heic|heif)$/i.test(file.name)) return true;
		return file.type === 'image/heic' || file.type === 'image/heif';
	}

	// `file.type` is an empty string for `.HEIC` on several platforms, so the
	// plain `image/*` test would drop them before they ever reach handleFiles.
	function isImageFile(file: File): boolean {
		return file.type.startsWith('image/') || isHeicFile(file);
	}

	async function heicPreview(file: File): Promise<Blob> {
		const body = new FormData();
		body.append('image', file, file.name);
		const res = await fetch('/api/hikes/route-builder/heic-preview', { method: 'POST', body });
		if (res.ok) return res.blob();
		if (res.status === 429) throw new Error(t.rb_heic_rate_limited);
		if (res.status === 501) throw new Error(t.rb_heic_unsupported);
		throw new Error(fmt(t.rb_heic_failed, { status: res.status }));
	}

	// One HEIC at a time: each request ships a multi-megabyte photo and costs a
	// server-side decode, so a dropped day of photos shouldn't hit the wire all
	// at once.
	let heicChain: Promise<unknown> = Promise.resolve();

	function queueHeicPreview(file: File): Promise<Blob> {
		const run = heicChain.then(() => heicPreview(file));
		// Keep the chain alive even when one conversion rejects.
		heicChain = run.catch(() => undefined);
		return run;
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

	// `preview` is what the UI renders: the dropped file itself for formats the
	// browser decodes, a server-rendered JPEG for HEIC. Hash and EXIF always
	// come from the original file.
	type Prepared =
		| { ok: true; kind: 'new'; wp: Waypoint; hasGps: boolean; id: string; preview: Blob }
		| { ok: true; kind: 'matched'; id: string; preview: Blob }
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
					// A failed HEIC preview is fatal for this file: the browser
					// can't render the original, so the waypoint would carry a
					// blank, unidentifiable image.
					const preview: Blob = isHeicFile(file) ? await queueHeicPreview(file) : file;
					let thumbnail: string | undefined;
					try {
						thumbnail = await readThumbnail(preview);
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
							? t.rb_not_placed_on_map
							: undefined;
						scheduleAutoDismiss(entries[entryIdx].id);
						return { ok: true, kind: 'matched', id: existing.id, preview };
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
					return { ok: true, kind: 'new', wp, hasGps, id, preview };
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
			setFullImage(p.id, p.preview);
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
		const images = files.filter(isImageFile);
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
	aria-label={t.rb_upload_aria}
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
		accept="image/*,.heic,.heif,.gpx,application/gpx+xml,application/xml,text/xml"
		multiple
		onchange={onFileInput}
		hidden
	/>
	<button
		type="button"
		class="bulk-fab action_button"
		aria-label={t.rb_add_files}
		title={t.rb_add_files}
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
			aria-label={failCount === 1 ? t.rb_show_notes_one : fmt(t.rb_show_notes_many, { n: failCount })}
			aria-expanded={showFailDetails}
		>
			{badge}
		</button>
	{:else if badge > 0}
		<span class="bulk-fab-badge tone-{badgeTone}" aria-label={fmt(t.rb_active, { n: badge })}>
			{badge}
		</span>
	{/if}
</div>

{#if showFailDetails && failedEntries.length > 0}
	<aside class="bulk-fail-popover" aria-label={t.rb_image_notes}>
		<header>
			<strong>{t.rb_image_notes}</strong>
			<button type="button" class="link" onclick={clearFailed}>{t.rb_hide_all}</button>
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
