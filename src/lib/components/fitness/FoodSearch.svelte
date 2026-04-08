<script>
	import { page } from '$app/stores';
	import { browser } from '$app/environment';
	import { Heart, ExternalLink, ScanBarcode, X } from '@lucide/svelte';
	import { detectFitnessLang, fitnessSlugs, t } from '$lib/js/fitnessI18n';
	import MacroBreakdown from './MacroBreakdown.svelte';

	/**
	 * @type {{
	 *   onselect: (food: { name: string, source: string, sourceId: string, amountGrams: number, per100g: any, portions?: any[], selectedPortion?: { description: string, grams: number } }) => void,
	 *   oncancel?: () => void,
	 *   showFavorites?: boolean,
	 *   showDetailLinks?: boolean,
	 *   autofocus?: boolean,
	 *   confirmLabel?: string,
	 *   initialResults?: any[],
	 * }}
	 */
	let {
		onselect,
		oncancel = undefined,
		showFavorites = true,
		showDetailLinks = true,
		autofocus = false,
		confirmLabel = undefined,
		initialResults = undefined,
	} = $props();

	const lang = $derived(detectFitnessLang($page.url.pathname));
	const s = $derived(fitnessSlugs(lang));
	const isEn = $derived(lang === 'en');
	const btnLabel = $derived(confirmLabel ?? t('log_food', lang));

	// --- Search state ---
	let query = $state('');
	let results = $state(initialResults ?? []);
	let loading = $state(false);
	let timeout = $state(null);
	const isPrefilledMode = $derived(initialResults != null);
	let filterQuery = $state('');
	const displayResults = $derived(
		isPrefilledMode && filterQuery
			? results.filter(r => r.name.toLowerCase().includes(filterQuery.toLowerCase()))
			: results
	);

	// --- Selection state ---
	let selected = $state(null);
	let amountInput = $state('100');
	let portionIdx = $state(-1); // -1 = grams

	// --- Barcode scanner state ---
	let scanning = $state(false);
	let scanError = $state('');
	let videoEl = $state(null);
	let scanStream = $state(null);
	let scanDebug = $state('');


	function doSearch() {
		if (timeout) clearTimeout(timeout);
		if (query.length < 2) {
			results = [];
			return;
		}
		loading = true;
		timeout = setTimeout(async () => {
			try {
				const favParam = showFavorites ? '&favorites=true' : '';
				const res = await fetch(`/api/nutrition/search?q=${encodeURIComponent(query)}&full=true${favParam}`);
				if (res.ok) results = await res.json();
			} catch {} finally {
				loading = false;
			}
		}, 300);
	}

	function selectItem(item) {
		selected = item;
		if (item.portions?.length > 0) {
			portionIdx = 0;
			amountInput = '1';
		} else {
			portionIdx = -1;
			amountInput = '100';
		}
	}

	function resolveGrams() {
		const qty = Number(amountInput) || 0;
		if (portionIdx >= 0 && selected?.portions?.[portionIdx]) {
			return Math.round(qty * selected.portions[portionIdx].grams);
		}
		return qty;
	}

	const previewGrams = $derived.by(() => {
		const qty = Number(amountInput) || 0;
		if (portionIdx >= 0 && selected?.portions?.[portionIdx]) {
			return Math.round(qty * selected.portions[portionIdx].grams);
		}
		return qty;
	});

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

	function confirm() {
		if (!selected) return;
		const grams = resolveGrams();
		if (!grams || grams <= 0) return;

		const food = {
			name: selected.name,
			source: selected.source,
			sourceId: selected.id,
			amountGrams: grams,
			per100g: selected.per100g,
		};
		if (selected.portions?.length > 0) {
			food.portions = selected.portions;
		}
		if (portionIdx >= 0 && selected.portions?.[portionIdx]) {
			food.selectedPortion = selected.portions[portionIdx];
		}
		onselect(food);
		reset();
	}

	function reset() {
		selected = null;
		query = '';
		results = [];
		amountInput = '100';
		portionIdx = -1;
	}

	async function toggleFavorite(item) {
		const wasFav = item.favorited;
		item.favorited = !wasFav;
		results = [...results];
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
		} catch {
			item.favorited = wasFav;
			results = [...results];
		}
	}



	function sourceLabel(source) {
		if (source === 'bls') return 'BLS';
		if (source === 'usda') return 'USDA';
		if (source === 'off') return 'OFF';
		if (source === 'recipe') return '🍴';
		return source?.toUpperCase() ?? '';
	}

	// EAN/UPC check digit validation (works for EAN-8, UPC-A, EAN-13)
	function validCheckDigit(code) {
		const digits = code.split('').map(Number);
		const check = digits.pop();
		const sum = digits.reduce((s, d, i) => s + d * ((i % 2 === (digits.length % 2 === 0 ? 0 : 1)) ? 1 : 3), 0);
		return (10 - (sum % 10)) % 10 === check;
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

			// Use native BarcodeDetector if available, else ponyfill with self-hosted WASM
			let detector;
			const formats = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128'];
			try {
				if ('BarcodeDetector' in globalThis) {
					const supported = await globalThis.BarcodeDetector.getSupportedFormats();
					if (supported.includes('ean_13')) {
						detector = new globalThis.BarcodeDetector({ formats });
					}
				}
			} catch {
				// native not usable, fall through to ponyfill
			}
			if (!detector) {
				try {
					const mod = await import('barcode-detector/ponyfill');
					await mod.prepareZXingModule({
						overrides: {
							locateFile: (path, prefix) => {
								if (path.endsWith('.wasm')) return '/fitness/zxing_reader.wasm';
								return prefix + path;
							},
						},
						fireImmediately: true,
					});
					detector = new mod.BarcodeDetector({ formats });
				} catch (importErr) {
					scanError = isEn ? 'Barcode library failed to load. Try reloading.' : 'Barcode-Bibliothek konnte nicht geladen werden. Seite neu laden.';
					stopScan();
					return;
				}
			}

			let lastCode = '';
			let confirmCount = 0;
			let errorCount = 0;
			const CONFIRM_THRESHOLD = 2;

			const detectLoop = async () => {
				while (scanning && videoEl) {
					try {
						if (videoEl.videoWidth === 0 || videoEl.videoHeight === 0) {
							await new Promise(r => setTimeout(r, 500));
							continue;
						}

						const bitmap = await createImageBitmap(videoEl);
						const results = await detector.detect(bitmap);
						bitmap.close();

						if (results.length > 0) {
							const code = results[0].rawValue;
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
						scanDebug = `ERROR: ${detectErr?.name}: ${detectErr?.message}`;
						if (errorCount >= 5) {
							scanError = isEn ? 'Barcode detection failed repeatedly. Try reloading.' : 'Barcode-Erkennung wiederholt fehlgeschlagen. Seite neu laden.';
							stopScan();
							return;
						}
					}
					await new Promise(r => setTimeout(r, 200));
				}
			};
			detectLoop();
		} catch (err) {
			scanning = false;
			const name = err?.name;
			if (name === 'NotAllowedError') {
				scanError = isEn
					? 'Camera permission denied — enable it in your browser site settings'
					: 'Kamerazugriff verweigert — in den Browser-Seiteneinstellungen aktivieren';
			} else if (name === 'NotFoundError') {
				scanError = isEn ? 'No camera found' : 'Keine Kamera gefunden';
			} else if (name === 'NotReadableError') {
				scanError = isEn ? 'Camera is in use by another app' : 'Kamera wird von einer anderen App verwendet';
			} else {
				scanError = isEn ? `Camera error: ${err?.message || name}` : `Kamerafehler: ${err?.message || name}`;
			}
		}
	}

	function stopScan() {
		scanning = false;
		if (scanStream) {
			for (const track of scanStream.getTracks()) track.stop();
			scanStream = null;
		}
		if (videoEl) videoEl.srcObject = null;
	}

	async function lookupBarcode(code) {
		loading = true;
		scanError = '';
		try {
			const res = await fetch(`/api/nutrition/barcode?code=${encodeURIComponent(code)}`);
			if (!res.ok) {
				scanError = isEn ? `No product found for barcode ${code}` : `Kein Produkt gefunden für Barcode ${code}`;
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
		<video bind:this={videoEl} class="fs-scanner-video" playsinline></video>
		<div class="fs-scanner-overlay">
			<div class="fs-scanner-reticle"></div>
		</div>
		{#if scanDebug}
			<div class="fs-scan-debug">{scanDebug}</div>
		{/if}
	</div>
{:else if !selected}
	{#if isPrefilledMode}
		{#if results.length > 3}
			<input
				type="text"
				class="fs-filter-input"
				placeholder={isEn ? 'Filter…' : 'Filtern…'}
				bind:value={filterQuery}
			/>
		{/if}
	{:else}
		<div class="fs-search-row">
			<!-- svelte-ignore a11y_autofocus -->
			<input
				type="text"
				class="fs-search-input"
				placeholder={t('search_food', lang)}
				bind:value={query}
				oninput={doSearch}
				autofocus={autofocus}
			/>
			{#if query}
				<button class="fs-clear-btn" onclick={() => { query = ''; results = []; }} aria-label="Clear">
					<X size={16} />
				</button>
			{/if}
			{#if browser}
				<button class="fs-barcode-btn" onclick={startScan} aria-label={isEn ? 'Scan barcode' : 'Barcode scannen'}>
					<ScanBarcode size={20} />
				</button>
			{/if}
		</div>
	{/if}
	{#if scanError}
		<p class="fs-scan-error">{scanError}</p>
	{/if}
	{#if loading}
		<p class="fs-status">{t('loading', lang)}</p>
	{/if}
	{#if displayResults.length > 0}
		<div class="fs-results">
			{#each displayResults as item}
				<div class="fs-result-row">
					{#if showFavorites}
						<button class="fs-fav" class:is-fav={item.favorited} onclick={() => toggleFavorite(item)} aria-label="Toggle favorite">
							<Heart size={14} fill={item.favorited ? 'var(--nord11)' : 'none'} />
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
					{#if showDetailLinks && (item.source === 'bls' || item.source === 'usda')}
						<a class="fs-detail-link" href="/fitness/{s.nutrition}/food/{item.source}/{item.id}" aria-label="View details">
							<ExternalLink size={13} />
						</a>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
	{#if oncancel}
		<button class="fs-btn-cancel" onclick={oncancel}>{t('cancel', lang)}</button>
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

		<!-- Amount selector -->
		<div class="fs-amount-row">
			<input
				type="number"
				class="fs-amount-input"
				bind:value={amountInput}
				min="0.1"
				step={portionIdx >= 0 ? '0.5' : '1'}
			/>
			{#if selected.portions?.length > 0}
				<select class="fs-unit-select" bind:value={portionIdx} onchange={() => {
					const grams = resolveGrams();
					if (portionIdx >= 0 && selected.portions[portionIdx]) {
						amountInput = String(Math.round((grams / selected.portions[portionIdx].grams) * 10) / 10 || 1);
					} else {
						amountInput = String(grams || 100);
					}
				}}>
					<option value={-1}>g</option>
					{#each selected.portions as p, pi}
						<option value={pi}>{p.description} ({Math.round(p.grams)}g)</option>
					{/each}
				</select>
			{:else}
				<span class="fs-unit-label">g</span>
			{/if}
		</div>
		{#if portionIdx >= 0 && previewGrams > 0}
			<span class="fs-detail-hint">= {previewGrams}g</span>
		{/if}

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

		<div class="fs-actions">
			<button class="fs-btn-cancel" onclick={() => { selected = null; }}>{t('cancel', lang)}</button>
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
	.fs-search-input {
		flex: 1;
		padding: 0.55rem 0.65rem;
		background: var(--color-bg-tertiary);
		border: 1px solid var(--color-border);
		border-radius: 8px;
		color: var(--color-text-primary);
		font-size: 0.9rem;
		box-sizing: border-box;
		transition: border-color 0.15s;
		min-width: 0;
	}
	.fs-filter-input {
		display: block;
		width: 100%;
		padding: 0.55rem 0.65rem;
		background: var(--color-bg-tertiary);
		border: 1px solid var(--color-border);
		border-radius: 8px;
		color: var(--color-text-primary);
		font-size: 0.9rem;
		box-sizing: border-box;
		transition: border-color 0.15s;
		margin-bottom: 0.25rem;
	}
	.fs-filter-input:focus {
		outline: none;
		border-color: var(--color-primary);
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
	.fs-status {
		font-size: 0.78rem;
		color: var(--color-text-tertiary);
		margin: 0.4rem 0;
	}
	.fs-scan-error {
		font-size: 0.78rem;
		color: var(--nord11);
		margin: 0.3rem 0;
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
	.fs-fav.is-fav { color: var(--nord11); }
	.fs-fav:hover { color: var(--nord11); }

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
		background: color-mix(in srgb, var(--nord10) 15%, transparent);
		color: var(--nord10);
	}
	.fs-source-badge.off {
		background: color-mix(in srgb, var(--nord15) 15%, transparent);
		color: var(--nord15);
	}
	.fs-source-badge.recipe {
		background: color-mix(in srgb, var(--nord14) 15%, transparent);
		color: var(--nord14);
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
		color: var(--nord10);
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
	.fs-amount-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	.fs-amount-input {
		width: 5rem;
		padding: 0.45rem 0.55rem;
		background: var(--color-bg-tertiary);
		border: 1px solid var(--color-border);
		border-radius: 8px;
		color: var(--color-text-primary);
		font-size: 0.9rem;
		text-align: right;
		transition: border-color 0.15s;
		box-sizing: border-box;
	}
	.fs-amount-input:focus {
		outline: none;
		border-color: var(--nord8);
	}
	.fs-unit-select {
		padding: 0.45rem 0.4rem;
		background: var(--color-bg-tertiary);
		border: 1px solid var(--color-border);
		border-radius: 8px;
		color: var(--color-text-primary);
		font-size: 0.78rem;
		min-width: 0;
		flex: 1;
	}
	.fs-unit-select:focus {
		outline: none;
		border-color: var(--nord8);
	}
	.fs-unit-label {
		font-size: 0.85rem;
		color: var(--color-text-secondary);
	}

	/* ── Detail view ── */
	.fs-detail-hint {
		font-size: 0.75rem;
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
