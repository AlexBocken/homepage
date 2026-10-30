/**
 * Ingredient → nutrition entry ranking over BLS and USDA as one table.
 *
 * 1. Candidates: the entries nearest to the ingredient by embedding (a
 *    multilingual-e5-small fine-tuned on ingredient lines, see the README),
 *    by German char n-grams, and by English char n-grams — K each, ~55 in all.
 * 2. Each candidate gets a feature vector (similarities, where the ingredient's
 *    words sit in the entry name, raw/spice/source flags, the entry's category,
 *    how often labelled lines chose it and how close the nearest such line is)
 *    and a linear score; the weights come from a conditional-logit fit on
 *    ~3,600 labelled lines (scripts/nutrition-model/final_fit.py).
 *
 * Every feature reproduces the Python training code exactly — including its
 * quirks (word splitting on [^a-z0-9], 4-char stems) — since the weights only
 * mean something on the features they were fitted on.
 * Pure TS with no SvelteKit imports, so scripts can use it directly.
 */
import { charNgrams } from './shoppingClassifier';

/**
 * The fine-tuned embedding model. Not on the Hugging Face hub: scripts/download-models.ts
 * fetches it from bocken.org into transformers.js's cache, where this id resolves.
 */
export const NUTRITION_MODEL = 'bocken/nutrition-e5-small';

export interface RankEntry {
	key: string;
	/** German name (BLS name, or the German translation of a USDA name) */
	nameDe: string;
	/** English name (BLS nameEn, or the USDA name) */
	nameEn: string;
	category: string;
	source: 'bls' | 'usda';
}

/** A line whose right entries are known: a generated training line or a manual label */
export interface LabelledLine {
	de: string;
	keys: string[];
}

export interface RerankerWeights {
	features: string[];
	mean: number[];
	std: number[];
	weights: number[];
	/** Candidates taken from each of the embedding and German n-gram rankings */
	K: number;
	/** …and from the English n-gram ranking, when there is an English name */
	K_EN: number;
}

/** Entry embeddings as written by scripts/embed-nutrition-entries.ts */
export interface EntryEmbeddingFile {
	model: string;
	dim: number;
	keys: string[];
	/** Per entry: int8 byte b decodes to b * scales[i] / 127 */
	scales: number[];
	/** base64 of an Int8Array, `dim` values per entry */
	data: string;
}

export interface Ranked {
	key: string;
	score: number;
	/** Softmax over the candidates */
	prob: number;
	/** The raw feature vector, when ranked with `explain` */
	features?: number[];
}

/** BLS then USDA, USDA under its German name where one exists — the order the model was trained on */
export function rankEntries(
	bls: { blsCode: string; nameDe: string; nameEn: string; category: string }[],
	usda: { fdcId: number; name: string; category: string }[],
	usdaNameDe: (name: string) => string | undefined
): RankEntry[] {
	return [
		...bls.map((b) => ({ key: `bls:${b.blsCode}`, nameDe: b.nameDe, nameEn: b.nameEn, category: b.category, source: 'bls' as const })),
		...usda.map((u) => ({ key: `usda:${u.fdcId}`, nameDe: usdaNameDe(u.name) ?? u.name, nameEn: u.name, category: u.category, source: 'usda' as const }))
	];
}

/** Lowercase and fold umlauts the way the training code did */
export const fold = (s: string) =>
	s.toLowerCase().replace(/ä/g, 'a').replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/ß/g, 'ss'); // ß-ok

const words = (s: string) => fold(s).split(/[^a-z0-9]+/).filter((w) => w.length >= 3);
const stem = (w: string) => w.slice(0, Math.max(4, w.length - 2));
const RAW = /\b(roh|raw)\b/;
const SPICE = /^(spices|gewürze),/i;

interface Sparse {
	idx: Int32Array;
	val: Float32Array;
}

/**
 * sklearn's TfidfVectorizer(analyzer='char_wb', ngram_range=(2, 5), sublinear_tf=True)
 * fitted on `docs`: smooth idf, 1 + ln(tf), L2-normalised rows. N-grams outside the
 * fitted vocabulary are dropped before normalising, as sklearn does.
 */
class Vectorizer {
	private vocab = new Map<string, number>();
	private idf: Float32Array;
	/** Vectors of the documents it was fitted on (their n-grams are only extracted once) */
	readonly fitted: Sparse[];

	constructor(docs: string[]) {
		const df: number[] = [];
		const terms = docs.map((d) => {
			const ids = charNgrams(fold(d)).map((g) => {
				let i = this.vocab.get(g);
				if (i === undefined) this.vocab.set(g, (i = df.length)), df.push(0);
				return i;
			});
			for (const i of new Set(ids)) df[i]++;
			return ids;
		});
		this.idf = Float32Array.from(df, (f) => Math.log((1 + docs.length) / (1 + f)) + 1);
		this.fitted = terms.map((ids) => this.weigh(ids));
	}

	get size() {
		return this.idf.length;
	}

	vector(text: string): Sparse {
		const ids: number[] = [];
		for (const g of charNgrams(fold(text))) {
			const i = this.vocab.get(g);
			if (i !== undefined) ids.push(i);
		}
		return this.weigh(ids);
	}

	private weigh(ids: number[]): Sparse {
		const tf = new Map<number, number>();
		for (const i of ids) tf.set(i, (tf.get(i) ?? 0) + 1);
		const idx = Int32Array.from(tf.keys());
		const val = Float32Array.from(idx, (i) => (1 + Math.log(tf.get(i)!)) * this.idf[i]);
		let norm = 0;
		for (const v of val) norm += v * v;
		norm = Math.sqrt(norm) || 1;
		for (let k = 0; k < val.length; k++) val[k] /= norm;
		return { idx, val };
	}
}

/** Inverted index of documents' TF-IDF vectors (CSR: per n-gram, the docs containing it) */
class Index {
	private start: Int32Array;
	private doc: Int32Array;
	private w: Float32Array;
	readonly size: number;

	constructor(vec: Vectorizer, vs: Sparse[]) {
		this.size = vs.length;
		this.start = new Int32Array(vec.size + 1);
		for (const v of vs) for (const i of v.idx) this.start[i + 1]++;
		for (let i = 0; i < vec.size; i++) this.start[i + 1] += this.start[i];
		const fill = this.start.slice(0, vec.size);
		this.doc = new Int32Array(this.start[vec.size]);
		this.w = new Float32Array(this.start[vec.size]);
		vs.forEach((v, j) => {
			for (let k = 0; k < v.idx.length; k++) {
				const at = fill[v.idx[k]]++;
				this.doc[at] = j;
				this.w[at] = v.val[k];
			}
		});
	}

	/** Cosine similarity of a query vector with every doc */
	scores(q: Sparse): Float32Array {
		const out = new Float32Array(this.size);
		for (let k = 0; k < q.idx.length; k++) {
			const i = q.idx[k];
			for (let m = this.start[i]; m < this.start[i + 1]; m++) out[this.doc[m]] += q.val[k] * this.w[m];
		}
		return out;
	}
}

/** Indices of the k largest values (ties in index order) */
function topK(xs: Float32Array, k: number): number[] {
	const idx: number[] = [];
	let min = -Infinity;
	for (let i = 0; i < xs.length; i++) {
		if (idx.length === k && xs[i] <= min) continue;
		let at = idx.length;
		while (at > 0 && xs[idx[at - 1]] < xs[i]) at--;
		idx.splice(at, 0, i);
		if (idx.length > k) idx.pop();
		min = xs[idx[idx.length - 1]];
	}
	return idx;
}

export class NutritionReranker {
	private readonly entries: RankEntry[];
	private readonly byKey = new Map<string, number>();
	private readonly emb: Float32Array;
	private readonly dim: number;
	private readonly vecDe: Vectorizer;
	private readonly vecEn: Vectorizer;
	private readonly ngDe: Index;
	private readonly ngEn: Index;
	private readonly w: RerankerWeights;
	/** Feature name → column, for the category one-hot */
	private readonly col = new Map<string, number>();
	private labels: { index: Index; lineKeys: number[][]; popularity: Map<number, number> } | null = null;
	/** Pre-split names, reused for every query */
	private readonly folded: { n: string; nw: string[]; head: string; raw: boolean; spice: boolean }[];

	constructor(entries: RankEntry[], embeddings: EntryEmbeddingFile, weights: RerankerWeights, lines: LabelledLine[]) {
		this.entries = entries;
		entries.forEach((e, i) => this.byKey.set(e.key, i));
		this.dim = embeddings.dim;
		this.emb = new Float32Array(entries.length * this.dim);
		const bytes = new Int8Array(Buffer.from(embeddings.data, 'base64'));
		embeddings.keys.forEach((key, r) => {
			const i = this.byKey.get(key);
			if (i === undefined) return; // entry dropped from the DB since embedding
			for (let j = 0; j < this.dim; j++) this.emb[i * this.dim + j] = (bytes[r * this.dim + j] * embeddings.scales[r]) / 127;
		});
		this.vecDe = new Vectorizer(entries.map((e) => e.nameDe));
		this.vecEn = new Vectorizer(entries.map((e) => e.nameEn));
		this.ngDe = new Index(this.vecDe, this.vecDe.fitted);
		this.ngEn = new Index(this.vecEn, this.vecEn.fitted);
		this.w = weights;
		weights.features.forEach((f, i) => this.col.set(f, i));
		this.folded = entries.map((e) => {
			const n = fold(e.nameDe);
			return { n, nw: words(n), head: n.split(',')[0].split(' ')[0], raw: RAW.test(n), spice: SPICE.test(e.nameEn) };
		});
		this.setLabels(lines);
	}

	/** Replace the labelled lines behind the popularity / nearest-label features */
	setLabels(lines: LabelledLine[]) {
		const kept = lines.map((l) => ({ de: l.de, keys: l.keys.map((k) => this.byKey.get(k)).filter((i) => i !== undefined) }));
		const popularity = new Map<number, number>();
		for (const l of kept) for (const i of l.keys) popularity.set(i, (popularity.get(i) ?? 0) + 1);
		// Same vocabulary and idf as the German entry names (the training code used that vectorizer)
		this.labels = {
			index: new Index(this.vecDe, kept.map((l) => this.vecDe.vector(l.de))),
			lineKeys: kept.map((l) => l.keys),
			popularity
		};
	}

	has(key: string) {
		return this.byKey.has(key);
	}

	/**
	 * Rank the candidates for an ingredient. `de` is the normalised German name,
	 * `en` the English one if known, `query` its embedding (`query: ` prefix, L2-normalised).
	 */
	rank(de: string, en: string | undefined, query: ArrayLike<number>, explain = false): Ranked[] {
		const { K, K_EN } = this.w;
		const n = this.entries.length, dim = this.dim;
		const dense = new Float32Array(n);
		for (let i = 0; i < n; i++) {
			let s = 0;
			for (let j = 0; j < dim; j++) s += this.emb[i * dim + j] * query[j];
			dense[i] = s;
		}
		const qde = this.vecDe.vector(de);
		const ng = this.ngDe.scores(qde);
		const nge = this.ngEn.scores(this.vecEn.vector(en ?? ''));
		const cands = new Set([...topK(dense, K), ...topK(ng, K)]);
		if (en) for (const i of topK(nge, K_EN)) cands.add(i);
		const top1 = topK(dense, 1)[0];

		// nearest labelled line per entry
		const nearest = new Map<number, number>();
		const { index, lineKeys, popularity } = this.labels!;
		const sims = index.scores(qde);
		for (let t = 0; t < sims.length; t++) {
			if (!sims[t]) continue;
			for (const i of lineKeys[t]) if (sims[t] > (nearest.get(i) ?? 0)) nearest.set(i, sims[t]);
		}

		const q = fold(de), qw = words(q);
		const out: Ranked[] = [];
		const f = new Float64Array(this.w.features.length);
		for (const c of cands) {
			const e = this.folded[c];
			const found = qw.map((w) => e.n.indexOf(stem(w))).filter((p) => p >= 0);
			const pos = found.length ? Math.min(...found) : 99;
			const same = (x: string, w: string) => x === w || (w.length > 4 && stem(x) === stem(w));
			f.fill(0);
			const set = (name: string, v: number) => {
				const i = this.col.get(name);
				if (i !== undefined) f[i] = v;
			};
			set('dense', dense[c]);
			set('ngram', ng[c]);
			set('ngram_en', nge[c]);
			set('dense_top1', +(c === top1));
			set('pos0', +(pos === 0));
			set('pos<15', +(pos > 0 && pos < 15));
			set('nopos', +(pos === 99));
			set('qcover', qw.filter((w) => e.nw.some((x) => x.includes(stem(w)))).length / Math.max(1, qw.length));
			set('ncover', e.nw.filter((x) => q.includes(stem(x))).length / Math.max(1, e.nw.length));
			set('headin', +(e.head !== '' && q.includes(stem(e.head))));
			set('firsteq', +(qw.length > 0 && e.nw.length > 0 && same(e.nw[0], qw[0])));
			set('wordeq', +qw.some((w) => e.nw.some((x) => same(x, w))));
			set('extra_words', e.nw.filter((x) => !qw.some((w) => w.includes(stem(x)) || x.includes(stem(w)))).length / Math.max(1, e.nw.length));
			set('len', e.n.length / 40);
			set('raw', +e.raw);
			set('spice', +e.spice);
			set('usda', +(this.entries[c].source === 'usda'));
			set(this.entries[c].category, 1);
			set('popularity', Math.log1p(popularity.get(c) ?? 0));
			set('nearest_label', nearest.get(c) ?? 0);
			let score = 0;
			for (let i = 0; i < f.length; i++) score += ((f[i] - this.w.mean[i]) / this.w.std[i]) * this.w.weights[i];
			out.push({ key: this.entries[c].key, score, prob: 0, ...(explain && { features: Array.from(f) }) });
		}
		out.sort((a, b) => b.score - a.score);
		const max = out[0]?.score ?? 0;
		const z = out.reduce((s, r) => s + Math.exp(r.score - max), 0);
		for (const r of out) r.prob = Math.exp(r.score - max) / z;
		return out;
	}
}
