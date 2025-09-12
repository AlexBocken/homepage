import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import fs from 'fs';
import path from 'path';

interface BibleVerse {
  bookName: string;
  abbreviation: string;
  chapter: number;
  verse: number;
  verseNumber: number;
  text: string;
}

// Cache for parsed verses to avoid reading file repeatedly
let cachedVerses: BibleVerse[] | null = null;

function loadVerses(): BibleVerse[] {
  if (cachedVerses) {
    return cachedVerses;
  }

  try {
    const filePath = path.join(process.cwd(), 'static', 'allioli.tsv');
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.trim().split('\n');
    
    cachedVerses = lines.map(line => {
      const [bookName, abbreviation, chapter, verse, verseNumber, text] = line.split('\t');
      return {
        bookName,
        abbreviation, 
        chapter: parseInt(chapter),
        verse: parseInt(verse),
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

export const GET: RequestHandler = async () => {
  try {
    const verses = loadVerses();
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