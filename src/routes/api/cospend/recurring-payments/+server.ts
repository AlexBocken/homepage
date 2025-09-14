import type { RequestHandler } from '@sveltejs/kit';
import { RecurringPayment } from '../../../../models/RecurringPayment';
import { dbConnect } from '../../../../utils/db';
import { error, json } from '@sveltejs/kit';
import { calculateNextExecutionDate, validateCronExpression } from '../../../../lib/utils/recurring';

export const GET: RequestHandler = async ({ locals, url }) => {
  const auth = await locals.auth();
  if (!auth || !auth.user?.nickname) {
    throw error(401, 'Not logged in');
  }

  const limit = parseInt(url.searchParams.get('limit') || '50');
  const offset = parseInt(url.searchParams.get('offset') || '0');
  const activeOnly = url.searchParams.get('active') === 'true';

  await dbConnect();
  
  try {
    const query: any = {};
    if (activeOnly) {
      query.isActive = true;
    }

    const recurringPayments = await RecurringPayment.find(query)
      .sort({ nextExecutionDate: 1, createdAt: -1 })
      .limit(limit)
      .skip(offset)
      .lean();

    return json({ recurringPayments });
  } catch (e) {
    console.error('Error fetching recurring payments:', e);
    throw error(500, 'Failed to fetch recurring payments');
  } finally {
    // Connection will be reused
  }
};

export const POST: RequestHandler = async ({ request, locals }) => {
  const auth = await locals.auth();
  if (!auth || !auth.user?.nickname) {
    throw error(401, 'Not logged in');
  }

  const data = await request.json();
  const { 
    title, 
    description, 
    amount, 
    paidBy, 
    category, 
    splitMethod, 
    splits, 
    frequency, 
    cronExpression,
    startDate,
    endDate
  } = data;

  if (!title || !amount || !paidBy || !splitMethod || !splits || !frequency) {
    throw error(400, 'Missing required fields');
  }

  if (amount <= 0) {
    throw error(400, 'Amount must be positive');
  }

  if (!['equal', 'full', 'proportional', 'personal_equal'].includes(splitMethod)) {
    throw error(400, 'Invalid split method');
  }

  if (!['daily', 'weekly', 'monthly', 'custom'].includes(frequency)) {
    throw error(400, 'Invalid frequency');
  }

  if (frequency === 'custom') {
    if (!cronExpression || !validateCronExpression(cronExpression)) {
      throw error(400, 'Valid cron expression required for custom frequency');
    }
  }

  if (category && !['groceries', 'shopping', 'travel', 'restaurant', 'utilities', 'fun', 'settlement'].includes(category)) {
    throw error(400, 'Invalid category');
  }

  // Validate personal + equal split method
  if (splitMethod === 'personal_equal' && splits) {
    const totalPersonal = splits.reduce((sum: number, split: any) => {
      return sum + (parseFloat(split.personalAmount) || 0);
    }, 0);
    
    if (totalPersonal > amount) {
      throw error(400, 'Personal amounts cannot exceed total payment amount');
    }
  }

  await dbConnect();
  
  try {
    const recurringPaymentData = {
      title,
      description,
      amount,
      currency: 'CHF',
      paidBy,
      category: category || 'groceries',
      splitMethod,
      splits,
      frequency,
      cronExpression: frequency === 'custom' ? cronExpression : undefined,
      startDate: startDate ? new Date(startDate) : new Date(),
      endDate: endDate ? new Date(endDate) : undefined,
      createdBy: auth.user.nickname,
      isActive: true,
      nextExecutionDate: new Date() // Will be calculated below
    };

    // Calculate the next execution date
    recurringPaymentData.nextExecutionDate = calculateNextExecutionDate({
      ...recurringPaymentData,
      frequency,
      cronExpression
    } as any, recurringPaymentData.startDate);

    const recurringPayment = await RecurringPayment.create(recurringPaymentData);

    return json({ 
      success: true, 
      recurringPayment: recurringPayment._id 
    });

  } catch (e) {
    console.error('Error creating recurring payment:', e);
    throw error(500, 'Failed to create recurring payment');
  } finally {
    // Connection will be reused
  }
};