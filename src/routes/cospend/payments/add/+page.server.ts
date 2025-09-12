import type { PageServerLoad, Actions } from './$types';
import { redirect, fail } from '@sveltejs/kit';
import { PREDEFINED_USERS, isPredefinedUsersMode } from '$lib/config/users';

export const load: PageServerLoad = async ({ locals }) => {
  const session = await locals.auth();
  
  if (!session) {
    throw redirect(302, '/login');
  }

  return {
    session,
    predefinedUsers: isPredefinedUsersMode() ? PREDEFINED_USERS : [],
    currentUser: session.user?.nickname || ''
  };
};

export const actions: Actions = {
  default: async ({ request, locals, fetch }) => {
    const session = await locals.auth();
    
    if (!session || !session.user?.nickname) {
      throw redirect(302, '/login');
    }

    const formData = await request.formData();
    const title = formData.get('title')?.toString().trim();
    const description = formData.get('description')?.toString().trim() || '';
    const amount = parseFloat(formData.get('amount')?.toString() || '0');
    const paidBy = formData.get('paidBy')?.toString().trim();
    const date = formData.get('date')?.toString();
    const category = formData.get('category')?.toString() || 'groceries';
    const splitMethod = formData.get('splitMethod')?.toString() || 'equal';
    
    // Recurring payment data
    const isRecurring = formData.get('isRecurring') === 'true';
    const recurringFrequency = formData.get('recurringFrequency')?.toString() || 'monthly';
    const recurringCronExpression = formData.get('recurringCronExpression')?.toString() || '';
    const recurringStartDate = formData.get('recurringStartDate')?.toString() || '';
    const recurringEndDate = formData.get('recurringEndDate')?.toString() || '';

    // Basic validation
    if (!title || amount <= 0 || !paidBy) {
      return fail(400, {
        error: 'Please fill in all required fields with valid values',
        values: Object.fromEntries(formData)
      });
    }

    // Recurring payment validation
    if (isRecurring) {
      if (recurringFrequency === 'custom' && !recurringCronExpression) {
        return fail(400, {
          error: 'Please provide a cron expression for custom recurring payments',
          values: Object.fromEntries(formData)
        });
      }
    }

    try {
      // Get users from form - either predefined or manual
      const users = [];
      if (isPredefinedUsersMode()) {
        users.push(...PREDEFINED_USERS);
      } else {
        // First check if we have JavaScript-managed users (hidden inputs)
        const entries = Array.from(formData.entries());
        const userEntries = entries.filter(([key]) => key.startsWith('user_'));
        const jsUsers = userEntries.map(([, value]) => value.toString().trim()).filter(Boolean);
        
        if (jsUsers.length > 0) {
          users.push(...jsUsers);
        } else {
          // Fallback: parse manual textarea input (no-JS mode)
          const usersManual = formData.get('users_manual')?.toString().trim() || '';
          const manualUsers = usersManual.split('\n')
            .map(user => user.trim())
            .filter(Boolean);
          users.push(...manualUsers);
        }
      }

      if (users.length === 0) {
        return fail(400, {
          error: 'Please add at least one user to split with',
          values: Object.fromEntries(formData)
        });
      }

      // Calculate splits based on method
      let splits = [];
      
      if (splitMethod === 'equal') {
        const splitAmount = amount / users.length;
        const paidByAmount = splitAmount - amount; // Payer gets negative (they're owed back)
        
        splits = users.map(user => ({
          username: user,
          amount: user === paidBy ? paidByAmount : splitAmount
        }));
      } else if (splitMethod === 'full') {
        // Payer pays everything, others owe their share of the full amount
        const otherUsers = users.filter(user => user !== paidBy);
        const amountPerOtherUser = otherUsers.length > 0 ? amount / otherUsers.length : 0;
        
        splits = users.map(user => ({
          username: user,
          amount: user === paidBy ? -amount : amountPerOtherUser
        }));
      } else if (splitMethod === 'personal_equal') {
        // Get personal amounts from form
        const personalAmounts = {};
        let totalPersonal = 0;
        
        for (const user of users) {
          const personalKey = `personal_${user}`;
          const personalAmount = parseFloat(formData.get(personalKey)?.toString() || '0');
          personalAmounts[user] = personalAmount;
          totalPersonal += personalAmount;
        }
        
        if (totalPersonal > amount) {
          return fail(400, {
            error: 'Personal amounts cannot exceed the total payment amount',
            values: Object.fromEntries(formData)
          });
        }
        
        const remainingAmount = amount - totalPersonal;
        const sharedPerPerson = remainingAmount / users.length;
        
        splits = users.map(user => {
          const personalAmount = personalAmounts[user] || 0;
          const totalOwed = personalAmount + sharedPerPerson;
          return {
            username: user,
            amount: user === paidBy ? totalOwed - amount : totalOwed,
            personalAmount
          };
        });
      } else {
        // Default to equal split for unknown methods
        const splitAmount = amount / users.length;
        const paidByAmount = splitAmount - amount;
        
        splits = users.map(user => ({
          username: user,
          amount: user === paidBy ? paidByAmount : splitAmount
        }));
      }

      // Submit to API
      const payload = {
        title,
        description,
        amount,
        paidBy,
        date: date || new Date().toISOString().split('T')[0],
        category,
        splitMethod,
        splits
      };

      const response = await fetch('/api/cospend/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        return fail(400, {
          error: errorData.message || 'Failed to create payment',
          values: Object.fromEntries(formData)
        });
      }

      const paymentResult = await response.json();

      // If this is a recurring payment, create the recurring payment record
      if (isRecurring) {
        const recurringPayload = {
          title,
          description,
          amount,
          paidBy,
          category,
          splitMethod,
          splits,
          frequency: recurringFrequency,
          cronExpression: recurringFrequency === 'custom' ? recurringCronExpression : undefined,
          startDate: recurringStartDate ? new Date(recurringStartDate).toISOString() : new Date().toISOString(),
          endDate: recurringEndDate ? new Date(recurringEndDate).toISOString() : null,
          isActive: true,
          nextExecutionDate: recurringStartDate ? new Date(recurringStartDate).toISOString() : new Date().toISOString()
        };

        const recurringResponse = await fetch('/api/cospend/recurring-payments', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(recurringPayload)
        });

        if (!recurringResponse.ok) {
          // Log the error but don't fail the entire operation since the payment was created
          console.error('Failed to create recurring payment:', await recurringResponse.text());
          // Could optionally return a warning to the user
        }
      }

      // Success - redirect to dashboard
      throw redirect(303, '/cospend');

    } catch (error) {
      if (error.status === 303) throw error; // Re-throw redirect
      
      console.error('Error creating payment:', error);
      return fail(500, {
        error: 'Failed to create payment. Please try again.',
        values: Object.fromEntries(formData)
      });
    }
  }
};