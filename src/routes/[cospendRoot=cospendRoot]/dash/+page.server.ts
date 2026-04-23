import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { errorWithVerse } from '$lib/server/errorQuote';

export const load: PageServerLoad = async ({ locals, fetch, url }) => {
  const session = locals.session ?? await locals.auth();

  if (!session) {
    throw redirect(302, '/login');
  }

  try {
    // Fetch both balance and debt data server-side using existing APIs
    const [balanceResponse, debtResponse] = await Promise.all([
      fetch('/api/cospend/balance'),
      fetch('/api/cospend/debts')
    ]);

    if (!balanceResponse.ok) {
      throw new Error('Failed to fetch balance');
    }

    if (!debtResponse.ok) {
      throw new Error('Failed to fetch debt data');
    }

    const balance = await balanceResponse.json();
    const debtData = await debtResponse.json();

    return {
      session,
      balance,
      debtData
    };
  } catch (e) {
    console.error('Error loading dashboard data:', e);
    await errorWithVerse(fetch, url.pathname, 500, 'Failed to load dashboard data');
  }
};