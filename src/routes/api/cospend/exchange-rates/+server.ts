import type { RequestHandler } from '@sveltejs/kit';
import { ExchangeRate } from '$models/ExchangeRate';
import { dbConnect } from '$utils/db';
import { error, json } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ locals, url }) => {
  const auth = await locals.auth();
  if (!auth || !auth.user?.nickname) {
    throw error(401, 'Not logged in');
  }

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

async function getExchangeRate(fromCurrency: string, date: string): Promise<number> {
  if (fromCurrency === 'CHF') {
    return 1;
  }

  const dateStr = date.split('T')[0]; // Extract YYYY-MM-DD
  
  await dbConnect();
  
  try {
    // Try cache first
    const cachedRate = await ExchangeRate.findOne({
      fromCurrency,
      toCurrency: 'CHF',
      date: dateStr
    });

    if (cachedRate) {
      return cachedRate.rate;
    }

    // Fetch from API
    const rate = await fetchFromFrankfurterAPI(fromCurrency, dateStr);
    
    // Cache the result
    await ExchangeRate.create({
      fromCurrency,
      toCurrency: 'CHF',
      rate,
      date: dateStr
    });

    return rate;
  } finally {
    // Connection will be reused
  }
}

async function fetchFromFrankfurterAPI(fromCurrency: string, date: string): Promise<number> {
  const url = `https://api.frankfurter.app/${date}?from=${fromCurrency}&to=CHF`;
  
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Frankfurter API request failed: ${response.status}`);
  }

  const data = await response.json();
  
  if (!data.rates || !data.rates.CHF) {
    throw new Error(`No exchange rate found for ${fromCurrency} to CHF on ${date}`);
  }

  return data.rates.CHF;
}

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

function isValidCurrencyCode(currency: string): boolean {
  return /^[A-Z]{3}$/.test(currency);
}