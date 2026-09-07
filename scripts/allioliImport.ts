/**
 * The pure part of `scripts/import-allioli.ts`: reading what `allioli -j`
 * prints. Kept separate so the unit test can import it without running the
 * command-line entry point.
 */
export type Verse = { verse: number; text: { latin?: string; german: string }; footnotes?: { number: number; text: string }[] };
export type Chapter = { chapter: number; verses: Verse[] };
export type Book = { book: { name: string; abbreviation: string; number: number }; chapters: Chapter[] };

/**
 * `allioli -j <Book>` prints one book, `allioli -j -d` an array of all of
 * them; an ambiguous abbreviation ("Phil") also yields an array. Both come
 * back as a list of books, in canonical order.
 */
export function booksFromJson(raw: string): Book[] {
	const parsed = parseRepaired(raw) as Book | Book[];
	const books = Array.isArray(parsed) ? parsed : [parsed];
	for (const b of books) {
		if (!b?.book?.abbreviation || !Array.isArray(b.chapters)) throw new Error('allioli output is not a book: missing "book" or "chapters"');
	}
	return [...books].sort((a, b) => a.book.number - b.book.number);
}

/**
 * `allioli` does not escape a bare ASCII quote inside a string (the John
 * introduction quotes Augustine with "…"), which breaks the JSON. Each
 * failure names the position just past the stray quote; escaping it and
 * parsing again mends the dump one quote at a time. Fix the tool; this
 * keeps the import going meanwhile.
 */
export function parseRepaired(raw: string): unknown {
	let text = raw;
	for (let i = 0; i < 500; i++) {
		try {
			return JSON.parse(text);
		} catch (e) {
			const at = Number((e as Error).message.match(/position (\d+)/)?.[1]);
			const q = Number.isFinite(at) ? text.lastIndexOf('"', at - 1) : -1;
			if (q < 0 || text[q - 1] === '\\') throw e;
			text = `${text.slice(0, q)}\\"${text.slice(q + 1)}`;
		}
	}
	throw new Error('allioli output could not be repaired: too many unescaped quotes');
}
