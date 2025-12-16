import { mysteryReferences, type MysteryDescription } from '$lib/data/mysteryDescriptions';
import type { PageServerLoad } from './$types';

export const prerender = true;

async function fetchBibleText(reference: string, fetch: typeof globalThis.fetch): Promise<string> {
  try {
    const response = await fetch(`/api/glaube/bibel/${encodeURIComponent(reference)}`);
    if (!response.ok) {
      console.error(`Failed to fetch reference ${reference}:`, response.status);
      return '';
    }
    const data = await response.json();

    // Format the verses into a single text with guillemets
    if (data.verses && data.verses.length > 0) {
      const text = data.verses.map((v: { verse: number; text: string }) => v.text).join(' ');
      return `«${text}»`;
    }
    return '';
  } catch (err) {
    console.error(`Error fetching reference ${reference}:`, err);
    return '';
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
      const text = await fetchBibleText(ref.reference, fetch);
      descriptions.push({
        title: ref.title,
        reference: ref.reference,
        text
      });
    }

    mysteryDescriptions[mysteryType] = descriptions;
  }

  return {
    mysteryDescriptions
  };
};
