/**
 * Motion-type gate: runs the tiny temporal classifier (scripts/motion-gate) over
 * a rolling window of pose features and reports whether the current motion looks
 * like an in-place rep, locomotion (walking to/from the rack), or idle. The
 * rep-counting FSM uses this as a *veto* so walking can't rack up phantom reps.
 *
 * The model is ~7800 params of fixed shape (conv1d → BN → ReLU ×2 → mean-pool →
 * linear), so instead of pulling in an ONNX runtime + WASM we run the forward
 * pass here in plain TS and ship the weights as JSON. Parity with the trained
 * PyTorch model is locked by tests/unit/fitness/motionGate.test.ts against a
 * committed fixture.
 *
 * SAFE BY DEFAULT: if `/fitness/motion-gate.json` isn't deployed (no model
 * trained yet), {@link loadGateWeights} resolves to null and gating is disabled —
 * the coach behaves exactly as it did before the gate existed.
 */

import { MotionFeatureWindow, FEATURE_DIM, WINDOW_FRAMES } from '$lib/js/motionFeatures';
import type { Landmark } from '$lib/js/poseCoach';

interface BatchNorm {
	gamma: number[];
	beta: number[];
	mean: number[];
	var: number[];
	eps: number;
}

/** Weights + architecture exported by scripts/motion-gate/train.py::export_weights. */
export interface GateWeights {
	version: number;
	labels: string[];
	featureNames: string[];
	arch: { featureDim: number; windowFrames: number; hidden: number; kernel: number; numClasses: number };
	featMean: number[];
	featStd: number[];
	conv1: { w: number[][][]; b: number[] }; // w: [out][in][k]
	bn1: BatchNorm;
	conv2: { w: number[][][]; b: number[] };
	bn2: BatchNorm;
	fc: { w: number[][]; b: number[] }; // w: [numClasses][hidden]
	/** Optional (input, logits) pairs — used only by the parity test. */
	samples?: { x: number[][]; logits: number[] }[];
}

/** 1D convolution, `pad`-same. inp/out are row-major [channels][length]. */
function conv1d(
	inp: Float32Array | number[],
	cin: number,
	len: number,
	w: number[][][],
	b: number[],
	cout: number,
	k: number,
	pad: number
): Float32Array {
	const out = new Float32Array(cout * len);
	for (let o = 0; o < cout; o++) {
		const wo = w[o];
		const bo = b[o];
		for (let t = 0; t < len; t++) {
			let s = bo;
			for (let i = 0; i < cin; i++) {
				const woi = wo[i];
				const base = i * len;
				for (let kk = 0; kk < k; kk++) {
					const tt = t + kk - pad;
					if (tt < 0 || tt >= len) continue;
					s += woi[kk] * inp[base + tt];
				}
			}
			out[o * len + t] = s;
		}
	}
	return out;
}

/** In-place BatchNorm (eval) followed by ReLU, per channel, over [channels][length]. */
function bnRelu(h: Float32Array, channels: number, len: number, bn: BatchNorm): void {
	for (let o = 0; o < channels; o++) {
		const scale = bn.gamma[o] / Math.sqrt(bn.var[o] + bn.eps);
		const shift = bn.beta[o] - bn.mean[o] * scale;
		for (let t = 0; t < len; t++) {
			const v = h[o * len + t] * scale + shift;
			h[o * len + t] = v > 0 ? v : 0;
		}
	}
}

/**
 * Forward pass → class logits. `flat` is a row-major [WINDOW_FRAMES × FEATURE_DIM]
 * feature window (exactly what {@link MotionFeatureWindow.tensor} returns).
 */
export function gateLogits(w: GateWeights, flat: Float32Array | number[]): Float32Array {
	const F = w.arch.featureDim;
	const T = w.arch.windowFrames;
	const H = w.arch.hidden;
	const K = w.arch.kernel;
	const C = w.arch.numClasses;
	const pad = (K - 1) >> 1;

	// Normalize and lay out as [F][T] for temporal convolution.
	const inp = new Float32Array(F * T);
	for (let t = 0; t < T; t++) {
		for (let f = 0; f < F; f++) {
			inp[f * T + t] = (flat[t * F + f] - w.featMean[f]) / w.featStd[f];
		}
	}

	const h1 = conv1d(inp, F, T, w.conv1.w, w.conv1.b, H, K, pad);
	bnRelu(h1, H, T, w.bn1);
	const h2 = conv1d(h1, H, T, w.conv2.w, w.conv2.b, H, K, pad);
	bnRelu(h2, H, T, w.bn2);

	// Adaptive average pool over time → [H].
	const pooled = new Float32Array(H);
	for (let o = 0; o < H; o++) {
		let s = 0;
		for (let t = 0; t < T; t++) s += h2[o * T + t];
		pooled[o] = s / T;
	}

	const out = new Float32Array(C);
	for (let c = 0; c < C; c++) {
		let s = w.fc.b[c];
		const wc = w.fc.w[c];
		for (let o = 0; o < H; o++) s += wc[o] * pooled[o];
		out[c] = s;
	}
	return out;
}

export function softmax(logits: Float32Array | number[]): number[] {
	let max = -Infinity;
	for (const v of logits) if (v > max) max = v;
	let sum = 0;
	const exps = Array.from(logits, (v) => {
		const e = Math.exp(v - max);
		sum += e;
		return e;
	});
	return exps.map((e) => e / sum);
}

let cached: GateWeights | null | undefined; // undefined = not tried; null = absent/invalid
let inflight: Promise<GateWeights | null> | null = null;

/**
 * Load (and cache) the gate weights. Resolves to null — gating disabled — when
 * the model isn't deployed or doesn't match the current feature spec, so the app
 * degrades cleanly to its pre-gate behaviour.
 */
export function loadGateWeights(): Promise<GateWeights | null> {
	if (cached !== undefined) return Promise.resolve(cached);
	if (inflight) return inflight;
	inflight = (async () => {
		try {
			const res = await fetch('/fitness/motion-gate.json');
			if (!res.ok) return (cached = null);
			const w = (await res.json()) as GateWeights;
			if (w.arch?.featureDim !== FEATURE_DIM || w.arch?.windowFrames !== WINDOW_FRAMES) {
				console.warn('[motion-gate] model/feature-spec mismatch — gating disabled');
				return (cached = null);
			}
			return (cached = w);
		} catch {
			return (cached = null); // no network / bad JSON → stay disabled
		} finally {
			inflight = null;
		}
	})();
	return inflight;
}

export interface GateVerdict {
	/** Class probabilities keyed by label (rep / walk / idle). */
	probs: Record<string, number>;
	/** Most-likely class this frame. */
	label: string;
	/** Smoothed P(rep) driving the veto. */
	pRep: number;
	/** True while the motion is confidently a rep — the FSM may count reps. */
	isRepMotion: boolean;
}

// EMA + hysteresis on P(rep) so the veto doesn't flap frame-to-frame.
const EMA_ALPHA = 0.3;
const REP_ON = 0.6;
const REP_OFF = 0.4;

/**
 * Stateful gate: feed it landmarks each frame (the same raw pose the recorder
 * captured), read {@link repMotionOk} in the rep FSM. Cheap enough to run every
 * frame (~250k MACs). Disabled (always allows) when constructed with a null model.
 */
export class MotionGate {
	private win = new MotionFeatureWindow();
	private model: GateWeights | null;
	private repIdx: number;
	private emaPRep = 0;
	private on = false;
	verdict: GateVerdict | null = null;

	constructor(model: GateWeights | null) {
		this.model = model;
		this.repIdx = model ? Math.max(0, model.labels.indexOf('rep')) : 0;
	}

	/** Is the gate actually active (a valid model loaded)? */
	get enabled(): boolean {
		return this.model !== null;
	}

	push(lms: Landmark[] | undefined, now: number): void {
		this.win.push(lms, now);
		if (!this.model) return;
		const t = this.win.tensor();
		if (!t) return;
		const probs = softmax(gateLogits(this.model, t));
		const pRep = probs[this.repIdx];
		this.emaPRep += (pRep - this.emaPRep) * EMA_ALPHA;
		if (this.on) {
			if (this.emaPRep < REP_OFF) this.on = false;
		} else if (this.emaPRep >= REP_ON) {
			this.on = true;
		}
		let best = 0;
		for (let i = 1; i < probs.length; i++) if (probs[i] > probs[best]) best = i;
		const byLabel: Record<string, number> = {};
		this.model.labels.forEach((l, i) => (byLabel[l] = probs[i]));
		this.verdict = {
			probs: byLabel,
			label: this.model.labels[best],
			pRep: this.emaPRep,
			isRepMotion: this.on
		};
	}

	/**
	 * Gate value for the rep FSM. Allows counting (true) whenever the gate is
	 * disabled or hasn't formed a verdict yet, so it can only *suppress* phantom
	 * reps, never block real ones during warm-up.
	 */
	get repMotionOk(): boolean {
		if (!this.model || !this.verdict) return true;
		return this.verdict.isRepMotion;
	}

	reset(): void {
		this.win.reset();
		this.emaPRep = 0;
		this.on = false;
		this.verdict = null;
	}
}
