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

    // Basic validation
    if (!title || amount <= 0 || !paidBy) {
      return fail(400, {
        error: 'Please fill in all required fields with valid values',
        values: Object.fromEntries(formData)
      });
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
        // Payer pays everything, others owe nothing
        splits = users.map(user => ({
          username: user,
          amount: user === paidBy ? -amount : 0
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

      // Success - redirect to payments list
      throw redirect(303, '/cospend/payments');

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