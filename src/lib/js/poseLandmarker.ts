/**
 * Shared, lazily-loaded MediaPipe PoseLandmarker.
 *
 * The model + WASM runtime (~17 MB) are downloaded once and the instance is
 * cached at module scope, so re-opening the form coach or switching exercises
 * reuses it instead of re-fetching (and re-showing the download bar). The model
 * bytes are streamed with a progress callback; the WASM is fetched alongside to
 * warm the HTTP cache so MediaPipe's own loader gets it instantly.
 */
import type { PoseLandmarker } from '@mediapipe/tasks-vision';

let cached: PoseLandmarker | null = null;
let inflight: Promise<PoseLandmarker> | null = null;

/** True once the model is loaded (so callers can skip any "downloading" UI). */
export function isPoseModelReady(): boolean {
	return cached !== null;
}

/** True if the browser supports WASM SIMD (picks the matching runtime build). */
function simdSupported(): boolean {
	try {
		// Minimal module that only validates when v128/SIMD is available.
		return WebAssembly.validate(
			new Uint8Array([
				0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 10, 10, 1, 8, 0, 65, 0, 253,
				15, 253, 98, 11
			])
		);
	} catch {
		return false;
	}
}

/**
 * Stream-download the given URLs, reporting combined progress (0..1, or -1 if
 * the total size is unknown). Returns the bytes for entries flagged `keep`.
 */
async function downloadWithProgress(
	items: { url: string; keep?: boolean }[],
	onProgress: (p: number) => void
): Promise<(Uint8Array | null)[]> {
	const responses = await Promise.all(items.map((it) => fetch(it.url)));
	responses.forEach((r, i) => {
		if (!r.ok) throw new Error(`download ${items[i].url}: ${r.status}`);
	});
	const total = responses.reduce((n, r) => n + (Number(r.headers.get('content-length')) || 0), 0);
	if (!total) onProgress(-1); // sizes unknown → indeterminate
	let received = 0;
	const out: (Uint8Array | null)[] = new Array(items.length).fill(null);

	await Promise.all(
		responses.map(async (r, i) => {
			if (!r.body || !total) {
				const ab = await r.arrayBuffer();
				received += ab.byteLength;
				if (items[i].keep) out[i] = new Uint8Array(ab);
				return;
			}
			const reader = r.body.getReader();
			const chunks: Uint8Array[] = [];
			for (;;) {
				const { done, value } = await reader.read();
				if (done) break;
				received += value.length;
				if (items[i].keep) chunks.push(value);
				onProgress(received / total);
			}
			if (items[i].keep) {
				const buf = new Uint8Array(chunks.reduce((n, c) => n + c.length, 0));
				let off = 0;
				for (const c of chunks) {
					buf.set(c, off);
					off += c.length;
				}
				out[i] = buf;
			}
		})
	);
	if (total) onProgress(1);
	return out;
}

/**
 * Load (or return the cached) PoseLandmarker. `onProgress` is only meaningful on
 * the first call that actually downloads; later calls resolve immediately.
 */
export function loadPoseLandmarker(
	onProgress: (p: number) => void = () => {}
): Promise<PoseLandmarker> {
	if (cached) return Promise.resolve(cached);
	if (inflight) return inflight;
	inflight = (async () => {
		const { FilesetResolver, PoseLandmarker } = await import('@mediapipe/tasks-vision');
		// Self-hosted runtime + model (mirrors the zxing_reader.wasm approach — avoids
		// CDN/MIME issues and works inside the Tauri WebView). We fetch the matching
		// WASM build (to warm the cache + drive the progress bar) and the model bytes
		// ourselves, then hand the model straight to MediaPipe.
		const variant = simdSupported() ? 'vision_wasm_internal' : 'vision_wasm_nosimd_internal';
		const [, modelBuf] = await downloadWithProgress(
			[
				{ url: `/fitness/mediapipe-wasm/${variant}.wasm` },
				{ url: '/fitness/pose_landmarker_lite.task', keep: true }
			],
			onProgress
		);
		const vision = await FilesetResolver.forVisionTasks('/fitness/mediapipe-wasm');
		const lm = await PoseLandmarker.createFromOptions(vision, {
			baseOptions: {
				modelAssetBuffer: modelBuf ?? undefined,
				modelAssetPath: modelBuf ? undefined : '/fitness/pose_landmarker_lite.task',
				delegate: 'GPU'
			},
			runningMode: 'VIDEO',
			numPoses: 1
		});
		cached = lm;
		return lm;
	})();
	inflight.catch(() => {}); // swallow here; the awaiting caller handles the error
	inflight.finally(() => {
		inflight = null;
	});
	return inflight;
}
