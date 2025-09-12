import { fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ fetch, locals, request }) => {
  const session = await locals.auth();
  
  if (!session) {
    throw redirect(302, '/login');
  }

  try {
    // Fetch debt data server-side with authentication cookies
    const response = await fetch('/api/cospend/debts', {
      headers: {
        'Cookie': request.headers.get('Cookie') || ''
      }
    });
    if (!response.ok) {
      throw new Error('Failed to fetch debt data');
    }
    
    const debtData = await response.json();
    
    return {
      debtData,
      session,
      currentUser: session.user?.nickname || ''
    };
  } catch (error) {
    console.error('Error loading debt data:', error);
    return {
      debtData: {
        whoOwesMe: [],
        whoIOwe: [],
        totalOwedToMe: 0,
        totalIOwe: 0
      },
      error: error.message,
      session,
      currentUser: session.user?.nickname || ''
    };
  }
}

export const actions: Actions = {
  settle: async ({ request, fetch, locals }) => {
    const data = await request.formData();
    
    const settlementType = data.get('settlementType');
    const fromUser = data.get('fromUser');
    const toUser = data.get('toUser');
    const amount = parseFloat(data.get('amount'));
    
    // Validation
    if (!settlementType || !fromUser || !toUser || !amount) {
      return fail(400, {
        error: 'All fields are required',
        values: {
          settlementType,
          fromUser,
          toUser,
          amount: data.get('amount')
        }
      });
    }
    
    if (isNaN(amount) || amount <= 0) {
      return fail(400, {
        error: 'Please enter a valid positive amount',
        values: {
          settlementType,
          fromUser,
          toUser,
          amount: data.get('amount')
        }
      });
    }
    
    try {
      // Create a settlement payment
      const payload = {
        title: 'Settlement Payment',
        description: `Settlement: ${fromUser} pays ${toUser}`,
        amount: amount,
        paidBy: fromUser,
        date: new Date().toISOString().split('T')[0],
        category: 'settlement',
        splitMethod: 'full',
        splits: [
          {
            username: fromUser,
            amount: -amount // Payer gets negative (receives money back)
          },
          {
            username: toUser,
            amount: amount // Receiver owes money
          }
        ]
      };

      const response = await fetch('/api/cospend/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': request.headers.get('Cookie') || ''
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to record settlement');
      }

      // Redirect back to dashboard on success
      throw redirect(303, '/cospend');
    } catch (error) {
      if (error.status === 303) {
        throw error; // Re-throw redirect
      }
      
      return fail(500, {
        error: error.message,
        values: {
          settlementType,
          fromUser,
          toUser,
          amount: data.get('amount')
        }
      });
    }
  }
};