import type { PageServerLoad } from './$types';
import { redirect, error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals, fetch, url }) => {
  const session = await locals.auth();
  
  if (!session) {
    throw redirect(302, '/login');
  }

  try {
    // Get pagination params from URL
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const offset = parseInt(url.searchParams.get('offset') || '0');
    
    // Fetch payments data server-side using existing API
    const paymentsResponse = await fetch(`/api/cospend/payments?limit=${limit}&offset=${offset}`);
    if (!paymentsResponse.ok) {
      throw new Error('Failed to fetch payments');
    }
    const paymentsData = await paymentsResponse.json();

    return {
      session,
      payments: paymentsData.payments,
      hasMore: paymentsData.payments.length === limit,
      currentOffset: offset,
      limit
    };
  } catch (e) {
    console.error('Error loading payments data:', e);
    throw error(500, 'Failed to load payments data');
  }
};