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
	const parsed = JSON.parse(raw) as Book | Book[];
	const books = Array.isArray(parsed) ? parsed : [parsed];
	for (const b of books) {
		if (!b?.book?.abbreviation || !Array.isArray(b.chapters)) throw new Error('allioli output is not a book: missing "book" or "chapters"');
	}
	return [...books].sort((a, b) => a.book.number - b.book.number);
}
