import type { RequestHandler } from '@sveltejs/kit';
import { error, json } from '@sveltejs/kit';
import { recurringPaymentScheduler } from '../../../../../lib/server/scheduler';

export const GET: RequestHandler = async ({ locals }) => {
  const auth = await locals.auth();
  if (!auth || !auth.user?.nickname) {
    throw error(401, 'Not logged in');
  }

  try {
    const status = recurringPaymentScheduler.getStatus();
    return json({
      success: true,
      scheduler: status,
      message: status.isScheduled ? 'Scheduler is running' : 'Scheduler is stopped'
    });
  } catch (e) {
    console.error('Error getting scheduler status:', e);
    throw error(500, 'Failed to get scheduler status');
  }
};

export const POST: RequestHandler = async ({ request, locals }) => {
  const auth = await locals.auth();
  if (!auth || !auth.user?.nickname) {
    throw error(401, 'Not logged in');
  }

  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'execute':
        console.log(`[API] Manual execution requested by ${auth.user.nickname}`);
        await recurringPaymentScheduler.executeNow();
        return json({
          success: true,
          message: 'Manual execution completed'
        });

      case 'status':
        const status = recurringPaymentScheduler.getStatus();
        return json({
          success: true,
          scheduler: status
        });

      default:
        throw error(400, 'Invalid action. Use "execute" or "status"');
    }
  } catch (e) {
    console.error('Error in scheduler API:', e);
    throw error(500, 'Scheduler operation failed');
  }
};