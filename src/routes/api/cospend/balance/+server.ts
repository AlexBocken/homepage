import type { RequestHandler } from '@sveltejs/kit';
import { PaymentSplit } from '$models/PaymentSplit';
import { Payment } from '$models/Payment'; // Need to import Payment for populate to work
import { dbConnect } from '$utils/db';
import { error, json } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ locals, url }) => {
  const auth = locals.session ?? await locals.auth();
  if (!auth || !auth.user?.nickname) {
    throw error(401, 'Not logged in');
  }

  const username = auth.user.nickname;
  const includeAll = url.searchParams.get('all') === 'true';

  await dbConnect();

  try {
    if (includeAll) {
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

      return json(result);

    } else {
      // Run balance sum and recent splits in parallel
      const [balanceResult, recentSplits] = await Promise.all([
        PaymentSplit.aggregate([
          { $match: { username } },
          { $group: { _id: null, total: { $sum: '$amount' } } }
        ]),
        PaymentSplit.aggregate([
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
        ])
      ]);

      const netBalance = balanceResult[0]?.total ?? 0;

      // Batch-fetch other users for settlements (avoids N+1 queries)
      const settlementIds = recentSplits
        .filter(s => s.paymentId?.category === 'settlement')
        .map(s => s.paymentId._id);

      if (settlementIds.length > 0) {
        const otherSplits = await PaymentSplit.find({
          paymentId: { $in: settlementIds } as any,
          username: { $ne: username }
        }).lean();

        const otherUserByPayment = new Map(
          otherSplits.map(s => [s.paymentId.toString(), s.username])
        );

        for (const split of recentSplits) {
          if (split.paymentId?.category === 'settlement') {
            split.otherUser = otherUserByPayment.get(split.paymentId._id.toString());
          }
        }
      }

      const result = {
        netBalance,
        recentSplits
      };

      return json(result);
    }

  } catch (e) {
    console.error('Error calculating balance:', e);
    throw error(500, 'Failed to calculate balance');
  }
};
