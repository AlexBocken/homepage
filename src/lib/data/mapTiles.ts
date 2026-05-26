/**
 * Map tile sources for the hikes maps.
 *
 * Tiles are served through the region-switching caching proxy (see
 * `tile-proxy/`), which transparently picks swisstopo inside Switzerland and
 * global providers (OpenTopoMap / Esri) elsewhere. The app just uses one
 * canonical scheme and never talks to the providers directly.
 *
 * To point back at swisstopo directly (e.g. local dev without the proxy),
 * change `TILE_BASE` here — it's the single switch.
 */
export const TILE_BASE = 'https://maps.bocken.org';

export const TILE_URL = {
	/** Schematic / topographic ("Karte"). */
	karte: `${TILE_BASE}/karte/{z}/{x}/{y}`,
	/** Satellite ("Luftbild"). */
	luftbild: `${TILE_BASE}/luftbild/{z}/{x}/{y}`,
	/** Historical Dufour map — Switzerland only. */
	dufour: `${TILE_BASE}/dufour/{z}/{x}/{y}`
} as const;

/** Combined attribution — the proxy may serve any provider depending on the
 * region in view, so all are credited. Shown in the page footer (the on-map
 * control is disabled). Thunderforest is the primary `karte` upstream abroad
 * when the proxy was built with a `THUNDERFOREST_API_KEY`; OpenTopoMap is
 * the no-key fallback. Both are credited so the attribution stays correct
 * regardless of which build is deployed. */
export const TILE_ATTRIBUTION =
	'&copy; <a href="https://www.swisstopo.admin.ch/" target="_blank" rel="noopener">swisstopo</a> · ' +
	'Maps &copy; <a href="https://www.thunderforest.com/" target="_blank" rel="noopener">Thunderforest</a>, ' +
	'Data &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> · ' +
	'<a href="https://opentopomap.org/" target="_blank" rel="noopener">OpenTopoMap</a> · ' +
	'&copy; <a href="https://www.esri.com/" target="_blank" rel="noopener">Esri</a>';
