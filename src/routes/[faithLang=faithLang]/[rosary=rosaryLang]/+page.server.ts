import { mysteryVerseData } from '$lib/data/mysteryVerseData';
import type { PageServerLoad } from './$types';

interface StreakData {
  length: number;
  lastPrayed: string | null;
}

const validMysteries = ['freudenreich', 'schmerzhaften', 'glorreichen', 'lichtreichen'] as const;

function getMysteryForWeekday(date: Date, includeLuminous: boolean): string {
  const dayOfWeek = date.getDay();

  if (includeLuminous) {
    const schedule: Record<number, string> = {
      0: 'glorreichen',
      1: 'freudenreich',
      2: 'schmerzhaften',
      3: 'glorreichen',
      4: 'lichtreichen',
      5: 'schmerzhaften',
      6: 'freudenreich'
    };
    return schedule[dayOfWeek];
  } else {
    const schedule: Record<number, string> = {
      0: 'glorreichen',
      1: 'freudenreich',
      2: 'schmerzhaften',
      3: 'glorreichen',
      4: 'freudenreich',
      5: 'schmerzhaften',
      6: 'glorreichen'
    };
    return schedule[dayOfWeek];
  }
}

export const load: PageServerLoad = async ({ url, fetch, locals }) => {
  const session = await locals.auth();

  // Read toggle/mystery state from URL search params (for no-JS progressive enhancement)
  const luminousParam = url.searchParams.get('luminous');
  const latinParam = url.searchParams.get('latin');
  const mysteryParam = url.searchParams.get('mystery');

  const hasUrlLuminous = luminousParam !== null;
  const hasUrlLatin = latinParam !== null;
  const hasUrlMystery = mysteryParam !== null;

  const initialLuminous = hasUrlLuminous ? luminousParam !== '0' : true;
  const initialLatin = hasUrlLatin ? latinParam !== '0' : true;

  const todaysMystery = getMysteryForWeekday(new Date(), initialLuminous);

  let initialMystery = (validMysteries as readonly string[]).includes(mysteryParam ?? '')
    ? mysteryParam!
    : todaysMystery;

  // If luminous is off and luminous mystery was selected, fall back
  if (!initialLuminous && initialMystery === 'lichtreichen') {
    initialMystery = todaysMystery;
  }

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
    streakData,
    initialMystery,
    todaysMystery,
    initialLuminous,
    initialLatin,
    hasUrlMystery,
    hasUrlLuminous,
    hasUrlLatin
  };
};
