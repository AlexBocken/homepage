import type { RequestHandler } from '@sveltejs/kit';
import { RecurringPayment } from '../../../../../models/RecurringPayment';
import { Payment } from '../../../../../models/Payment';
import { PaymentSplit } from '../../../../../models/PaymentSplit';
import { dbConnect, dbDisconnect } from '../../../../../utils/db';
import { error, json } from '@sveltejs/kit';
import { calculateNextExecutionDate } from '../../../../../lib/utils/recurring';

export const POST: RequestHandler = async ({ locals }) => {
  const auth = await locals.auth();
  if (!auth || !auth.user?.nickname) {
    throw error(401, 'Not logged in');
  }

  await dbConnect();
  
  try {
    const now = new Date();
    
    // Find all active recurring payments that are due
    const duePayments = await RecurringPayment.find({
      isActive: true,
      nextExecutionDate: { $lte: now },
      $or: [
        { endDate: { $exists: false } },
        { endDate: null },
        { endDate: { $gte: now } }
      ]
    });

    const results = [];

    for (const recurringPayment of duePayments) {
      try {
        // Create the payment
        const payment = await Payment.create({
          title: recurringPayment.title,
          description: recurringPayment.description,
          amount: recurringPayment.amount,
          currency: recurringPayment.currency,
          paidBy: recurringPayment.paidBy,
          date: now,
          category: recurringPayment.category,
          splitMethod: recurringPayment.splitMethod,
          createdBy: recurringPayment.createdBy
        });

        // Create payment splits
        const splitPromises = recurringPayment.splits.map((split) => {
          return PaymentSplit.create({
            paymentId: payment._id,
            username: split.username,
            amount: split.amount,
            proportion: split.proportion,
            personalAmount: split.personalAmount
          });
        });

        await Promise.all(splitPromises);

        // Calculate next execution date
        const nextExecutionDate = calculateNextExecutionDate(recurringPayment, now);

        // Update the recurring payment
        await RecurringPayment.findByIdAndUpdate(recurringPayment._id, {
          lastExecutionDate: now,
          nextExecutionDate: nextExecutionDate
        });

        results.push({
          recurringPaymentId: recurringPayment._id,
          paymentId: payment._id,
          title: recurringPayment.title,
          amount: recurringPayment.amount,
          nextExecution: nextExecutionDate,
          success: true
        });

      } catch (paymentError) {
        console.error(`Error executing recurring payment ${recurringPayment._id}:`, paymentError);
        results.push({
          recurringPaymentId: recurringPayment._id,
          title: recurringPayment.title,
          amount: recurringPayment.amount,
          success: false,
          error: paymentError instanceof Error ? paymentError.message : 'Unknown error'
        });
      }
    }

    return json({ 
      success: true,
      executed: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results
    });

  } catch (e) {
    console.error('Error executing recurring payments:', e);
    throw error(500, 'Failed to execute recurring payments');
  } finally {
    await dbDisconnect();
  }
};