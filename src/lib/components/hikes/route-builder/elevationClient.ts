/**
 * Single-point Swisstopo elevation lookup for the route-builder.
 * Image GPS altitude (EXIF GPSAltitude) is unreliable and causes spikes in the
 * elevation profile, so all waypoints — including image-derived ones — should
 * source their altitude from the terrain model instead.
 */
export async function fetchElevationAt(lat: number, lng: number): Promise<number | null> {
	try {
		const res = await fetch(`/api/hikes/route-builder/elevation?lat=${lat}&lng=${lng}`);
		if (!res.ok) return null;
		const { elevation } = (await res.json()) as { elevation: number | null };
		return typeof elevation === 'number' ? elevation : null;
	} catch {
		return null;
	}
}
