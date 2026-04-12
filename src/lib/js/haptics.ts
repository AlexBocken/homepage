import { createWebHaptics } from 'web-haptics/svelte';

export type HapticPulse = { duration: number; intensity?: number };

type AndroidBridgeShape = {
	forceVibrate?: (durationMs: number, intensityPct: number) => void;
};

function getBridge(): AndroidBridgeShape | undefined {
	if (typeof window === 'undefined') return undefined;
	return (window as unknown as { AndroidBridge?: AndroidBridgeShape }).AndroidBridge;
}

/**
 * Progressively-enhanced haptics: uses the Tauri Android bridge (bypasses silent
 * mode via VibrationAttributes.USAGE_ACCESSIBILITY) when running inside the
 * installed app; falls back to web-haptics in the browser.
 */
export function createHaptics() {
	const web = createWebHaptics();
	const nativeAvailable = typeof getBridge()?.forceVibrate === 'function';

	function trigger(pulse: HapticPulse = { duration: 30, intensity: 0.7 }): void {
		const bridge = getBridge();
		if (bridge?.forceVibrate) {
			bridge.forceVibrate(pulse.duration, Math.round((pulse.intensity ?? 0.7) * 100));
			return;
		}
		web.trigger([pulse]);
	}

	return { trigger, destroy: web.destroy, nativeAvailable };
}
