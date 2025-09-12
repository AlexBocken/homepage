import type { RequestHandler } from '@sveltejs/kit';
import { RecurringPayment } from '../../../../../models/RecurringPayment';
import { dbConnect, dbDisconnect } from '../../../../../utils/db';
import { error, json } from '@sveltejs/kit';
import { calculateNextExecutionDate, validateCronExpression } from '../../../../../lib/utils/recurring';
import mongoose from 'mongoose';

export const GET: RequestHandler = async ({ params, locals }) => {
  const auth = await locals.auth();
  if (!auth || !auth.user?.nickname) {
    throw error(401, 'Not logged in');
  }

  const { id } = params;
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    throw error(400, 'Invalid payment ID');
  }

  await dbConnect();
  
  try {
    const recurringPayment = await RecurringPayment.findById(id).lean();

    if (!recurringPayment) {
      throw error(404, 'Recurring payment not found');
    }

    return json({ recurringPayment });
  } catch (e) {
    console.error('Error fetching recurring payment:', e);
    throw error(500, 'Failed to fetch recurring payment');
  } finally {
    await dbDisconnect();
  }
};

export const PUT: RequestHandler = async ({ params, request, locals }) => {
  const auth = await locals.auth();
  if (!auth || !auth.user?.nickname) {
    throw error(401, 'Not logged in');
  }

  const { id } = params;
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    throw error(400, 'Invalid payment ID');
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
    endDate,
    isActive
  } = data;

  await dbConnect();
  
  try {
    const existingPayment = await RecurringPayment.findById(id);
    if (!existingPayment) {
      throw error(404, 'Recurring payment not found');
    }

    const updateData: any = {};
    
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
      if (!['groceries', 'shopping', 'travel', 'restaurant', 'utilities', 'fun', 'settlement'].includes(category)) {
        throw error(400, 'Invalid category');
      }
      updateData.category = category;
    }
    if (splitMethod !== undefined) {
      if (!['equal', 'full', 'proportional', 'personal_equal'].includes(splitMethod)) {
        throw error(400, 'Invalid split method');
      }
      updateData.splitMethod = splitMethod;
    }
    if (splits !== undefined) {
      updateData.splits = splits;
    }
    if (frequency !== undefined) {
      if (!['daily', 'weekly', 'monthly', 'custom'].includes(frequency)) {
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

    // Validate personal + equal split method
    if (splitMethod === 'personal_equal' && splits && amount) {
      const totalPersonal = splits.reduce((sum: number, split: any) => {
        return sum + (parseFloat(split.personalAmount) || 0);
      }, 0);
      
      if (totalPersonal > amount) {
        throw error(400, 'Personal amounts cannot exceed total payment amount');
      }
    }

    // Recalculate next execution date if frequency, cron expression, or start date changed
    if (frequency !== undefined || cronExpression !== undefined || startDate !== undefined) {
      const updatedPayment = { ...existingPayment.toObject(), ...updateData };
      updateData.nextExecutionDate = calculateNextExecutionDate(
        updatedPayment,
        updateData.startDate || existingPayment.startDate
      );
    }

    const recurringPayment = await RecurringPayment.findByIdAndUpdate(
      id, 
      updateData, 
      { new: true, runValidators: true }
    );

    return json({ 
      success: true, 
      recurringPayment 
    });

  } catch (e) {
    console.error('Error updating recurring payment:', e);
    if (e instanceof mongoose.Error.ValidationError) {
      throw error(400, e.message);
    }
    throw error(500, 'Failed to update recurring payment');
  } finally {
    await dbDisconnect();
  }
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
  const auth = await locals.auth();
  if (!auth || !auth.user?.nickname) {
    throw error(401, 'Not logged in');
  }

  const { id } = params;
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    throw error(400, 'Invalid payment ID');
  }

  await dbConnect();
  
  try {
    const recurringPayment = await RecurringPayment.findByIdAndDelete(id);

    if (!recurringPayment) {
      throw error(404, 'Recurring payment not found');
    }

    return json({ success: true });

  } catch (e) {
    console.error('Error deleting recurring payment:', e);
    throw error(500, 'Failed to delete recurring payment');
  } finally {
    await dbDisconnect();
  }
};