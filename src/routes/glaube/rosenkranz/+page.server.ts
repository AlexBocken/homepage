import { mysteryReferences, type MysteryDescription, type VerseData } from '$lib/data/mysteryDescriptions';
import type { PageServerLoad } from './$types';

export const prerender = true;

async function fetchBibleData(reference: string, fetch: typeof globalThis.fetch): Promise<{ text: string; verseData: VerseData | null }> {
  try {
    const response = await fetch(`/api/glaube/bibel/${encodeURIComponent(reference)}`);
    if (!response.ok) {
      console.error(`Failed to fetch reference ${reference}:`, response.status);
      return { text: '', verseData: null };
    }
    const data = await response.json();

    // Format the verses into a single text with guillemets
    let text = '';
    if (data.verses && data.verses.length > 0) {
      text = `«${data.verses.map((v: { verse: number; text: string }) => v.text).join(' ')}»`;
    }

    // Store the full verse data for the modal
    const verseData: VerseData = {
      book: data.book,
      chapter: data.chapter,
      verses: data.verses
    };

    return { text, verseData };
  } catch (err) {
    console.error(`Error fetching reference ${reference}:`, err);
    return { text: '', verseData: null };
  }
}

export const load: PageServerLoad = async ({ fetch }) => {
  // Fetch Bible texts for all mysteries at build time
  const mysteryDescriptions: Record<string, MysteryDescription[]> = {
    lichtreichen: [],
    freudenreich: [],
    schmerzhaften: [],
    glorreichen: []
  };

  // Process each mystery type
  for (const [mysteryType, references] of Object.entries(mysteryReferences)) {
    const descriptions: MysteryDescription[] = [];

    for (const ref of references) {
      const { text, verseData } = await fetchBibleData(ref.reference, fetch);
      descriptions.push({
        title: ref.title,
        reference: ref.reference,
        text,
        verseData
      });
    }

    mysteryDescriptions[mysteryType] = descriptions;
  }

  return {
    mysteryDescriptions
  };
};
