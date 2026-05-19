<script lang="ts">
	import { untrack } from 'svelte';
	import Seo from '$lib/components/Seo.svelte';
	import EditMap from '$lib/components/hikes/route-builder/EditMap.svelte';
	import WaypointTable from '$lib/components/hikes/route-builder/WaypointTable.svelte';
	import ImageDropzone from '$lib/components/hikes/route-builder/ImageDropzone.svelte';
	import { assembleTrackPoints, buildGpx, type GpxImageWaypoint } from '$lib/gpx';
	import {
		builder,
		setRoutedSegments,
		setElevations,
		clearDraft,
		reconcileSegments,
		densifyLinearSegments,
		importGpx
	} from '$lib/components/hikes/route-builder/builderStore.svelte';

	let busy = $state(false);
	let error = $state<string | null>(null);
	let routeRequestId = 0;

	/**
	 * Pull elevations from Swisstopo for every point of the current
	 * `routedSegments` that lacks one, then fold the values back into the
	 * segment arrays. Shared by the snap path (where BRouter sometimes
	 * doesn't return elevations) and the manual / off-trail path (where
	 * we densify a straight line then need its profile).
	 *
	 * Returns silently if every point already has an altitude — handy when
	 * BRouter snapped the route and embedded elevations inline.
	 */
	async function enrichMissingElevations(reqId: number): Promise<void> {
		const flat = builder.routedSegments.flat();
		if (flat.length === 0) return;
		if (!flat.some((p) => typeof p[2] !== 'number')) return;
		const elevRes = await fetch('/api/hikes/route-builder/elevation', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ coordinates: flat.map((p) => [p[0], p[1]]) })
		});
		if (reqId !== routeRequestId) return;
		if (!elevRes.ok) return;
		const { elevations } = (await elevRes.json()) as { elevations: (number | null)[] };
		setElevations(elevations);
	}

	async function snapToRoute() {
		const placed = builder.waypoints.filter((w) => !w.unplaced);
		if (placed.length < 2) {
			setRoutedSegments([]);
			return;
		}
		const reqId = ++routeRequestId;
		busy = true;
		error = null;
		try {
			const res = await fetch('/api/hikes/route-builder/route', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					waypoints: placed.map((w) => ({ lat: w.lat, lng: w.lng })),
					profile: builder.profile
				})
			});
			if (reqId !== routeRequestId) return; // stale response
			if (!res.ok) {
				error = `Routing fehlgeschlagen (HTTP ${res.status}).`;
				return;
			}
			const data = (await res.json()) as {
				segments: Array<Array<[number, number, number?]>>;
				source: string;
			};
			if (reqId !== routeRequestId) return;
			setRoutedSegments(data.segments);
			// BRouter usually embeds elevations inline; OSRM / linear
			// fallbacks don't. Single helper handles both cases.
			await enrichMissingElevations(reqId);
		} catch (err) {
			if (reqId !== routeRequestId) return;
			error = (err as Error).message;
		} finally {
			if (reqId === routeRequestId) busy = false;
		}
	}

	// Reactor: any structural change (waypoints, profile, autoSnap toggle)
	// reconciles `routedSegments` against the current waypoint list first —
	// matching pairs keep their snapped data, new pairs get a straight-line
	// placeholder. After that, if autoSnap is on, fire a debounced API call to
	// refresh; server-side per-pair caching makes cached pairs free.
	let snapDebounce: ReturnType<typeof setTimeout> | null = null;
	$effect(() => {
		// Track waypoint structure + flags as deps.
		builder.profile;
		builder.autoSnap;
		builder.waypoints.length;
		for (const w of builder.waypoints) {
			w.id; w.lat; w.lng;
		}

		// All side-effects that read/write `routedSegments` and `segmentSourceIds`
		// must be untracked — otherwise the effect's own writes would feed back
		// into its dependency set and trigger an update loop.
		untrack(() => {
			reconcileSegments();

			if (snapDebounce) clearTimeout(snapDebounce);
			if (builder.autoSnap) {
				snapDebounce = setTimeout(() => snapToRoute(), 250);
			} else {
				// Manual / off-trail mode: keep already-snapped pairs intact
				// (reconcileSegments preserved them); but for any fresh
				// two-point linear placeholder, densify to ~25 m spacing and
				// pull a Swisstopo elevation profile so the GPX carries
				// per-trkpt `<ele>` even when the user chose not to snap.
				// Cancel any in-flight snap request so a late response can't
				// overwrite what we're about to densify.
				const reqId = ++routeRequestId;
				snapDebounce = setTimeout(async () => {
					busy = true;
					try {
						densifyLinearSegments(25);
						await enrichMissingElevations(reqId);
					} catch (err) {
						if (reqId === routeRequestId) error = (err as Error).message;
					} finally {
						if (reqId === routeRequestId) busy = false;
					}
				}, 250);
			}
		});
	});

	function downloadGpx() {
		const unplaced = builder.waypoints.filter((w) => w.unplaced);
		if (unplaced.length > 0) {
			error = `${unplaced.length} Bild${unplaced.length === 1 ? '' : 'er'} ohne Position. Bitte in der Wegpunkt-Liste platzieren oder entfernen.`;
			return;
		}
		const placed = builder.waypoints.filter((w) => !w.unplaced);
		const assembled = assembleTrackPoints({
			waypoints: placed.map((w) => ({
				lat: w.lat,
				lng: w.lng,
				altitude: w.altitude,
				timestamp: w.timestamp ?? null
			})),
			routedSegments: builder.routedSegments
		});
		if (!assembled.ok) {
			error = assembled.error;
			return;
		}
		error = null;
		// Look up altitude for a placed-waypoint index from the routed segments.
		// Mirrors the trkpt fallback in `assembleTrackPoints`: image waypoints
		// almost never carry their own `altitude` (EXIF GPSAltitude is too noisy
		// to trust), so without this fallback the GPX `<wpt>` would emit no
		// `<ele>` and downstream tools render it as 0.
		function routedAltitudeAt(idx: number): number | undefined {
			const segs = builder.routedSegments;
			const startSeg = segs[idx];
			if (startSeg && startSeg.length > 0 && typeof startSeg[0][2] === 'number') {
				return startSeg[0][2];
			}
			const prevSeg = idx > 0 ? segs[idx - 1] : undefined;
			if (prevSeg && prevSeg.length > 0) {
				const last = prevSeg[prevSeg.length - 1];
				if (typeof last[2] === 'number') return last[2];
			}
			return undefined;
		}
		const imageWaypoints: GpxImageWaypoint[] = placed
			.map((w, idx) => ({ w, idx }))
			.filter(
				(e): e is { w: typeof e.w & { imageHash: string }; idx: number } =>
					typeof e.w.imageHash === 'string'
			)
			.map(({ w, idx }) => ({
				lat: w.lat,
				lng: w.lng,
				altitude: typeof w.altitude === 'number' ? w.altitude : routedAltitudeAt(idx),
				timestamp: w.timestamp ?? null,
				hash: w.imageHash,
				visibility: w.imageVisibility === 'private' ? 'private' : 'public'
			}));
		const gpx = buildGpx({
			name: builder.name || 'Neue Wanderung',
			trackPoints: assembled.points,
			imageWaypoints
		});
		const blob = new Blob([gpx], { type: 'application/gpx+xml' });
		const url = URL.createObjectURL(blob);
		const slug = (builder.name || 'route').toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '') || 'route';
		const a = document.createElement('a');
		a.href = url;
		a.download = `${slug}.gpx`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	}

	// GPX import: file input is hidden; the visible "GPX laden" button
	// proxies its click. Imported route REPLACES the current draft, so
	// confirm first when there's existing work to avoid silent data loss.
	let gpxFileInput: HTMLInputElement | undefined = $state();

	function openGpxPicker() {
		if (
			builder.waypoints.length > 0 &&
			!confirm(
				'Bestehenden Entwurf durch importierte GPX ersetzen? Aktuelle Wegpunkte gehen verloren.'
			)
		) {
			return;
		}
		gpxFileInput?.click();
	}

	async function onGpxSelected(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		try {
			const xml = await file.text();
			const result = importGpx(xml);
			if (!result.ok) {
				error = result.error;
				return;
			}
			error = null;
			// Cancel any in-flight enrichment so it doesn't overwrite the
			// freshly-imported geometry.
			routeRequestId++;
		} catch (err) {
			error = `GPX-Import fehlgeschlagen: ${(err as Error).message}`;
		} finally {
			// Reset so the same file can be re-selected later.
			input.value = '';
		}
	}

	// Placement coordination: which unplaced waypoint is currently waiting for
	// a click on the map?
	let pendingPlacementId = $state<string | null>(null);

	function startPlacement(waypointId: string) {
		pendingPlacementId = waypointId;
	}

	function cancelPlacement() {
		pendingPlacementId = null;
	}
</script>

<Seo title="Routen-Builder · Wanderungen" description="Eigene Wanderrouten erstellen, exportieren und teilen." lang="de" />

<svelte:head>
	<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
	<link rel="preconnect" href="https://wmts.geo.admin.ch" crossorigin="anonymous" />
</svelte:head>

<section class="builder">
	<header class="header">
		<input
			class="name-input"
			type="text"
			placeholder="Name der Tour…"
			bind:value={builder.name}
		/>
		<div class="actions">
			<select bind:value={builder.profile} disabled={!builder.autoSnap}>
				<option value="hiking-mountain">Wandern (Berg)</option>
				<option value="trekking">Trekking</option>
				<option value="road">Strasse</option>
			</select>
			<label class="snap-toggle" class:active={builder.autoSnap}>
				<input type="checkbox" bind:checked={builder.autoSnap} />
				<span>Auf Wege snappen</span>
			</label>
			<!-- Mode-agnostic busy chip — fires for both the snap-to-route
			     path and the densify+elevate path so the user always knows
			     when the GPX is still incomplete. -->
			<span class="status" class:busy aria-live="polite" aria-atomic="true">
				<span class="status-dot" aria-hidden="true"></span>
				{busy ? 'Berechne Route + Höhenprofil…' : 'Bereit'}
			</span>
			<button
				type="button"
				class="primary"
				onclick={downloadGpx}
				disabled={busy}
				title={busy ? 'Warten bis Route + Höhenprofil berechnet sind' : ''}
			>
				GPX herunterladen
			</button>
			<button
				type="button"
				class="link"
				onclick={openGpxPicker}
				title="Eine zuvor exportierte GPX-Datei in den Editor laden"
			>
				GPX laden
			</button>
			<input
				bind:this={gpxFileInput}
				type="file"
				accept=".gpx,application/gpx+xml,application/xml,text/xml"
				onchange={onGpxSelected}
				hidden
			/>
			<button type="button" class="link" onclick={clearDraft}>Zurücksetzen</button>
		</div>
	</header>

	{#if error}
		<p class="err">{error}</p>
	{/if}

	<div class="grid">
		<div class="map-col">
			<EditMap
				{pendingPlacementId}
				onPlacementCancel={cancelPlacement}
				onPlacementComplete={cancelPlacement}
			/>
		</div>
		<div class="side">
			<WaypointTable
				{pendingPlacementId}
				onRequestPlacement={startPlacement}
				onCancelPlacement={cancelPlacement}
			/>
			<ImageDropzone />
		</div>
	</div>

	<p class="hint">
		Tipp: Klicke auf die Karte, um Wegpunkte hinzuzufügen. Bilder mit GPS-EXIF werden
		automatisch als Wegpunkte verwendet. Der GPX-Export bleibt lokal — eine Veröffentlichung
		als Wandereintrag erfordert einen Commit der Dateien unter
		<code>src/content/hikes/&lt;slug&gt;/</code>.
	</p>
</section>

<style>
	.builder {
		max-width: 1300px;
		margin-inline: auto;
		padding: 1rem 1rem 3rem;
	}

	.header {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 1rem;
	}

	.name-input {
		flex: 1 1 240px;
		font-size: 1.25rem;
		font-weight: 600;
		padding: 0.5rem 0.75rem;
		background: var(--color-bg-tertiary);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		color: var(--color-text-primary);
	}

	.actions {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.actions select,
	.actions button {
		font: inherit;
		font-size: 0.9rem;
		padding: 0.45rem 0.9rem;
		border-radius: var(--radius-pill);
		border: 1px solid var(--color-border);
		background: var(--color-bg-tertiary);
		color: var(--color-text-primary);
		cursor: pointer;
	}

	.actions button.primary {
		background: var(--color-primary);
		color: var(--color-text-on-primary);
		border-color: var(--color-primary);
	}

	.actions button.link {
		background: transparent;
		border-color: transparent;
		color: var(--color-text-secondary);
	}

	.actions button:disabled,
	.actions select:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.snap-toggle {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		font: inherit;
		font-size: 0.9rem;
		padding: 0.45rem 0.9rem;
		border-radius: var(--radius-pill);
		border: 1px solid var(--color-border);
		background: var(--color-bg-tertiary);
		color: var(--color-text-secondary);
		cursor: pointer;
		user-select: none;
	}

	.snap-toggle.active {
		background: var(--color-primary);
		color: var(--color-text-on-primary);
		border-color: var(--color-primary);
	}

	.snap-toggle input {
		accent-color: var(--color-primary);
		width: 1rem;
		height: 1rem;
	}

	/* Live busy chip — sits between the snap toggle and the download
	 * button so the user can't miss it when GPX export would land
	 * without elevations yet. Quiet green dot when idle, pulsing
	 * amber dot when fetching. */
	.status {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.8rem;
		color: var(--color-text-secondary);
		font-variant-numeric: tabular-nums;
		min-width: 0;
	}

	.status-dot {
		width: 0.55rem;
		height: 0.55rem;
		border-radius: 50%;
		background: var(--green);
		flex: 0 0 auto;
		box-shadow: 0 0 0 0 color-mix(in oklab, var(--green) 40%, transparent);
	}

	.status.busy {
		color: var(--orange);
	}

	.status.busy .status-dot {
		background: var(--orange);
		animation: status-pulse 1.1s ease-out infinite;
	}

	@keyframes status-pulse {
		0% {
			box-shadow: 0 0 0 0 color-mix(in oklab, var(--orange) 70%, transparent);
		}
		70% {
			box-shadow: 0 0 0 0.55rem color-mix(in oklab, var(--orange) 0%, transparent);
		}
		100% {
			box-shadow: 0 0 0 0 color-mix(in oklab, var(--orange) 0%, transparent);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.status.busy .status-dot {
			animation: none;
		}
	}

	.grid {
		display: grid;
		grid-template-columns: minmax(0, 1.5fr) minmax(280px, 1fr);
		gap: 1.5rem;
	}

	@media (max-width: 900px) {
		.grid {
			grid-template-columns: 1fr;
		}
	}

	.err {
		margin: 0 0 1rem;
		padding: 0.5rem 0.75rem;
		background: color-mix(in oklab, var(--red) 12%, transparent);
		color: var(--red);
		border-radius: var(--radius-md);
	}

	.hint {
		margin-top: 1.5rem;
		color: var(--color-text-tertiary);
		font-size: 0.85rem;
	}

	code {
		background: var(--color-bg-tertiary);
		padding: 0.1em 0.35em;
		border-radius: var(--radius-sm);
		font-size: 0.85em;
	}
</style>
