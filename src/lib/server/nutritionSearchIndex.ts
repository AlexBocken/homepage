/**
 * In-memory search index for the static BLS + USDA food tables.
 *
 * Instead of fuzzy-scoring all ~14.5k entries on every keystroke, we build (once,
 * lazily) a word→entries inverted index and only score the candidates whose name
 * has a word starting with each query word. All text is diacritic-folded so the
 * German and English names match accent-insensitively (e.g. "hahnchen" finds
 * "Hähnchen"). Matching is word-prefix + AND across query words, then ranked with
 * the shared fuzzyScore.
 *
 * Both tables are bilingual, so both names are indexed per entry: BLS carries
 * nameDe/nameEn, and USDA's English names are paired with the German translations in
 * usdaNamesDe. A German query therefore reaches USDA foods too.
 */

import { NUTRITION_DB } from '$lib/data/nutritionDb';
import { usdaNameDe } from '$lib/data/usdaNamesDe';
import { BLS_DB } from '$lib/data/blsDb';
import { germanSynonyms } from '$lib/data/helvetisms';
import { fuzzyScore } from '$lib/js/fuzzy';

/** Per-character penalty applied to a match's score by name length, so shorter
 *  names rank above longer ones that match equally well. Small enough that it
 *  only breaks ties, not real match-quality differences. Shared with the recipe
 *  and OFF ranking in the search endpoint for consistent ordering. */
export const NAME_LENGTH_PENALTY = 0.1;

/**
 * Score a query against one name, tolerating word order.
 *
 * fuzzyScore is a subsequence match, so it only ever scores the query words in
 * the order they were typed: "peppers bell red" scores against
 * "Peppers, bell, red, raw", but "bell peppers raw red" scores 0 and the entry
 * gets dropped — even though it is obviously the same food, and even though the
 * inverted index below already proved every query word prefixes a word in that
 * name. So fall back to scoring the words independently.
 *
 * In-order queries keep their exact previous score (fuzzyScore's consecutive-run
 * and word-boundary bonuses make those naturally outrank the reordered path), so
 * this only ever adds results that used to be dropped.
 */
export function scoreName(query: string, queryWords: string[], name: string): number {
	const phrase = fuzzyScore(query, name);
	if (phrase > 0) return phrase;
	let sum = 0;
	for (const qw of queryWords) {
		const s = fuzzyScore(qw, name);
		// Every word must still be present somewhere in this name — a partial hit
		// is not a match, it's a different food.
		if (s === 0) return 0;
		sum += s;
	}
	return sum;
}

/**
 * Split a query into words on anything that isn't a letter or digit, matching how
 * entry names are tokenized for the index. Splitting on whitespace alone would
 * leave punctuation stuck to the word — "peppers, bell" would look for a word
 * starting with "peppers," and find nothing, even though the user just typed the
 * food's name exactly as USDA writes it. Letters are left alone (not folded) so
 * callers matching against unfolded text keep their diacritics.
 */
export function queryWords(s: string): string[] {
	return s.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
}

/** Lowercase + strip diacritics (ä→a, ö→o, ü→u, é→e, …) + sharp-s→ss. */
export function foldText(s: string): string {
	return s
		.toLowerCase()
		.normalize('NFKD')
		.replace(/\p{Diacritic}/gu, '')
		.replace(/ß/g, 'ss'); // ß-ok (folding eszett to ss is the point)
}

interface Candidate {
	source: 'bls' | 'usda';
	idx: number; // index into BLS_DB / NUTRITION_DB
	/**
	 * Folded field strings to score against (de+en, or name), each with the length the
	 * tiebreaker should charge for it. The two differ only for the German-synonym
	 * variant: it carries invisible keywords (Karotte for a food now called Rüebli) so
	 * that a German query still scores, but charging for those extra characters would
	 * push every helvetised food down the ranking against foods that were never
	 * renamed. It is charged for the displayed name instead.
	 */
	folded: { text: string; len: number }[];
}

let _candidates: Candidate[] | null = null;
let _sortedWords: string[] | null = null;
let _wordToCands: Map<string, number[]> | null = null;

function tokenize(folded: string): string[] {
	return folded.split(/[^a-z0-9]+/).filter(Boolean);
}

function build(): void {
	if (_candidates) return;

	const candidates: Candidate[] = [];
	const wordSets = new Map<string, Set<number>>();

	const addWords = (folded: string, candId: number) => {
		for (const w of tokenize(folded)) {
			let set = wordSets.get(w);
			if (!set) {
				set = new Set();
				wordSets.set(w, set);
			}
			set.add(candId);
		}
	};

	for (let i = 0; i < BLS_DB.length; i++) {
		const e = BLS_DB[i];
		const de = foldText(e.nameDe);
		const en = e.nameEn ? foldText(e.nameEn) : '';
		const candId = candidates.length;
		const folded = [{ text: de, len: de.length }];
		if (en) folded.push({ text: en, len: en.length });
		const syn = foldText(germanSynonyms(e.nameDe));
		if (syn) {
			// Appended to the name, not indexed on its own: a query mixes renamed and
			// unchanged words ("karotte roh"), and neither string carries both.
			folded.push({ text: `${de} ${syn}`, len: de.length });
			addWords(syn, candId);
		}
		candidates.push({ source: 'bls', idx: i, folded });
		addWords(de, candId);
		if (en) addWords(en, candId);
	}

	for (let i = 0; i < NUTRITION_DB.length; i++) {
		const en = foldText(NUTRITION_DB[i].name);
		const deName = usdaNameDe(NUTRITION_DB[i].name);
		const de = deName ? foldText(deName) : '';
		const candId = candidates.length;
		const folded = [{ text: en, len: en.length }];
		if (de) folded.push({ text: de, len: de.length });
		const syn = deName ? foldText(germanSynonyms(deName)) : '';
		if (syn) {
			folded.push({ text: `${de} ${syn}`, len: de.length });
			addWords(syn, candId);
		}
		candidates.push({ source: 'usda', idx: i, folded });
		addWords(en, candId);
		if (de) addWords(de, candId);
	}

	const wordToCands = new Map<string, number[]>();
	for (const [w, set] of wordSets) wordToCands.set(w, [...set]);

	_candidates = candidates;
	_wordToCands = wordToCands;
	_sortedWords = [...wordToCands.keys()].sort();
}

/** Build the index eagerly (called from server startup so the first search is warm). */
export function warmFoodSearchIndex(): void {
	build();
}

/** First index in sorted words whose value is >= target. */
function lowerBound(arr: string[], target: string): number {
	let lo = 0;
	let hi = arr.length;
	while (lo < hi) {
		const mid = (lo + hi) >> 1;
		if (arr[mid] < target) lo = mid + 1;
		else hi = mid;
	}
	return lo;
}

/** Candidate ids whose (German or English) name has a word starting with `prefix`. */
function candsForPrefix(prefix: string): Set<number> {
	const out = new Set<number>();
	const words = _sortedWords!;
	const map = _wordToCands!;
	for (let i = lowerBound(words, prefix); i < words.length && words[i].startsWith(prefix); i++) {
		for (const c of map.get(words[i])!) out.add(c);
	}
	return out;
}

export interface LocalHit {
	source: 'bls' | 'usda';
	idx: number;
	score: number;
}

/**
 * Word-prefix, diacritic-folded search over BLS + USDA. Each query word must be a
 * prefix of some word in the entry's German or English name (AND across query
 * words, order-independent); survivors are ranked with fuzzyScore.
 */
export function searchBlsUsda(rawQuery: string): LocalHit[] {
	build();

	const qf = foldText(rawQuery).trim();
	const qWords = queryWords(qf);
	if (!qWords.length) return [];

	let acc: Set<number> | null = null;
	for (const qw of qWords) {
		const ids = candsForPrefix(qw);
		if (acc === null) {
			acc = ids;
		} else {
			// Intersect (iterate the smaller set for speed).
			const [small, large] = acc.size <= ids.size ? [acc, ids] : [ids, acc];
			const next = new Set<number>();
			for (const id of small) if (large.has(id)) next.add(id);
			acc = next;
		}
		if (acc.size === 0) return [];
	}

	const hits: LocalHit[] = [];
	for (const id of acc!) {
		const cand = _candidates![id];
		let rawBest = 0;
		let bestLen = 0;
		for (const f of cand.folded) {
			const sc = scoreName(qf, qWords, f.text);
			if (sc > rawBest) {
				rawBest = sc;
				bestLen = f.len;
			}
		}
		// Mild tiebreaker: among equally-good matches prefer the shorter name
		// (penalise by the matched field's length, so a bilingual BLS entry isn't
		// punished for carrying both languages). Kept small so real match quality
		// still dominates. Filter on the raw score so nothing new drops out.
		if (rawBest > 0) {
			hits.push({ source: cand.source, idx: cand.idx, score: rawBest - bestLen * NAME_LENGTH_PENALTY });
		}
	}
	return hits;
}
