import type * as Leaflet from 'leaflet';

/**
 * The reader's own position on the hikes maps: whether it is shown, and drawing
 * it. Shared by the detail and overview maps so the toggle behaves the same on
 * both — and, through the storage key, carries over from one to the other.
 */

export const GPS_STORAGE_KEY = 'hikes:gpsEnabled';

const isTauri = () => typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

/**
 * Where the choice is kept. Off on every visit: a page must not ask for the
 * reader's position on arrival. The choice is kept for the rest of the tab
 * (sessionStorage), so moving between the overview and a hike keeps the marker;
 * only the app, which is a hiking companion, remembers it across launches.
 */
export function gpsStore(): Storage | null {
	if (typeof window === 'undefined') return null;
	return isTauri() ? window.localStorage : window.sessionStorage;
}

/**
 * The locate button's next state. `unavailable` means the reader asked for their
 * position and there is no way to get it; `null` means nothing changes (no
 * window to ask).
 */
export function toggleLocation(enabled: boolean): { enabled: boolean; unavailable: boolean } | null {
	if (enabled) return { enabled: false, unavailable: false };
	if (typeof window === 'undefined') return null;
	if (!isTauri() && !('geolocation' in navigator)) return { enabled: false, unavailable: true };
	return { enabled: true, unavailable: false };
}

const WATCH_OPTIONS = { enableHighAccuracy: true, maximumAge: 5000, timeout: 10_000 };

/**
 * Follow the reader's position on `map` with a dot and an accuracy circle.
 * The app asks its geolocation plugin; a browser — or the app without the
 * plugin — uses the web API. Returns the function that stops watching and
 * takes the dot and circle off the map.
 */
export function watchUserLocation(L: typeof Leaflet, map: Leaflet.Map): () => void {
	let marker: Leaflet.CircleMarker | null = null;
	let circle: Leaflet.Circle | null = null;
	let stopWatch: (() => void) | undefined;
	let stopped = false;

	const show = (lat: number, lng: number, accuracy: number) => {
		if (!marker) {
			marker = L.circleMarker([lat, lng], {
				radius: 7,
				fillColor: '#5e81ac',
				fillOpacity: 1,
				color: '#fff',
				weight: 2
			}).addTo(map);
			circle = L.circle([lat, lng], {
				radius: accuracy,
				color: '#5e81ac',
				fillColor: '#5e81ac',
				fillOpacity: 0.1,
				weight: 1
			}).addTo(map);
		} else {
			marker.setLatLng([lat, lng]);
			circle?.setLatLng([lat, lng]);
			circle?.setRadius(accuracy);
		}
	};

	const watchWeb = () => {
		if (!('geolocation' in navigator)) return;
		const id = navigator.geolocation.watchPosition(
			(pos) => show(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy),
			() => {},
			WATCH_OPTIONS
		);
		stopWatch = () => navigator.geolocation.clearWatch(id);
	};

	if (isTauri()) {
		(async () => {
			try {
				const geo = await import('@tauri-apps/plugin-geolocation');
				const watchId = await geo.watchPosition(WATCH_OPTIONS, (pos) => {
					if (pos?.coords) show(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy ?? 30);
				});
				const clear = () => geo.clearWatch(watchId).catch(() => {});
				// Switched off while the plugin was still starting up.
				if (stopped) clear();
				else stopWatch = clear;
			} catch {
				/* Tauri plugin unavailable — fall through to web API */
			}
			if (!stopWatch && !stopped) watchWeb();
		})();
	} else {
		watchWeb();
	}

	return () => {
		stopped = true;
		stopWatch?.();
		stopWatch = undefined;
		marker?.remove();
		circle?.remove();
		marker = null;
		circle = null;
	};
}
