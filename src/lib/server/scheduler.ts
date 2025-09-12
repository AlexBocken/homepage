import cron from 'node-cron';
import { RecurringPayment } from '../../models/RecurringPayment';
import { Payment } from '../../models/Payment';
import { PaymentSplit } from '../../models/PaymentSplit';
import { dbConnect, dbDisconnect } from '../../utils/db';
import { calculateNextExecutionDate } from '../utils/recurring';

class RecurringPaymentScheduler {
  private isRunning = false;
  private task: cron.ScheduledTask | null = null;

  // Start the scheduler - runs every minute to check for due payments
  start() {
    if (this.task) {
      console.log('[Scheduler] Already running');
      return;
    }

    console.log('[Scheduler] Starting recurring payments scheduler');
    
    // Run every minute to check for due payments
    this.task = cron.schedule('* * * * *', async () => {
      if (this.isRunning) {
        console.log('[Scheduler] Previous execution still running, skipping');
        return;
      }
      
      await this.processRecurringPayments();
    }, {
      scheduled: true,
      timezone: 'Europe/Zurich' // Adjust timezone as needed
    });

    console.log('[Scheduler] Recurring payments scheduler started (runs every minute)');
  }

  stop() {
    if (this.task) {
      this.task.destroy();
      this.task = null;
      console.log('[Scheduler] Recurring payments scheduler stopped');
    }
  }

  async processRecurringPayments() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    let dbConnected = false;

    try {
      await dbConnect();
      dbConnected = true;
      
      const now = new Date();
      
      // Find all active recurring payments that are due (with 1 minute tolerance)
      const duePayments = await RecurringPayment.find({
        isActive: true,
        nextExecutionDate: { $lte: now },
        $or: [
          { endDate: { $exists: false } },
          { endDate: null },
          { endDate: { $gte: now } }
        ]
      });

      if (duePayments.length === 0) {
        return; // No payments due
      }

      console.log(`[Scheduler] Processing ${duePayments.length} due recurring payments at ${now.toISOString()}`);

      let successCount = 0;
      let failureCount = 0;

      for (const recurringPayment of duePayments) {
        try {
          console.log(`[Scheduler] Processing: ${recurringPayment.title} (${recurringPayment._id})`);

          // Create the payment
          const payment = await Payment.create({
            title: `${recurringPayment.title}`,
            description: recurringPayment.description ? 
              `${recurringPayment.description} (Auto-generated from recurring payment)` : 
              'Auto-generated from recurring payment',
            amount: recurringPayment.amount,
            currency: recurringPayment.currency,
            paidBy: recurringPayment.paidBy,
            date: now,
            category: recurringPayment.category,
            splitMethod: recurringPayment.splitMethod,
            createdBy: `${recurringPayment.createdBy} (Auto)`
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

          successCount++;
          console.log(`[Scheduler] ✓ Created payment for "${recurringPayment.title}", next execution: ${nextExecutionDate.toISOString()}`);

        } catch (paymentError) {
          console.error(`[Scheduler] ✗ Error processing recurring payment ${recurringPayment._id}:`, paymentError);
          failureCount++;

          // Optionally, you could disable recurring payments that fail repeatedly
          // or implement a retry mechanism here
        }
      }

      if (successCount > 0 || failureCount > 0) {
        console.log(`[Scheduler] Completed. Success: ${successCount}, Failures: ${failureCount}`);
      }

    } catch (error) {
      console.error('[Scheduler] Error during recurring payment processing:', error);
    } finally {
      this.isRunning = false;
      if (dbConnected) {
        try {
          await dbDisconnect();
        } catch (disconnectError) {
          console.error('[Scheduler] Error disconnecting from database:', disconnectError);
        }
      }
    }
  }

  // Manual execution for testing
  async executeNow() {
    console.log('[Scheduler] Manual execution requested');
    await this.processRecurringPayments();
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      isScheduled: this.task !== null,
      nextRun: this.task?.nextDate()?.toISOString()
    };
  }
}

// Singleton instance
export const recurringPaymentScheduler = new RecurringPaymentScheduler();

// Helper function to initialize the scheduler
export function initializeScheduler() {
  if (typeof window === 'undefined') { // Only run on server
    recurringPaymentScheduler.start();
    
    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('[Scheduler] Received SIGTERM, stopping scheduler...');
      recurringPaymentScheduler.stop();
      process.exit(0);
    });
    
    process.on('SIGINT', () => {
      console.log('[Scheduler] Received SIGINT, stopping scheduler...');
      recurringPaymentScheduler.stop();
      process.exit(0);
    });
  }
}