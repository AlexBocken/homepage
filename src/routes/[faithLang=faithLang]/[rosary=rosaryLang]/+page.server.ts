import { mysteryVerseData } from '$lib/data/mysteryVerseData';
import type { PageServerLoad } from './$types';

interface StreakData {
  length: number;
  lastPrayed: string | null;
}

export const load: PageServerLoad = async ({ fetch, locals }) => {
  const session = await locals.auth();

  // Fetch streak data for logged-in users via API route
  let streakData: StreakData | null = null;
  if (session?.user?.nickname) {
    try {
      const res = await fetch('/api/glaube/rosary-streak');
      if (res.ok) {
        streakData = await res.json();
      }
    } catch {
      // Server unavailable, client will use localStorage
    }
  }

  return {
    mysteryDescriptions: mysteryVerseData,
    streakData
  };
};
