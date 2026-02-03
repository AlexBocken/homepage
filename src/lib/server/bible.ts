import { readFileSync } from 'fs';
import { resolve } from 'path';

export interface BibleVerse {
	bookName: string;
	abbreviation: string;
	bookNumber: number;
	chapter: number;
	verseNumber: number;
	text: string;
}

let cachedVerses: BibleVerse[] | null = null;

export function loadVersesFromFile(tsvPath?: string): BibleVerse[] {
	if (cachedVerses) return cachedVerses;

	const filePath = tsvPath ?? resolve('static/allioli.tsv');
	const content = readFileSync(filePath, 'utf-8');
	const lines = content.trim().split('\n');

	cachedVerses = lines.map((line) => {
		const [bookName, abbreviation, bookNumber, chapter, verseNumber, text] = line.split('\t');
		return {
			bookName,
			abbreviation,
			bookNumber: parseInt(bookNumber),
			chapter: parseInt(chapter),
			verseNumber: parseInt(verseNumber),
			text
		};
	});

	return cachedVerses;
}

function parseReference(reference: string) {
	const match = reference.match(
		/^([A-Za-zäöüÄÖÜß]+)\s*(\d+)[\s,:]+(\d+)(?:[-:](\d+))?$/
	);
	if (!match) return null;

	const [, bookRef, chapterStr, startVerseStr, endVerseStr] = match;

	return {
		bookRef,
		isFullName: bookRef.length > 5,
		chapter: parseInt(chapterStr),
		startVerse: parseInt(startVerseStr),
		endVerse: endVerseStr ? parseInt(endVerseStr) : parseInt(startVerseStr)
	};
}

export function getVersesByReference(
	verses: BibleVerse[],
	reference: string
): BibleVerse[] {
	const parsed = parseReference(reference);
	if (!parsed) return [];

	return verses.filter((v) => {
		const bookMatches = parsed.isFullName
			? v.bookName === parsed.bookRef
			: v.abbreviation === parsed.bookRef;

		return (
			bookMatches &&
			v.chapter === parsed.chapter &&
			v.verseNumber >= parsed.startVerse &&
			v.verseNumber <= parsed.endVerse
		);
	});
}

export function lookupReference(reference: string, tsvPath?: string) {
	const verses = loadVersesFromFile(tsvPath);
	const matched = getVersesByReference(verses, reference);

	if (matched.length === 0) return null;

	const first = matched[0];
	return {
		reference,
		book: first.bookName,
		chapter: first.chapter,
		verses: matched.map((v) => ({ verse: v.verseNumber, text: v.text }))
	};
}
