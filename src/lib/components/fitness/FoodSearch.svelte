<script module>
	// Cross-instance cache of slim search results (survives tab switches, which
	// remount FoodSearch). Small LRU cap.
	const SEARCH_CACHE = new Map();
	const SEARCH_CACHE_MAX = 50;
	function cacheGet(/** @type {string} */ key) {
		return SEARCH_CACHE.get(key);
	}
	/**
	 * Drop every cached result set. Call this whenever a favourite changes: results
	 * carry a `favorited` flag and are ranked favourites-first, and this cache is
	 * module state that survives client-side navigation — so after favouriting on a
	 * food's detail page and coming back, a previously-typed query would otherwise
	 * replay pre-favourite results (no heart, old order).
	 */
	export function clearFoodSearchCache() {
		SEARCH_CACHE.clear();
	}
	function cacheSet(/** @type {string} */ key, /** @type {any} */ value) {
		if (SEARCH_CACHE.has(key)) SEARCH_CACHE.delete(key);
		SEARCH_CACHE.set(key, value);
		if (SEARCH_CACHE.size > SEARCH_CACHE_MAX) {
			SEARCH_CACHE.delete(SEARCH_CACHE.keys().next().value);
		}
	}
</script>

<script>
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { browser } from '$app/environment';
	import { onMount, untrack } from 'svelte';
	import Heart from '@lucide/svelte/icons/heart';
	import ExternalLink from '@lucide/svelte/icons/external-link';
	import ScanBarcode from '@lucide/svelte/icons/scan-barcode';
	import UtensilsCrossed from '@lucide/svelte/icons/utensils-crossed';
	import LoaderCircle from '@lucide/svelte/icons/loader-circle';
	import X from '@lucide/svelte/icons/x';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import { detectFitnessLang, fitnessSlugs, m } from '$lib/js/fitnessI18n';
	import { NUTRIENT_META } from '$lib/data/dailyReferenceIntake';
	import { formatGrams } from '$lib/fitness/nutritionMath';
	import MacroBreakdown from './MacroBreakdown.svelte';
	import PortionAmountInput from './PortionAmountInput.svelte';

	/**
	 * @typedef {{ description: string, grams: number }} Portion
	 */
	/**
	 * @typedef {{
	 *   id: string,
	 *   name: string,
	 *   source: string,
	 *   per100g: any,
	 *   portions?: Portion[],
	 *   brands?: string,
	 *   category?: string,
	 *   calories?: number,
	 *   favorited?: boolean,
	 * }} FoodItem
	 */

	/**
	 * @type {{
	 *   onselect: (food: { name: string, source: string, sourceId: string, amountGrams: number, per100g: any, portions?: Portion[], selectedPortion?: Portion }) => void,
	 *   oncancel?: () => void,
	 *   onfavoritechange?: (payload: { source: string, sourceId: string, name: string, favorited: boolean }) => void,
	 *   showFavorites?: boolean,
	 *   highlightFavorites?: boolean,
	 *   showDetailLinks?: boolean,
	 *   autofocus?: boolean,
	 *   confirmLabel?: string,
	 *   initialResults?: FoodItem[],
	 *   query?: string,
	 *   results?: FoodItem[],
	 *   placeholder?: string,
	 * }}
	 */
	let {
		onselect,
		oncancel = undefined,
		onfavoritechange = undefined,
		showFavorites = true,
		highlightFavorites = false,
		showDetailLinks = true,
		autofocus = false,
		confirmLabel = undefined,
		initialResults = undefined,
		query = $bindable(''),
		results = $bindable(untrack(() => initialResults ?? [])),
		placeholder = undefined,
	} = $props();

	const lang = $derived(detectFitnessLang(page.url.pathname));
	const t = $derived(m[lang]);
	const s = $derived(fitnessSlugs(lang));
	const isEn = $derived(lang === 'en');
	const btnLabel = $derived(confirmLabel ?? t.log_food);

	// --- Search state ---
	// `query` is $bindable so the parent can share ONE search string across all
	// add-food tabs (Search / Favorites / Recent / Meals) — the value persists
	// when switching tabs even though this component unmounts. In prefilled mode
	// (Favorites/Recent) `query` filters the given list locally; in search mode it
	// drives the server search.
	let loading = $state(false);
	/** @type {ReturnType<typeof setTimeout> | null} */
	let timeout = $state(null);

	// --- Source filter ---
	// Empty set means "all databases" — the state the search starts in. The first
	// click narrows to just that source; from there clicks toggle sources on and
	// off, and clearing the last one lands back on "all" rather than on a filter
	// that can never match anything.
	const SOURCES = /** @type {const} */ ([
		{ key: 'recipe', label: () => t.source_recipes },
		{ key: 'usda', label: () => 'USDA' },
		{ key: 'bls', label: () => 'BLS' },
		{ key: 'off', label: () => 'OFF' },
	]);
	/** @type {Set<string>} */
	let activeSources = $state(new Set());
	const allSources = $derived(activeSources.size === 0);

	/** @param {string} key */
	function isSourceOn(key) {
		return allSources || activeSources.has(key);
	}

	/** @param {string} key */
	function toggleSource(key) {
		if (allSources) {
			activeSources = new Set([key]);
		} else {
			const next = new Set(activeSources);
			if (next.has(key)) next.delete(key);
			else next.add(key);
			activeSources = next;
		}
		if (!isPrefilledMode) doSearch({ immediate: true });
	}

	/** Off by default — ready meals stay searchable until deliberately excluded. */
	let hideReadyMeals = $state(false);

	function toggleReadyMeals() {
		hideReadyMeals = !hideReadyMeals;
		if (!isPrefilledMode) doSearch({ immediate: true });
	}
	/** Aborts the previous in-flight search so an older response can't overwrite a newer one. @type {AbortController | null} */
	let searchAbort = null;
	const isPrefilledMode = $derived(initialResults != null);
	const displayResults = $derived(
		isPrefilledMode && query
			? results.filter((/** @type {FoodItem} */ r) => r.name.toLowerCase().includes(query.toLowerCase()))
			: results
	);

	function onQueryInput() {
		// Prefilled lists filter reactively via displayResults; only the search tab
		// hits the server.
		if (!isPrefilledMode) doSearch();
	}

	function clearQuery() {
		query = '';
		if (!isPrefilledMode) results = [];
	}

	// Entering the search tab with a query carried over from another tab: run the
	// search so the results match the shared text.
	onMount(() => {
		if (!isPrefilledMode && query.length >= 2) doSearch();
	});

	// --- Selection state ---
	/** @type {FoodItem | null} */
	let selected = $state(null);
	/** Canonical consumed amount; PortionAmountInput keeps it in sync with the qty+unit UI. */
	let logGrams = $state(100);
	/** @type {Portion | undefined} */
	let chosenPortion = $state(undefined);

	// --- Barcode scanner state ---
	let scanning = $state(false);
	let cameraStarting = $state(false); // true from scan-start until the live preview plays
	let scanError = $state('');
	/** @type {HTMLVideoElement | null} */
	let videoEl = $state(null);
	/** @type {MediaStream | null} */
	let scanStream = $state(null);
	let scanDebug = $state('');
	/** ZXing-ponyfill detection worker (created only when native BarcodeDetector is absent). @type {Worker | null} */
	let scanWorker = null;
	/** Resolver for the in-flight worker detect request. @type {((codes: string[]) => void) | null} */
	let workerPending = null;
	/** @type {((value?: unknown) => void) | null} */
	let workerReadyResolve = null;
	/** @type {((reason?: unknown) => void) | null} */
	let workerReadyReject = null;


	/** @param {{ immediate?: boolean }} [opts] */
	function doSearch(opts = {}) {
		if (timeout) clearTimeout(timeout);
		scanError = '';
		const q = query.trim();
		if (q.length < 2) {
			searchAbort?.abort();
			searchAbort = null;
			results = [];
			loading = false;
			return;
		}
		const sourceParam = allSources ? '' : [...activeSources].sort().join(',');
		// Results are slim (no per100g) — served instantly from cache on repeat/backspace.
		const key = `${showFavorites ? 'f:' : ''}${hideReadyMeals ? 'nrm:' : ''}${sourceParam}|${q.toLowerCase()}`;
		const cached = cacheGet(key);
		if (cached) {
			searchAbort?.abort();
			searchAbort = null;
			results = cached;
			loading = false;
			return;
		}
		loading = true;
		const run = async () => {
			searchAbort?.abort();
			const ac = new AbortController();
			searchAbort = ac;
			try {
				const favParam = showFavorites ? '&favorites=true' : '';
				const srcParam = sourceParam ? `&sources=${sourceParam}` : '';
				const rmParam = hideReadyMeals ? '&hideReadyMeals=true' : '';
				const res = await fetch(`/api/nutrition/search?q=${encodeURIComponent(q)}${favParam}${srcParam}${rmParam}`, { signal: ac.signal });
				if (res.ok) {
					const data = await res.json();
					results = data;
					cacheSet(key, data);
				}
			} catch {
				// aborted or network error — ignore
			} finally {
				if (searchAbort === ac) {
					loading = false;
					searchAbort = null;
				}
			}
		};
		// A filter click is a deliberate one-shot action — no need to debounce it
		// the way we debounce each keystroke.
		if (opts.immediate) run();
		else timeout = setTimeout(run, 150);
	}

	/** @param {FoodItem} item */
	async function selectItem(item) {
		let chosen = item;
		// Slim search results carry no per100g — fetch it on demand when picked.
		// Prefilled items (favorites/recent) and barcode results already have it.
		if (!item.per100g) {
			loading = true;
			try {
				const res = await fetch(`/api/nutrition/lookup?source=${item.source}&id=${encodeURIComponent(item.id)}`);
				if (res.ok) {
					const data = await res.json();
					if (data.per100g) {
						chosen = { ...item, per100g: data.per100g, portions: data.portions ?? item.portions };
					}
				}
			} catch {
				// fall through to the guard below
			}
			loading = false;
			if (!chosen.per100g) {
				scanError = isEn ? 'Could not load food data' : 'Lebensmitteldaten nicht gefunden';
				return;
			}
		}
		selected = chosen;
		// Default to one of the first portion when the source offers any — that's the
		// unit the label is written in, and far likelier what the user means than 100 g.
		const first = chosen.portions?.[0];
		chosenPortion = first;
		logGrams = first ? Math.round(first.grams) : 100;
	}

	const previewGrams = $derived(logGrams);

	/** Scaled nutrient values for the preview */
	const previewNutrients = $derived.by(() => {
		if (!selected?.per100g || !previewGrams) return null;
		const s = previewGrams / 100;
		const n = selected.per100g;
		return {
			calories: Math.round((n.calories ?? 0) * s),
			protein: (n.protein ?? 0) * s,
			fat: (n.fat ?? 0) * s,
			carbs: (n.carbs ?? 0) * s,
			saturatedFat: (n.saturatedFat ?? 0) * s,
			sugars: (n.sugars ?? 0) * s,
			fiber: (n.fiber ?? 0) * s,
		};
	});

	// --- Micronutrient preview (collapsed by default) ---
	// Same grouping as the food detail page, so the numbers you see before
	// logging line up with the ones on the entry's own page. No %DRI bars here:
	// those need the user's profile, which this component isn't given.
	let showMicros = $state(false);

	const MINERAL_KEYS = ['calcium', 'iron', 'magnesium', 'phosphorus', 'potassium', 'sodium', 'zinc'];
	const VITAMIN_KEYS = ['vitaminA', 'vitaminC', 'vitaminD', 'vitaminE', 'vitaminK', 'thiamin', 'riboflavin', 'niacin', 'vitaminB6', 'vitaminB12', 'folate'];
	const OTHER_KEYS = ['cholesterol'];

	const microSections = $derived.by(() => {
		const n = selected?.per100g;
		if (!n || !previewGrams) return [];
		const s = previewGrams / 100;
		/** @param {string[]} keys */
		const rows = (keys) =>
			keys.map((k) => {
				const meta = NUTRIENT_META[/** @type {keyof typeof NUTRIENT_META} */ (k)];
				return {
					key: k,
					label: isEn ? meta.label : meta.labelDe,
					unit: meta.unit,
					value: (/** @type {Record<string, number>} */ (n)[k] ?? 0) * s,
				};
			});
		return [
			{ title: isEn ? 'Minerals' : 'Mineralstoffe', rows: rows(MINERAL_KEYS) },
			{ title: isEn ? 'Vitamins' : 'Vitamine', rows: rows(VITAMIN_KEYS) },
			{ title: isEn ? 'Other' : 'Sonstiges', rows: rows(OTHER_KEYS) },
		];
	});

	/** True when the source carries any micronutrient data at all — OFF products
	 *  usually don't, and an all-zero table is just noise. */
	const hasMicros = $derived(microSections.some((s) => s.rows.some((r) => r.value > 0)));

	function confirm() {
		if (!selected) return;
		if (!logGrams || logGrams <= 0) return;

		/** @type {{ name: string, source: string, sourceId: string, amountGrams: number, per100g: any, portions?: Portion[], selectedPortion?: Portion }} */
		const food = {
			name: selected.name,
			source: selected.source,
			sourceId: selected.id,
			amountGrams: logGrams,
			per100g: selected.per100g,
		};
		if (selected.portions && selected.portions.length > 0) {
			food.portions = selected.portions;
		}
		if (chosenPortion) {
			food.selectedPortion = chosenPortion;
		}
		onselect(food);
		reset();
	}

	function reset() {
		selected = null;
		query = '';
		results = [];
		logGrams = 100;
		chosenPortion = undefined;
	}

	/** @param {FoodItem} item */
	async function toggleFavorite(item) {
		const wasFav = item.favorited;
		item.favorited = !wasFav;
		results = [...results];
		// Cached result sets carry the favourite flag and favourites-first order, so
		// they are stale the moment this changes.
		clearFoodSearchCache();
		try {
			if (wasFav) {
				await fetch('/api/fitness/favorite-ingredients', {
					method: 'DELETE',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ source: item.source, sourceId: item.id })
				});
			} else {
				await fetch('/api/fitness/favorite-ingredients', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ source: item.source, sourceId: item.id, name: item.name })
				});
			}
			onfavoritechange?.({ source: item.source, sourceId: item.id, name: item.name, favorited: !wasFav });
		} catch {
			item.favorited = wasFav;
			results = [...results];
		}
	}



	/** @param {string | undefined} source */
	function sourceLabel(source) {
		if (source === 'bls') return 'BLS';
		if (source === 'usda') return 'USDA';
		if (source === 'off') return 'OFF';
		if (source === 'recipe') return '🍴';
		return source?.toUpperCase() ?? '';
	}

	/**
	 * EAN/UPC check digit validation (works for EAN-8, UPC-A, EAN-13)
	 * @param {string} code
	 */
	function validCheckDigit(code) {
		const digits = code.split('').map(Number);
		const check = digits.pop();
		const sum = digits.reduce((/** @type {number} */ s, /** @type {number} */ d, /** @type {number} */ i) => s + d * ((i % 2 === (digits.length % 2 === 0 ? 0 : 1)) ? 1 : 3), 0);
		return (10 - (sum % 10)) % 10 === check;
	}

	/** Hand a frame to the detection worker, which takes ownership of (and closes) the bitmap.
	 * @param {ImageBitmap} bitmap
	 * @returns {Promise<string[]>}
	 */
	function detectViaWorker(bitmap) {
		return new Promise((resolve) => {
			if (!scanWorker) { bitmap.close(); resolve([]); return; }
			workerPending = resolve;
			scanWorker.postMessage({ type: 'detect', bitmap }, [bitmap]);
		});
	}

	/** @param {MessageEvent} e */
	function handleWorkerMessage(e) {
		const d = e.data;
		if (d?.type === 'ready') {
			workerReadyResolve?.(undefined);
			workerReadyResolve = workerReadyReject = null;
		} else if (d?.type === 'error') {
			workerReadyReject?.(new Error(d.message));
			workerReadyResolve = workerReadyReject = null;
		} else if (d?.type === 'result') {
			const cb = workerPending; workerPending = null; cb?.(d.codes ?? []);
		} else if (d?.type === 'detect-error') {
			const cb = workerPending; workerPending = null; cb?.([]);
		}
	}

	/** Crop to the central reticle ROI and downscale before detecting — far fewer pixels
	 * for the decoder, so each pass is much cheaper than a full-frame decode.
	 * @returns {Promise<ImageBitmap | null>}
	 */
	async function grabRoiBitmap() {
		const v = videoEl;
		if (!v || !v.videoWidth || !v.videoHeight) return null;
		const fw = v.videoWidth, fh = v.videoHeight;
		const roiW = Math.round(fw * 0.9);
		const roiH = Math.round(fh * 0.5);
		const sx = Math.round((fw - roiW) / 2);
		const sy = Math.round((fh - roiH) / 2);
		const resizeWidth = Math.min(roiW, 800);
		const resizeHeight = Math.max(1, Math.round(roiH * (resizeWidth / roiW)));
		try {
			return await createImageBitmap(v, sx, sy, roiW, roiH, { resizeWidth, resizeHeight, resizeQuality: 'medium' });
		} catch {
			// Some engines (older Safari) reject crop/resize options — fall back to the full frame.
			try { return await createImageBitmap(v); } catch { return null; }
		}
	}

	/** Resolve on the next decoded video frame (requestVideoFrameCallback) or a timed fallback —
	 * paces detection to the display cadence instead of a fixed busy-loop. */
	function nextVideoFrame() {
		return new Promise((resolve) => {
			const v = videoEl;
			if (v && 'requestVideoFrameCallback' in v) {
				/** @type {any} */ (v).requestVideoFrameCallback(() => resolve(undefined));
			} else {
				setTimeout(() => resolve(undefined), 120);
			}
		});
	}

	/** Last-resort ZXing ponyfill running on the main thread, for WebViews that lack
	 * native BarcodeDetector AND can't run the detection worker (e.g. older WebKitGTK in
	 * a Tauri desktop shell). Janky but functional. Throws (with the real cause) if even
	 * this fails, so the reason can be surfaced rather than swallowed.
	 * @param {string[]} formats
	 * @returns {Promise<any>}
	 */
	async function loadMainThreadDetector(formats) {
		const mod = await import('barcode-detector/ponyfill');
		// Fetch the wasm ourselves and pass the raw bytes (wasmBinary) so Emscripten
		// instantiates straight from the buffer — no locateFile fetch, no instantiateStreaming
		// MIME requirement, no default CDN fallback.
		const resp = await fetch('/fitness/zxing_reader.wasm');
		if (!resp.ok) throw new Error(`wasm fetch failed: ${resp.status}`);
		const wasmBinary = await resp.arrayBuffer();
		await mod.prepareZXingModule({
			overrides: { wasmBinary },
			fireImmediately: true
		});
		return new mod.BarcodeDetector({ formats });
	}

	/** Build a platform-native BarcodeDetector if one that supports EAN-13 is available.
	 * @param {string[]} formats
	 * @returns {Promise<any>}
	 */
	async function tryNativeDetector(formats) {
		try {
			if ('BarcodeDetector' in globalThis) {
				const BD = /** @type {any} */ (globalThis).BarcodeDetector;
				const supported = await BD.getSupportedFormats();
				if (supported.includes('ean_13')) return new BD({ formats });
			}
		} catch {
			// not usable
		}
		return null;
	}

	// --- Barcode scanning ---
	async function startScan() {
		scanError = '';

		// Check secure context (getUserMedia requires HTTPS or localhost)
		if (!globalThis.isSecureContext) {
			scanError = isEn ? 'Camera requires HTTPS' : 'Kamera benötigt HTTPS';
			return;
		}
		if (!navigator.mediaDevices?.getUserMedia) {
			scanError = isEn ? 'Camera API not available' : 'Kamera-API nicht verfügbar';
			return;
		}

		// Check/request permission via Permissions API if available
		if (navigator.permissions) {
			try {
				const perm = await navigator.permissions.query({ name: /** @type {any} */ ('camera') });
				if (perm.state === 'denied') {
					scanError = isEn
						? 'Camera permission denied — enable it in your browser site settings'
						: 'Kamerazugriff verweigert — in den Browser-Seiteneinstellungen aktivieren';
					return;
				}
			} catch {
				// permissions.query('camera') not supported on all browsers — proceed anyway
			}
		}

		scanning = true;
		cameraStarting = true;
		scanDebug = '';

		try {
			const stream = await navigator.mediaDevices.getUserMedia({
				video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
			});
			scanStream = stream;

			// Wait for the video element to be mounted
			await new Promise(r => requestAnimationFrame(r));
			if (!videoEl) { stopScan(); return; }

			videoEl.srcObject = stream;
			await videoEl.play();

			// Native BarcodeDetector stays on the main thread (the browser offloads it
			// internally and it's already smooth); the ZXing WASM ponyfill — which would
			// otherwise block the main thread ~100-300ms per frame and stutter the preview —
			// runs in a Web Worker instead. Either path only ever sees a cropped, downscaled
			// ROI of the frame (grabRoiBitmap).
			/** @type {any} */
			let nativeDetector = null;
			/** ZXing ponyfill on the main thread — used when the worker can't run. @type {any} */
			let mainDetector = null;
			const formats = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128'];
			/** Why ZXing couldn't load, surfaced if we end up with no detector at all. */
			let zxingFailReason = '';

			// Always prefer ZXing — in a worker (off the main thread → smooth preview), or on the
			// main thread if the worker can't run. The platform's native detector is only a
			// fallback: it's laggy (notably in the Android WebView) and unavailable/limited in
			// many browsers, whereas ZXing is consistent everywhere WebAssembly exists.
			if (typeof WebAssembly === 'undefined') {
				zxingFailReason = 'WebAssembly is not defined';
			} else {
				try {
					const { default: BarcodeWorker } = await import('$lib/workers/barcodeDetector.worker?worker');
					scanWorker = new BarcodeWorker();
					scanWorker.onmessage = handleWorkerMessage;
					await new Promise((resolve, reject) => {
						workerReadyResolve = resolve;
						workerReadyReject = reject;
						/** @type {Worker} */ (scanWorker).postMessage({ type: 'init', wasmUrl: '/fitness/zxing_reader.wasm' });
					});
				} catch (workerErr) {
					// Worker unavailable (e.g. a WebView without module-worker support). Try the
					// ponyfill on the main thread before giving up on ZXing.
					console.warn('[barcode] worker path failed, trying main-thread ZXing:', workerErr);
					if (scanWorker) { scanWorker.terminate(); scanWorker = null; }
					workerPending = null;
					workerReadyResolve = workerReadyReject = null;
					try {
						mainDetector = await loadMainThreadDetector(formats);
					} catch (mainErr) {
						console.warn('[barcode] main-thread ZXing failed, falling back to native:', mainErr);
						const wm = workerErr instanceof Error ? workerErr.message : String(workerErr);
						const mm = mainErr instanceof Error ? mainErr.message : String(mainErr);
						zxingFailReason = `worker: ${wm} · main: ${mm}`;
					}
				}
			}

			// Native fallback only when ZXing couldn't run at all.
			if (!scanWorker && !mainDetector) {
				nativeDetector = await tryNativeDetector(formats);
				if (!nativeDetector) {
					scanError = zxingFailReason === 'WebAssembly is not defined'
						? (isEn
							? 'Barcode scanning needs WebAssembly, which is unavailable in this browser.'
							: 'Barcode-Scannen benötigt WebAssembly, das in diesem Browser nicht verfügbar ist.')
						: (isEn
							? 'Barcode library failed to load. Try reloading.'
							: 'Barcode-Bibliothek konnte nicht geladen werden. Seite neu laden.');
					scanDebug = zxingFailReason || 'no detector available';
					stopScan();
					return;
				}
			}

			let lastCode = '';
			let confirmCount = 0;
			let errorCount = 0;
			const CONFIRM_THRESHOLD = 2;
			const MIN_INTERVAL = 90; // ms floor between detection passes (caps CPU when native is fast)

			const detectLoop = async () => {
				while (scanning && videoEl) {
					const startedAt = performance.now();
					try {
						/** @type {string[]} */
						let codes;
						if (nativeDetector) {
							// Detect straight off the <video>: the native (offloaded) detector grabs the
							// frame itself, avoiding a per-frame createImageBitmap() readback on the main
							// thread — that GPU→CPU copy was what stuttered the preview on Android.
							if (!videoEl.videoWidth || !videoEl.videoHeight) { await new Promise(r => setTimeout(r, 200)); continue; }
							const results = await nativeDetector.detect(videoEl);
							codes = results.map((/** @type {any} */ r) => r.rawValue);
						} else {
							// ZXing fallback (no native detector): hand a cropped, downscaled ROI to the
							// worker (or main thread) — fewer pixels, and the heavy decode stays off the UI.
							const bitmap = await grabRoiBitmap();
							if (!bitmap) { await new Promise(r => setTimeout(r, 300)); continue; }
							if (scanWorker) {
								codes = await detectViaWorker(bitmap); // worker closes the bitmap
							} else {
								const results = await mainDetector.detect(bitmap);
								bitmap.close();
								codes = results.map((/** @type {any} */ r) => r.rawValue);
							}
						}

						if (codes.length > 0) {
							const code = codes[0];
							if (/^\d+$/.test(code) && [8, 12, 13].includes(code.length) && validCheckDigit(code)) {
								if (code === lastCode) {
									confirmCount++;
								} else {
									lastCode = code;
									confirmCount = 1;
								}
								if (confirmCount >= CONFIRM_THRESHOLD) {
									stopScan();
									await lookupBarcode(code);
									return;
								}
							}
						}
					} catch (detectErr) {
						errorCount++;
						const e = /** @type {{ name?: string, message?: string }} */ (detectErr);
						scanDebug = `ERROR: ${e?.name}: ${e?.message}`;
						if (errorCount >= 5) {
							scanError = isEn ? 'Barcode detection failed repeatedly. Try reloading.' : 'Barcode-Erkennung wiederholt fehlgeschlagen. Seite neu laden.';
							stopScan();
							return;
						}
					}
					const elapsed = performance.now() - startedAt;
					if (elapsed < MIN_INTERVAL) await new Promise(r => setTimeout(r, MIN_INTERVAL - elapsed));
					await nextVideoFrame();
				}
			};
			detectLoop();
		} catch (err) {
			scanning = false;
			const e = /** @type {{ name?: string, message?: string }} */ (err);
			const name = e?.name;
			if (name === 'NotAllowedError') {
				scanError = isEn
					? 'Camera permission denied — enable it in your browser site settings'
					: 'Kamerazugriff verweigert — in den Browser-Seiteneinstellungen aktivieren';
			} else if (name === 'NotFoundError') {
				scanError = isEn ? 'No camera found' : 'Keine Kamera gefunden';
			} else if (name === 'NotReadableError') {
				scanError = isEn ? 'Camera is in use by another app' : 'Kamera wird von einer anderen App verwendet';
			} else {
				scanError = isEn ? `Camera error: ${e?.message || name}` : `Kamerafehler: ${e?.message || name}`;
			}
		}
	}

	function stopScan() {
		scanning = false;
		cameraStarting = false;
		if (scanStream) {
			for (const track of scanStream.getTracks()) track.stop();
			scanStream = null;
		}
		if (scanWorker) {
			scanWorker.terminate();
			scanWorker = null;
		}
		workerPending = null;
		workerReadyResolve = workerReadyReject = null;
		if (videoEl) videoEl.srcObject = null;
	}

	/** @param {string} code */
	async function lookupBarcode(code) {
		loading = true;
		scanError = '';
		try {
			const res = await fetch(`/api/nutrition/barcode?code=${encodeURIComponent(code)}`);
			if (!res.ok) {
				// Distinguish the failure modes — collapsing every status into "not found"
				// made a session timeout or a server fault look like an unknown product.
				if (res.status === 404) {
					scanError = isEn ? `No product found for barcode ${code}` : `Kein Produkt gefunden für Barcode ${code}`;
				} else if (res.status === 401) {
					scanError = isEn ? 'Session expired — log in again' : 'Sitzung abgelaufen — bitte neu anmelden';
				} else {
					scanError = isEn
						? `Lookup failed (${res.status}) for barcode ${code}`
						: `Suche fehlgeschlagen (${res.status}) für Barcode ${code}`;
				}
				return;
			}
			const data = await res.json();
			// Directly select the scanned item
			selectItem(data);
		} catch {
			scanError = isEn ? 'Lookup failed' : 'Suche fehlgeschlagen';
		} finally {
			loading = false;
		}
	}
</script>

{#if scanning}
	<div class="fs-scanner">
		<div class="fs-scanner-header">
			<span class="fs-scanner-title">{isEn ? 'Scan barcode' : 'Barcode scannen'}</span>
			<button class="fs-scanner-close" onclick={stopScan} aria-label="Close scanner"><X size={18} /></button>
		</div>
		<!-- svelte-ignore a11y_media_has_caption -->
		<video
			bind:this={videoEl}
			class="fs-scanner-video"
			playsinline
			autoplay
			muted
			onplaying={() => (cameraStarting = false)}
		></video>
		{#if cameraStarting}
			<div class="fs-scanner-loading">
				<LoaderCircle class="spin" size={34} strokeWidth={2} />
			</div>
		{:else}
			<div class="fs-scanner-overlay">
				<div class="fs-scanner-reticle"></div>
			</div>
		{/if}
		{#if scanDebug}
			<div class="fs-scan-debug">{scanDebug}</div>
		{/if}
	</div>
{:else if !selected}
	<div class="fs-search-row">
		<div class="fs-input-wrap">
			<!-- svelte-ignore a11y_autofocus -->
			<input
				type="text"
				class="fs-search-input"
				placeholder={placeholder ?? t.search_food}
				bind:value={query}
				oninput={onQueryInput}
				autofocus={autofocus}
			/>
			{#if loading}
				<LoaderCircle class="fs-spinner" size={18} strokeWidth={2} />
			{/if}
		</div>
		{#if query}
			<button class="fs-clear-btn" onclick={clearQuery} aria-label="Clear">
				<X size={16} />
			</button>
		{/if}
		{#if browser && !isPrefilledMode}
			<button class="fs-barcode-btn" onclick={startScan} aria-label={isEn ? 'Scan barcode' : 'Barcode scannen'}>
				<ScanBarcode size={20} />
			</button>
		{/if}
	</div>
	{#if !isPrefilledMode}
		<div class="fs-sources" role="group" aria-label={t.source_filter}>
			{#each SOURCES as src}
				<button
					class="fs-source-btn"
					class:is-on={isSourceOn(src.key)}
					aria-pressed={isSourceOn(src.key)}
					onclick={() => toggleSource(src.key)}
				>{src.label()}</button>
			{/each}
			<span class="fs-sources-sep" aria-hidden="true"></span>
			<button
				class="fs-source-btn fs-rm-btn"
				class:is-on={hideReadyMeals}
				aria-pressed={hideReadyMeals}
				title={t.hide_ready_meals_title}
				onclick={toggleReadyMeals}
			>
				<UtensilsCrossed size={11} strokeWidth={2.5} />
				{t.hide_ready_meals}
			</button>
		</div>
	{/if}
	{#if scanError}
		<p class="fs-scan-error">{scanError}</p>
	{/if}
	{#if displayResults.length > 0}
		<div class="fs-results">
			{#each displayResults as item}
				<div class="fs-result-row">
					{#if showFavorites}
						<button class="fs-fav" class:is-fav={item.favorited} onclick={() => toggleFavorite(item)} aria-label="Toggle favorite">
							<Heart size={14} fill={item.favorited ? 'var(--red)' : 'none'} />
						</button>
					{/if}
					<button class="fs-result" onclick={() => selectItem(item)}>
						<div class="fs-result-info">
							<span class="fs-result-name">{item.name}</span>
							<span class="fs-result-meta">
								<span class="fs-source-badge" class:usda={item.source === 'usda'} class:off={item.source === 'off'} class:recipe={item.source === 'recipe'}>{sourceLabel(item.source)}</span>
								{#if item.brands}<span class="fs-result-brands">{item.brands}</span>{/if}
								{#if item.category}{item.category}{/if}
							</span>
						</div>
						<span class="fs-result-cal">{item.calories}<small> kcal</small></span>
					</button>
					{#if highlightFavorites && !showFavorites}
						<!-- Every row carries a heart — filled when favourited, outline when not —
						     so the indicator doubles as a toggle without a row's control
						     disappearing when it is switched off. -->
						<button class="fs-fav-mark" class:is-fav={item.favorited} onclick={() => toggleFavorite(item)} aria-label="Toggle favorite" aria-pressed={item.favorited}>
							<Heart size={14} fill={item.favorited ? 'var(--red)' : 'none'} />
						</button>
					{/if}
					{#if showDetailLinks && (item.source === 'bls' || item.source === 'usda' || item.source === 'off')}
						<a class="fs-detail-link" href={resolve('/fitness/[nutrition=fitnessNutrition]/food/[source]/[id]', { nutrition: s.nutrition, source: item.source, id: item.id })} aria-label="View details">
							<ExternalLink size={13} />
						</a>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
	{#if !loading && displayResults.length === 0 && (isPrefilledMode ? results.length > 0 && query.trim().length > 0 : query.trim().length >= 2)}
		<p class="fs-no-results">{isEn ? 'No results found' : 'Keine Ergebnisse gefunden'}</p>
	{/if}
	{#if oncancel}
		<button class="fs-btn-cancel" onclick={oncancel}>{t.cancel}</button>
	{/if}
{:else}
	<!-- Selected food — detail & amount -->
	<div class="fs-selected">
		<div class="fs-selected-header">
			<span class="fs-selected-name">
				<span class="fs-source-badge" class:usda={selected.source === 'usda'} class:off={selected.source === 'off'} class:recipe={selected.source === 'recipe'}>{sourceLabel(selected.source)}</span>
				{selected.name}
			</span>
			{#if selected.brands}
				<span class="fs-selected-brands">{selected.brands}</span>
			{/if}
		</div>

		<!-- Amount selector — keyed so a newly picked food reseeds its portion basis -->
		{#key selected.source + ':' + selected.id}
			<PortionAmountInput
				bind:grams={logGrams}
				bind:selectedPortion={chosenPortion}
				portions={selected.portions ?? []}
				onenter={confirm}
			/>
		{/key}

		{#if previewNutrients}
			<MacroBreakdown
				calories={previewNutrients.calories}
				protein={previewNutrients.protein}
				fat={previewNutrients.fat}
				carbs={previewNutrients.carbs}
				saturatedFat={previewNutrients.saturatedFat}
				sugars={previewNutrients.sugars}
				fiber={previewNutrients.fiber}
			/>
		{/if}

		{#if hasMicros}
			<button
				class="fs-micro-toggle"
				class:is-open={showMicros}
				aria-expanded={showMicros}
				onclick={() => (showMicros = !showMicros)}
			>
				<span>{isEn ? 'Micronutrients' : 'Mikronährstoffe'}</span>
				<ChevronDown class="fs-micro-chevron" size={15} strokeWidth={2.5} />
			</button>
			{#if showMicros}
				<div class="fs-micros">
					{#each microSections as section (section.title)}
						<div class="fs-micro-section">
							<h4 class="fs-micro-title">{section.title}</h4>
							{#each section.rows as row (row.key)}
								<div class="fs-micro-row">
									<span class="fs-micro-label">{row.label}</span>
									<span class="fs-micro-value">{formatGrams(row.value)}<small> {row.unit}</small></span>
								</div>
							{/each}
						</div>
					{/each}
				</div>
			{/if}
		{/if}

		<div class="fs-actions">
			<button class="fs-btn-cancel" onclick={() => { selected = null; }}>{t.cancel}</button>
			<button class="fs-btn-confirm" onclick={confirm}>{btnLabel}</button>
		</div>
	</div>
{/if}

<style>
	/* ── Search row with barcode button ── */
	.fs-search-row {
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}
	.fs-input-wrap {
		position: relative;
		flex: 1;
		min-width: 0;
		display: flex;
	}
	.fs-search-input {
		flex: 1;
		padding: 0.55rem 2.3rem 0.55rem 0.65rem; /* right space reserved for the spinner */
		background: var(--color-bg-tertiary);
		border: 1px solid var(--color-border);
		border-radius: 8px;
		color: var(--color-text-primary);
		font-size: 0.9rem;
		box-sizing: border-box;
		transition: border-color 0.15s;
		min-width: 0;
	}
	.fs-search-input:focus {
		outline: none;
		border-color: var(--color-primary);
	}
	.fs-clear-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		background: none;
		border: none;
		color: var(--color-text-secondary);
		cursor: pointer;
		padding: 0.3rem;
		border-radius: 50%;
		flex-shrink: 0;
		transition: background 0.12s;
	}
	.fs-clear-btn:hover {
		background: var(--color-bg-elevated);
	}
	.fs-barcode-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0.5rem;
		background: var(--color-bg-tertiary);
		border: 1px solid var(--color-border);
		border-radius: 8px;
		color: var(--color-text-secondary);
		cursor: pointer;
		flex-shrink: 0;
		transition: color 0.15s, border-color 0.15s;
	}
	.fs-barcode-btn:hover {
		color: var(--nord8);
		border-color: var(--nord8);
	}
	.fs-input-wrap :global(.fs-spinner) {
		position: absolute;
		right: 1rem;
		/* Center vertically via margin, NOT transform — the spin animation animates
		   `transform: rotate()`, which would override a translateY centering. */
		top: 0;
		bottom: 0;
		margin-block: auto;
		height: 18px;
		color: var(--color-text-tertiary);
		animation: spin 1s linear infinite;
		pointer-events: none;
	}
	/* ── Source filter pills ── */
	.fs-sources {
		display: flex;
		gap: 0.35rem;
		margin-top: 0.4rem;
		flex-wrap: wrap;
	}
	.fs-source-btn {
		padding: 0.2rem 0.6rem;
		background: var(--color-bg-tertiary);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-pill);
		color: var(--color-text-tertiary);
		font-size: 0.7rem;
		font-weight: 600;
		letter-spacing: 0.02em;
		cursor: pointer;
		transition: background var(--transition-fast), color var(--transition-fast),
			border-color var(--transition-fast), scale var(--transition-fast);
	}
	.fs-source-btn:hover {
		scale: 1.05;
	}
	.fs-source-btn.is-on {
		background: color-mix(in srgb, var(--color-primary) 15%, transparent);
		border-color: var(--color-primary);
		color: var(--color-primary);
	}
	.fs-sources-sep {
		width: 1px;
		align-self: stretch;
		margin-inline: 0.15rem;
		background: var(--color-border);
	}
	/* The ready-meal pill excludes rather than includes, so it gets its own accent —
	   "on" here means results are being removed, not a database added. */
	.fs-rm-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
	}
	.fs-rm-btn.is-on {
		background: color-mix(in srgb, var(--orange) 15%, transparent);
		border-color: var(--orange);
		color: var(--orange);
	}
	.fs-scan-error {
		font-size: 0.78rem;
		color: var(--red);
		margin: 0.3rem 0;
	}
	.fs-no-results {
		font-size: 0.82rem;
		color: var(--color-text-tertiary);
		margin: 0.5rem 0;
		text-align: center;
	}

	/* ── Barcode scanner ── */
	.fs-scanner {
		position: relative;
		border-radius: 10px;
		overflow: hidden;
		background: #000;
	}
	.fs-scanner-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.5rem 0.65rem;
		background: rgba(0,0,0,0.7);
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		z-index: 2;
	}
	.fs-scanner-title {
		font-size: 0.82rem;
		font-weight: 600;
		color: #fff;
	}
	.fs-scanner-close {
		display: flex;
		background: none;
		border: none;
		color: #fff;
		cursor: pointer;
		padding: 0.2rem;
	}
	.fs-scanner-video {
		width: 100%;
		display: block;
		max-height: 260px;
		object-fit: cover;
	}
	.fs-scanner-loading {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		background: #000;
	}
	.fs-scanner-loading :global(.spin) {
		animation: spin 1s linear infinite;
		color: #88c0d0;
	}
	.fs-scanner-overlay {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		pointer-events: none;
	}
	.fs-scanner-reticle {
		width: 70%;
		height: 40%;
		border: 2px solid rgba(136, 192, 208, 0.8);
		border-radius: 8px;
		box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.35);
		animation: fs-pulse 2s ease-in-out infinite;
	}
	@keyframes fs-pulse {
		0%, 100% { border-color: rgba(136, 192, 208, 0.8); }
		50% { border-color: rgba(136, 192, 208, 0.3); }
	}

	.fs-scan-debug {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		padding: 0.35rem 0.5rem;
		background: rgba(0,0,0,0.75);
		color: #88c0d0;
		font-size: 0.65rem;
		font-family: monospace;
		word-break: break-all;
		z-index: 3;
	}

	/* ── Results ── */
	.fs-results {
		max-height: 260px;
		overflow-y: auto;
		border-radius: 8px;
		border: 1px solid var(--color-border);
	}
	.fs-result-row {
		display: flex;
		align-items: center;
		border-bottom: 1px solid var(--color-border);
	}
	.fs-result-row:last-child {
		border-bottom: none;
	}
	.fs-fav {
		background: none;
		border: none;
		cursor: pointer;
		padding: 0.4rem;
		color: var(--color-text-tertiary);
		flex-shrink: 0;
		display: flex;
		transition: color 0.15s;
	}
	.fs-fav.is-fav { color: var(--red); }
	/* Trailing twin of .fs-fav: same box (14px icon + 0.4rem padding either side),
	   so rows line up whichever side the toggle sits on. */
	.fs-fav-mark {
		background: none;
		border: none;
		cursor: pointer;
		padding: 0.4rem;
		color: var(--color-text-tertiary);
		flex-shrink: 0;
		display: flex;
		justify-content: center;
		transition: color 0.15s;
	}
	.fs-fav-mark.is-fav { color: var(--red); }
	.fs-fav:hover, .fs-fav-mark:hover { color: var(--red); }

	.fs-result {
		display: flex;
		justify-content: space-between;
		align-items: center;
		flex: 1;
		min-width: 0;
		padding: 0.55rem 0.65rem;
		background: none;
		border: none;
		cursor: pointer;
		text-align: left;
		color: var(--color-text-primary);
		gap: 0.75rem;
		transition: background 0.12s;
	}
	.fs-result:hover {
		background: var(--color-bg-elevated);
	}
	.fs-result-info {
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
	}
	.fs-result-name {
		font-size: 0.83rem;
		font-weight: 500;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.fs-result-meta {
		font-size: 0.68rem;
		color: var(--color-text-tertiary);
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}
	.fs-result-brands {
		font-style: italic;
	}
	.fs-source-badge {
		display: inline-block;
		font-size: 0.55rem;
		font-weight: 700;
		letter-spacing: 0.04em;
		padding: 0.05rem 0.25rem;
		border-radius: 3px;
		background: var(--color-bg-elevated);
		color: var(--color-text-tertiary);
		vertical-align: middle;
	}
	.fs-source-badge.usda {
		background: color-mix(in srgb, var(--blue) 15%, transparent);
		color: var(--blue);
	}
	.fs-source-badge.off {
		background: color-mix(in srgb, var(--purple) 15%, transparent);
		color: var(--purple);
	}
	.fs-source-badge.recipe {
		background: color-mix(in srgb, var(--green) 15%, transparent);
		color: var(--green);
		font-size: 0.7rem;
		padding: 0.02rem 0.15rem;
	}
	.fs-result-cal {
		font-size: 0.85rem;
		font-weight: 700;
		color: var(--color-text-primary);
		white-space: nowrap;
		flex-shrink: 0;
		font-variant-numeric: tabular-nums;
	}
	.fs-result-cal small {
		font-size: 0.65rem;
		font-weight: 500;
		color: var(--color-text-tertiary);
	}
	.fs-detail-link {
		display: flex;
		padding: 0.4rem;
		color: var(--color-text-tertiary);
		flex-shrink: 0;
		transition: color 0.15s;
	}
	.fs-detail-link:hover {
		color: var(--blue);
	}

	/* ── Selected food ── */
	.fs-selected {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}
	.fs-selected-name {
		font-weight: 700;
		font-size: 0.9rem;
		letter-spacing: -0.01em;
		display: flex;
		align-items: center;
		gap: 0.35rem;
	}
	.fs-selected-brands {
		font-size: 0.72rem;
		color: var(--color-text-tertiary);
		font-style: italic;
	}
	/* ── Micronutrient disclosure ── */
	.fs-micro-toggle {
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
		padding: 0.45rem 0.65rem;
		background: var(--color-bg-tertiary);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		color: var(--color-text-secondary);
		font-size: 0.78rem;
		font-weight: 600;
		cursor: pointer;
		transition: background var(--transition-fast), color var(--transition-fast);
	}
	.fs-micro-toggle:hover {
		background: var(--color-bg-elevated);
		color: var(--color-text-primary);
	}
	.fs-micro-toggle :global(.fs-micro-chevron) {
		transition: rotate var(--transition-normal);
	}
	.fs-micro-toggle.is-open :global(.fs-micro-chevron) {
		rotate: 180deg;
	}
	.fs-micros {
		max-height: 220px;
		overflow-y: auto;
		padding: 0.1rem 0.15rem;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	.fs-micro-title {
		margin: 0.2rem 0 0.15rem;
		font-size: 0.66rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-text-tertiary);
	}
	.fs-micro-row {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 0.5rem;
		padding: 0.2rem 0;
		border-bottom: 1px solid var(--color-border);
		font-size: 0.76rem;
	}
	.fs-micro-row:last-child {
		border-bottom: none;
	}
	.fs-micro-label {
		color: var(--color-text-secondary);
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.fs-micro-value {
		color: var(--color-text-primary);
		font-weight: 600;
		white-space: nowrap;
		font-variant-numeric: tabular-nums;
	}
	.fs-micro-value small {
		font-weight: 500;
		color: var(--color-text-tertiary);
	}

	/* ── Buttons ── */
	.fs-actions {
		display: flex;
		gap: 0.5rem;
		justify-content: flex-end;
	}
	.fs-btn-cancel {
		padding: 0.5rem 1.1rem;
		background: var(--color-bg-tertiary);
		color: var(--color-text-secondary);
		border: 1px solid var(--color-border);
		border-radius: 8px;
		cursor: pointer;
		font-size: 0.82rem;
		font-weight: 500;
		flex: 1;
		transition: background 0.15s;
	}
	.fs-btn-cancel:hover {
		background: var(--color-bg-elevated);
	}
	.fs-btn-confirm {
		padding: 0.5rem 1.1rem;
		background: var(--color-primary);
		color: var(--color-text-on-primary);
		border: none;
		border-radius: 8px;
		cursor: pointer;
		font-size: 0.82rem;
		font-weight: 700;
		flex: 2;
		transition: opacity 0.15s, transform 0.1s;
	}
	.fs-btn-confirm:hover {
		opacity: 0.9;
	}
	.fs-btn-confirm:active {
		transform: scale(0.97);
	}
</style>
