/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

import { build, files, version } from '$service-worker';

const sw = self as unknown as ServiceWorkerGlobalScope;

// Build/static caches are version-suffixed because their entries are
// hash-fingerprinted — old entries become dead weight after a deploy.
// Pages/images caches use stable names so user-visible content survives
// SW updates; otherwise every deploy wipes the offline shell and forces a
// re-sync before the user can open the app offline again.
const CACHE_BUILD = `cache-build-${version}`;
const CACHE_STATIC = `cache-static-${version}`;
const CACHE_IMAGES = `cache-images-v1`;
const CACHE_PAGES = `cache-pages-v1`;

// Shells precached on install so a fresh user (or one whose pages cache was
// just wiped pre-stabilization) can open the app offline at start_url and
// reach the recipe shell without a prior online visit.
const PRECACHE_SHELLS = [
	'/',
	'/rezepte',
	'/recipes',
	'/rezepte/offline-shell',
	'/recipes/offline-shell',
	'/glaube',
	'/faith',
	'/fitness',
	// Active workout shells precached so a fresh install can log workouts
	// offline immediately without an online visit to /fitness first.
	'/fitness/workout',
	'/fitness/training',
	'/fitness/workout/active',
	'/fitness/training/aktiv'
];

// Assets to precache
const buildAssets = new Set(build);
const staticAssets = new Set(files);

sw.addEventListener('install', (event) => {
	event.waitUntil(
		Promise.all([
			// Cache build assets (JS, CSS)
			caches.open(CACHE_BUILD).then((cache) => cache.addAll(build)),
			// Cache static assets (fonts, etc.) - filter out large files
			caches.open(CACHE_STATIC).then((cache) => {
				const smallStaticFiles = files.filter(
					(file) =>
						!file.endsWith('.json') ||
						file === '/manifest.json'
				);
				return cache.addAll(smallStaticFiles);
			}),
			// Best-effort precache of shell pages — individual failures are
			// non-fatal so a single 5xx can't break SW install.
			caches.open(CACHE_PAGES).then(async (cache) => {
				await Promise.allSettled(
					PRECACHE_SHELLS.map(async (path) => {
						try {
							const res = await fetch(path, { credentials: 'same-origin' });
							if (res.ok) await cache.put(path, res);
						} catch {
							// Network unavailable during install — shell will be cached
							// on first online visit instead.
						}
					})
				);
			})
		]).then(() => {
			// Skip waiting to activate immediately
			sw.skipWaiting();
		})
	);
});

sw.addEventListener('activate', (event) => {
	event.waitUntil(
		caches.keys().then((keys) => {
			return Promise.all(
				keys
					.filter((key) => {
						// Delete only stale build/static caches from prior versions.
						// Stable pages/images caches are kept so offline data persists.
						if (key === CACHE_BUILD || key === CACHE_STATIC) return false;
						if (key === CACHE_IMAGES || key === CACHE_PAGES) return false;
						return key.startsWith('cache-build-') || key.startsWith('cache-static-') ||
							// Old per-version pages/images caches from before stabilization
							key.startsWith('cache-pages-') || key.startsWith('cache-images-');
					})
					.map((key) => caches.delete(key))
			);
		}).then(() => {
			// Take control of all clients immediately
			sw.clients.claim();
		})
	);
});

sw.addEventListener('fetch', (event) => {
	const url = new URL(event.request.url);

	// Only handle same-origin requests
	if (url.origin !== location.origin) return;

	// Skip API requests - let them go to network (IndexedDB handles offline)
	if (url.pathname.startsWith('/api/')) return;

	// Handle SvelteKit __data.json requests for cacheable routes (recipes, glaube, root)
	// Cache successful responses, serve from cache when offline
	const isCacheableDataRoute = url.pathname.includes('__data.json') &&
		(url.pathname.match(/^\/(rezepte|recipes|glaube|faith|fitness|tasks|cospend|expenses)(\/|$)/) || url.pathname === '/__data.json');

	if (isCacheableDataRoute) {
		event.respondWith(
			(async () => {
				const cache = await caches.open(CACHE_PAGES);

				// Create a cache key without query parameters
				// SvelteKit adds ?x-sveltekit-invalidated=... which we need to ignore
				const cacheKey = url.pathname;

				let response: Response | undefined;
				try {
					response = await fetch(event.request);
				} catch {
					// Network unreachable — fall through to cache fallback below.
				}

				// Cache successful responses for offline use (using pathname as key)
				if (response?.ok) {
					cache.put(cacheKey, response.clone());
					return response;
				}

				// Network unreachable OR upstream 5xx (502/503/504 etc.) — serve
				// stale cached data so the PWA stays usable when the origin is down.
				if (!response || response.status >= 500) {
					const cached = await cache.match(cacheKey);
					if (cached) return cached;
				}

				// Pass through non-5xx errors (404, 401, ...) untouched.
				if (response) return response;

				// No response and no cache — synthetic offline error.
				return new Response(JSON.stringify({ error: 'offline' }), {
					status: 503,
					headers: { 'Content-Type': 'application/json' }
				});
			})()
		);
		return;
	}

	// Handle recipe images (thumbnails and full images)
	if (
		url.pathname.startsWith('/static/rezepte/') &&
		(url.pathname.includes('/thumb/') || url.pathname.includes('/full/'))
	) {
		event.respondWith(
			(async () => {
				const cache = await caches.open(CACHE_IMAGES);

				// Try exact match first
				const cached = await cache.match(event.request);
				if (cached) return cached;

				// Try to fetch from network
				try {
					const response = await fetch(event.request);
					if (response.ok) {
						// Cache thumbnails for offline use
						if (url.pathname.includes('/thumb/')) {
							cache.put(event.request, response.clone());
						}
					}
					return response;
				} catch {
					// Network failed - try to serve thumbnail as fallback for full
					if (url.pathname.includes('/full/')) {
						// Extract filename and try to find cached thumbnail
						const filename = url.pathname.split('/').pop();
						if (filename) {
							// Match the absolute origin used by sync.ts — keys are stored
							// as the full URL so cross-origin requests in dev resolve too.
							const thumbUrl = `https://bocken.org/static/rezepte/thumb/${filename}`;
							const thumbCached = await cache.match(thumbUrl);
							if (thumbCached) {
								return thumbCached;
							}
						}
					}

					// No fallback available
					return new Response('', { status: 404 });
				}
			})()
		);
		return;
	}

	// For build assets - cache first
	if (buildAssets.has(url.pathname)) {
		event.respondWith(
			caches.match(event.request).then((cached) => {
				return cached || fetch(event.request);
			})
		);
		return;
	}

	// For static assets - cache first
	if (staticAssets.has(url.pathname)) {
		event.respondWith(
			caches.match(event.request).then((cached) => {
				return cached || fetch(event.request);
			})
		);
		return;
	}

	// For navigation requests (HTML pages) - network first, cache response, fallback to cache
	if (event.request.mode === 'navigate') {
		event.respondWith(
			(async () => {
				const cache = await caches.open(CACHE_PAGES);

				// Use pathname only for cache key (ignore query params)
				const cacheKey = url.pathname;

				let response: Response | undefined;
				try {
					response = await fetch(event.request);
				} catch {
					// Network unreachable — fall through to fallback below.
				}

				// Cache successful HTML responses for cacheable pages (using pathname as key)
				if (response?.ok) {
					const isCacheablePage =
						url.pathname.match(/^\/(rezepte|recipes|glaube|faith|fitness|tasks|cospend|expenses)(\/|$)/) ||
						url.pathname === '/';
					if (isCacheablePage) {
						cache.put(cacheKey, response.clone());
					}
					return response;
				}

				// Network unreachable OR upstream 5xx (502 Bad Gateway, 503, 504, ...) —
				// serve stale shell so the PWA stays usable when the origin is down.
				const upstreamDown = !response || response.status >= 500;

				if (upstreamDown) {
					const cached = await cache.match(cacheKey);
					if (cached) return cached;

					// For recipe routes, redirect to the offline shell with the target URL
					// The offline shell will then do client-side navigation to load from IndexedDB
					// Skip if this is already the offline-shell or an offline navigation to prevent loops
					const isRecipeRoute = url.pathname.match(/^\/(rezepte|recipes)(\/|$)/);
					const isOfflineShell = url.pathname.includes('/offline-shell');
					const isOfflineNavigation = url.searchParams.has('_offline');

					if (isRecipeRoute && !isOfflineShell && !isOfflineNavigation) {
						const isEnglish = url.pathname.startsWith('/recipes');
						const shellPath = isEnglish ? '/recipes/offline-shell' : '/rezepte/offline-shell';

						// Check if we have the offline shell cached
						const shellCached = await cache.match(shellPath);
						if (shellCached) {
							// Redirect to the offline shell with the original URL as a query param
							const redirectUrl = `${shellPath}?redirect=${encodeURIComponent(url.pathname + url.search)}`;
							return Response.redirect(redirectUrl, 302);
						}
					}
				}

				// Pass through non-5xx errors (404, 401, ...) untouched.
				if (response && !upstreamDown) return response;

				// Last resort - return a styled offline response
				return new Response(
					`<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>Offline</title><style>
*{box-sizing:border-box;margin:0;font-family:Helvetica,Arial,sans-serif}
body{background:#f8f6f1;color:#2a2a2a;min-height:100svh;display:flex;flex-direction:column;padding-top:env(safe-area-inset-top,0px)}
nav{position:sticky;top:calc(12px + env(safe-area-inset-top,0px));z-index:100;display:flex;align-items:center;justify-content:center;height:3rem;padding:0 1.2rem;margin:12px auto 0;width:fit-content;max-width:calc(100% - 1.5rem);border-radius:100px;background:rgba(46,52,64,0.82);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);border:1px solid rgba(255,255,255,0.08);box-shadow:0 4px 24px rgba(0,0,0,0.25)}
nav .logo{height:1.4rem;width:auto;display:block}
main{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:2rem;text-align:center;gap:1rem}
main svg{opacity:0.4}
h1{font-size:1.5rem;font-weight:600}
p{color:#555;max-width:360px;line-height:1.5}
.hint{font-size:0.85rem;color:#777;max-width:360px;line-height:1.5;margin-top:0.5rem}
.hint a{color:#5E81AC}
.hint a:hover{color:#81A1C1}
button{padding:0.6rem 1.5rem;border:none;border-radius:100px;background:#5E81AC;color:white;font-size:0.9rem;cursor:pointer;box-shadow:0 0 0.4em 0.05em rgba(0,0,0,0.2)}
button:hover{background:#81A1C1}
@media(prefers-color-scheme:dark){
body{background:#000;color:#e5e5e5}
nav{background:rgba(20,20,20,0.78);border-color:rgba(255,255,255,0.06)}
p{color:#aaa}
.hint{color:#888}
.hint a{color:#88C0D0}
.hint a:hover{color:#8FBCBB}
}
</style></head><body>
<nav><svg class="logo" viewBox="0 0 330 80.310541" xmlns="http://www.w3.org/2000/svg" fill="#d8dee9" aria-label="Bocken"><g fill="none" stroke="#d8dee9" stroke-width="3" transform="translate(-42.033271,-37.145192)"><path d="m 65.113709,84.638921 c -0.346049,-9.794303 8.85917,-32.693347 8.85917,-32.693347"/><path d="m 65.108044,84.684262 c 0.346049,-9.794303 -8.85917,-32.693347 -8.85917,-32.693347"/></g><g><path d="M 0,0 C 6.633,-3.91 14.348,-4.302 20.992,-1.732 20.009,5.333 15.93,11.893 9.31,15.795 2.69,19.697 -5.025,20.088 -11.669,17.519 -10.7,10.462 -6.62,3.901 0,0" transform="matrix(0.35277777,0,0,-0.35277777,4.116564,13.543871)"/><path d="m 0,0 c -6.62,3.901 -14.335,4.293 -20.979,1.724 0.97,-7.058 5.049,-13.618 11.669,-17.519 6.633,-3.91 14.348,-4.301 20.992,-1.732 C 10.699,-10.462 6.62,-3.902 0,0" transform="matrix(0.35277777,0,0,-0.35277777,10.339434,19.278333)"/><path d="M 0,0 C 6.633,-3.909 14.348,-4.301 20.992,-1.731 20.009,5.333 15.93,11.894 9.31,15.795 2.69,19.697 -5.026,20.088 -11.669,17.52 -10.7,10.461 -6.62,3.902 0,0" transform="matrix(0.35277777,0,0,-0.35277777,10.903454,36.572256)"/><path d="M 0,0 C 6.644,-2.57 14.358,-2.178 20.992,1.732 27.612,5.633 31.691,12.194 32.661,19.25 26.017,21.82 18.302,21.429 11.682,17.527 5.062,13.625 0.982,7.065 0,0" transform="matrix(0.35277777,0,0,-0.35277777,32.871328,24.119748)"/><path d="M 0,0 C 6.62,3.901 10.699,10.461 11.669,17.519 5.025,20.088 -2.689,19.696 -9.31,15.795 -15.93,11.893 -20.009,5.333 -20.992,-1.732 -14.348,-4.301 -6.633,-3.91 0,0" transform="matrix(0.35277777,0,0,-0.35277777,35.741597,35.870171)"/><path d="m -27.40181,13.441787 c 6.644,-2.57 14.359,-2.178 20.9920004,1.731 6.62000002,3.902 10.699,10.461 11.669,17.519 -6.644,2.569 -14.359,2.178 -20.9790004,-1.724 -6.62,-3.901 -10.7,-10.462 -11.682,-17.526" transform="matrix(0.35277777,0,0,-0.35277777,43.12113,17.474745)"/><path d="m 0,0 c 1.271,7.579 -1.125,14.922 -5.904,20.205 -6.242,-3.433 -10.906,-9.591 -12.178,-17.169 -1.275,-7.594 1.123,-14.937 5.902,-20.22 C -5.936,-13.736 -1.273,-7.578 0,0" transform="matrix(0.35277777,0,0,-0.35277777,20.082753,7.127875)"/><path d="m 0,0 c 1.271,7.579 -1.125,14.922 -5.904,20.206 -6.242,-3.434 -10.906,-9.592 -12.178,-17.17 -1.275,-7.593 1.123,-14.937 5.902,-20.22 C -5.937,-13.736 -1.273,-7.578 0,0" transform="matrix(0.35277777,0,0,-0.35277777,26.963346,20.756878)"/><path d="M 0,0 C 4.779,5.283 7.176,12.627 5.901,20.22 4.629,27.798 -0.035,33.956 -6.277,37.39 -11.055,32.106 -13.453,24.763 -12.18,17.184 -10.908,9.606 -6.244,3.448 0,0" transform="matrix(0.35277777,0,0,-0.35277777,29.06985,14.051408)"/></g><path d="M 0,0 -9.323,10.862 -3.185,17.76 0,21.339 3.173,17.774 9.324,10.862 Z M 41.228,66.513 C 41.168,66.275 38.492,57.729 32.099,49.53 28.9,45.41 24.801,41.388 19.697,38.388 15.112,35.701 9.727,33.802 3.198,33.324 L 0,36.917 -3.195,33.326 c -6.641,0.491 -12.102,2.451 -16.739,5.216 -7.724,4.607 -13.143,11.62 -16.561,17.559 -1.71,2.961 -2.918,5.631 -3.685,7.529 -0.383,0.949 -0.657,1.703 -0.83,2.204 -0.087,0.251 -0.148,0.438 -0.185,0.554 l -0.037,0.12 -0.006,0.017 -1.095,3.699 H -63.598 V 59.868 h 13.769 c 1.509,-3.763 4.398,-9.908 9.196,-16.216 3.801,-4.982 8.828,-10.072 15.38,-13.996 4.034,-2.422 8.662,-4.371 13.847,-5.556 l -3.872,-4.351 -7.799,-8.764 11.537,-13.441 c -5.22,-1.21 -9.868,-3.199 -13.916,-5.657 -9.751,-5.918 -16.085,-14.346 -20.051,-21.22 -2.011,-3.498 -3.414,-6.613 -4.323,-8.872 h -13.768 v -10.356 h 21.265 l 1.097,3.704 c 0.051,0.212 2.714,8.708 9.07,16.892 3.177,4.106 7.248,8.124 12.313,11.137 4.521,2.682 9.822,4.602 16.234,5.143 L 0,-15.9 l 3.619,4.215 c 6.533,-0.549 11.913,-2.527 16.488,-5.287 7.663,-4.624 13.036,-11.615 16.424,-17.525 1.694,-2.946 2.891,-5.601 3.652,-7.486 0.38,-0.943 0.651,-1.693 0.822,-2.19 0.085,-0.249 0.146,-0.435 0.183,-0.55 l 0.037,-0.119 0.004,-0.016 1.094,-3.703 h 21.268 v 10.356 H 49.825 c -1.499,3.743 -4.361,9.841 -9.105,16.111 -3.768,4.964 -8.752,10.044 -15.248,13.981 -4.052,2.46 -8.703,4.452 -13.928,5.661 l 11.534,13.437 -7.8,8.765 -3.867,4.345 c 5.185,1.183 9.812,3.13 13.845,5.55 9.835,5.899 16.218,14.364 20.21,21.275 2.032,3.529 3.447,6.672 4.36,8.948 H 63.591 V 70.224 H 42.323 Z" transform="matrix(0.35277777,0,0,-0.35277777,23.308833,63.179301)"/><path d="m 63.34524,67.259285 h 13.664006 c 7.392004,0 11.573339,-0.821334 15.082674,-2.912001 3.882669,-2.389335 6.197336,-7.242671 6.197336,-12.91734 0,-6.79467 -2.837334,-10.901338 -9.258671,-13.58934 4.256002,-2.389334 6.12267,-5.973336 6.12267,-11.424005 0,-4.778669 -1.792001,-8.810671 -4.928002,-11.125339 -3.136002,-2.240001 -7.242671,-3.210668 -13.962674,-3.210668 H 63.34524 Z m 5.525336,-5.002669 V 40.827272 h 6.57067 c 6.496003,0 9.781338,0.448001 12.096005,1.568001 3.285335,1.642668 5.152003,4.928002 5.152003,9.333338 0,3.808002 -1.717334,7.168003 -4.330669,8.512004 -2.613335,1.418667 -6.34667,2.016001 -11.946672,2.016001 z m 0,-26.432013 V 17.083261 h 6.645336 c 5.67467,0 8.736004,0.522667 10.826672,1.941334 1.941334,1.269334 3.210668,4.181336 3.210668,7.466671 0,3.808001 -1.493334,6.645336 -4.256002,7.91467 -2.314668,1.045334 -4.704002,1.418667 -9.706671,1.418667 z M 125.09456,25.445932 c -12.17067,0 -21.42935,9.184004 -21.42935,21.130676 0,12.618673 9.18401,21.653344 21.87735,21.653344 11.94667,0 20.75734,-9.034671 20.75734,-21.28001 0,-12.469339 -8.88534,-21.50401 -21.20534,-21.50401 z m 0,5.077335 c 9.03467,0 15.60534,6.944004 15.60534,16.501342 0,9.408004 -6.42134,16.128007 -15.30668,16.128007 -9.408,0 -16.128,-6.79467 -16.128,-16.426674 0,-9.258671 6.79467,-16.202675 15.82934,-16.202675 z m 63.46674,24.714679 c -4.256,5.674669 -8.13867,7.91467 -14.03734,7.91467 -9.10933,0 -16.352,-7.168003 -16.352,-16.277341 0,-9.184004 7.09333,-16.352008 16.20267,-16.352008 6.048,0 11.05067,2.912002 14.18667,8.288004 h 6.19734 C 191.4733,30.597934 183.6333,25.445932 174.4493,25.445932 c -12.24534,0 -21.87735,9.408004 -21.87735,21.28001 0,12.170672 9.70667,21.50401 22.25068,21.50401 5.07734,0 9.78134,-1.568001 13.58934,-4.629335 2.61333,-2.090668 4.18134,-4.106669 6.42134,-8.362671 z m 13.66395,12.021339 h 5.52534 v -8.437337 l 6.42133,-7.914671 13.58934,16.352008 h 6.86934 L 217.68126,46.949942 233.58527,26.416599 H 226.7906 L 207.75059,51.205944 V 12.080592 h -5.52534 z m 76.38406,-18.592009 c 0,-5.600003 -0.74667,-9.034671 -2.76267,-12.618673 -3.65867,-6.570669 -10.752,-10.602671 -18.59201,-10.602671 -11.872,0 -21.13068,9.333337 -21.13068,21.205343 0,12.096006 9.48268,21.578677 21.57868,21.578677 8.88534,0 16.87468,-5.749336 19.86134,-14.410673 h -5.74933 c -2.31467,5.600002 -8.06401,9.333337 -14.26134,9.333337 -8.43734,0 -15.45601,-6.421336 -15.90401,-14.48534 z m -36.81069,-5.002669 c 1.49334,-7.840004 7.69067,-13.14134 15.45601,-13.14134 7.91467,0 13.88801,4.928003 15.82934,13.14134 z m 44.42666,23.594678 h 5.52534 V 44.784608 c 0,-4.554669 0.59733,-6.944004 2.16533,-9.258671 2.16534,-3.136002 5.97334,-5.00267 10.30401,-5.00267 4.032,0 7.69067,1.642668 9.93067,4.405336 1.94133,2.538668 2.688,5.525336 2.688,10.901338 v 21.429344 h 5.52533 V 45.829941 c 0,-6.869336 -0.97066,-10.528005 -3.584,-14.03734 -3.21067,-4.106668 -8.13867,-6.346669 -13.888,-6.346669 -5.37601,0 -9.70668,2.016001 -13.14134,6.272003 v -5.301336 h -5.52534 z"/></svg></nav>
<main>
<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="1" y1="1" x2="23" y2="23"/><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/><path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"/><path d="M10.71 5.05A16 16 0 0 1 22.56 9"/><path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>
<h1>Offline</h1>
<p>You're not connected to the internet. Please check your connection and try again.</p>
<button onclick="location.reload()">Retry</button>
<p class="hint">Install the <a href="https://bocken.org/static/Bocken.apk">Android app</a> or add this site to your home screen to browse offline.</p>
</main>
</body></html>`,
					{ headers: { 'Content-Type': 'text/html' } }
				);
			})()
		);
		return;
	}
});

// Handle messages from the app
sw.addEventListener('message', (event) => {
	if (event.data?.type === 'CACHE_PAGES') {
		const urls: string[] = event.data.urls;
		caches.open(CACHE_PAGES).then((cache) => {
			Promise.all(
				urls.map((url) =>
					fetch(url, { credentials: 'same-origin' })
						.then((response) => {
							if (response.ok) {
								return cache.put(url, response);
							}
						})
						.catch(() => {
							// Ignore failed page fetches
						})
				)
			);
		});
	}

	if (event.data?.type === 'CACHE_IMAGES') {
		const urls: string[] = event.data.urls;
		const requestId = event.data.requestId;

		caches.open(CACHE_IMAGES).then(async (cache) => {
			// Cache images in batches to avoid overwhelming the network
			const batchSize = 10;
			const total = urls.length;
			let completed = 0;

			// Report progress to all clients
			async function reportProgress(done: boolean = false) {
				const clients = await sw.clients.matchAll();
				for (const client of clients) {
					client.postMessage({
						type: 'CACHE_IMAGES_PROGRESS',
						requestId,
						completed,
						total,
						done
					});
				}
			}

			// Report initial state
			await reportProgress();

			for (let i = 0; i < urls.length; i += batchSize) {
				const batch = urls.slice(i, i + batchSize);

				await Promise.all(
					batch.map(async (url) => {
						try {
							// Recipe image URLs embed a content hash
							// (e.g. /static/rezepte/thumb/<slug>.<hash>.webp), so a cache
							// hit on the exact URL guarantees the bytes haven't changed.
							// Skip the network round-trip when already cached.
							const cached = await cache.match(url);
							if (cached) return;
							const response = await fetch(url);
							if (response.ok) await cache.put(url, response);
						} catch {
							// Ignore failed image fetches
						} finally {
							completed++;
						}
					})
				);

				// Report progress after each batch
				await reportProgress();

				// Small delay between batches
				if (i + batchSize < urls.length) {
					await new Promise((resolve) => setTimeout(resolve, 100));
				}
			}

			// Report completion
			await reportProgress(true);
		});
	}

	if (event.data?.type === 'CACHE_DATA') {
		const urls: string[] = event.data.urls;
		caches.open(CACHE_PAGES).then((cache) => {
			// Cache __data.json files in batches to avoid overwhelming the network
			const batchSize = 20;
			let index = 0;

			function cacheBatch() {
				const batch = urls.slice(index, index + batchSize);
				if (batch.length === 0) return;

				Promise.all(
					batch.map((url) =>
						fetch(url)
							.then((response) => {
								if (response.ok) {
									return cache.put(url, response);
								}
							})
							.catch(() => {
								// Ignore failed fetches
							})
					)
				).then(() => {
					index += batchSize;
					if (index < urls.length) {
						// Small delay between batches
						setTimeout(cacheBatch, 50);
					}
				});
			}

			cacheBatch();
		});
	}
});
