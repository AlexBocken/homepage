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

function getRandomVerse(verses: BibleVerse[]): BibleVerse {
  const randomIndex = Math.floor(Math.random() * verses.length);
  return verses[randomIndex];
}

function formatVerse(verse: BibleVerse): string {
  return `${verse.bookName} ${verse.chapter}:${verse.verseNumber}`;
}

export const GET: RequestHandler = async ({ fetch }) => {
  try {
    const verses = await loadVerses(fetch);
    const randomVerse = getRandomVerse(verses);

    return json({
      text: randomVerse.text,
      reference: formatVerse(randomVerse),
      book: randomVerse.bookName,
      chapter: randomVerse.chapter,
      verse: randomVerse.verseNumber
    });
  } catch (err) {
    console.error('Error fetching random Bible verse:', err);
    return error(500, 'Failed to fetch Bible verse');
  }
};
