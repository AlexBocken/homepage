import type { RequestHandler } from '@sveltejs/kit';
import { PaymentSplit } from '../../../../models/PaymentSplit';
import { Payment } from '../../../../models/Payment';
import { dbConnect } from '../../../../utils/db';
import { error, json } from '@sveltejs/kit';

interface DebtSummary {
  username: string;
  netAmount: number; // positive = you owe them, negative = they owe you
  transactions: {
    paymentId: string;
    title: string;
    amount: number;
    date: Date;
    category: string;
  }[];
}

export const GET: RequestHandler = async ({ locals }) => {
  const auth = await locals.auth();
  if (!auth || !auth.user?.nickname) {
    throw error(401, 'Not logged in');
  }

  const currentUser = auth.user.nickname;

  await dbConnect();
  
  try {
    // Get all splits for the current user
    const userSplits = await PaymentSplit.find({ username: currentUser })
      .populate('paymentId')
      .lean();

    // Get all other users who have splits with payments involving the current user
    const paymentIds = userSplits.map(split => split.paymentId._id);
    const allRelatedSplits = await PaymentSplit.find({
      paymentId: { $in: paymentIds },
      username: { $ne: currentUser }
    })
      .populate('paymentId')
      .lean();

    // Group debts by user
    const debtsByUser = new Map<string, DebtSummary>();

    // Process current user's splits to understand what they owe/are owed
    for (const split of userSplits) {
      const payment = split.paymentId as any;
      if (!payment) continue;

      // Find other participants in this payment
      const otherSplits = allRelatedSplits.filter(s => 
        s.paymentId._id.toString() === split.paymentId._id.toString()
      );

      for (const otherSplit of otherSplits) {
        const otherUser = otherSplit.username;
        
        if (!debtsByUser.has(otherUser)) {
          debtsByUser.set(otherUser, {
            username: otherUser,
            netAmount: 0,
            transactions: []
          });
        }

        const debt = debtsByUser.get(otherUser)!;
        
        // Current user's amount: positive = they owe, negative = they are owed
        // We want to show net between the two users
        debt.netAmount += split.amount;
        
        debt.transactions.push({
          paymentId: payment._id.toString(),
          title: payment.title,
          amount: split.amount,
          date: payment.date,
          category: payment.category
        });
      }
    }

    // Convert map to array and sort by absolute amount (largest debts first)
    const debtSummaries = Array.from(debtsByUser.values())
      .filter(debt => Math.abs(debt.netAmount) > 0.01) // Filter out tiny amounts
      .sort((a, b) => Math.abs(b.netAmount) - Math.abs(a.netAmount));

    // Separate into who owes you vs who you owe
    const whoOwesMe = debtSummaries.filter(debt => debt.netAmount < 0).map(debt => ({
      ...debt,
      netAmount: Math.round(Math.abs(debt.netAmount) * 100) / 100 // Round to 2 decimal places and make positive for display
    }));

    const whoIOwe = debtSummaries.filter(debt => debt.netAmount > 0).map(debt => ({
      ...debt,
      netAmount: Math.round(debt.netAmount * 100) / 100 // Round to 2 decimal places
    }));

    return json({
      whoOwesMe,
      whoIOwe,
      totalOwedToMe: whoOwesMe.reduce((sum, debt) => sum + debt.netAmount, 0),
      totalIOwe: whoIOwe.reduce((sum, debt) => sum + debt.netAmount, 0)
    });

  } catch (e) {
    console.error('Error calculating debt breakdown:', e);
    throw error(500, 'Failed to calculate debt breakdown');
  } finally {
    // Connection will be reused
  }
};