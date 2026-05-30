<script lang="ts">
	import { onMount } from 'svelte';
	import {
		loadBitmap,
		renderToBlob,
		fitWithin,
		blobToFile,
		formatBytes,
		type CropRect
	} from '$lib/js/imageEdit';

	type Props = {
		file: File;
		shortName?: string;
		onApply: (file: File, url: string) => void;
		onCancel: () => void;
	};

	let { file, shortName = '', onApply, onCancel }: Props = $props();

	const MIN_CROP = 24; // minimum crop edge, source px

	const RATIOS = [
		{ key: 'free', label: 'Frei' },
		{ key: 'orig', label: 'Original' },
		{ key: '1:1', label: '1:1', value: 1 },
		{ key: '4:3', label: '4:3', value: 4 / 3 },
		{ key: '3:2', label: '3:2', value: 3 / 2 },
		{ key: '16:9', label: '16:9', value: 16 / 9 }
	] as const;

	const RES_PRESETS = [1000, 1500, 2000, 0]; // 0 = Original

	let bitmap = $state<ImageBitmap | null>(null);
	let imgW = $state(0);
	let imgH = $state(0);
	let loadError = $state('');

	let crop = $state<CropRect>({ x: 0, y: 0, w: 0, h: 0 });
	let ratioMode = $state<string>('free');
	let maxRes = $state(2000);
	let quality = $state(92);

	// Live-encode output
	let outBlob = $state<Blob | null>(null);
	let outUrl = $state('');
	let outW = $state(0);
	let outH = $state(0);
	let encoding = $state(false);

	// Stage measurement
	let stageW = $state(0);
	let stageH = $state(0);
	let stageCanvas = $state<HTMLCanvasElement | null>(null);

	const activeRatio = $derived.by(() => {
		const r = RATIOS.find((x) => x.key === ratioMode);
		if (!r) return null;
		if (r.key === 'orig') return imgH ? imgW / imgH : null;
		return 'value' in r ? r.value : null;
	});

	// Fit the source image into the available stage area (display pixels).
	const displayScale = $derived.by(() => {
		if (!imgW || !imgH || !stageW || !stageH) return 1;
		const availW = Math.max(1, stageW - 24);
		const availH = Math.max(1, stageH - 24);
		return Math.min(availW / imgW, availH / imgH);
	});
	const dispW = $derived(Math.round(imgW * displayScale));
	const dispH = $derived(Math.round(imgH * displayScale));

	function clamp(v: number, lo: number, hi: number) {
		return Math.max(lo, Math.min(hi, v));
	}

	onMount(() => {
		let cancelled = false;
		(async () => {
			try {
				const bm = await loadBitmap(file);
				if (cancelled) {
					bm.close?.();
					return;
				}
				bitmap = bm;
				imgW = bm.width;
				imgH = bm.height;
				crop = { x: 0, y: 0, w: bm.width, h: bm.height };
			} catch {
				loadError = 'Bild konnte nicht geladen werden.';
			}
		})();
		return () => {
			cancelled = true;
		};
	});

	// Draw the source onto the display canvas whenever it or the layout changes.
	$effect(() => {
		const cv = stageCanvas;
		const bm = bitmap;
		const w = dispW;
		const h = dispH;
		if (!cv || !bm || w <= 0 || h <= 0) return;
		cv.width = w;
		cv.height = h;
		const ctx = cv.getContext('2d');
		if (!ctx) return;
		ctx.imageSmoothingEnabled = true;
		ctx.imageSmoothingQuality = 'high';
		ctx.clearRect(0, 0, w, h);
		ctx.drawImage(bm, 0, 0, imgW, imgH, 0, 0, w, h);
	});

	// Debounced live encode — runs whenever crop / resolution / quality change.
	let encodeToken = 0;
	$effect(() => {
		const bm = bitmap;
		if (!bm) return;
		const c = { ...crop };
		const mr = maxRes;
		const q = quality;
		const token = ++encodeToken;
		encoding = true;
		const timer = setTimeout(async () => {
			try {
				const blob = await renderToBlob(bm, c, mr, q);
				if (token !== encodeToken) return;
				const size = fitWithin(c.w, c.h, mr);
				if (outUrl) URL.revokeObjectURL(outUrl);
				outBlob = blob;
				outUrl = URL.createObjectURL(blob);
				outW = size.w;
				outH = size.h;
			} catch {
				/* transient encode failure — next change retries */
			} finally {
				if (token === encodeToken) encoding = false;
			}
		}, 200);
		return () => clearTimeout(timer);
	});

	$effect(() => {
		return () => {
			if (outUrl) URL.revokeObjectURL(outUrl);
			bitmap?.close?.();
		};
	});

	// --- Crop drag handling ---
	type Drag = { handle: string; hx: number; hy: number; px: number; py: number; start: CropRect };
	let drag: Drag | null = null;

	function startDrag(e: PointerEvent, handle: string, hx: number, hy: number) {
		e.preventDefault();
		e.stopPropagation();
		(e.currentTarget as Element).setPointerCapture(e.pointerId);
		drag = { handle, hx, hy, px: e.clientX, py: e.clientY, start: { ...crop } };
	}

	function onPointerMove(e: PointerEvent) {
		if (!drag || displayScale === 0) return;
		const ddx = (e.clientX - drag.px) / displayScale;
		const ddy = (e.clientY - drag.py) / displayScale;
		const s = drag.start;

		if (drag.handle === 'move') {
			crop = {
				x: clamp(s.x + ddx, 0, imgW - s.w),
				y: clamp(s.y + ddy, 0, imgH - s.h),
				w: s.w,
				h: s.h
			};
			return;
		}

		let left = s.x;
		let top = s.y;
		let right = s.x + s.w;
		let bottom = s.y + s.h;
		if (drag.hx === 1) right = s.x + s.w + ddx;
		else if (drag.hx === -1) left = s.x + ddx;
		if (drag.hy === 1) bottom = s.y + s.h + ddy;
		else if (drag.hy === -1) top = s.y + ddy;

		const r = activeRatio;
		if (r) {
			if (drag.hx !== 0 && drag.hy !== 0) {
				const nw = Math.max(MIN_CROP, right - left);
				const nh = nw / r;
				if (drag.hy === 1) bottom = top + nh;
				else top = bottom - nh;
			} else if (drag.hx !== 0) {
				const cy = s.y + s.h / 2;
				const nh = Math.max(MIN_CROP, right - left) / r;
				top = cy - nh / 2;
				bottom = cy + nh / 2;
			} else if (drag.hy !== 0) {
				const cx = s.x + s.w / 2;
				const nw = Math.max(MIN_CROP, bottom - top) * r;
				left = cx - nw / 2;
				right = cx + nw / 2;
			}
		}

		left = Math.max(0, left);
		top = Math.max(0, top);
		right = Math.min(imgW, right);
		bottom = Math.min(imgH, bottom);
		if (right - left < MIN_CROP) {
			if (drag.hx === -1) left = right - MIN_CROP;
			else right = left + MIN_CROP;
		}
		if (bottom - top < MIN_CROP) {
			if (drag.hy === -1) top = bottom - MIN_CROP;
			else bottom = top + MIN_CROP;
		}
		left = Math.max(0, left);
		top = Math.max(0, top);
		right = Math.min(imgW, right);
		bottom = Math.min(imgH, bottom);

		crop = { x: left, y: top, w: right - left, h: bottom - top };
	}

	function endDrag() {
		// Pointer capture is released implicitly on pointerup.
		drag = null;
	}

	function selectRatio(key: string) {
		ratioMode = key;
		const r = RATIOS.find((x) => x.key === key);
		const value = r && r.key === 'orig' ? imgW / imgH : r && 'value' in r ? r.value : null;
		if (!value) return; // 'free' keeps the current crop
		// Fit a centred rect of this ratio inside the current crop.
		const cx = crop.x + crop.w / 2;
		const cy = crop.y + crop.h / 2;
		let nw = crop.w;
		let nh = nw / value;
		if (nh > crop.h) {
			nh = crop.h;
			nw = nh * value;
		}
		nw = Math.min(nw, imgW);
		nh = Math.min(nh, imgH);
		crop = {
			x: clamp(cx - nw / 2, 0, imgW - nw),
			y: clamp(cy - nh / 2, 0, imgH - nh),
			w: nw,
			h: nh
		};
	}

	function resetCrop() {
		ratioMode = 'free';
		crop = { x: 0, y: 0, w: imgW, h: imgH };
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			e.preventDefault();
			onCancel();
		}
	}

	function apply() {
		if (!outBlob || !outUrl) return;
		const url = outUrl;
		const f = blobToFile(outBlob, shortName);
		outUrl = ''; // hand the object URL off to the caller; don't revoke it
		onApply(f, url);
	}

	const handles = [
		{ key: 'nw', hx: -1, hy: -1 },
		{ key: 'n', hx: 0, hy: -1 },
		{ key: 'ne', hx: 1, hy: -1 },
		{ key: 'e', hx: 1, hy: 0 },
		{ key: 'se', hx: 1, hy: 1 },
		{ key: 's', hx: 0, hy: 1 },
		{ key: 'sw', hx: -1, hy: 1 },
		{ key: 'w', hx: -1, hy: 0 }
	];
</script>

<svelte:window onkeydown={onKeydown} />

<div
	class="backdrop"
	role="dialog"
	aria-modal="true"
	aria-label="Bild bearbeiten"
	tabindex="-1"
>
	<button type="button" class="scrim" aria-label="Schliessen" onclick={onCancel}></button>

	<div class="panel">
		<header class="panel-head">
			<h2>Bild bearbeiten</h2>
			<button type="button" class="ghost" onclick={onCancel} aria-label="Abbrechen">✕</button>
		</header>

		<div class="body">
			<!-- Stage -->
			<div class="stage" bind:clientWidth={stageW} bind:clientHeight={stageH}>
				{#if loadError}
					<p class="stage-msg">{loadError}</p>
				{:else if !bitmap}
					<p class="stage-msg">Lade Bild…</p>
				{:else}
					<div class="frame" style:width="{dispW}px" style:height="{dispH}px">
						<canvas bind:this={stageCanvas}></canvas>
						<div
							class="crop"
							style:left="{crop.x * displayScale}px"
							style:top="{crop.y * displayScale}px"
							style:width="{crop.w * displayScale}px"
							style:height="{crop.h * displayScale}px"
							role="application"
							aria-label="Zuschneidebereich verschieben"
							onpointerdown={(e) => startDrag(e, 'move', 0, 0)}
							onpointermove={onPointerMove}
							onpointerup={endDrag}
							onpointercancel={endDrag}
						>
							<span class="third v1"></span>
							<span class="third v2"></span>
							<span class="third h1"></span>
							<span class="third h2"></span>
							{#each handles as h (h.key)}
								<button
									type="button"
									class="handle h-{h.key}"
									aria-label="Ziehpunkt {h.key}"
									onpointerdown={(e) => startDrag(e, h.key, h.hx, h.hy)}
								></button>
							{/each}
						</div>
					</div>
				{/if}
			</div>

			<!-- Controls -->
			<div class="rail">
				<div class="preview">
					<div class="preview-img" class:busy={encoding}>
						{#if outUrl}
							<!-- svelte-ignore a11y_missing_attribute -->
							<img src={outUrl} />
						{/if}
					</div>
					<dl class="stats">
						<div><dt>Auflösung</dt><dd>{outW || '—'} × {outH || '—'}</dd></div>
						<div>
							<dt>Dateigrösse</dt>
							<dd class="size">{outBlob ? formatBytes(outBlob.size) : '—'}</dd>
						</div>
					</dl>
				</div>

				<fieldset class="group">
					<legend>Seitenverhältnis</legend>
					<div class="chips">
						{#each RATIOS as r (r.key)}
							<button
								type="button"
								class="chip"
								class:active={ratioMode === r.key}
								onclick={() => selectRatio(r.key)}>{r.label}</button
							>
						{/each}
					</div>
				</fieldset>

				<fieldset class="group">
					<legend>Max. Auflösung</legend>
					<div class="chips">
						{#each RES_PRESETS as p (p)}
							<button
								type="button"
								class="chip"
								class:active={maxRes === p}
								onclick={() => (maxRes = p)}>{p === 0 ? 'Original' : p}</button
							>
						{/each}
					</div>
					<label class="custom">
						<span>Eigene Kante</span>
						<input type="number" min="0" step="50" bind:value={maxRes} />
						<span class="unit">px</span>
					</label>
				</fieldset>

				<fieldset class="group">
					<legend>WebP-Qualität</legend>
					<div class="quality">
						<input type="range" min="1" max="100" step="1" bind:value={quality} />
						<output>{quality}</output>
					</div>
				</fieldset>

				<button type="button" class="reset" onclick={resetCrop}>Zuschnitt zurücksetzen</button>
			</div>
		</div>

		<footer class="panel-foot">
			<button type="button" class="btn ghost-btn" onclick={onCancel}>Abbrechen</button>
			<button type="button" class="btn primary" disabled={!outBlob} onclick={apply}>
				Übernehmen
			</button>
		</footer>
	</div>
</div>

<style>
	.backdrop {
		position: fixed;
		inset: 0;
		z-index: 1000;
		display: grid;
		place-items: center;
		padding: clamp(0px, 2vw, 1.5rem);
	}
	.scrim {
		all: unset;
		position: absolute;
		inset: 0;
		background: rgba(10, 14, 20, 0.6);
		backdrop-filter: blur(4px);
		cursor: pointer;
	}
	.panel {
		position: relative;
		z-index: 1;
		display: flex;
		flex-direction: column;
		width: min(1100px, 100%);
		height: min(760px, 100%);
		max-height: 100%;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-card);
		box-shadow: var(--shadow-lg);
		overflow: hidden;
	}
	.panel-head,
	.panel-foot {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 0.85rem 1.25rem;
		flex-shrink: 0;
	}
	.panel-head {
		justify-content: space-between;
		border-bottom: 1px solid var(--color-border);
	}
	.panel-head h2 {
		margin: 0;
		font-size: var(--text-lg, 1.2rem);
		color: var(--color-text-primary);
	}
	.panel-foot {
		justify-content: flex-end;
		border-top: 1px solid var(--color-border);
	}
	.ghost {
		all: unset;
		cursor: pointer;
		color: var(--color-text-secondary);
		font-size: 1.1rem;
		line-height: 1;
		padding: 0.35rem;
		border-radius: var(--radius-sm);
	}
	.ghost:hover {
		color: var(--color-text-primary);
		background: var(--color-bg-elevated);
	}

	.body {
		display: grid;
		grid-template-columns: 1fr 320px;
		flex: 1;
		min-height: 0;
	}

	/* Stage */
	.stage {
		position: relative;
		display: grid;
		place-items: center;
		min-height: 0;
		background:
			repeating-conic-gradient(var(--color-bg-secondary) 0% 25%, transparent 0% 50%) 50% / 24px 24px;
		background-color: var(--color-bg-tertiary);
		overflow: hidden;
	}
	.stage-msg {
		color: var(--color-text-secondary);
		font-size: var(--text-sm);
	}
	.frame {
		position: relative;
		touch-action: none;
		box-shadow: var(--shadow-md);
	}
	.frame canvas {
		display: block;
		width: 100%;
		height: 100%;
	}
	.crop {
		position: absolute;
		box-sizing: border-box;
		border: 1px solid rgba(255, 255, 255, 0.95);
		box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.5);
		cursor: move;
		touch-action: none;
	}
	.third {
		position: absolute;
		background: rgba(255, 255, 255, 0.35);
		pointer-events: none;
	}
	.third.v1,
	.third.v2 {
		top: 0;
		bottom: 0;
		width: 1px;
	}
	.third.v1 {
		left: 33.33%;
	}
	.third.v2 {
		left: 66.66%;
	}
	.third.h1,
	.third.h2 {
		left: 0;
		right: 0;
		height: 1px;
	}
	.third.h1 {
		top: 33.33%;
	}
	.third.h2 {
		top: 66.66%;
	}
	.handle {
		all: unset;
		position: absolute;
		width: 14px;
		height: 14px;
		box-sizing: border-box;
		background: var(--color-primary);
		border: 2px solid white;
		border-radius: 50%;
		cursor: pointer;
		touch-action: none;
	}
	.h-nw {
		top: -7px;
		left: -7px;
		cursor: nwse-resize;
	}
	.h-ne {
		top: -7px;
		right: -7px;
		cursor: nesw-resize;
	}
	.h-se {
		bottom: -7px;
		right: -7px;
		cursor: nwse-resize;
	}
	.h-sw {
		bottom: -7px;
		left: -7px;
		cursor: nesw-resize;
	}
	.h-n {
		top: -7px;
		left: calc(50% - 7px);
		cursor: ns-resize;
	}
	.h-s {
		bottom: -7px;
		left: calc(50% - 7px);
		cursor: ns-resize;
	}
	.h-e {
		right: -7px;
		top: calc(50% - 7px);
		cursor: ew-resize;
	}
	.h-w {
		left: -7px;
		top: calc(50% - 7px);
		cursor: ew-resize;
	}

	/* Rail */
	.rail {
		display: flex;
		flex-direction: column;
		gap: 1.1rem;
		padding: 1.1rem;
		overflow-y: auto;
		border-left: 1px solid var(--color-border);
		background: var(--color-bg-secondary);
	}
	.preview {
		display: flex;
		gap: 0.85rem;
		align-items: center;
	}
	.preview-img {
		flex-shrink: 0;
		width: 96px;
		height: 96px;
		border-radius: var(--radius-md);
		background: var(--color-bg-tertiary);
		border: 1px solid var(--color-border);
		overflow: hidden;
		display: grid;
		place-items: center;
		transition: opacity 150ms ease;
	}
	.preview-img.busy {
		opacity: 0.55;
	}
	.preview-img img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	.stats {
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	.stats dt {
		font-size: var(--text-sm, 0.8rem);
		color: var(--color-text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}
	.stats dd {
		margin: 0;
		font-size: var(--text-md, 1rem);
		color: var(--color-text-primary);
		font-variant-numeric: tabular-nums;
	}
	.stats dd.size {
		font-weight: 700;
		color: var(--color-primary);
	}

	.group {
		border: none;
		margin: 0;
		padding: 0;
		min-width: 0;
	}
	.group legend {
		padding: 0;
		font-size: var(--text-sm, 0.8rem);
		color: var(--color-text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.04em;
		margin-bottom: 0.5rem;
	}
	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
	}
	.chip {
		all: unset;
		cursor: pointer;
		padding: 0.35rem 0.7rem;
		border-radius: var(--radius-pill);
		background: var(--color-bg-tertiary);
		border: 1px solid var(--color-border);
		color: var(--color-text-secondary);
		font-size: var(--text-sm, 0.85rem);
		transition: var(--transition-fast);
	}
	.chip:hover {
		background: var(--color-bg-elevated);
		color: var(--color-text-primary);
	}
	.chip.active {
		background: var(--color-primary);
		border-color: var(--color-primary);
		color: var(--color-text-on-primary);
	}
	.custom {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-top: 0.6rem;
		font-size: var(--text-sm, 0.85rem);
		color: var(--color-text-secondary);
	}
	.custom input {
		width: 6ch;
		padding: 0.3rem 0.5rem;
		background: var(--color-bg-tertiary);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		color: var(--color-text-primary);
		font: inherit;
	}
	.custom .unit {
		color: var(--color-text-tertiary);
	}
	.quality {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}
	.quality input[type='range'] {
		flex: 1;
		accent-color: var(--color-primary);
	}
	.quality output {
		min-width: 2.5ch;
		text-align: right;
		font-variant-numeric: tabular-nums;
		font-weight: 700;
		color: var(--color-text-primary);
	}
	.reset {
		all: unset;
		cursor: pointer;
		text-align: center;
		padding: 0.5rem;
		border-radius: var(--radius-md);
		border: 1px solid var(--color-border);
		color: var(--color-text-secondary);
		font-size: var(--text-sm, 0.85rem);
		transition: var(--transition-fast);
	}
	.reset:hover {
		background: var(--color-bg-elevated);
		color: var(--color-text-primary);
	}

	.btn {
		all: unset;
		cursor: pointer;
		padding: 0.6rem 1.4rem;
		border-radius: var(--radius-pill);
		font-weight: 600;
		transition: var(--transition-fast);
	}
	.ghost-btn {
		color: var(--color-text-secondary);
	}
	.ghost-btn:hover {
		background: var(--color-bg-elevated);
		color: var(--color-text-primary);
	}
	.primary {
		background: var(--color-primary);
		color: var(--color-text-on-primary);
	}
	.primary:hover {
		background: var(--color-primary-hover);
	}
	.primary:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	@media (max-width: 760px) {
		.panel {
			height: 100%;
			border-radius: 0;
		}
		.body {
			grid-template-columns: 1fr;
			grid-template-rows: minmax(0, 1fr) auto;
		}
		.rail {
			border-left: none;
			border-top: 1px solid var(--color-border);
			max-height: 45dvh;
		}
	}
</style>
