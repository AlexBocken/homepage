/**
 * fzf-style fuzzy match: characters must appear in order (non-contiguous).
 * Returns 0 for no match, higher scores for better matches.
 */
export function fuzzyScore(query: string, text: string): number {
	if (query.length === 0) return 1;
	let qi = 0;
	let score = 0;
	let consecutive = 0;
	let prevMatchIdx = -2;

	for (let ti = 0; ti < text.length && qi < query.length; ti++) {
		if (text[ti] === query[qi]) {
			qi++;
			score += 1;

			// Bonus for consecutive matches
			if (ti === prevMatchIdx + 1) {
				consecutive++;
				score += consecutive * 2;
			} else {
				consecutive = 0;
			}

			// Bonus for matching at word boundary (start, after space/punctuation)
			if (ti === 0 || /[\s()\-_/]/.test(text[ti - 1])) {
				score += 5;
			}

			prevMatchIdx = ti;
		}
	}

	// All query chars must be found
	if (qi < query.length) return 0;

	// Bonus for closer match length to query length (tighter matches)
	const span = prevMatchIdx - (text.indexOf(query[0]) ?? 0) + 1;
	score += Math.max(0, query.length * 2 - span);

	return score;
}
