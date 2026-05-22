/**
 * Server-side GPX entry point. The parsers themselves are dependency-free
 * and live in `$lib/gpx` (also imported by the browser-side route-builder
 * for the import feature). This shim re-exports them under the historical
 * server-module path so existing callers (build script, fitness API)
 * don't need to change their imports.
 */

export {
	parseGpx,
	parseGpxStages,
	parseGpxImageRefs,
	trackDistance,
	haversineKm as haversine,
	type GpxPoint,
	type GpxStage,
	type GpxImageRef
} from '$lib/gpx';
