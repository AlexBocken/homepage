import type { RequestHandler } from '@sveltejs/kit';
import { RecurringPayment } from '$models/RecurringPayment';
import { Payment } from '$models/Payment';
import { PaymentSplit } from '$models/PaymentSplit';
import { dbConnect } from '$utils/db';
import { error, json } from '@sveltejs/kit';
import { calculateNextExecutionDate } from '$lib/utils/recurring';
import { invalidateCospendCaches } from '$lib/server/cache';

// This endpoint is designed to be called by a cron job or external scheduler
// It processes all recurring payments that are due for execution
export const POST: RequestHandler = async ({ request }) => {
  // Optional: Add basic authentication or API key validation here
  const authHeader = request.headers.get('authorization');
  const expectedToken = process.env.CRON_API_TOKEN;
  
  if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
    throw error(401, 'Unauthorized');
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
    let successCount = 0;
    let failureCount = 0;

    for (const recurringPayment of duePayments) {
      try {
        // Create the payment
        const payment = await Payment.create({
          title: `${recurringPayment.title} (Auto)`,
          description: `Automatically generated from recurring payment: ${recurringPayment.description || 'No description'}`,
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

        // Invalidate caches for all affected users
        const affectedUsernames = recurringPayment.splits.map((split) => split.username);
        await invalidateCospendCaches(affectedUsernames, payment._id.toString());

        // Calculate next execution date
        const nextExecutionDate = calculateNextExecutionDate(recurringPayment, now);

        // Update the recurring payment
        await RecurringPayment.findByIdAndUpdate(recurringPayment._id, {
          lastExecutionDate: now,
          nextExecutionDate: nextExecutionDate
        });

        successCount++;
        results.push({
          recurringPaymentId: recurringPayment._id,
          paymentId: payment._id,
          title: recurringPayment.title,
          amount: recurringPayment.amount,
          nextExecution: nextExecutionDate,
          success: true
        });

      } catch (paymentError) {
        console.error(`[Cron] Error processing recurring payment ${recurringPayment._id}:`, paymentError);
        failureCount++;
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
      timestamp: now.toISOString(),
      processed: duePayments.length,
      successful: successCount,
      failed: failureCount,
      results: results
    });

  } catch (e) {
    console.error('[Cron] Error executing recurring payments:', e);
    throw error(500, 'Failed to execute recurring payments');
  } finally {
    // Connection will be reused
  }
};