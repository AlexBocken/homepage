import type { RequestHandler } from './$types';
import { RecurringPayment } from '$models/RecurringPayment';
import { dbConnect } from '$utils/db';
import { error, json } from '@sveltejs/kit';
import { calculateNextExecutionDate, validateCronExpression } from '$lib/utils/recurring';
import { PAYMENT_CATEGORIES, RECURRING_FREQUENCIES } from '$lib/js/cospendI18n';
import { assertPersonalWithinTotal, isSplitMethod } from '$lib/server/cospendValidation';
import mongoose from 'mongoose';
import { requireAuth } from '$lib/server/middleware/auth';
import { rethrowHttp } from '$lib/server/middleware/httpErrors';
import { assertObjectId } from '$lib/server/ownedResource';

export const GET: RequestHandler = async ({ params, locals }) => {
  await requireAuth(locals);

  const { id } = params;
  assertObjectId(id, 'payment ID');

  await dbConnect();
  
  try {
    const recurringPayment = await RecurringPayment.findById(id).lean();

    if (!recurringPayment) {
      throw error(404, 'Recurring payment not found');
    }

    return json({ recurringPayment });
  } catch (e) {
    rethrowHttp(e);
    console.error('Error fetching recurring payment:', e);
    throw error(500, 'Failed to fetch recurring payment');
  }
};

export const PUT: RequestHandler = async ({ params, request, locals }) => {
  await requireAuth(locals);

  const { id } = params;
  assertObjectId(id, 'payment ID');

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
    endDate,
    isActive
  } = data;

  await dbConnect();
  
  try {
    const existingPayment = await RecurringPayment.findById(id);
    if (!existingPayment) {
      throw error(404, 'Recurring payment not found');
    }

    const updateData: Record<string, unknown> = {};
    
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (amount !== undefined) {
      if (amount <= 0) {
        throw error(400, 'Amount must be positive');
      }
      updateData.amount = amount;
    }
    if (paidBy !== undefined) updateData.paidBy = paidBy;
    if (category !== undefined) {
      if (!PAYMENT_CATEGORIES.includes(category)) {
        throw error(400, 'Invalid category');
      }
      updateData.category = category;
    }
    if (splitMethod !== undefined) {
      if (!isSplitMethod(splitMethod)) {
        throw error(400, 'Invalid split method');
      }
      updateData.splitMethod = splitMethod;
    }
    if (splits !== undefined) {
      updateData.splits = splits;
    }
    if (frequency !== undefined) {
      if (!(RECURRING_FREQUENCIES as readonly string[]).includes(frequency)) {
        throw error(400, 'Invalid frequency');
      }
      updateData.frequency = frequency;
    }
    if (cronExpression !== undefined) {
      if (frequency === 'custom' && !validateCronExpression(cronExpression)) {
        throw error(400, 'Valid cron expression required for custom frequency');
      }
      updateData.cronExpression = frequency === 'custom' ? cronExpression : undefined;
    }
    if (startDate !== undefined) updateData.startDate = new Date(startDate);
    if (endDate !== undefined) updateData.endDate = endDate ? new Date(endDate) : null;
    if (isActive !== undefined) updateData.isActive = isActive;

    assertPersonalWithinTotal(splitMethod, splits, amount);

    // Recalculate next execution date if frequency, cron expression, or start date changed
    if (frequency !== undefined || cronExpression !== undefined || startDate !== undefined) {
      const updatedPayment = { ...existingPayment.toObject(), ...updateData };
      updateData.nextExecutionDate = calculateNextExecutionDate(
        updatedPayment,
        (updateData.startDate || existingPayment.startDate) as Date
      );
    }

    const recurringPayment = await RecurringPayment.findByIdAndUpdate(
      id, 
      updateData, 
      { returnDocument: 'after', runValidators: true }
    );

    return json({ 
      success: true, 
      recurringPayment 
    });

  } catch (e) {
    rethrowHttp(e);
    console.error('Error updating recurring payment:', e);
    if (e instanceof mongoose.Error.ValidationError) {
      throw error(400, e.message);
    }
    throw error(500, 'Failed to update recurring payment');
  }
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
  await requireAuth(locals);

  const { id } = params;
  assertObjectId(id, 'payment ID');

  await dbConnect();
  
  try {
    const recurringPayment = await RecurringPayment.findByIdAndDelete(id);

    if (!recurringPayment) {
      throw error(404, 'Recurring payment not found');
    }

    return json({ success: true });

  } catch (e) {
    rethrowHttp(e);
    console.error('Error deleting recurring payment:', e);
    throw error(500, 'Failed to delete recurring payment');
  }
};