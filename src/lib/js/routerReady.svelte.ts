import { afterNavigate } from '$app/navigation';

/**
 * Whether SvelteKit's client router has started, for effects that keep the
 * address bar in step with page state via `replaceState`. Until it has,
 * `replaceState` throws ("before router is initialized"), and an effect that
 * throws on its first run is torn down, so the URL would stop following the
 * page for good. `afterNavigate` fires once the router is up, the initial
 * load included. Call during component init.
 */
export function createRouterReady() {
	let ready = $state(false);
	afterNavigate(() => {
		ready = true;
	});
	return {
		get ready() {
			return ready;
		}
	};
}
