import type { RequestHandler } from '@sveltejs/kit';
import { Payment } from '../../../../models/Payment';
import { PaymentSplit } from '../../../../models/PaymentSplit';
import { dbConnect, dbDisconnect } from '../../../../utils/db';
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
      .sort({ date: -1 })
      .limit(limit)
      .skip(offset)
      .lean();

    return json({ payments });
  } catch (e) {
    throw error(500, 'Failed to fetch payments');
  } finally {
    await dbDisconnect();
  }
};

export const POST: RequestHandler = async ({ request, locals }) => {
  const auth = await locals.auth();
  if (!auth || !auth.user?.nickname) {
    throw error(401, 'Not logged in');
  }

  const data = await request.json();
  const { title, description, amount, paidBy, date, image, splitMethod, splits } = data;

  if (!title || !amount || !paidBy || !splitMethod || !splits) {
    throw error(400, 'Missing required fields');
  }

  if (amount <= 0) {
    throw error(400, 'Amount must be positive');
  }

  if (!['equal', 'full', 'proportional'].includes(splitMethod)) {
    throw error(400, 'Invalid split method');
  }

  await dbConnect();
  
  try {
    const payment = await Payment.create({
      title,
      description,
      amount,
      currency: 'CHF',
      paidBy,
      date: date ? new Date(date) : new Date(),
      image,
      splitMethod,
      createdBy: auth.user.nickname
    });

    const splitPromises = splits.map((split: any) => {
      return PaymentSplit.create({
        paymentId: payment._id,
        username: split.username,
        amount: split.amount,
        proportion: split.proportion
      });
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
    await dbDisconnect();
  }
};