/**
 * Shared cursor state for a track-backed view (map + one or more charts).
 *
 * Each surface (map, elevation/pace/cadence chart, …) pushes the hovered track
 * point into `hover.index`; every surface observes the rune via `$effect` to
 * draw the corresponding cursor on its own side. A single shared rune avoids
 * the map↔chart hover-loop bookkeeping that prop wiring would require.
 *
 * `source` records which surface wrote the last update so a receiver can skip
 * redrawing on its own write and prevent feedback loops. It is a free-form
 * string so callers can namespace per chart (`'pace'`, `'elev'`, `'map'`, …).
 *
 * Unlike the hike page — which has exactly one map + one chart and can use a
 * module singleton — a workout can render several independent GPS exercises, so
 * this is a factory: create one store per exercise to keep their cursors apart.
 * The hikes singleton (`$lib/components/hikes/hoverStore`) is built on top of it.
 */

export type TrackHoverSource = string | null;

export interface TrackHoverStore {
	readonly hover: { index: number | null; source: TrackHoverSource };
	setHover(index: number | null, source: TrackHoverSource): void;
	clearHover(): void;
}

export function createTrackHover(): TrackHoverStore {
	const hover = $state<{ index: number | null; source: TrackHoverSource }>({
		index: null,
		source: null
	});
	return {
		get hover() {
			return hover;
		},
		setHover(index, source) {
			hover.index = index;
			hover.source = source;
		},
		clearHover() {
			hover.index = null;
			hover.source = null;
		}
	};
}
