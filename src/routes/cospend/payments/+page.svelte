<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import ProfilePicture from '$lib/components/cospend/ProfilePicture.svelte';
  import { getCategoryEmoji, getCategoryName } from '$lib/utils/categories';
  import { isSettlementPayment, getSettlementIcon, getSettlementReceiver } from '$lib/utils/settlements';
  import AddButton from '$lib/components/AddButton.svelte';


  import { formatCurrency } from '$lib/utils/formatters';

  let { data } = $props();

  // Use server-side data with progressive enhancement
  let payments = $state(data.payments || []);
  let loading = $state(false); // Start as false since we have server data
  let error = $state(null);
  let currentPage = $state(Math.floor(data.currentOffset / data.limit));
  let limit = $state(data.limit || 20);
  let hasMore = $state(data.hasMore || false);

  // Progressive enhancement: only load if JavaScript is available
  onMount(async () => {
    // Mark that JavaScript is loaded for CSS
    document.body.classList.add('js-loaded');

    // Only refresh if we don't have server data
    if (payments.length === 0) {
      await loadPayments();
    }
  });

  async function loadPayments(page = 0) {
    try {
      loading = true;
      const response = await fetch(`/api/cospend/payments?limit=${limit}&offset=${page * limit}`);

      if (!response.ok) {
        throw new Error('Failed to load payments');
      }

      const result = await response.json();

      if (page === 0) {
        payments = result.payments;
      } else {
        payments = [...payments, ...result.payments];
      }

      hasMore = result.payments.length === limit;
      currentPage = page;

    } catch (err) {
      error = err.message;
    } finally {
      loading = false;
    }
  }

  async function loadMore() {
    if (!loading && hasMore) {
      await loadPayments(currentPage + 1);
    }
  }

  async function deletePayment(paymentId) {
    if (!confirm('Are you sure you want to delete this payment?')) {
      return;
    }

    try {
      const response = await fetch(`/api/cospend/payments/${paymentId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete payment');
      }

      payments = payments.filter(p => p._id !== paymentId);
    } catch (err) {
      alert('Error: ' + err.message);
    }
  }


  function formatAmountWithCurrency(payment) {
    if (payment.currency === 'CHF' || !payment.originalAmount) {
      return formatCurrency(payment.amount, 'CHF', 'de-CH');
    }

    return `${formatCurrency(payment.originalAmount, payment.currency, 'CHF', 'de-CH')} ≈ ${formatCurrency(payment.amount, 'CHF', 'de-CH')}`;
  }

  function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('de-CH');
  }

  function getUserSplitAmount(payment, username) {
    const split = payment.splits?.find(s => s.username === username);
    return split ? split.amount : 0;
  }

  function getSplitDescription(payment) {
    if (!payment.splits || payment.splits.length === 0) return 'No splits';

    if (payment.splitMethod === 'equal') {
      return `Split equally among ${payment.splits.length} people`;
    } else if (payment.splitMethod === 'full') {
      return `Paid in full by ${payment.paidBy}`;
    } else if (payment.splitMethod === 'personal_equal') {
      return `Personal amounts + equal split among ${payment.splits.length} people`;
    } else {
      return `Custom split among ${payment.splits.length} people`;
    }
  }
</script>

<svelte:head>
  <title>All Payments - Cospend</title>
</svelte:head>

<main class="payments-list">
  <div class="header">
    <div class="header-content">
      <h1>All Payments</h1>
    </div>
  </div>

  {#if loading && payments.length === 0}
    <div class="loading">Loading payments...</div>
  {:else if error}
    <div class="error">Error: {error}</div>
  {:else if payments.length === 0}
    <div class="empty-state">
      <div class="empty-content">
        <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>
        <h2>No payments yet</h2>
        <p>Start by adding your first shared expense</p>
        <a href="/cospend/payments/add" class="btn btn-primary">Add Your First Payment</a>
      </div>
    </div>
  {:else}
    <div class="payments-grid">
      {#each payments as payment}
        {#if isSettlementPayment(payment)}
          <!-- Settlement Card - Distinct Layout -->
          <a href="/cospend/payments/view/{payment._id}" class="payment-card settlement-card">
            <div class="settlement-header">
              <div class="settlement-badge">
                <span class="settlement-icon">💸</span>
                <span class="settlement-label">Settlement</span>
              </div>
              <span class="settlement-date">{formatDate(payment.date)}</span>
            </div>

            <div class="settlement-flow">
              <div class="settlement-user">
                <ProfilePicture username={payment.paidBy} size={48} />
                <span class="username">{payment.paidBy}</span>
              </div>

              <div class="settlement-arrow-container">
                <div class="settlement-amount-display">
                  {formatAmountWithCurrency(payment)}
                </div>
                <div class="settlement-arrow">→</div>
              </div>

              <div class="settlement-user">
                <ProfilePicture username={getSettlementReceiver(payment)} size={48} />
                <span class="username">{getSettlementReceiver(payment)}</span>
              </div>
            </div>

            {#if payment.description}
              <p class="settlement-description">{payment.description}</p>
            {/if}
          </a>
        {:else}
          <!-- Regular Payment Card -->
          <a href="/cospend/payments/view/{payment._id}" class="payment-card">
            <div class="payment-header">
              <div class="payment-title-section">
                <ProfilePicture username={payment.paidBy} size={40} />
                <div class="payment-title">
                  <div class="title-with-category">
                    <span class="category-emoji">{getCategoryEmoji(payment.category || 'groceries')}</span>
                    <h3>{payment.title}</h3>
                  </div>
                  <div class="payment-meta">
                    <span class="category-name">{getCategoryName(payment.category || 'groceries')}</span>
                    <span class="date">{formatDate(payment.date)}</span>
                    <span class="amount">{formatAmountWithCurrency(payment)}</span>
                  </div>
                </div>
              </div>
              {#if payment.image}
                <img src={payment.image} alt="Receipt" class="receipt-thumb" />
              {/if}
            </div>

            {#if payment.description}
              <p class="payment-description">{payment.description}</p>
            {/if}

            <div class="payment-details">
              <div class="detail-row">
                <span class="label">Paid by:</span>
                <span class="value">{payment.paidBy}</span>
              </div>
              <div class="detail-row">
                <span class="label">Split:</span>
                <span class="value">{getSplitDescription(payment)}</span>
              </div>
            </div>

            {#if payment.splits && payment.splits.length > 0}
              <div class="splits-summary">
                <h4>Split Details</h4>
                <div class="splits-list">
                  {#each payment.splits as split}
                    <div class="split-item">
                      <span class="split-user">{split.username}</span>
                      <span class="split-amount" class:positive={split.amount < 0} class:negative={split.amount > 0}>
                        {#if split.amount > 0}
                          owes {formatCurrency(split.amount, 'CHF', 'de-CH')}
                        {:else if split.amount < 0}
                          owed {formatCurrency(Math.abs(split.amount, 'CHF', 'de-CH'))}
                        {:else}
                          owes {formatCurrency(split.amount, 'CHF', 'de-CH')}
                        {/if}
                      </span>
                    </div>
                  {/each}
                </div>
              </div>
            {/if}
          </a>
        {/if}
      {/each}
    </div>

    <!-- Pagination that works without JavaScript -->
    <div class="pagination">
      {#if data.currentOffset > 0}
        <a href="?offset={Math.max(0, data.currentOffset - data.limit)}&limit={data.limit}"
           class="btn btn-secondary">
          ← Previous
        </a>
      {/if}

      {#if hasMore}
        <a href="?offset={data.currentOffset + data.limit}&limit={data.limit}"
           class="btn btn-secondary">
          Next →
        </a>
      {/if}

      <!-- Progressive enhancement: JavaScript load more button -->
      {#if hasMore}
        <button class="btn btn-secondary js-only" onclick={loadMore} disabled={loading}
                style="display: none;">
          {loading ? 'Loading...' : 'Load More (JS)'}
        </button>
      {/if}
    </div>
  {/if}
</main>

<AddButton href="/cospend/payments/add" />

<style>
  .payments-list {
    max-width: 1200px;
    margin: 0 auto;
    padding: 1rem;
  }


   h1 {
    margin-block: 0 1rem;
    margin-inline: auto;
    color: var(--nord0);
    text-align: center;
  }

  @media (prefers-color-scheme: dark) {
     h1 {
      color: var(--font-default-dark);
    }

  }

  .btn {
    padding: 0.75rem 1.5rem;
    border-radius: 0.5rem;
    text-decoration: none;
    font-weight: 500;
    transition: all 0.2s;
    border: none;
    cursor: pointer;
  }

  .btn-primary {
    background-color: var(--blue);
    color: white;
  }

  .btn-primary:hover {
    background-color: var(--nord10);
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
  }

  .btn-secondary {
    background-color: var(--nord5);
    color: var(--nord0);
    border: 1px solid var(--nord4);
  }

  .btn-secondary:hover {
    background-color: var(--nord4);
  }

  @media (prefers-color-scheme: dark) {
    .btn-secondary {
      background-color: var(--nord2);
      color: var(--font-default-dark);
      border-color: var(--nord3);
    }

    .btn-secondary:hover {
      background-color: var(--nord3);
    }
  }

  .loading, .error {
    text-align: center;
    padding: 2rem;
    font-size: 1.1rem;
  }

  .error {
    color: var(--red);
    background-color: var(--nord6);
    border-radius: 0.5rem;
    border: 1px solid var(--red);
  }

  @media (prefers-color-scheme: dark) {
    .error {
      background-color: var(--accent-dark);
    }
  }

  .empty-state {
    text-align: center;
    padding: 4rem 2rem;
  }

  .empty-content svg {
    color: var(--nord3);
    margin-bottom: 1rem;
  }

  .empty-content h2 {
    margin: 0 0 0.5rem 0;
    color: var(--nord1);
  }

  .empty-content p {
    margin: 0 0 2rem 0;
    color: var(--nord2);
  }

  @media (prefers-color-scheme: dark) {
    .empty-content svg {
      color: var(--nord4);
    }

    .empty-content h2 {
      color: var(--nord5);
    }

    .empty-content p {
      color: var(--nord4);
    }
  }

  .payments-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 1rem;
    margin-bottom: 1.5rem;
  }

  .payment-card {
    display: block;
    background: var(--nord6);
    border-radius: 0.75rem;
    padding: 1.5rem;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    transition: all 0.2s;
    text-decoration: none;
    color: inherit;
    border: 1px solid var(--nord4);
  }

  .payment-card:hover {
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
    text-decoration: none;
    color: inherit;
    transform: translateY(-1px);
    border-color: var(--nord3);
  }

  @media (prefers-color-scheme: dark) {
    .payment-card {
      background: var(--nord1);
      border-color: var(--nord2);
    }

    .payment-card:hover {
      border-color: var(--nord3);
    }
  }

  /* Settlement Card Styles */
  .settlement-card {
    background: linear-gradient(135deg, #e8f5e9, #f1f8e9);
    border: 2px solid var(--green);
    position: relative;
    overflow: hidden;
  }

  .settlement-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(90deg, var(--green), var(--lightblue));
  }

  .settlement-card:hover {
    box-shadow: 0 6px 20px rgba(163, 190, 140, 0.4);
    border-color: var(--lightblue);
  }

  @media (prefers-color-scheme: dark) {
    .settlement-card {
      background: linear-gradient(135deg, #1a2e1a, #1e2b1e);
    }

    .settlement-card:hover {
      box-shadow: 0 6px 20px rgba(163, 190, 140, 0.3);
    }
  }

  .settlement-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
  }

  .settlement-badge {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: linear-gradient(135deg, var(--green), var(--lightblue));
    color: white;
    padding: 0.5rem 1rem;
    border-radius: 2rem;
    font-weight: 600;
    font-size: 0.9rem;
    box-shadow: 0 2px 8px rgba(163, 190, 140, 0.3);
  }

  .settlement-icon {
    font-size: 1.2rem;
  }

  .settlement-date {
    color: var(--nord3);
    font-size: 0.9rem;
    font-weight: 500;
  }

  @media (prefers-color-scheme: dark) {
    .settlement-date {
      color: var(--nord4);
    }
  }

  .settlement-flow {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .settlement-user {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    flex: 1;
    min-width: 0;
  }

  .settlement-user .username {
    font-weight: 600;
    color: var(--green);
    font-size: 0.95rem;
    text-align: center;
    word-break: break-word;
  }

  .settlement-arrow-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    flex-shrink: 0;
  }

  .settlement-amount-display {
    font-size: 1.3rem;
    font-weight: 700;
    color: var(--green);
    white-space: nowrap;
    text-align: center;
  }

  .settlement-arrow {
    color: var(--green);
    font-size: 2rem;
    font-weight: bold;
    line-height: 1;
  }

  .settlement-description {
    color: var(--nord2);
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid var(--nord4);
    font-style: italic;
    font-size: 0.9rem;
  }

  @media (prefers-color-scheme: dark) {
    .settlement-description {
      color: var(--nord5);
      border-top-color: var(--nord3);
    }
  }

  .payment-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 1rem;
  }

  .payment-title-section {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    flex: 1;
  }

  .title-with-category {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }

  .title-with-category .category-emoji {
    font-size: 1.3rem;
    flex-shrink: 0;
  }

  .payment-title h3 {
    margin: 0;
    color: var(--nord0);
    font-size: 1.25rem;
  }

  @media (prefers-color-scheme: dark) {
    .payment-title h3 {
      color: var(--font-default-dark);
    }
  }

  .payment-meta {
    display: flex;
    gap: 1rem;
    font-size: 0.9rem;
    color: var(--nord3);
    flex-wrap: wrap;
  }

  .payment-meta .category-name {
    color: var(--nord3);
    font-style: italic;
    font-size: 0.8rem;
  }

  .payment-meta .amount {
    font-weight: 600;
    color: var(--blue);
  }

  @media (prefers-color-scheme: dark) {
    .payment-meta {
      color: var(--nord4);
    }

    .payment-meta .category-name {
      color: var(--nord4);
    }
  }

  .receipt-thumb {
    width: 60px;
    height: 60px;
    object-fit: cover;
    border-radius: 0.5rem;
    border: 1px solid var(--nord4);
  }

  @media (prefers-color-scheme: dark) {
    .receipt-thumb {
      border-color: var(--nord2);
    }
  }

  .payment-description {
    color: var(--nord2);
    margin-bottom: 1rem;
    font-style: italic;
  }

  @media (prefers-color-scheme: dark) {
    .payment-description {
      color: var(--nord5);
    }
  }

  .payment-details {
    margin-bottom: 1rem;
  }

  .detail-row {
    display: flex;
    justify-content: space-between;
    margin-bottom: 0.5rem;
  }

  .detail-row .label {
    color: var(--nord3);
    font-weight: 500;
  }

  .detail-row .value {
    color: var(--nord0);
  }

  @media (prefers-color-scheme: dark) {
    .detail-row .label {
      color: var(--nord4);
    }

    .detail-row .value {
      color: var(--font-default-dark);
    }
  }

  .splits-summary {
    border-top: 1px solid var(--nord4);
    padding-top: 1rem;
    margin-bottom: 1rem;
  }

  .splits-summary h4 {
    margin: 0 0 0.75rem 0;
    color: var(--nord0);
    font-size: 1rem;
  }

  @media (prefers-color-scheme: dark) {
    .splits-summary {
      border-top-color: var(--nord2);
    }

    .splits-summary h4 {
      color: var(--font-default-dark);
    }
  }

  .splits-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .split-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .split-user {
    color: var(--nord2);
  }

  .split-amount.positive {
    color: var(--green);
    font-weight: 500;
  }

  .split-amount.negative {
    color: var(--red);
    font-weight: 500;
  }

  @media (prefers-color-scheme: dark) {
    .split-user {
      color: var(--nord5);
    }
  }


  .pagination {
    display: flex;
    justify-content: center;
    gap: 1rem;
    margin-top: 2rem;
  }

  /* Progressive enhancement: show JS features only when JS is loaded */
  .js-only {
    display: none;
  }

  :global(body.js-loaded) .js-only {
    display: inline-block;
  }

  @media (max-width: 768px) {
    .payments-list {
      padding: 0.75rem;
      max-width: none;
    }

    .payments-grid {
      grid-template-columns: 1fr;
      gap: 0.75rem;
      margin-bottom: 1rem;
    }

    .payment-card {
      padding: 1rem;
    }

    .payment-header {
      margin-bottom: 0.75rem;
    }

    .payment-meta {
      gap: 0.5rem;
      font-size: 0.85rem;
    }

    .title-with-category .category-emoji {
      font-size: 1.1rem;
    }

    .payment-title h3 {
      font-size: 1.1rem;
    }
  }

  @media (max-width: 480px) {
    .payments-list {
      padding: 0.5rem;
    }

    .payments-grid {
      gap: 0.5rem;
    }

    .payment-card {
      padding: 0.75rem;
    }

    /* Make settlement more compact on small screens */
    .settlement-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.5rem;
      margin-bottom: 1rem;
    }

    .settlement-badge {
      padding: 0.4rem 0.75rem;
      font-size: 0.8rem;
    }

    .settlement-icon {
      font-size: 1rem;
    }

    .settlement-date {
      font-size: 0.8rem;
    }

    .settlement-flow {
      flex-direction: column;
      gap: 1rem;
    }

    .settlement-user {
      width: 100%;
    }

    .settlement-user .username {
      font-size: 0.85rem;
    }

    .settlement-arrow-container {
      transform: rotate(90deg);
      gap: 0.75rem;
    }

    .settlement-amount-display {
      font-size: 1.1rem;
      transform: rotate(-90deg);
    }

    .settlement-arrow {
      font-size: 1.5rem;
      transform: rotate(-90deg);
    }
  }

  /* Very small screens - simplify further */
  @media (max-width: 360px) {
    .settlement-amount-display {
      font-size: 1rem;
    }

    .settlement-user .username {
      font-size: 0.75rem;
    }
  }
</style>
