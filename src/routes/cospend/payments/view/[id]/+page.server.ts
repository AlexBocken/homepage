import type { PageServerLoad } from './$types';
import { redirect, error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals, params, fetch }) => {
  const session = await locals.auth();
  
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
    throw error(500, 'Failed to load payment data');
  }
};