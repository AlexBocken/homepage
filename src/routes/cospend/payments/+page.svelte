<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import ProfilePicture from '$lib/components/ProfilePicture.svelte';
  import { getCategoryEmoji, getCategoryName } from '$lib/utils/categories';

  export let data;

  let payments = [];
  let loading = true;
  let error = null;
  let currentPage = 0;
  let limit = 20;
  let hasMore = true;

  onMount(async () => {
    await loadPayments();
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
      <p>Manage your shared expenses</p>
    </div>
    <div class="header-actions">
      <a href="/cospend/payments/add" class="btn btn-primary">Add Payment</a>
      <a href="/cospend" class="btn btn-secondary">Back to Dashboard</a>
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
        <div class="payment-card">
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
                  <span class="amount">{formatCurrency(payment.amount)}</span>
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
                        owes {formatCurrency(split.amount)}
                      {:else if split.amount < 0}
                        owed {formatCurrency(Math.abs(split.amount))}
                      {:else}
                        even
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
        </div>
      {/each}
    </div>

    {#if hasMore}
      <div class="load-more">
        <button class="btn btn-secondary" on:click={loadMore} disabled={loading}>
          {loading ? 'Loading...' : 'Load More'}
        </button>
      </div>
    {/if}
  {/if}
</main>

<style>
  .payments-list {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 2rem;
    gap: 2rem;
  }

  .header-content h1 {
    margin: 0 0 0.5rem 0;
    color: #333;
    font-size: 2rem;
  }

  .header-content p {
    margin: 0;
    color: #666;
    font-size: 1.1rem;
  }

  .header-actions {
    display: flex;
    gap: 1rem;
    flex-shrink: 0;
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
    background-color: #1976d2;
    color: white;
  }

  .btn-primary:hover {
    background-color: #1565c0;
  }

  .btn-secondary {
    background-color: #f5f5f5;
    color: #333;
    border: 1px solid #ddd;
  }

  .btn-secondary:hover {
    background-color: #e8e8e8;
  }

  .loading, .error {
    text-align: center;
    padding: 2rem;
    font-size: 1.1rem;
  }

  .error {
    color: #d32f2f;
    background-color: #ffebee;
    border-radius: 0.5rem;
  }

  .empty-state {
    text-align: center;
    padding: 4rem 2rem;
  }

  .empty-content svg {
    color: #ccc;
    margin-bottom: 1rem;
  }

  .empty-content h2 {
    margin: 0 0 0.5rem 0;
    color: #555;
  }

  .empty-content p {
    margin: 0 0 2rem 0;
    color: #777;
  }

  .payments-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
    gap: 1.5rem;
    margin-bottom: 2rem;
  }

  .payment-card {
    background: white;
    border-radius: 0.75rem;
    padding: 1.5rem;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    transition: all 0.2s;
  }

  .payment-card:hover {
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
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
    color: #333;
    font-size: 1.25rem;
  }

  .payment-meta {
    display: flex;
    gap: 1rem;
    font-size: 0.9rem;
    color: #666;
    flex-wrap: wrap;
  }

  .payment-meta .category-name {
    color: #888;
    font-style: italic;
    font-size: 0.8rem;
  }

  .payment-meta .amount {
    font-weight: 600;
    color: #1976d2;
  }

  .receipt-thumb {
    width: 60px;
    height: 60px;
    object-fit: cover;
    border-radius: 0.5rem;
    border: 1px solid #ddd;
  }

  .payment-description {
    color: #555;
    margin-bottom: 1rem;
    font-style: italic;
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
    color: #666;
    font-weight: 500;
  }

  .detail-row .value {
    color: #333;
  }

  .splits-summary {
    border-top: 1px solid #eee;
    padding-top: 1rem;
    margin-bottom: 1rem;
  }

  .splits-summary h4 {
    margin: 0 0 0.75rem 0;
    color: #333;
    font-size: 1rem;
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
    color: #555;
  }

  .split-amount.positive {
    color: #2e7d32;
    font-weight: 500;
  }

  .split-amount.negative {
    color: #d32f2f;
    font-weight: 500;
  }

  .payment-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-top: 1px solid #eee;
    padding-top: 1rem;
  }

  .created-by {
    font-size: 0.9rem;
    color: #666;
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
    background-color: #f5f5f5;
    color: #333;
  }

  .btn-edit:hover {
    background-color: #e8e8e8;
  }

  .btn-delete {
    background-color: #d32f2f;
    color: white;
  }

  .btn-delete:hover {
    background-color: #c62828;
  }

  .load-more {
    text-align: center;
    margin-top: 2rem;
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