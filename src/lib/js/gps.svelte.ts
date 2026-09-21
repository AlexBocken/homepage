/**
 * GPS tracking utility for Tauri Android shell.
 * Uses native Android LocationForegroundService for GPS collection
 * (survives screen-off), with JS polling to pull points into the UI.
 * Falls back to a no-op tracker in the browser.
 *
 * The native service owns the route: it keeps every point and writes them to disk.
 * This module is only a view of it, and can re-attach at any moment — after a page
 * reload, after the app was swiped away, after Android killed the process. It used to
 * be the other way round (the page drained native and held the only copy), which is
 * how a reload mid-run lost the whole workout.
 */

export interface GpsPoint {
	lat: number;
	lng: number;
	altitude?: number;
	speed?: number;
	cadence?: number; // steps per minute, from step detector sensor
	timestamp: number;
}

export interface IntervalStep {
	type?: 'step';
	label: string;
	durationType: 'distance' | 'time';
	durationValue: number; // meters (distance) or seconds (time)
}

export interface IntervalGroup {
	type: 'group';
	repeat: number;
	steps: IntervalStep[];
}

export type IntervalEntry = IntervalStep | IntervalGroup;

/** Expand groups (repeat × steps) into a flat step list for the native bridge. */
export function flattenIntervals(entries: IntervalEntry[]): IntervalStep[] {
	const out: IntervalStep[] = [];
	for (const e of entries) {
		if ((e as IntervalGroup).type === 'group') {
			const g = e as IntervalGroup;
			for (let i = 0; i < g.repeat; i++) {
				for (const s of g.steps) {
					out.push({ label: s.label, durationType: s.durationType, durationValue: s.durationValue });
				}
			}
		} else {
			const s = e as IntervalStep;
			out.push({ label: s.label, durationType: s.durationType, durationValue: s.durationValue });
		}
	}
	return out;
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
	hasActivityRecognitionPermission?: () => boolean;
	// Added with the durable-session build. The site deploys independently of the APK,
	// so an older app may lack any of these — always feature-detect.
	getPointsSince?: (index: number) => string;
	getSessionState?: () => string;
	resumeLocationService?: () => void;
	discardSession?: () => void;
	isIgnoringBatteryOptimizations?: () => boolean;
	requestIgnoreBatteryOptimizations?: () => void;
}

/** What native reports about its session — see AndroidBridge.getSessionState(). */
export interface NativeSessionState {
	/** The service is running right now. */
	tracking: boolean;
	/** No service, but a session is on disk and can be resumed. */
	recoverable: boolean;
	/** Running only as the pre-start map preview; nothing recorded yet. */
	prestart: boolean;
	paused: boolean;
	sessionId: string;
	startTimeMs: number;
	pointCount: number;
	totalDistanceKm: number;
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
	let _prestart = $state(false);

	/** Native's view of its session, or null in a browser / on an older app build. */
	function nativeState(): NativeSessionState | null {
		const bridge = getAndroidBridge();
		if (!bridge || typeof bridge.getSessionState !== 'function') return null;
		try {
			return JSON.parse(bridge.getSessionState());
		} catch {
			return null;
		}
	}

	function startPolling() {
		if (_pollTimer !== null) return;
		_pollTimer = setInterval(pollPoints, POLL_INTERVAL_MS);
	}

	/**
	 * Adopt whatever session native already has: re-read its whole route and carry on
	 * polling. Asks native to resume from disk first when the service itself is gone.
	 * Returns true when this tracker is now following a native session.
	 */
	function attach(): boolean {
		const bridge = getAndroidBridge();
		const state = nativeState();
		if (!bridge || !state || typeof bridge.getPointsSince !== 'function') return false;
		if (!state.tracking && !state.recoverable) return false;

		// Not a pre-start preview: (re)assert the service from the foreground. That
		// resumes it from disk if the process was killed, and restores location access
		// if the system had restarted it in the background.
		if (!state.prestart) {
			try { bridge.resumeLocationService?.(); } catch { /* keep what we can read */ }
		}

		try {
			track = JSON.parse(bridge.getPointsSince(0));
		} catch {
			track = [];
		}
		_prestart = state.prestart;
		isTracking = true;
		startPolling();
		// A resume from disk happens on native's main thread, a moment after the call
		// above returns — read again shortly rather than waiting out a full poll.
		if (state.recoverable) setTimeout(pollPoints, 600);
		_debugMsg = `attached: pts:${track.length}`;
		return true;
	}

	function pollPoints() {
		const bridge = getAndroidBridge();
		if (!bridge) return;
		try {
			// By index where the app supports it — the read that cannot lose points.
			const json = typeof bridge.getPointsSince === 'function'
				? bridge.getPointsSince(track.length)
				: bridge.getPoints();
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

		// Native is already recording a real session this tracker lost sight of: follow
		// it. Starting again would reset its distance and clock to zero.
		const existing = nativeState();
		if (existing && !existing.prestart && (existing.tracking || existing.recoverable) && attach()) {
			return true;
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
			_prestart = startPaused;

			// Start native Android foreground service — it does its own GPS tracking
			const bridge = getAndroidBridge();
			if (bridge) {
				_debugMsg = 'starting native GPS service...';
				const ttsConfig = JSON.stringify(voiceGuidance ?? {});
				bridge.startLocationService(ttsConfig, startPaused);
				// Poll the native side for collected points
				startPolling();
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
		_prestart = false;
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
		// Native leaves pre-start on its first resume; follow it.
		if (_prestart) _prestart = nativeState()?.prestart ?? false;
	}

	/** Throw away a native session nobody wants back (orphan prompt → discard). */
	function discardNative(): void {
		if (_pollTimer !== null) {
			clearInterval(_pollTimer);
			_pollTimer = null;
		}
		try { getAndroidBridge()?.discardSession?.(); } catch { /* nothing to discard */ }
		track = [];
		isTracking = false;
		_prestart = false;
		_intervalState = null;
	}

	/** True when exempt from battery optimisation, or when that cannot be asked
	 *  (browser, older app) — in which case there is nothing to nag about. */
	function batteryExempt(): boolean {
		const bridge = getAndroidBridge();
		if (!bridge || typeof bridge.isIgnoringBatteryOptimizations !== 'function') return true;
		try { return bridge.isIgnoringBatteryOptimizations(); } catch { return true; }
	}

	function requestBatteryExemption(): void {
		try { getAndroidBridge()?.requestIgnoreBatteryOptimizations?.(); } catch { /* unsupported */ }
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

	function cadenceAvailable(): boolean {
		const bridge = getAndroidBridge();
		// No bridge (e.g. browser) or older build lacking the check: assume ok, don't nag.
		if (!bridge || typeof bridge.hasActivityRecognitionPermission !== 'function') return true;
		try { return bridge.hasActivityRecognitionPermission(); } catch { return true; }
	}

	// Adopt a session native is already running. Synchronous on purpose: pages read
	// `isTracking` while their script initialises, before any onMount.
	attach();

	return {
		get track() { return track; },
		get isTracking() { return isTracking; },
		/** Tracking only as the pre-start map preview — nothing recorded yet. */
		get prestart() { return _prestart; },
		nativeState,
		attach,
		discardNative,
		batteryExempt,
		requestBatteryExemption,
		get distance() { return distance; },
		get currentSpeed() { return currentSpeed; },
		get currentPace() { return currentPace; },
		get latestPoint() { return latestPoint; },
		get available() { return checkTauri(); },
		get debug() { return _debugMsg; },
		get intervalState() { return _intervalState; },
		cadenceAvailable,
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
