/**
 * Fixes to the sources' texts that both the importer and the server apply:
 * the importer so the collection holds them, the server so a deployment
 * shows them before the next import. Every function here is idempotent.
 */

/**
 * The Oxford Catena Aurea (1841–45) opens Matthew, Mark and Luke with the
 * translators' own matter — a list of the authors cited with the editions
 * used, a preface on the Greek writers — and only then with Aquinas's
 * prooemium. The source file runs the two together under one heading, so
 * the reader showed a bibliography as the first words of Aquinas.
 *
 * Newman signs the prefaces "J. H. N." on a line of their own (Mark, Luke),
 * and the prooemium follows. Matthew's list of authors is unsigned; there
 * the prooemium is found by its opening, a Scripture quotation standing as
 * its own paragraph and closed by the first `[ Book c:v ]` marker. John has
 * no preamble and comes back unchanged.
 */
export function trimCatenaPreface(text: string): { text: string; trimmed: boolean } {
	const signed = /\n\s*J\. ?H\. ?N\.\s*\n/.exec(text);
	if (signed) return { text: text.slice(signed.index + signed[0].length).trimStart(), trimmed: true };
	const m = /\[ ?(?:[1-3] )?[A-Z][a-z]+\.? \d+:\d+/.exec(text);
	if (!m) return { text, trimmed: false };
	const start = text.lastIndexOf('\n\n', m.index);
	// Only a bibliography is cut this way: the prooemium's own opening gloss,
	// which the signature rule leaves in place, must survive a second pass.
	if (start < 0 || (text.slice(0, start).match(/A\.D\. \d+/g)?.length ?? 0) < 5) return { text, trimmed: false };
	return { text: text.slice(start + 2).trimStart(), trimmed: true };
}
