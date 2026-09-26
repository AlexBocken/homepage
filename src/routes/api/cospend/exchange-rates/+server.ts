import type { RequestHandler } from '@sveltejs/kit';
import { error, json } from '@sveltejs/kit';
import { requireAuth } from '$lib/server/middleware/auth';
import { getExchangeRate, isValidCurrencyCode } from '$lib/utils/currency';

export const GET: RequestHandler = async ({ locals, url }) => {
  await requireAuth(locals);

  const fromCurrency = url.searchParams.get('from')?.toUpperCase();
  const date = url.searchParams.get('date');
  const action = url.searchParams.get('action') || 'rate';

  if (action === 'currencies') {
    return await getSupportedCurrencies();
  }

  if (!fromCurrency || !date) {
    throw error(400, 'Missing required parameters: from and date');
  }

  if (!isValidCurrencyCode(fromCurrency)) {
    throw error(400, 'Invalid currency code');
  }

  try {
    const rate = await getExchangeRate(fromCurrency, date);
    return json({ rate, fromCurrency, toCurrency: 'CHF', date });
  } catch (e) {
    console.error('Error getting exchange rate:', e);
    throw error(500, 'Failed to get exchange rate');
  }
};

async function getSupportedCurrencies() {
  try {
    const response = await fetch('https://api.frankfurter.app/currencies');
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const data = await response.json();
    const currencies = Object.keys(data);
    
    return json({ currencies });
  } catch (e) {
    console.error('Error fetching supported currencies:', e);
    // Return common currencies as fallback
    const fallbackCurrencies = ['EUR', 'USD', 'GBP', 'JPY', 'CAD', 'AUD', 'SEK', 'NOK', 'DKK'];
    return json({ currencies: fallbackCurrencies });
  }
}
