<script lang="ts">
	import { untrack } from 'svelte';
	import Seo from '$lib/components/Seo.svelte';
	import EditMap from '$lib/components/hikes/route-builder/EditMap.svelte';
	import WaypointTable from '$lib/components/hikes/route-builder/WaypointTable.svelte';
	import WaypointDetailPanel from '$lib/components/hikes/route-builder/WaypointDetailPanel.svelte';
	import ImageDropzone from '$lib/components/hikes/route-builder/ImageDropzone.svelte';
	import RouteStatsBar from '$lib/components/hikes/route-builder/RouteStatsBar.svelte';
	import { assembleTrackPoints, buildGpx, type GpxImageWaypoint, type GpxTrack } from '$lib/gpx';
	import {
		builder,
		focusWaypoint,
		mapView,
		setRoutedSegments,
		setElevations,
		clearDraft,
		reconcileSegments,
		densifyLinearSegments,
		deriveStageGroups,
		importGpx
	} from '$lib/components/hikes/route-builder/builderStore.svelte';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import Crosshair from '@lucide/svelte/icons/crosshair';
	import Download from '@lucide/svelte/icons/download';
	import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
	import LoaderCircle from '@lucide/svelte/icons/loader-circle';
	import CheckCircle2 from '@lucide/svelte/icons/circle-check-big';
	import Toggle from '$lib/components/Toggle.svelte';

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
		// Assemble each stage independently so timestamps interpolate within a
		// stage and the overnight gap between stages is never bridged. One
		// <trk> per stage; a single-stage route yields one track (== before).
		const groups = deriveStageGroups();
		const tracks: GpxTrack[] = [];
		for (const g of groups) {
			const assembled = assembleTrackPoints({
				waypoints: placed.slice(g.startIdx, g.endIdx + 1).map((w) => ({
					lat: w.lat,
					lng: w.lng,
					altitude: w.altitude,
					timestamp: w.timestamp ?? null
				})),
				// Only the segments *within* the stage (between its consecutive
				// waypoints); the boundary segment to the next stage is excluded.
				routedSegments: builder.routedSegments.slice(g.startIdx, g.endIdx)
			});
			if (!assembled.ok) {
				error = groups.length > 1 ? `Etappe „${g.name}“: ${assembled.error}` : assembled.error;
				return;
			}
			tracks.push({ name: g.name, points: assembled.points });
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
			tracks,
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

	// GPX import: handed off to ImageDropzone's FAB picker, which forwards
	// any `.gpx` file in the picked set here. Imported route REPLACES the
	// current draft, so confirm first when there's existing work.
	async function importGpxFile(file: File) {
		if (
			builder.waypoints.length > 0 &&
			!confirm(
				'Bestehenden Entwurf durch importierte GPX ersetzen? Aktuelle Wegpunkte gehen verloren.'
			)
		) {
			return;
		}
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

	// --- Prev / next waypoint navigation -------------------------------------
	// Derived list of placed-only waypoints (the only ones that can sit on the
	// map). The nav bar walks this list in display order so jumping with
	// chevrons follows the table's numbering.
	const placedWaypoints = $derived(builder.waypoints.filter((w) => !w.unplaced));

	const focusedIdx = $derived.by(() => {
		if (!mapView.focusId) return -1;
		return placedWaypoints.findIndex((w) => w.id === mapView.focusId);
	});

	function focusByIdx(idx: number) {
		const wp = placedWaypoints[idx];
		if (!wp) return;
		focusWaypoint(wp.id);
	}

	function focusPrev() {
		if (placedWaypoints.length === 0) return;
		if (focusedIdx <= 0) {
			// No focus yet, or already at first → land on the last waypoint
			// (typical "step backwards through the route" intent).
			focusByIdx(focusedIdx === -1 ? placedWaypoints.length - 1 : 0);
			return;
		}
		focusByIdx(focusedIdx - 1);
	}

	function focusNext() {
		if (placedWaypoints.length === 0) return;
		if (focusedIdx === -1) {
			focusByIdx(0);
			return;
		}
		if (focusedIdx >= placedWaypoints.length - 1) {
			focusByIdx(placedWaypoints.length - 1);
			return;
		}
		focusByIdx(focusedIdx + 1);
	}

	function refocus() {
		// Re-center the map on the currently focused waypoint (handy after
		// the user pans away).
		if (focusedIdx === -1) focusByIdx(0);
		else focusByIdx(focusedIdx);
	}

	// Keyboard shortcuts for power users: ← / → step through waypoints
	// (when not focused on an input).
	function onKey(e: KeyboardEvent) {
		const target = e.target as HTMLElement | null;
		if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
		if (target?.isContentEditable) return;
		if (e.key === 'ArrowLeft') {
			e.preventDefault();
			focusPrev();
		} else if (e.key === 'ArrowRight') {
			e.preventDefault();
			focusNext();
		}
	}
</script>

<svelte:window onkeydown={onKey} />

<Seo title="Routen-Builder · Wanderungen" description="Eigene Wanderrouten erstellen, exportieren und teilen." lang="de" />

<svelte:head>
	<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
	<link rel="preconnect" href="https://wmts.geo.admin.ch" crossorigin="anonymous" />
</svelte:head>

<section class="builder">
	<header class="header">
		<div class="header-primary">
			<input
				class="name-input"
				type="text"
				placeholder="Name der Tour…"
				bind:value={builder.name}
			/>
			<button
				type="button"
				class="download-cta"
				onclick={downloadGpx}
				disabled={busy}
				title={busy ? 'Warten bis Route + Höhenprofil berechnet sind' : 'GPX herunterladen'}
			>
				<Download size={16} strokeWidth={2.2} />
				<span>GPX herunterladen</span>
			</button>
			<button
				type="button"
				class="reset-btn"
				onclick={clearDraft}
				aria-label="Entwurf zurücksetzen"
				title="Entwurf zurücksetzen"
			>
				<RotateCcw size={16} strokeWidth={2} />
			</button>
		</div>
		<div class="header-settings">
			<div class="setting">
				<span class="setting-label">Routing</span>
				<select
					class="profile-select"
					bind:value={builder.profile}
					disabled={!builder.autoSnap}
				>
					<option value="hiking-mountain">Wandern (Berg)</option>
					<option value="trekking">Trekking</option>
					<option value="road">Strasse</option>
				</select>
			</div>
			<div class="setting setting-toggle">
				<Toggle bind:checked={builder.autoSnap} label="Auf Wege snappen" />
			</div>
			<!-- Mode-agnostic snap status. Spinner while the route or
			     elevation profile is still resolving; subtle check when idle. -->
			<span class="snap-status" class:busy aria-live="polite" aria-atomic="true">
				{#if busy}
					<LoaderCircle size={14} strokeWidth={2.4} class="spin" />
					<span>Berechne Route + Höhenprofil…</span>
				{:else}
					<CheckCircle2 size={14} strokeWidth={2} />
					<span>Bereit</span>
				{/if}
			</span>
		</div>
	</header>

	<RouteStatsBar {busy} />

	{#if error}
		<p class="err">{error}</p>
	{/if}

	<div class="map-row">
		<div class="map-stage">
			<EditMap
				{pendingPlacementId}
				onPlacementCancel={cancelPlacement}
				onPlacementComplete={cancelPlacement}
			/>
			{#if placedWaypoints.length > 0}
				<div class="map-nav" role="group" aria-label="Wegpunkt-Navigation">
					<button
						type="button"
						onclick={focusPrev}
						aria-label="Vorheriger Wegpunkt"
						title="Vorheriger Wegpunkt (←)"
					>
						<ChevronLeft size={18} strokeWidth={2.2} />
					</button>
					<span class="map-nav-label" aria-live="polite">
						{focusedIdx === -1 ? '–' : focusedIdx + 1}
						<span class="sep">/</span>
						{placedWaypoints.length}
					</span>
					<button
						type="button"
						class="recenter"
						onclick={refocus}
						aria-label="Auf aktuellen Wegpunkt zentrieren"
						title="Zentrieren"
					>
						<Crosshair size={16} strokeWidth={2.2} />
					</button>
					<button
						type="button"
						onclick={focusNext}
						aria-label="Nächster Wegpunkt"
						title="Nächster Wegpunkt (→)"
					>
						<ChevronRight size={18} strokeWidth={2.2} />
					</button>
				</div>
			{/if}
		</div>
		<div class="side-col">
			{#if placedWaypoints.length > 0}
				<nav class="step-nav" aria-label="Zwischen Wegpunkten wechseln">
					<button
						type="button"
						onclick={focusPrev}
						disabled={focusedIdx === 0}
						aria-label="Vorheriger Wegpunkt"
					>
						<ChevronLeft size={16} strokeWidth={2} />
						<span>Zurück</span>
					</button>
					<span class="step-pos">
						{focusedIdx === -1 ? '–' : focusedIdx + 1}
						<span class="sep">/</span>
						{placedWaypoints.length}
					</span>
					<button
						type="button"
						onclick={focusNext}
						disabled={focusedIdx === placedWaypoints.length - 1}
						aria-label="Nächster Wegpunkt"
					>
						<span>Weiter</span>
						<ChevronRight size={16} strokeWidth={2} />
					</button>
				</nav>
			{/if}
			<WaypointDetailPanel onCancelPlacement={cancelPlacement} />
		</div>
	</div>

	<WaypointTable
		{pendingPlacementId}
		onRequestPlacement={startPlacement}
		onCancelPlacement={cancelPlacement}
	/>

	<p class="hint">
		Tipp: Klicke auf die Karte, um Wegpunkte hinzuzufügen. Bilder mit GPS-EXIF werden
		automatisch als Wegpunkte verwendet. Mit den Pfeiltasten ← → kannst du die Wegpunkte
		nacheinander auf der Karte anspringen. Der GPX-Export bleibt lokal — eine
		Veröffentlichung als Wandereintrag erfordert einen Commit der Dateien unter
		<code>src/content/hikes/&lt;slug&gt;/</code>.
	</p>
</section>

<!-- FAB lives outside .builder so its fixed-positioning doesn't add a
     phantom flex item / gap to the page's vertical flow. -->
<ImageDropzone onGpxImport={importGpxFile} />

<style>
	.builder {
		max-width: 1400px;
		margin-inline: auto;
		padding: 1rem 1rem 3rem;
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}

	.header {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
		margin: 0;
	}

	/* Primary row: name input is the dominant element; download is the
	 * single primary CTA; reset is an icon-only escape hatch. */
	.header-primary {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.name-input {
		flex: 1 1 auto;
		min-width: 0;
		font-size: 1.35rem;
		font-weight: 600;
		padding: 0.55rem 0.85rem;
		background: var(--color-bg-tertiary);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		color: var(--color-text-primary);
	}

	.name-input:focus {
		outline: none;
		border-color: var(--color-primary);
		box-shadow: 0 0 0 3px color-mix(in oklab, var(--color-primary) 20%, transparent);
	}

	.download-cta {
		appearance: none;
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
		font: inherit;
		font-size: 0.9rem;
		font-weight: 600;
		padding: 0.55rem 1rem;
		border-radius: var(--radius-pill);
		border: 1px solid var(--color-primary);
		background: var(--color-primary);
		color: var(--color-text-on-primary);
		cursor: pointer;
		transition: background var(--transition-fast), transform var(--transition-fast),
			box-shadow var(--transition-fast);
		flex-shrink: 0;
	}

	.download-cta:hover:not(:disabled) {
		background: var(--color-primary-hover, var(--color-primary));
		transform: translateY(-1px);
		box-shadow: 0 0.4em 1em -0.4em color-mix(in oklab, var(--color-primary) 65%, transparent);
	}

	.download-cta:disabled {
		opacity: 0.55;
		cursor: not-allowed;
	}

	.reset-btn {
		appearance: none;
		background: transparent;
		border: 1px solid var(--color-border);
		color: var(--color-text-tertiary);
		padding: 0.5rem;
		border-radius: 50%;
		cursor: pointer;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		transition: color var(--transition-fast), border-color var(--transition-fast),
			background var(--transition-fast);
		flex-shrink: 0;
	}

	.reset-btn:hover {
		color: var(--red);
		border-color: color-mix(in oklab, var(--red) 35%, var(--color-border));
		background: color-mix(in oklab, var(--red) 8%, transparent);
	}

	/* Secondary row: routing settings grouped on the left, live snap
	 * status on the right. Quieter than the primary row by design. */
	.header-settings {
		display: flex;
		align-items: center;
		gap: 1.25rem;
		flex-wrap: wrap;
		padding: 0.25rem 0.15rem 0;
	}

	.setting {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
	}

	.setting-label {
		font-size: 0.72rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-text-tertiary);
		font-weight: 600;
	}

	.profile-select {
		appearance: none;
		font: inherit;
		font-size: 0.85rem;
		padding: 0.35rem 1.85rem 0.35rem 0.7rem;
		background: var(--color-bg-tertiary)
			url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2381a1c1' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'/></svg>")
			no-repeat right 0.55rem center;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		color: var(--color-text-primary);
		cursor: pointer;
	}

	.profile-select:disabled {
		opacity: 0.55;
		cursor: not-allowed;
	}

	.setting-toggle :global(.toggle-wrapper label) {
		font-size: 0.85rem;
		gap: 0.55rem;
	}

	.snap-status {
		margin-left: auto;
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.8rem;
		color: var(--color-text-tertiary);
		font-variant-numeric: tabular-nums;
	}

	.snap-status :global(svg) {
		color: var(--green);
		flex-shrink: 0;
	}

	.snap-status.busy {
		color: var(--color-text-secondary);
	}

	.snap-status.busy :global(svg) {
		color: var(--color-primary);
	}

	.snap-status :global(.spin) {
		animation: snap-spin 0.85s linear infinite;
	}

	@keyframes snap-spin {
		to { transform: rotate(360deg); }
	}

	@media (prefers-reduced-motion: reduce) {
		.snap-status :global(.spin) {
			animation: none;
		}
	}

	.map-row {
		display: grid;
		grid-template-columns: minmax(0, 2.2fr) minmax(280px, 1fr);
		gap: 1rem;
		align-items: start;
	}

	@media (max-width: 1024px) {
		.map-row {
			grid-template-columns: 1fr;
		}
	}

	.map-stage {
		position: relative;
		min-width: 0;
	}

	.side-col {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		min-width: 0;
	}

	/* Stand-alone Zurück/Weiter slider sitting above the detail-panel card,
	 * not inside it — gives the user the same step controls as the floating
	 * map-nav, but with full labels in the side column. */
	.step-nav {
		display: grid;
		grid-template-columns: 1fr auto 1fr;
		gap: 0.3rem;
		align-items: center;
		padding: 0.3rem;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-pill);
		box-shadow: var(--shadow-sm);
	}

	.step-nav button {
		appearance: none;
		background: transparent;
		border: 0;
		color: var(--color-text-primary);
		font: inherit;
		font-size: 0.85rem;
		padding: 0.4rem 0.75rem;
		border-radius: var(--radius-pill);
		cursor: pointer;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.3rem;
	}

	.step-nav button:first-child {
		justify-self: start;
	}

	.step-nav button:last-child {
		justify-self: end;
	}

	.step-nav button:hover:not(:disabled) {
		background: var(--color-bg-elevated);
	}

	.step-nav button:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.step-pos {
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--color-text-secondary);
		font-variant-numeric: tabular-nums;
		min-width: 3.2rem;
		text-align: center;
	}

	.step-pos .sep {
		color: var(--color-text-tertiary);
		margin: 0 0.2rem;
		font-weight: 400;
	}

	/* Floating prev/next navigator anchored to the top-right of the map.
	 * Sits above Leaflet's own zoom controls (z-index 1000); we use 600 to
	 * stay above markers/polylines (400) but below modal-ish UI. */
	.map-nav {
		position: absolute;
		top: 0.75rem;
		right: 0.75rem;
		z-index: 600;
		display: inline-flex;
		align-items: center;
		gap: 0.1rem;
		padding: 0.25rem;
		background: color-mix(in oklab, var(--color-surface) 92%, transparent);
		backdrop-filter: blur(8px);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-pill);
		box-shadow: var(--shadow-md);
		font: inherit;
	}

	.map-nav button {
		appearance: none;
		background: transparent;
		border: 0;
		color: var(--color-text-primary);
		width: 2rem;
		height: 2rem;
		border-radius: 50%;
		cursor: pointer;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		transition: background var(--transition-fast), color var(--transition-fast);
	}

	.map-nav button:hover {
		background: var(--color-bg-elevated);
	}

	.map-nav button:focus-visible {
		outline: 2px solid var(--color-primary);
		outline-offset: 2px;
	}

	.map-nav button.recenter {
		color: var(--blue);
	}

	.map-nav-label {
		padding: 0 0.4rem;
		font-size: 0.85rem;
		font-weight: 600;
		font-variant-numeric: tabular-nums;
		color: var(--color-text-primary);
		min-width: 3.2rem;
		text-align: center;
	}

	.map-nav-label .sep {
		color: var(--color-text-tertiary);
		margin: 0 0.15rem;
		font-weight: 400;
	}

	.err {
		margin: 0;
		padding: 0.5rem 0.75rem;
		background: color-mix(in oklab, var(--red) 12%, transparent);
		color: var(--red);
		border-radius: var(--radius-md);
	}

	.hint {
		margin-top: 0.25rem;
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
