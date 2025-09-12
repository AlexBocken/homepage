# Recurring Payments Setup

This document explains how to set up and use the recurring payments feature in your Cospend application.

## Features

- **Daily, Weekly, Monthly recurring payments**: Simple frequency options
- **Custom Cron scheduling**: Advanced users can use cron expressions for complex schedules
- **Full payment management**: Create, edit, pause, and delete recurring payments
- **Automatic execution**: Payments are automatically created based on schedule
- **Split support**: All payment split methods are supported (equal, proportional, personal+equal, full payment)

## Setup

### 1. Environment Variables

Add the following optional environment variable to your `.env` file for secure cron job execution:

```env
CRON_API_TOKEN=your-secure-random-token-here
```

### 2. Database Setup

The recurring payments feature uses MongoDB models that are automatically created. No additional database setup is required.

### 3. Background Job Setup

You need to set up a recurring job to automatically process due payments. Here are several options:

#### Option A: System Cron (Linux/macOS)

Add the following to your crontab (run `crontab -e`):

```bash
# Run every 5 minutes
*/5 * * * * curl -X POST -H "Authorization: Bearer your-secure-random-token-here" https://yourdomain.com/api/cospend/recurring-payments/cron-execute

# Or run every hour
0 * * * * curl -X POST -H "Authorization: Bearer your-secure-random-token-here" https://yourdomain.com/api/cospend/recurring-payments/cron-execute
```

#### Option B: GitHub Actions (if hosted on a platform that supports it)

Create `.github/workflows/recurring-payments.yml`:

```yaml
name: Process Recurring Payments
on:
  schedule:
    - cron: '*/5 * * * *'  # Every 5 minutes
  workflow_dispatch:  # Allow manual triggering

jobs:
  process-payments:
    runs-on: ubuntu-latest
    steps:
      - name: Process recurring payments
        run: |
          curl -X POST \
            -H "Authorization: Bearer ${{ secrets.CRON_API_TOKEN }}" \
            https://yourdomain.com/api/cospend/recurring-payments/cron-execute
```

#### Option C: Cloud Function/Serverless

Deploy a simple cloud function that calls the endpoint on a schedule:

```javascript
// Example for Vercel/Netlify Functions
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const response = await fetch('https://yourdomain.com/api/cospend/recurring-payments/cron-execute', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.CRON_API_TOKEN}`
      }
    });
    
    const result = await response.json();
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
```

#### Option D: Manual Execution

For testing or manual processing, you can call the endpoint directly:

```bash
curl -X POST \
  -H "Authorization: Bearer your-secure-random-token-here" \
  -H "Content-Type: application/json" \
  https://yourdomain.com/api/cospend/recurring-payments/cron-execute
```

## Usage

### Creating Recurring Payments

1. Navigate to `/cospend/recurring/add`
2. Fill in the payment details (title, amount, category, etc.)
3. Choose frequency:
   - **Daily**: Executes every day
   - **Weekly**: Executes every week  
   - **Monthly**: Executes every month
   - **Custom**: Use cron expressions for advanced scheduling
4. Set up user splits (same options as regular payments)
5. Set start date and optional end date

### Managing Recurring Payments

1. Navigate to `/cospend/recurring`
2. View all recurring payments with their next execution dates
3. Edit, pause, activate, or delete recurring payments
4. Filter by active/inactive status

### Cron Expression Examples

For custom frequency, you can use cron expressions:

- `0 9 * * *` - Every day at 9:00 AM
- `0 9 * * 1` - Every Monday at 9:00 AM
- `0 9 1 * *` - Every 1st of the month at 9:00 AM
- `0 9 1,15 * *` - Every 1st and 15th of the month at 9:00 AM
- `0 9 * * 1-5` - Every weekday at 9:00 AM
- `0 */6 * * *` - Every 6 hours

## Monitoring

The cron execution endpoint returns detailed information about processed payments:

```json
{
  "success": true,
  "timestamp": "2024-01-01T09:00:00.000Z",
  "processed": 3,
  "successful": 2,
  "failed": 1,
  "results": [
    {
      "recurringPaymentId": "...",
      "paymentId": "...",
      "title": "Monthly Rent",
      "amount": 1200,
      "nextExecution": "2024-02-01T09:00:00.000Z",
      "success": true
    }
  ]
}
```

Check your application logs for detailed processing information.

## Security Considerations

1. **API Token**: Use a strong, random token for the `CRON_API_TOKEN`
2. **HTTPS**: Always use HTTPS for the cron endpoint
3. **Rate Limiting**: Consider adding rate limiting to the cron endpoint
4. **Monitoring**: Monitor the cron job execution and set up alerts for failures

## Troubleshooting

### Common Issues

1. **Payments not executing**: Check that your cron job is running and the API token is correct
2. **Permission errors**: Ensure the cron endpoint can access the database
3. **Time zone issues**: The system uses server time for scheduling
4. **Cron expression errors**: Validate cron expressions using online tools

### Logs

Check server logs for detailed error messages:
- Look for `[Cron]` prefixed messages
- Monitor database connection issues
- Check for validation errors in payment creation

## Future Enhancements

Potential improvements to consider:
- Web-based cron job management
- Email notifications for successful/failed executions  
- Payment execution history and analytics
- Time zone support for scheduling
- Webhook notifications