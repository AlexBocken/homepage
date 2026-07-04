/** A geocoding hit from the route-builder location search (Photon-backed). */
export interface GeoResult {
	/** Human-readable "Name, City, State, Country". */
	label: string;
	lat: number;
	lon: number;
	/** Photon bounding box `[minLon, maxLat, maxLon, minLat]`, when available. */
	extent: [number, number, number, number] | null;
}
