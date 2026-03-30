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

export interface IntervalStep {
	label: string;
	durationType: 'distance' | 'time';
	durationValue: number; // meters (distance) or seconds (time)
}

export interface VoiceGuidanceConfig {
	enabled: boolean;
	triggerType: 'distance' | 'time';
	triggerValue: number;
	metrics: string[];
	language: string;
	voiceId?: string;
	ttsVolume?: number; // 0.0–1.0, relative TTS volume
	audioDuck?: boolean; // duck other audio during TTS
	intervals?: IntervalStep[];
}

export interface IntervalState {
	currentIndex: number;
	totalSteps: number;
	currentLabel: string;
	progress: number; // 0.0–1.0
	complete: boolean;
}

interface AndroidBridge {
	startLocationService(ttsConfigJson: string, startPaused: boolean): void;
	stopLocationService(): void;
	getPoints(): string;
	isTracking(): boolean;
	getAvailableTtsVoices(): string;
	hasTtsEngine(): boolean;
	installTtsEngine(): void;
	pauseTracking(): void;
	resumeTracking(): void;
	getIntervalState(): string;
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
	let _intervalState = $state<IntervalState | null>(null);

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
		// Poll interval state
		try {
			const stateJson = bridge.getIntervalState();
			if (stateJson && stateJson !== '{}') {
				_intervalState = JSON.parse(stateJson);
			}
		} catch { /* no interval active */ }
	}

	async function start(voiceGuidance?: VoiceGuidanceConfig, startPaused = false) {
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
				const ttsConfig = JSON.stringify(voiceGuidance ?? {});
				bridge.startLocationService(ttsConfig, startPaused);
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
		_intervalState = null;
		const result = [...track];
		return result;
	}

	function reset() {
		track = [];
		_intervalState = null;
	}

	function getAvailableTtsVoices(): Array<{ id: string; name: string; language: string }> {
		const bridge = getAndroidBridge();
		if (!bridge) return [];
		try {
			return JSON.parse(bridge.getAvailableTtsVoices());
		} catch {
			return [];
		}
	}

	function hasTtsEngine(): boolean {
		const bridge = getAndroidBridge();
		if (!bridge) return false;
		return bridge.hasTtsEngine();
	}

	function installTtsEngine(): void {
		const bridge = getAndroidBridge();
		bridge?.installTtsEngine();
	}

	function pauseTracking(): void {
		const bridge = getAndroidBridge();
		bridge?.pauseTracking();
	}

	function resumeTracking(): void {
		const bridge = getAndroidBridge();
		bridge?.resumeTracking();
	}

	/** Request location permissions without starting the tracking service.
	 *  Returns true if permissions were granted. */
	async function ensurePermissions(): Promise<boolean> {
		if (!checkTauri()) return false;
		try {
			const geo = await import('@tauri-apps/plugin-geolocation');
			let perms = await geo.checkPermissions();
			if (perms.location !== 'granted') {
				perms = await geo.requestPermissions(['location']);
			}
			return perms.location === 'granted';
		} catch {
			return false;
		}
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
		get intervalState() { return _intervalState; },
		start,
		stop,
		reset,
		getAvailableTtsVoices,
		hasTtsEngine,
		installTtsEngine,
		pauseTracking,
		resumeTracking,
		ensurePermissions
	};
}

let _instance: ReturnType<typeof createGpsTracker> | null = null;

export function getGpsTracker() {
	if (!_instance) {
		_instance = createGpsTracker();
	}
	return _instance;
}
