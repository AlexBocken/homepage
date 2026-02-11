import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { resolve } from 'path';

interface BibleVerse {
  bookName: string;
  abbreviation: string;
  bookNumber: number;
  chapter: number;
  verseNumber: number;
  text: string;
}

const tsvFiles: Record<string, string> = {
  glaube: '/allioli.tsv',
  faith: '/drb.tsv'
};

// Cache for parsed verses per language
const versesCache = new Map<string, BibleVerse[]>();

async function loadVerses(fetch: typeof globalThis.fetch, tsvFile: string): Promise<BibleVerse[]> {
  const cached = versesCache.get(tsvFile);
  if (cached) return cached;

  try {
    const response = await fetch(tsvFile);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const content = await response.text();
    const lines = content.trim().split('\n');

    const verses = lines.map(line => {
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

    versesCache.set(tsvFile, verses);
    return verses;
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

export const GET: RequestHandler = async ({ fetch, params }) => {
  const tsvFile = tsvFiles[params.faithLang];

  try {
    const verses = await loadVerses(fetch, tsvFile);
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
