import type { RequestHandler } from '@sveltejs/kit';
import { PaymentSplit } from '$models/PaymentSplit';
import { Payment } from '$models/Payment'; // Need to import Payment for populate to work
import { dbConnect } from '$utils/db';
import { error, json } from '@sveltejs/kit';
import cache from '$lib/server/cache';

export const GET: RequestHandler = async ({ locals, url }) => {
  const auth = await locals.auth();
  if (!auth || !auth.user?.nickname) {
    throw error(401, 'Not logged in');
  }

  const username = auth.user.nickname;
  const includeAll = url.searchParams.get('all') === 'true';

  await dbConnect();

  try {
    if (includeAll) {
      // Try cache first for all balances
      const cacheKey = 'cospend:balance:all';
      const cached = await cache.get(cacheKey);

      if (cached) {
        return json(JSON.parse(cached));
      }

      const allSplits = await PaymentSplit.aggregate([
        {
          $group: {
            _id: '$username',
            totalOwed: { $sum: { $cond: [{ $gt: ['$amount', 0] }, '$amount', 0] } },
            totalOwing: { $sum: { $cond: [{ $lt: ['$amount', 0] }, { $abs: '$amount' }, 0] } },
            netBalance: { $sum: '$amount' }
          }
        },
        {
          $project: {
            username: '$_id',
            totalOwed: 1,
            totalOwing: 1,
            netBalance: 1,
            _id: 0
          }
        }
      ]);

      const currentUserBalance = allSplits.find(balance => balance.username === username) || {
        username,
        totalOwed: 0,
        totalOwing: 0,
        netBalance: 0
      };

      const result = {
        currentUser: currentUserBalance,
        allBalances: allSplits
      };

      // Cache for 30 minutes
      await cache.set(cacheKey, JSON.stringify(result), 1800);

      return json(result);

    } else {
      // Try cache first for individual user balance
      const cacheKey = `cospend:balance:${username}`;
      const cached = await cache.get(cacheKey);

      if (cached) {
        return json(JSON.parse(cached));
      }

      const userSplits = await PaymentSplit.find({ username }).lean();

      // Calculate net balance: negative = you are owed money, positive = you owe money
      const netBalance = userSplits.reduce((sum, split) => sum + split.amount, 0);

      const recentSplits = await PaymentSplit.aggregate([
        { $match: { username } },
        {
          $lookup: {
            from: 'payments',
            localField: 'paymentId',
            foreignField: '_id',
            as: 'paymentId'
          }
        },
        { $unwind: '$paymentId' },
        { $sort: { 'paymentId.date': -1, 'paymentId.createdAt': -1 } },
        { $limit: 30 }
      ]);

      // For settlements, fetch the other user's split info
      for (const split of recentSplits) {
        if (split.paymentId && split.paymentId.category === 'settlement') {
          // This is a settlement, find the other user
          const otherSplit = await PaymentSplit.findOne({
            paymentId: split.paymentId._id,
            username: { $ne: username }
          }).lean();

          if (otherSplit) {
            split.otherUser = otherSplit.username;
          }
        }
      }

      const result = {
        netBalance,
        recentSplits
      };

      // Cache for 30 minutes
      await cache.set(cacheKey, JSON.stringify(result), 1800);

      return json(result);
    }

  } catch (e) {
    console.error('Error calculating balance:', e);
    throw error(500, 'Failed to calculate balance');
  }
};