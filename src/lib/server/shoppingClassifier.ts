/**
 * Shopping category classifier — a one-vs-rest linear SVM over two feature
 * blocks, trained in-process so manual overrides take effect without a rebuild:
 *
 * - char n-grams (2–5, word-bounded, sublinear TF-IDF, L2-normalised) — pick up
 *   word parts like "-quark", "setzling", "tk " that generalise to unseen items
 * - the item's e5 sentence embedding, PCA-reduced (see EmbeddingFile) —
 *   semantics for names whose spelling says nothing ("tahini", "prosecco")
 *
 * The solver is liblinear's dual coordinate descent for the L2-regularised
 * squared-hinge loss (what sklearn's LinearSVC runs), so offline experiments in
 * sklearn carry over. Pure TS with no SvelteKit imports: the eval script reuses it.
 */

export interface TrainingSample {
	text: string;
	category: string;
	/** Projected embedding of `query: <text>` (EmbeddingSpace.project) */
	vector: ArrayLike<number>;
	/** Loss weight; manual overrides can count more than generated items. */
	weight?: number;
}

export interface Prediction {
	category: string;
	/** Decision value of the winning class. */
	score: number;
	/** Gap to the runner-up — a low margin means the call was close. */
	margin: number;
}

/**
 * Shipped training embeddings, as written by scripts/embed-shopping-training.ts.
 * The 768-d e5 vectors are reduced by PCA to `dim` components — cross-validated
 * accuracy held up (it even rose slightly) while the solve got ~10× cheaper.
 */
export interface EmbeddingFile {
	model: string;
	rawDim: number;
	dim: number;
	/** PCA: mean of the raw vectors */
	mean: number[];
	/** PCA: `dim` orthonormal components of length `rawDim`, row-major */
	components: number[];
	/** Projections are divided by this so the block is ~unit length */
	norm: number;
	/** Max |projected value|; int8 byte b decodes to b * scale / 127 */
	scale: number;
	texts: string[];
	/** base64 of an Int8Array, `dim` values per text */
	data: string;
}

export interface EmbeddingSpace {
	/** Projected vectors of the shipped training texts */
	vectors: Map<string, Float32Array>;
	/** Map a raw e5 embedding into the classifier's space */
	project(raw: ArrayLike<number>): Float32Array;
}

export function loadEmbeddingSpace(file: EmbeddingFile): EmbeddingSpace {
	const { dim, rawDim, mean, components, norm } = file;
	const bytes = new Int8Array(Buffer.from(file.data, 'base64'));
	const vectors = new Map<string, Float32Array>();
	file.texts.forEach((text, i) => {
		const v = new Float32Array(dim);
		for (let j = 0; j < dim; j++) v[j] = (bytes[i * dim + j] * file.scale) / 127;
		vectors.set(text, v);
	});
	const project = (raw: ArrayLike<number>) => {
		if (raw.length !== rawDim) throw new Error(`expected a ${rawDim}-d embedding, got ${raw.length}`);
		const out = new Float32Array(dim);
		for (let c = 0; c < dim; c++) {
			let s = 0;
			for (let j = 0; j < rawDim; j++) s += (raw[j] - mean[j]) * components[c * rawDim + j];
			out[c] = s / norm;
		}
		return out;
	};
	return { vectors, project };
}

/** Samples per solver slice between event-loop yields */
const SLICE = 1000;

const MIN_N = 2;
const MAX_N = 5;

/** sklearn's `char_wb` analyzer: n-grams inside space-padded words. */
export function charNgrams(text: string): string[] {
	const out: string[] = [];
	for (const word of text.toLowerCase().split(/\s+/).filter(Boolean)) {
		const w = ` ${word} `;
		for (let n = MIN_N; n <= MAX_N; n++) {
			if (w.length <= n) {
				out.push(w);
				break;
			}
			for (let i = 0; i + n <= w.length; i++) out.push(w.slice(i, i + n));
		}
	}
	return out;
}

interface SparseVec {
	idx: Int32Array;
	val: Float64Array;
}

interface Problem {
	n: number;
	V: number;
	dim: number;
	rowPtr: Int32Array;
	col: Int32Array;
	val: Float64Array;
	dense: Float64Array;
	diag: Float64Array;
	qd: Float64Array;
	y: Float64Array;
}

interface PassState {
	/** Samples order[0..active) are still in play */
	active: number;
	pgMaxOld: number;
	pgMax: number;
	pgMin: number;
}

/**
 * Dual coordinate descent (L2-regularised squared hinge) over order[from..to)
 * — one slice of a pass, so the caller can yield between slices — updating
 * `w`/`alpha`/`st` in place. Shrunk samples swap with the last active one,
 * which this pass hasn't visited yet. Kept small and separate so V8 optimises
 * it after a few calls rather than deep inside a long-running loop.
 */
function coordinateSlice(
	p: Problem,
	w: Float64Array,
	alpha: Float64Array,
	order: Int32Array,
	from: number,
	to: number,
	st: PassState
) {
	const { V, dim, rowPtr, col, val, dense, diag, qd, y } = p;
	const bias = V + dim;
	for (let s = from; s < to && s < st.active; s++) {
		const i = order[s];
		const off = i * dim;
		const start = rowPtr[i];
		const end = rowPtr[i + 1];
		let wx = w[bias];
		for (let k = start; k < end; k++) wx += w[col[k]] * val[k];
		for (let j = 0; j < dim; j++) wx += w[V + j] * dense[off + j];
		const G = y[i] * wx - 1 + diag[i] * alpha[i];

		let PG = G;
		if (alpha[i] === 0) {
			if (G > st.pgMaxOld) {
				st.active--;
				order[s] = order[st.active];
				order[st.active] = i;
				s--;
				continue;
			}
			if (PG > 0) PG = 0;
		}
		if (PG > st.pgMax) st.pgMax = PG;
		if (PG < st.pgMin) st.pgMin = PG;
		if (Math.abs(PG) < 1e-12) continue;

		const old = alpha[i];
		const next = Math.max(old - G / qd[i], 0);
		alpha[i] = next;
		const step = (next - old) * y[i];
		for (let k = start; k < end; k++) w[col[k]] += step * val[k];
		for (let j = 0; j < dim; j++) w[V + j] += step * dense[off + j];
		w[bias] += step;
	}
}

export class ShoppingClassifier {
	private vocab = new Map<string, number>();
	private idf = new Float64Array(0);
	private categories: string[] = [];
	/** Per class: [ngram weights | embedding weights | bias] */
	private weights: Float64Array[] = [];
	private dim = 0;
	/** Most passes any class needed in the last fit — for tuning */
	passes = 0;

	get trained(): boolean {
		return this.weights.length > 0;
	}

	private sparse(text: string, grow: boolean): SparseVec {
		const counts = new Map<number, number>();
		for (const g of charNgrams(text)) {
			let id = this.vocab.get(g);
			if (id === undefined) {
				if (!grow) continue;
				id = this.vocab.size;
				this.vocab.set(g, id);
			}
			counts.set(id, (counts.get(id) ?? 0) + 1);
		}
		return {
			idx: Int32Array.from(counts.keys()),
			val: Float64Array.from(counts.values())
		};
	}

	/** Sublinear TF × IDF, then L2-normalise in place. */
	private weigh(v: SparseVec) {
		let norm = 0;
		for (let j = 0; j < v.idx.length; j++) {
			v.val[j] = (1 + Math.log(v.val[j])) * this.idf[v.idx[j]];
			norm += v.val[j] * v.val[j];
		}
		norm = Math.sqrt(norm) || 1;
		for (let j = 0; j < v.val.length; j++) v.val[j] /= norm;
	}

	/**
	 * Fit from scratch. A few seconds of CPU for ~27k samples, so it yields to the
	 * event loop every SLICE samples (featurising and solving) instead of
	 * stalling the server.
	 */
	async train(samples: TrainingSample[], { C = 1, maxIter = 100, eps = 0.1 } = {}) {
		if (!samples.length) throw new Error('no training samples');
		this.vocab = new Map();
		this.dim = samples[0].vector.length;

		const xs: SparseVec[] = [];
		for (const s of samples) {
			xs.push(this.sparse(s.text, true));
			if (xs.length % SLICE === 0) await new Promise((r) => setImmediate(r));
		}
		const V = this.vocab.size;
		const df = new Float64Array(V);
		for (const x of xs) for (const id of x.idx) df[id]++;
		this.idf = new Float64Array(V);
		const n = samples.length;
		for (let i = 0; i < V; i++) this.idf[i] = Math.log((1 + n) / (1 + df[i])) + 1;
		for (const x of xs) this.weigh(x);

		// Flat typed arrays (CSR n-grams + one dense block) keep the hot loop
		// monomorphic; the dense block is about as wide as a
		// row's non-zero n-grams, so neither dominates the solve
		const dim = this.dim;
		const rowPtr = new Int32Array(n + 1);
		xs.forEach((x, i) => (rowPtr[i + 1] = rowPtr[i] + x.idx.length));
		const col = new Int32Array(rowPtr[n]);
		const val = new Float64Array(rowPtr[n]);
		xs.forEach((x, i) => {
			col.set(x.idx, rowPtr[i]);
			val.set(x.val, rowPtr[i]);
		});
		const dense = new Float64Array(n * dim);
		samples.forEach((s, i) => dense.set(s.vector, i * dim));
		const diag = Float64Array.from(samples, (s) => 1 / (2 * C * (s.weight ?? 1)));
		// x·x including the bias term, plus the loss diagonal
		const qd = new Float64Array(n);
		for (let i = 0; i < n; i++) {
			let q = 1 + diag[i];
			for (let k = rowPtr[i]; k < rowPtr[i + 1]; k++) q += val[k] * val[k];
			for (let j = i * dim; j < (i + 1) * dim; j++) q += dense[j] * dense[j];
			qd[i] = q;
		}
		const problem: Problem = { n, V, dim, rowPtr, col, val, dense, diag, qd, y: new Float64Array(n) };

		this.categories = [...new Set(samples.map((s) => s.category))].sort();
		this.passes = 0;
		const weights: Float64Array[] = [];
		for (const cat of this.categories) {
			samples.forEach((s, i) => (problem.y[i] = s.category === cat ? 1 : -1));
			const w = new Float64Array(V + dim + 1);
			const alpha = new Float64Array(n);
			const order = Int32Array.from({ length: n }, (_, i) => i);
			let seed = 1;
			const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

			// liblinear's shrinking: a sample at alpha = 0 whose gradient clears
			// last pass's largest violation is safely outside the margin, so it
			// leaves the active set. Converging on the shrunk set triggers one more
			// pass over everything, which ends the solve only if nothing moved.
			const st: PassState = { active: n, pgMaxOld: Infinity, pgMax: 0, pgMin: 0 };
			for (let iter = 0; iter < maxIter; iter++) {
				for (let i = st.active - 1; i > 0; i--) {
					const j = Math.floor(rand() * (i + 1));
					const t = order[i];
					order[i] = order[j];
					order[j] = t;
				}
				st.pgMax = -Infinity;
				st.pgMin = Infinity;
				for (let from = 0; from < st.active; from += SLICE) {
					coordinateSlice(problem, w, alpha, order, from, from + SLICE, st);
					await new Promise((r) => setImmediate(r));
				}
				this.passes = Math.max(this.passes, iter + 1);

				if (st.pgMax - st.pgMin <= eps) {
					if (st.active === n) break;
					st.active = n;
					st.pgMaxOld = Infinity;
					continue;
				}
				st.pgMaxOld = st.pgMax <= 0 ? Infinity : st.pgMax;
			}
			weights.push(w);
		}
		this.weights = weights;
	}

	predict(text: string, vector: ArrayLike<number>): Prediction {
		if (!this.trained) throw new Error('classifier not trained');
		const x = this.sparse(text, false);
		this.weigh(x);
		const V = this.vocab.size;
		const scores = this.weights.map((w) => {
			let s = w[V + this.dim];
			for (let j = 0; j < x.idx.length; j++) s += w[x.idx[j]] * x.val[j];
			for (let j = 0; j < this.dim; j++) s += w[V + j] * vector[j];
			return s;
		});
		let best = 0;
		for (let k = 1; k < scores.length; k++) if (scores[k] > scores[best]) best = k;
		const runnerUp = Math.max(...scores.filter((_, k) => k !== best));
		return { category: this.categories[best], score: scores[best], margin: scores[best] - runnerUp };
	}
}
