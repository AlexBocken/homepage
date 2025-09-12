<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import ProfilePicture from '$lib/components/ProfilePicture.svelte';
  import { getCategoryEmoji, getCategoryName } from '$lib/utils/categories';
  import { isSettlementPayment, getSettlementIcon, getSettlementReceiver } from '$lib/utils/settlements';
  import AddButton from '$lib/components/AddButton.svelte';

  export let data;

  // Use server-side data with progressive enhancement
  let payments = data.payments || [];
  let loading = false; // Start as false since we have server data
  let error = null;
  let currentPage = Math.floor(data.currentOffset / data.limit);
  let limit = data.limit || 20;
  let hasMore = data.hasMore || false;

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

  function formatCurrency(amount) {
    return new Intl.NumberFormat('de-CH', {
      style: 'currency',
      currency: 'CHF'
    }).format(amount);
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
        <a href="/cospend/payments/view/{payment._id}" class="payment-card" class:settlement-card={isSettlementPayment(payment)}>
          <div class="payment-header">
            {#if isSettlementPayment(payment)}
              <div class="settlement-flow">
                <div class="settlement-user-from">
                  <ProfilePicture username={payment.paidBy} size={32} />
                  <span class="username">{payment.paidBy}</span>
                </div>
                <div class="settlement-arrow">
                  <span class="arrow">→</span>
                  <span class="settlement-badge-small">Settlement</span>
                </div>
                <div class="settlement-user-to">
                  <ProfilePicture username={getSettlementReceiver(payment)} size={32} />
                  <span class="username">{getSettlementReceiver(payment)}</span>
                </div>
              </div>
              <div class="settlement-amount">
                <span class="amount settlement-amount-text">{formatCurrency(payment.amount)}</span>
                <span class="date">{formatDate(payment.date)}</span>
              </div>
            {:else}
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
                    <span class="amount">{formatCurrency(payment.amount)}</span>
                  </div>
                </div>
              </div>
              {#if payment.image}
                <img src={payment.image} alt="Receipt" class="receipt-thumb" />
              {/if}
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
                        owes {formatCurrency(split.amount)}
                      {:else if split.amount < 0}
                        owed {formatCurrency(Math.abs(split.amount))}
                      {:else}
                        owes {formatCurrency(split.amount)}
                      {/if}
                    </span>
                  </div>
                {/each}
              </div>
            </div>
          {/if}

          <div class="payment-actions">
            <span class="created-by">Created by {payment.createdBy}</span>
            {#if payment.createdBy === data.session.user.nickname}
              <div class="action-buttons">
                <button
                  class="btn-edit"
                  on:click={() => goto(`/cospend/payments/edit/${payment._id}`)}
                >
                  Edit
                </button>
                <button
                  class="btn-delete"
                  on:click={() => deletePayment(payment._id)}
                >
                  Delete
                </button>
              </div>
            {/if}
          </div>
        </a>
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
        <button class="btn btn-secondary js-only" on:click={loadMore} disabled={loading}
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
    padding: 2rem;
  }


   h1 {
    margin-block: 0 2rem;
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
    grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
    gap: 1.5rem;
    margin-bottom: 2rem;
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

  .settlement-card {
    background: linear-gradient(135deg, var(--nord6), var(--nord5));
    border: 2px solid var(--green);
  }

  .settlement-card:hover {
    box-shadow: 0 4px 16px rgba(163, 190, 140, 0.3);
  }

  @media (prefers-color-scheme: dark) {
    .settlement-card {
      background: linear-gradient(135deg, var(--nord2), var(--nord1));
    }

    .settlement-card:hover {
      box-shadow: 0 4px 16px rgba(163, 190, 140, 0.2);
    }
  }

  .settlement-flow {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex: 1;
  }

  .settlement-user-from, .settlement-user-to {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .settlement-user-from .username,
  .settlement-user-to .username {
    font-weight: 500;
    color: var(--green);
  }

  .settlement-arrow {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
  }

  .settlement-arrow .arrow {
    color: var(--green);
    font-size: 1.2rem;
    font-weight: bold;
  }

  .settlement-badge-small {
    background: linear-gradient(135deg, var(--green), var(--lightblue));
    color: white;
    padding: 0.125rem 0.375rem;
    border-radius: 0.75rem;
    font-size: 0.65rem;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.025em;
  }

  .settlement-amount {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.25rem;
  }

  .settlement-amount-text {
    font-size: 1.1rem;
    font-weight: 600;
    color: var(--green);
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

  .payment-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-top: 1px solid var(--nord4);
    padding-top: 1rem;
  }

  .created-by {
    font-size: 0.9rem;
    color: var(--nord3);
  }

  @media (prefers-color-scheme: dark) {
    .payment-actions {
      border-top-color: var(--nord2);
    }

    .created-by {
      color: var(--nord4);
    }
  }

  .action-buttons {
    display: flex;
    gap: 0.5rem;
  }

  .btn-edit, .btn-delete {
    padding: 0.5rem 0.75rem;
    border-radius: 0.25rem;
    border: none;
    cursor: pointer;
    font-size: 0.9rem;
    transition: all 0.2s;
  }

  .btn-edit {
    background-color: var(--nord5);
    color: var(--nord0);
    border: 1px solid var(--nord4);
  }

  .btn-edit:hover {
    background-color: var(--nord4);
  }

  .btn-delete {
    background-color: var(--red);
    color: white;
  }

  .btn-delete:hover {
    background-color: var(--nord11);
  }

  @media (prefers-color-scheme: dark) {
    .btn-edit {
      background-color: var(--nord2);
      color: var(--font-default-dark);
      border-color: var(--nord3);
    }

    .btn-edit:hover {
      background-color: var(--nord3);
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

  @media (max-width: 600px) {
    .payments-list {
      padding: 1rem;
    }

    .header {
      flex-direction: column;
      gap: 1rem;
    }

    .header-actions {
      flex-direction: column;
      width: 100%;
    }

    .payments-grid {
      grid-template-columns: 1fr;
    }

    .payment-actions {
      flex-direction: column;
      align-items: flex-start;
      gap: 1rem;
    }
  }
</style>
