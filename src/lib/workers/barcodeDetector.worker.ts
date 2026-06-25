/// <reference lib="webworker" />
// Off-main-thread barcode detection.
//
// The ZXing WASM ponyfill decodes a frame in ~100-300ms. Run on the main thread
// (as the BarcodeDetector ponyfill otherwise does) it repeatedly stalls the event
// loop and compositor, so the camera preview stutters. Here it runs in a worker:
// the main thread only grabs a cropped, downscaled ImageBitmap and transfers it in,
// keeping the viewport smooth. Native BarcodeDetector (when present) stays on the
// main thread instead — the browser offloads it internally and it's already fluid.

type DetectModule = {
	prepareZXingModule: (opts: unknown) => Promise<unknown>;
	BarcodeDetector: new (opts: { formats: string[] }) => {
		detect: (source: ImageBitmap) => Promise<Array<{ rawValue: string }>>;
	};
};

const ctx = self as unknown as DedicatedWorkerGlobalScope;

let detector: InstanceType<DetectModule['BarcodeDetector']> | null = null;
let initPromise: Promise<void> | null = null;

const FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128'];

async function init(wasmUrl: string): Promise<void> {
	const mod = (await import('barcode-detector/ponyfill')) as unknown as DetectModule;
	// Fetch the wasm ourselves and hand Emscripten the raw bytes (wasmBinary) instead of
	// letting it fetch via locateFile. This sidesteps instantiateStreaming MIME pitfalls
	// and the default CDN fallback — it instantiates straight from the buffer, same-origin.
	const resp = await fetch(wasmUrl);
	if (!resp.ok) throw new Error(`wasm fetch failed: ${resp.status} ${wasmUrl}`);
	const wasmBinary = await resp.arrayBuffer();
	await mod.prepareZXingModule({
		overrides: { wasmBinary },
		fireImmediately: true
	});
	detector = new mod.BarcodeDetector({ formats: FORMATS });
}

ctx.onmessage = async (e: MessageEvent) => {
	const data = e.data;

	if (data?.type === 'init') {
		try {
			initPromise ??= init(data.wasmUrl);
			await initPromise;
			ctx.postMessage({ type: 'ready' });
		} catch (err) {
			ctx.postMessage({ type: 'error', message: err instanceof Error ? err.message : String(err) });
		}
		return;
	}

	if (data?.type === 'detect') {
		const bitmap = data.bitmap as ImageBitmap;
		try {
			if (!detector) {
				bitmap.close();
				ctx.postMessage({ type: 'result', codes: [] });
				return;
			}
			const results = await detector.detect(bitmap);
			bitmap.close();
			ctx.postMessage({ type: 'result', codes: results.map((r) => r.rawValue) });
		} catch (err) {
			bitmap.close();
			ctx.postMessage({ type: 'detect-error', message: err instanceof Error ? err.message : String(err) });
		}
	}
};
