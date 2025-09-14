import type { RequestHandler } from '@sveltejs/kit';
import { RecurringPayment } from '../../../../../models/RecurringPayment';
import { Payment } from '../../../../../models/Payment';
import { PaymentSplit } from '../../../../../models/PaymentSplit';
import { dbConnect } from '../../../../../utils/db';
import { error, json } from '@sveltejs/kit';
import { calculateNextExecutionDate } from '../../../../../lib/utils/recurring';
import { convertToCHF } from '../../../../../lib/utils/currency';

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
        // Handle currency conversion for execution date
        let finalAmount = recurringPayment.amount;
        let originalAmount: number | undefined;
        let exchangeRate: number | undefined;

        if (recurringPayment.currency !== 'CHF') {
          try {
            const conversion = await convertToCHF(
              recurringPayment.amount, 
              recurringPayment.currency, 
              now.toISOString()
            );
            finalAmount = conversion.convertedAmount;
            originalAmount = recurringPayment.amount;
            exchangeRate = conversion.exchangeRate;
          } catch (conversionError) {
            console.error(`Currency conversion failed for recurring payment ${recurringPayment._id}:`, conversionError);
            // Continue with original amount if conversion fails
          }
        }

        // Create the payment
        const payment = await Payment.create({
          title: recurringPayment.title,
          description: recurringPayment.description,
          amount: finalAmount,
          currency: recurringPayment.currency,
          originalAmount,
          exchangeRate,
          paidBy: recurringPayment.paidBy,
          date: now,
          category: recurringPayment.category,
          splitMethod: recurringPayment.splitMethod,
          createdBy: recurringPayment.createdBy
        });

        // Convert split amounts to CHF if needed
        const convertedSplits = recurringPayment.splits.map((split) => {
          let convertedAmount = split.amount || 0;
          let convertedPersonalAmount = split.personalAmount;
          
          // Convert amounts if we have a foreign currency and exchange rate
          if (recurringPayment.currency !== 'CHF' && exchangeRate && split.amount) {
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

        // Create payment splits
        const splitPromises = convertedSplits.map((split) => {
          return PaymentSplit.create(split);
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
    // Connection will be reused
  }
};