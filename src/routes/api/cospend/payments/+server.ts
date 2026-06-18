import type { RequestHandler } from '@sveltejs/kit';
import { Payment } from '$models/Payment';
import { PaymentSplit } from '$models/PaymentSplit';
import { dbConnect } from '$utils/db';
import { convertToCHF, isValidCurrencyCode } from '$lib/utils/currency';
import { PAYMENT_CATEGORIES } from '$lib/js/cospendI18n';
import { error, json } from '@sveltejs/kit';

interface SplitInput {
  username: string;
  amount: number;
  proportion?: number;
  personalAmount?: number;
}

/** Whitelist receipt highlight selections into the stored shape (boxes 0..1). */
function sanitizeReceiptScan(raw: unknown) {
  if (!raw || typeof raw !== 'object') return undefined;
  const data = raw as Record<string, unknown>;
  const box = (b: unknown) => {
    if (!b || typeof b !== 'object') return null;
    const o = b as Record<string, unknown>;
    const n = (v: unknown) => (typeof v === 'number' && isFinite(v) ? Math.min(1, Math.max(0, v)) : null);
    const x0 = n(o.x0), y0 = n(o.y0), x1 = n(o.x1), y1 = n(o.y1);
    if (x0 === null || y0 === null || x1 === null || y1 === null) return null;
    return { x0, y0, x1, y1 };
  };
  const items = Array.isArray(data.items)
    ? data.items
        .map((it) => {
          const o = (it ?? {}) as Record<string, unknown>;
          const b = box(o.box);
          if (!b || typeof o.user !== 'string' || typeof o.amount !== 'number') return null;
          return { box: b, user: o.user, amount: o.amount };
        })
        .filter((x): x is { box: NonNullable<ReturnType<typeof box>>; user: string; amount: number } => x !== null)
    : [];
  const totalBox = box(data.totalBox);
  if (!totalBox && items.length === 0) return undefined;
  return { totalBox, items };
}

export const GET: RequestHandler = async ({ locals, url }) => {
  const auth = locals.session ?? await locals.auth();
  if (!auth || !auth.user?.nickname) {
    throw error(401, 'Not logged in');
  }

  const limit = parseInt(url.searchParams.get('limit') || '20');
  const offset = parseInt(url.searchParams.get('offset') || '0');

  await dbConnect();

  try {
    const payments = await Payment.find()
      .populate('splits')
      .sort({ date: -1, createdAt: -1 })
      .limit(limit)
      .skip(offset)
      .lean();

    return json({ payments });
  } catch (e) {
    throw error(500, 'Failed to fetch payments');
  }
};

export const POST: RequestHandler = async ({ request, locals }) => {
  const auth = locals.session ?? await locals.auth();
  if (!auth || !auth.user?.nickname) {
    throw error(401, 'Not logged in');
  }

  const data = await request.json();
  const { title, description, amount, currency, paidBy, date, image, category, splitMethod, splits, receiptScan } = data;

  if (!title || !amount || !paidBy || !splitMethod || !splits) {
    throw error(400, 'Missing required fields');
  }

  if (amount <= 0) {
    throw error(400, 'Amount must be positive');
  }

  if (!['equal', 'full', 'proportional', 'personal_equal'].includes(splitMethod)) {
    throw error(400, 'Invalid split method');
  }

  if (category && !PAYMENT_CATEGORIES.includes(category)) {
    throw error(400, 'Invalid category');
  }

  // Validate currency if provided
  const inputCurrency = currency?.toUpperCase() || 'CHF';
  if (currency && !isValidCurrencyCode(inputCurrency)) {
    throw error(400, 'Invalid currency code');
  }

  // Validate personal + equal split method
  if (splitMethod === 'personal_equal' && splits) {
    const totalPersonal = splits.reduce((sum: number, split: SplitInput) => {
      return sum + (split.personalAmount ?? 0);
    }, 0);

    if (totalPersonal > amount) {
      throw error(400, 'Personal amounts cannot exceed total payment amount');
    }
  }

  const paymentDate = date ? new Date(date) : new Date();
  let finalAmount = amount;
  let originalAmount: number | undefined;
  let exchangeRate: number | undefined;

  // Convert currency if not CHF
  if (inputCurrency !== 'CHF') {
    try {
      const conversion = await convertToCHF(amount, inputCurrency, paymentDate.toISOString());
      finalAmount = conversion.convertedAmount;
      originalAmount = amount;
      exchangeRate = conversion.exchangeRate;
    } catch (e) {
      console.error('Currency conversion error:', e);
      throw error(400, `Failed to convert ${inputCurrency} to CHF: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  await dbConnect();

  try {
    const payment = await Payment.create({
      title,
      description,
      amount: finalAmount,
      currency: inputCurrency,
      originalAmount,
      exchangeRate,
      paidBy,
      date: paymentDate,
      image,
      category: category || 'groceries',
      splitMethod,
      createdBy: auth.user.nickname,
      receiptScan: sanitizeReceiptScan(receiptScan)
    });

    // Convert split amounts to CHF if needed
    const convertedSplits = splits.map((split: SplitInput) => {
      let convertedAmount = split.amount;
      let convertedPersonalAmount = split.personalAmount;

      // Convert amounts if we have a foreign currency
      if (inputCurrency !== 'CHF' && exchangeRate) {
        convertedAmount = split.amount * exchangeRate;
        if (split.personalAmount) {
          convertedPersonalAmount = split.personalAmount * exchangeRate;
        }
      }

      return {
        paymentId: payment._id,
        username: split.username,
        amount: convertedAmount,
        proportion: split.proportion,
        personalAmount: convertedPersonalAmount
      };
    });

    const splitPromises = convertedSplits.map((split: (typeof convertedSplits)[number]) => {
      return PaymentSplit.create(split as any);
    });

    await Promise.all(splitPromises);

    return json({
      success: true,
      payment: payment._id
    });

  } catch (e) {
    console.error('Error creating payment:', e);
    throw error(500, 'Failed to create payment');
  }
};
