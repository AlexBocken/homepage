import { ExchangeRate } from '$models/ExchangeRate';
import { dbConnect } from '$utils/db';

/**
 * Convert amount from foreign currency to CHF using direct database/API access
 */
export async function convertToCHF(
  amount: number,
  fromCurrency: string,
  date: string,
  fetch?: typeof globalThis.fetch
): Promise<{
  convertedAmount: number;
  exchangeRate: number;
}> {
  if (fromCurrency.toUpperCase() === 'CHF') {
    return {
      convertedAmount: amount,
      exchangeRate: 1
    };
  }

  const rate = await getExchangeRate(fromCurrency.toUpperCase(), date);

  return {
    convertedAmount: amount * rate,
    exchangeRate: rate
  };
}

/**
 * Rate from `fromCurrency` (upper-case ISO code) to CHF on `date` (YYYY-MM-DD,
 * or an ISO timestamp whose date part is used). CHF is 1; anything else comes
 * from the ExchangeRate cache, or from the Frankfurter API and is then cached.
 */
export async function getExchangeRate(fromCurrency: string, date: string): Promise<number> {
  if (fromCurrency === 'CHF') {
    return 1;
  }

  const dateStr = date.split('T')[0]; // Extract YYYY-MM-DD
  
  await dbConnect();
  
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
}

/**
 * Fetch exchange rate from Frankfurter API
 */
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

/**
 * Validate currency code (3-letter ISO code)
 */
export function isValidCurrencyCode(currency: string): boolean {
  return /^[A-Z]{3}$/.test(currency.toUpperCase());
}