import type { RequestHandler } from '@sveltejs/kit';
import { Payment } from '$models/Payment';
import { PaymentSplit } from '$models/PaymentSplit';
import { dbConnect } from '$utils/db';
import { error, json } from '@sveltejs/kit';
import cache, { invalidateCospendCaches } from '$lib/server/cache';

export const GET: RequestHandler = async ({ params, locals }) => {
  const auth = await locals.auth();
  if (!auth || !auth.user?.nickname) {
    throw error(401, 'Not logged in');
  }

  const { id } = params;

  await dbConnect();

  try {
    // Try cache first
    const cacheKey = `cospend:payment:${id}`;
    const cached = await cache.get(cacheKey);

    if (cached) {
      return json(JSON.parse(cached));
    }

    const payment = await Payment.findById(id).populate('splits').lean();

    if (!payment) {
      throw error(404, 'Payment not found');
    }

    const result = { payment };

    // Cache for 30 minutes
    await cache.set(cacheKey, JSON.stringify(result), 1800);

    return json(result);
  } catch (e) {
    if (e.status === 404) throw e;
    throw error(500, 'Failed to fetch payment');
  } finally {
    // Connection will be reused
  }
};

export const PUT: RequestHandler = async ({ params, request, locals }) => {
  const auth = await locals.auth();
  if (!auth || !auth.user?.nickname) {
    throw error(401, 'Not logged in');
  }

  const { id } = params;
  const data = await request.json();

  await dbConnect();

  try {
    const payment = await Payment.findById(id);

    if (!payment) {
      throw error(404, 'Payment not found');
    }

    if (payment.createdBy !== auth.user.nickname) {
      throw error(403, 'Not authorized to edit this payment');
    }

    // Get old splits to invalidate caches for users who were in the original payment
    const oldSplits = await PaymentSplit.find({ paymentId: id }).lean();
    const oldUsernames = oldSplits.map(split => split.username);

    const updatedPayment = await Payment.findByIdAndUpdate(
      id,
      {
        title: data.title,
        description: data.description,
        amount: data.amount,
        paidBy: data.paidBy,
        date: data.date ? new Date(data.date) : payment.date,
        image: data.image,
        category: data.category || payment.category,
        splitMethod: data.splitMethod
      },
      { new: true }
    );

    let newUsernames: string[] = [];
    if (data.splits) {
      await PaymentSplit.deleteMany({ paymentId: id });

      const splitPromises = data.splits.map((split: any) => {
        return PaymentSplit.create({
          paymentId: id,
          username: split.username,
          amount: split.amount,
          proportion: split.proportion,
          personalAmount: split.personalAmount
        });
      });

      await Promise.all(splitPromises);
      newUsernames = data.splits.map((split: any) => split.username);
    }

    // Invalidate caches for all users (old and new)
    const allAffectedUsers = [...new Set([...oldUsernames, ...newUsernames])];
    await invalidateCospendCaches(allAffectedUsers, id);

    return json({ success: true, payment: updatedPayment });
  } catch (e) {
    if (e.status) throw e;
    throw error(500, 'Failed to update payment');
  } finally {
    // Connection will be reused
  }
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
  const auth = await locals.auth();
  if (!auth || !auth.user?.nickname) {
    throw error(401, 'Not logged in');
  }

  const { id } = params;

  await dbConnect();

  try {
    const payment = await Payment.findById(id);

    if (!payment) {
      throw error(404, 'Payment not found');
    }

    if (payment.createdBy !== auth.user.nickname) {
      throw error(403, 'Not authorized to delete this payment');
    }

    // Get splits to invalidate caches for affected users
    const splits = await PaymentSplit.find({ paymentId: id }).lean();
    const affectedUsernames = splits.map(split => split.username);

    await PaymentSplit.deleteMany({ paymentId: id });
    await Payment.findByIdAndDelete(id);

    // Invalidate caches for all affected users
    await invalidateCospendCaches(affectedUsernames, id);

    return json({ success: true });
  } catch (e) {
    if (e.status) throw e;
    throw error(500, 'Failed to delete payment');
  } finally {
    // Connection will be reused
  }
};