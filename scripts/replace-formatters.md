# Formatter Replacement Progress

## Components Completed ✅
1. DebtBreakdown.svelte - Replaced formatCurrency function
2. EnhancedBalance.svelte - Replaced formatCurrency function (with Math.abs wrapper)

## Remaining Files to Update

### Components (3 files)
- [ ] PaymentModal.svelte - Has formatCurrency function
- [ ] SplitMethodSelector.svelte - Has inline .toFixed() calls
- [ ] BarChart.svelte - Has inline .toFixed() calls
- [ ] IngredientsPage.svelte - Has .toFixed() for recipe calculations

### Cospend Pages (7 files)
- [ ] routes/cospend/+page.svelte - Has formatCurrency function
- [ ] routes/cospend/payments/+page.svelte - Has formatCurrency function
- [ ] routes/cospend/payments/view/[id]/+page.svelte - Has formatCurrency and .toFixed()
- [ ] routes/cospend/payments/add/+page.svelte - Has .toFixed() and .toLocaleString()
- [ ] routes/cospend/payments/edit/[id]/+page.svelte - Has multiple .toFixed() calls
- [ ] routes/cospend/recurring/+page.svelte - Has formatCurrency function
- [ ] routes/cospend/recurring/edit/[id]/+page.svelte - Has .toFixed() and .toLocaleString()
- [ ] routes/cospend/settle/+page.svelte - Has formatCurrency function

## Replacement Strategy

### Pattern 1: Identical formatCurrency functions
```typescript
// OLD
function formatCurrency(amount) {
  return new Intl.NumberFormat('de-CH', {
    style: 'currency',
    currency: 'CHF'
  }).format(amount);
}

// NEW
import { formatCurrency } from '$lib/utils/formatters';
// Usage: formatCurrency(amount, 'CHF', 'de-CH')
```

### Pattern 2: .toFixed() for currency display
```typescript
// OLD
{payment.amount.toFixed(2)}

// NEW
import { formatNumber } from '$lib/utils/formatters';
{formatNumber(payment.amount, 2, 'de-CH')}
```

### Pattern 3: .toLocaleString() for dates
```typescript
// OLD
nextDate.toLocaleString('de-CH', { weekday: 'long', ... })

// NEW
import { formatDateTime } from '$lib/utils/formatters';
formatDateTime(nextDate, 'de-CH', { weekday: 'long', ... })
```

### Pattern 4: Exchange rate display (4 decimals)
```typescript
// OLD
{exchangeRate.toFixed(4)}

// NEW
{formatNumber(exchangeRate, 4, 'de-CH')}
```
