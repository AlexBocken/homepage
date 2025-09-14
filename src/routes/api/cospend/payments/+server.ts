import type { RequestHandler } from '@sveltejs/kit';
import { Payment } from '../../../../models/Payment';
import { PaymentSplit } from '../../../../models/PaymentSplit';
import { dbConnect } from '../../../../utils/db';
import { convertToCHF, isValidCurrencyCode } from '../../../../lib/utils/currency';
import { error, json } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ locals, url }) => {
  const auth = await locals.auth();
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
  } finally {
    // Connection will be reused
  }
};

export const POST: RequestHandler = async ({ request, locals }) => {
  const auth = await locals.auth();
  if (!auth || !auth.user?.nickname) {
    throw error(401, 'Not logged in');
  }

  const data = await request.json();
  const { title, description, amount, currency, paidBy, date, image, category, splitMethod, splits } = data;

  if (!title || !amount || !paidBy || !splitMethod || !splits) {
    throw error(400, 'Missing required fields');
  }

  if (amount <= 0) {
    throw error(400, 'Amount must be positive');
  }

  if (!['equal', 'full', 'proportional', 'personal_equal'].includes(splitMethod)) {
    throw error(400, 'Invalid split method');
  }

  if (category && !['groceries', 'shopping', 'travel', 'restaurant', 'utilities', 'fun', 'settlement'].includes(category)) {
    throw error(400, 'Invalid category');
  }

  // Validate currency if provided
  const inputCurrency = currency?.toUpperCase() || 'CHF';
  if (currency && !isValidCurrencyCode(inputCurrency)) {
    throw error(400, 'Invalid currency code');
  }

  // Validate personal + equal split method
  if (splitMethod === 'personal_equal' && splits) {
    const totalPersonal = splits.reduce((sum: number, split: any) => {
      return sum + (parseFloat(split.personalAmount) || 0);
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
      throw error(400, `Failed to convert ${inputCurrency} to CHF: ${e.message}`);
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
      createdBy: auth.user.nickname
    });

    // Convert split amounts to CHF if needed
    const convertedSplits = splits.map((split: any) => {
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

    const splitPromises = convertedSplits.map((split) => {
      return PaymentSplit.create(split);
    });

    await Promise.all(splitPromises);

    return json({ 
      success: true, 
      payment: payment._id 
    });

  } catch (e) {
    console.error('Error creating payment:', e);
    throw error(500, 'Failed to create payment');
  } finally {
    // Connection will be reused
  }
};