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
		reconcileSegments
	} from '$lib/components/hikes/route-builder/builderStore.svelte';

	let busy = $state(false);
	let error = $state<string | null>(null);
	let routeRequestId = 0;

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

			// If routing didn't return elevations, enrich via Swisstopo.
			const flat = data.segments.flat();
			const needsElevation = flat.some((p) => typeof p[2] !== 'number');
			if (needsElevation) {
				const elevRes = await fetch('/api/hikes/route-builder/elevation', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ coordinates: flat.map((p) => [p[0], p[1]]) })
				});
				if (reqId !== routeRequestId) return;
				if (elevRes.ok) {
					const elevData = (await elevRes.json()) as { elevations: (number | null)[] };
					setElevations(elevData.elevations);
				}
			}
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
				// Keep whatever was already snapped. Cancel any in-flight request so
				// a late response doesn't overwrite the linear placeholders we just
				// reconciled.
				routeRequestId++;
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
				<span>Auf Wege snappen{busy ? ' …' : ''}</span>
			</label>
			<button type="button" class="primary" onclick={downloadGpx}>
				GPX herunterladen
			</button>
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
