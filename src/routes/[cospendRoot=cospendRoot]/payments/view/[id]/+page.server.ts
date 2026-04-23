import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { errorWithVerse } from '$lib/server/errorQuote';

export const load: PageServerLoad = async ({ locals, params, fetch, url }) => {
  const session = locals.session ?? await locals.auth();
  
  if (!session) {
    throw redirect(302, '/login');
  }

  try {
    // Fetch payment data server-side using existing API
    const paymentResponse = await fetch(`/api/cospend/payments/${params.id}`);
    if (!paymentResponse.ok) {
      throw new Error('Failed to fetch payment');
    }
    const paymentData = await paymentResponse.json();

    return {
      session,
      paymentId: params.id,
      payment: paymentData.payment
    };
  } catch (e) {
    console.error('Error loading payment data:', e);
    await errorWithVerse(fetch, url.pathname, 500, 'Failed to load payment data');
  }
};