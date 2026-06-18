import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { errorWithVerse } from '$lib/server/errorQuote';

export const load: PageServerLoad = async ({ locals, fetch, url }) => {
  const session = locals.session ?? await locals.auth();
  
  if (!session) {
    throw redirect(302, '/login');
  }

  try {
    // Pagination + search/filter params from URL
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const filterKeys = ['q', 'category', 'paidBy', 'dateFrom', 'dateTo', 'amountMin', 'amountMax'] as const;
    /** @type {Record<string, string>} */
    const filters: Record<string, string> = {};
    for (const k of filterKeys) {
      const v = url.searchParams.get(k);
      if (v) filters[k] = v;
    }

    const params = new URLSearchParams({ limit: String(limit), offset: String(offset), ...filters });

    const [paymentsResponse, facetsResponse] = await Promise.all([
      fetch(`/api/cospend/payments?${params.toString()}`),
      // Facets honour the active filters (except amount) so the histogram is faceted.
      fetch(`/api/cospend/payments/facets?${new URLSearchParams(filters).toString()}`)
    ]);
    if (!paymentsResponse.ok) {
      throw new Error('Failed to fetch payments');
    }
    const paymentsData = await paymentsResponse.json();
    const facets = facetsResponse.ok
      ? await facetsResponse.json()
      : { amount: { min: 0, max: 0 }, date: { min: null, max: null }, histogram: [] };

    return {
      session,
      payments: paymentsData.payments,
      hasMore: paymentsData.payments.length === limit,
      currentOffset: offset,
      limit,
      facets,
      filters: {
        q: filters.q ?? '',
        category: filters.category ?? '',
        paidBy: filters.paidBy ?? '',
        dateFrom: filters.dateFrom ?? '',
        dateTo: filters.dateTo ?? '',
        amountMin: filters.amountMin ?? '',
        amountMax: filters.amountMax ?? ''
      }
    };
  } catch (e) {
    console.error('Error loading payments data:', e);
    await errorWithVerse(fetch, url.pathname, 500, 'Failed to load payments data');
    throw new Error('unreachable');
  }
};