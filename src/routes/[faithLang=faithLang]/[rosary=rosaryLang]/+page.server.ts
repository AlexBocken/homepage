import { mysteryVerseDataDe, mysteryVerseDataEn } from '$lib/data/mysteryVerseData';
import type { PageServerLoad, Actions } from './$types';

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

export const load: PageServerLoad = async ({ url, fetch, locals, params }) => {
  const session = await locals.auth();

  // Read toggle/mystery state from URL search params (for no-JS progressive enhancement)
  const luminousParam = url.searchParams.get('luminous');
  const latinParam = url.searchParams.get('latin');
  const mysteryParam = url.searchParams.get('mystery');
  const imagesParam = url.searchParams.get('images');

  const hasUrlLuminous = luminousParam !== null;
  const hasUrlLatin = latinParam !== null;
  const hasUrlMystery = mysteryParam !== null;
  const hasUrlImages = imagesParam !== null;

  const initialLuminous = hasUrlLuminous ? luminousParam !== '0' : true;
  const initialLatin = hasUrlLatin ? latinParam !== '0' : true;
  const initialShowImages = hasUrlImages ? imagesParam !== '0' : true;

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
    mysteryDescriptions: params.faithLang === 'faith' ? mysteryVerseDataEn : mysteryVerseDataDe,
    streakData,
    isLoggedIn: !!session?.user?.nickname,
    initialMystery,
    todaysMystery,
    initialLuminous,
    initialLatin,
    hasUrlMystery,
    hasUrlLuminous,
    hasUrlLatin,
    initialShowImages,
    hasUrlImages
  };
};

export const actions: Actions = {
  pray: async ({ locals, fetch }) => {
    const session = await locals.auth();
    if (!session?.user?.nickname) {
      return { success: false };
    }

    const res = await fetch('/api/glaube/rosary-streak');
    const current = res.ok ? await res.json() : { length: 0, lastPrayed: null };

    const today = new Date().toISOString().split('T')[0];
    if (current.lastPrayed === today) {
      return { success: true, alreadyPrayed: true };
    }

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const newLength = current.lastPrayed === yesterdayStr ? current.length + 1 : 1;

    await fetch('/api/glaube/rosary-streak', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ length: newLength, lastPrayed: today })
    });

    return { success: true };
  }
};
