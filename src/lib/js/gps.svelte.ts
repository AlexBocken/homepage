/**
 * GPS tracking utility for Tauri Android shell.
 * Uses native Android LocationForegroundService for GPS collection
 * (survives screen-off), with JS polling to pull points into the UI.
 * Falls back to a no-op tracker in the browser.
 */

export interface GpsPoint {
	lat: number;
	lng: number;
	altitude?: number;
	speed?: number;
	timestamp: number;
}

interface AndroidBridge {
	startLocationService(): void;
	stopLocationService(): void;
	getPoints(): string;
	isTracking(): boolean;
}

function checkTauri(): boolean {
	return typeof window !== 'undefined' && '__TAURI__' in window;
}

function getAndroidBridge(): AndroidBridge | null {
	if (typeof window !== 'undefined' && 'AndroidBridge' in window) {
		return (window as any).AndroidBridge;
	}
	return null;
}


/** Haversine distance in km between two points */
function haversine(a: GpsPoint, b: GpsPoint): number {
	const R = 6371;
	const dLat = ((b.lat - a.lat) * Math.PI) / 180;
	const dLng = ((b.lng - a.lng) * Math.PI) / 180;
	const sinLat = Math.sin(dLat / 2);
	const sinLng = Math.sin(dLng / 2);
	const h =
		sinLat * sinLat +
		Math.cos((a.lat * Math.PI) / 180) *
			Math.cos((b.lat * Math.PI) / 180) *
			sinLng * sinLng;
	return 2 * R * Math.asin(Math.sqrt(h));
}

/** Compute total distance from a track */
export function trackDistance(track: GpsPoint[]): number {
	let total = 0;
	for (let i = 1; i < track.length; i++) {
		total += haversine(track[i - 1], track[i]);
	}
	return total;
}

const POLL_INTERVAL_MS = 3000;

export function createGpsTracker() {
	let track = $state<GpsPoint[]>([]);
	let isTracking = $state(false);
	let _pollTimer: ReturnType<typeof setInterval> | null = null;

	const distance = $derived(trackDistance(track));
	const currentSpeed = $derived(
		track.length > 0 ? (track[track.length - 1].speed ?? 0) : 0
	);
	const currentPace = $derived.by(() => {
		if (track.length < 2) return 0;
		const a = track[track.length - 2];
		const b = track[track.length - 1];
		const d = haversine(a, b);
		const dt = (b.timestamp - a.timestamp) / 60000;
		if (d < 0.001) return 0;
		return dt / d;
	});
	const latestPoint = $derived(
		track.length > 0 ? track[track.length - 1] : null
	);

	let _debugMsg = $state('');

	function pollPoints() {
		const bridge = getAndroidBridge();
		if (!bridge) return;
		try {
			const json = bridge.getPoints();
			const points: GpsPoint[] = JSON.parse(json);
			if (points.length > 0) {
				track = [...track, ...points];
				const last = points[points.length - 1];
				_debugMsg = `pts:${track.length} lat:${last.lat.toFixed(4)} lng:${last.lng.toFixed(4)}`;
			}
		} catch (e) {
			_debugMsg = `poll err: ${(e as Error)?.message ?? e}`;
		}
	}

	async function start() {
		_debugMsg = 'starting...';
		if (!checkTauri() || isTracking) {
			_debugMsg = `bail: tauri=${checkTauri()} tracking=${isTracking}`;
			return false;
		}

		try {
			// Still use the Tauri plugin to request permissions (it has the proper Android permission flow)
			_debugMsg = 'importing plugin...';
			const geo = await import('@tauri-apps/plugin-geolocation');
			_debugMsg = 'checking perms...';

			let perms = await geo.checkPermissions();
			_debugMsg = `perms: ${JSON.stringify(perms)}`;
			if (perms.location !== 'granted') {
				_debugMsg = 'requesting perms...';
				perms = await geo.requestPermissions(['location']);
				_debugMsg = `after req: ${JSON.stringify(perms)}`;
			}
			if (perms.location !== 'granted') {
				_debugMsg = `denied: ${JSON.stringify(perms)}`;
				return false;
			}

			track = [];
			isTracking = true;

			// Start native Android foreground service — it does its own GPS tracking
			const bridge = getAndroidBridge();
			if (bridge) {
				_debugMsg = 'starting native GPS service...';
				bridge.startLocationService();
				// Poll the native side for collected points
				_pollTimer = setInterval(pollPoints, POLL_INTERVAL_MS);
				_debugMsg = 'native GPS service started, polling...';
			} else {
				_debugMsg = 'no AndroidBridge — native tracking unavailable';
				isTracking = false;
				return false;
			}

			return true;
		} catch (e) {
			_debugMsg = `error: ${(e as Error)?.message ?? e}`;
			isTracking = false;
			return false;
		}
	}

	async function stop(): Promise<GpsPoint[]> {
		if (!isTracking) return [];

		// Stop polling
		if (_pollTimer !== null) {
			clearInterval(_pollTimer);
			_pollTimer = null;
		}

		// Drain any remaining points from native
		pollPoints();

		// Stop native service
		const bridge = getAndroidBridge();
		if (bridge) {
			bridge.stopLocationService();
		}

		isTracking = false;
		const result = [...track];
		return result;
	}

	function reset() {
		track = [];
	}

	return {
		get track() { return track; },
		get isTracking() { return isTracking; },
		get distance() { return distance; },
		get currentSpeed() { return currentSpeed; },
		get currentPace() { return currentPace; },
		get latestPoint() { return latestPoint; },
		get available() { return checkTauri(); },
		get debug() { return _debugMsg; },
		start,
		stop,
		reset
	};
}

let _instance: ReturnType<typeof createGpsTracker> | null = null;

export function getGpsTracker() {
	if (!_instance) {
		_instance = createGpsTracker();
	}
	return _instance;
}
