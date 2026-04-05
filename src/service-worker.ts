/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

import { build, files, version } from '$service-worker';

const sw = self as unknown as ServiceWorkerGlobalScope;

// Unique cache names
const CACHE_BUILD = `cache-build-${version}`;
const CACHE_STATIC = `cache-static-${version}`;
const CACHE_IMAGES = `cache-images-${version}`;
const CACHE_PAGES = `cache-pages-${version}`;

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
						// Delete old caches
						return (
							key !== CACHE_BUILD &&
							key !== CACHE_STATIC &&
							key !== CACHE_IMAGES &&
							key !== CACHE_PAGES
						);
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
		(url.pathname.match(/^\/(rezepte|recipes|glaube|faith|fitness)(\/|$)/) || url.pathname === '/__data.json');

	if (isCacheableDataRoute) {
		event.respondWith(
			(async () => {
				const cache = await caches.open(CACHE_PAGES);

				// Create a cache key without query parameters
				// SvelteKit adds ?x-sveltekit-invalidated=... which we need to ignore
				const cacheKey = url.pathname;

				try {
					// Try network first
					const response = await fetch(event.request);

					// Cache successful responses for offline use (using pathname as key)
					if (response.ok) {
						cache.put(cacheKey, response.clone());
					}

					return response;
				} catch {
					// Network failed - try to serve from cache (ignoring query params)
					const cached = await cache.match(cacheKey);
					if (cached) {
						return cached;
					}

					// No cached data available - return error response
					// The page will need to handle this gracefully
					return new Response(JSON.stringify({ error: 'offline' }), {
						status: 503,
						headers: { 'Content-Type': 'application/json' }
					});
				}
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
							const thumbUrl = `/static/rezepte/thumb/${filename}`;
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

				try {
					// Try network first
					const response = await fetch(event.request);

					// Cache successful HTML responses for cacheable pages (using pathname as key)
					const isCacheablePage = response.ok && (
						url.pathname.match(/^\/(rezepte|recipes|glaube|faith|fitness)(\/|$)/) ||
						url.pathname === '/'
					);
					if (isCacheablePage) {
						cache.put(cacheKey, response.clone());
					}

					return response;
				} catch {
					// Network failed - try to serve from cache (ignoring query params)
					const cached = await cache.match(cacheKey);
					if (cached) {
						return cached;
					}

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

					// Last resort - return a styled offline response
					return new Response(
						`<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>Offline</title><style>
*{box-sizing:border-box;margin:0;font-family:Helvetica,Arial,sans-serif}
body{background:#f8f6f1;color:#2a2a2a;min-height:100svh;display:flex;flex-direction:column;padding-top:env(safe-area-inset-top,0px)}
nav{position:sticky;top:calc(12px + env(safe-area-inset-top,0px));z-index:100;display:flex;align-items:center;justify-content:center;height:3rem;padding:0 1.2rem;margin:12px auto 0;width:fit-content;max-width:calc(100% - 1.5rem);border-radius:100px;background:rgba(46,52,64,0.82);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);border:1px solid rgba(255,255,255,0.08);box-shadow:0 4px 24px rgba(0,0,0,0.25)}
nav span{color:#999;font-size:0.9rem;letter-spacing:0.02em}
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
<nav><span>bocken.org</span></nav>
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
				}
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
					batch.map((url) =>
						fetch(url)
							.then((response) => {
								if (response.ok) {
									return cache.put(url, response);
								}
							})
							.catch(() => {
								// Ignore failed image fetches
							})
							.finally(() => {
								completed++;
							})
					)
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
