import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

interface BibleVerse {
  bookName: string;
  abbreviation: string;
  bookNumber: number;
  chapter: number;
  verseNumber: number;
  text: string;
}

// Cache for parsed verses to avoid reading file repeatedly
let cachedVerses: BibleVerse[] | null = null;

async function loadVerses(fetch: typeof globalThis.fetch): Promise<BibleVerse[]> {
  if (cachedVerses) {
    return cachedVerses;
  }

  try {
    const response = await fetch('/allioli.tsv');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const content = await response.text();
    const lines = content.trim().split('\n');

    cachedVerses = lines.map(line => {
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
  } catch (err) {
    console.error('Error loading Bible verses:', err);
    throw new Error('Failed to load Bible verses');
  }
}

function parseReference(reference: string): { bookRef: string; isFullName: boolean; chapter: number; startVerse: number; endVerse: number } | null {
  // Parse various reference formats:
  // "Mt 3, 16-17", "Mt3:16-17", "Mt 3:16-17", "Lk1:3", "Matthäus 3, 16-17"
  // Match book name (letters and umlauts), optional space, chapter, separator (: or ,), optional space, verse(s)
  const match = reference.match(/^([A-Za-zäöüÄÖÜß]+)\s*(\d+)[\s,:]+(\d+)(?:[-:](\d+))?$/);
  if (!match) {
    return null;
  }

  const [, bookRef, chapterStr, startVerseStr, endVerseStr] = match;

  // If book reference is longer than 5 characters, assume it's a full name
  // Otherwise, assume it's an abbreviation
  const isFullName = bookRef.length > 5;

  return {
    bookRef,
    isFullName,
    chapter: parseInt(chapterStr),
    startVerse: parseInt(startVerseStr),
    endVerse: endVerseStr ? parseInt(endVerseStr) : parseInt(startVerseStr)
  };
}

function getVersesByReference(verses: BibleVerse[], reference: string): BibleVerse[] {
  const parsed = parseReference(reference);
  if (!parsed) {
    return [];
  }

  return verses.filter(v => {
    // Match based on whether we're using full name or abbreviation
    const bookMatches = parsed.isFullName
      ? v.bookName === parsed.bookRef
      : v.abbreviation === parsed.bookRef;

    return bookMatches &&
      v.chapter === parsed.chapter &&
      v.verseNumber >= parsed.startVerse &&
      v.verseNumber <= parsed.endVerse;
  });
}

export const GET: RequestHandler = async ({ params, fetch }) => {
  const reference = params.reference;

  if (!reference) {
    return error(400, 'Missing reference parameter');
  }

  try {
    const verses = await loadVerses(fetch);
    const matchedVerses = getVersesByReference(verses, reference);

    if (matchedVerses.length === 0) {
      return error(404, 'No verses found for the given reference');
    }

    // Extract book and chapter from first verse (they're all the same)
    const firstVerse = matchedVerses[0];

    return json({
      reference,
      book: firstVerse.bookName,
      chapter: firstVerse.chapter,
      verses: matchedVerses.map(v => ({
        verse: v.verseNumber,
        text: v.text
      }))
    });
  } catch (err) {
    console.error('Error fetching Bible verses:', err);
    return error(500, 'Failed to fetch Bible verses');
  }
};
