import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { Payment } from '../../../../models/Payment';
import { dbConnect } from '../../../../utils/db';

export const GET: RequestHandler = async ({ url, locals }) => {
  const session = await locals.auth();
  
  if (!session || !session.user?.nickname) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  await dbConnect();
  
  try {

    // Get query parameters for date range (default to last 12 months)
    const monthsBack = parseInt(url.searchParams.get('months') || '12');
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - monthsBack);

    // First, let's get all payments and see what we have
    console.log('Searching for payments for user:', session.user.nickname);
    console.log('Date range:', startDate.toISOString(), 'to', endDate.toISOString());
    
    const totalPayments = await Payment.countDocuments();
    const paymentsInRange = await Payment.countDocuments({
      date: {
        $gte: startDate,
        $lte: endDate
      }
    });
    const expensePayments = await Payment.countDocuments({
      date: {
        $gte: startDate,
        $lte: endDate
      },
      category: { $ne: 'settlement' },
      $or: [
        { paidBy: session.user.nickname },
        { createdBy: session.user.nickname }
      ]
    });
    console.log('Total payments:', totalPayments, 'In date range:', paymentsInRange, 'User expenses:', expensePayments);
    
    // Aggregate payments by month and category
    const pipeline = [
      {
        $match: {
          date: {
            $gte: startDate,
            $lte: endDate
          },
          // Exclude settlements - only show actual expenses
          category: { $ne: 'settlement' },
          // Only include payments where current user is involved
          $or: [
            { paidBy: session.user.nickname },
            { createdBy: session.user.nickname }
          ]
        }
      },
      {
        $addFields: {
          // Extract year-month from date
          yearMonth: {
            $dateToString: {
              format: '%Y-%m',
              date: '$date'
            }
          }
        }
      },
      {
        $group: {
          _id: {
            yearMonth: '$yearMonth',
            category: '$category'
          },
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      {
        $sort: {
          '_id.yearMonth': 1,
          '_id.category': 1
        }
      }
    ];

    const results = await Payment.aggregate(pipeline);
    console.log('Aggregation results:', results);

    // Transform data into chart-friendly format
    const monthsMap = new Map();
    const categories = new Set();

    // Initialize months
    for (let i = 0; i < monthsBack; i++) {
      const date = new Date();
      date.setMonth(date.getMonth() - monthsBack + i + 1);
      const yearMonth = date.toISOString().substring(0, 7);
      monthsMap.set(yearMonth, {});
    }

    // Populate data
    results.forEach((result: any) => {
      const { yearMonth, category } = result._id;
      const amount = result.totalAmount;
      
      categories.add(category);
      
      if (!monthsMap.has(yearMonth)) {
        monthsMap.set(yearMonth, {});
      }
      
      monthsMap.get(yearMonth)[category] = amount;
    });

    // Convert to arrays for Chart.js
    const months = Array.from(monthsMap.keys()).sort();
    const categoryList = Array.from(categories).sort();
    
    const datasets = categoryList.map((category: string) => ({
      label: category,
      data: months.map(month => monthsMap.get(month)[category] || 0)
    }));

    return json({
      labels: months.map(month => {
        const [year, monthNum] = month.split('-');
        const date = new Date(parseInt(year), parseInt(monthNum) - 1);
        return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      }),
      datasets,
      categories: categoryList
    });

  } catch (error) {
    console.error('Error fetching monthly expenses:', error);
    return json({ error: 'Failed to fetch monthly expenses' }, { status: 500 });
  }
};