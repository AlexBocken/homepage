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
		(url.pathname.match(/^\/(rezepte|recipes|glaube)(\/|$)/) || url.pathname === '/__data.json');

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
			caches.open(CACHE_IMAGES).then((cache) =>
				cache.match(event.request).then((cached) => {
					if (cached) return cached;

					return fetch(event.request).then((response) => {
						if (response.ok) {
							cache.put(event.request, response.clone());
						}
						return response;
					}).catch(() => {
						// Return a placeholder or let the browser handle the error
						return new Response('', { status: 404 });
					});
				})
			)
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
						url.pathname.match(/^\/(rezepte|recipes|glaube)(\/|$)/) ||
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

					// Last resort - return a basic offline response
					return new Response(
						'<!DOCTYPE html><html><head><meta charset="utf-8"><title>Offline</title></head><body><h1>Offline</h1><p>Please connect to the internet and try again.</p></body></html>',
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
		caches.open(CACHE_IMAGES).then((cache) => {
			// Cache images in batches to avoid overwhelming the network
			const batchSize = 10;
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
								// Ignore failed image fetches
							})
					)
				).then(() => {
					index += batchSize;
					if (index < urls.length) {
						// Small delay between batches
						setTimeout(cacheBatch, 100);
					}
				});
			}

			cacheBatch();
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
