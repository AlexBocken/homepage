<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import ProfilePicture from '$lib/components/ProfilePicture.svelte';
  import { getCategoryEmoji, getCategoryName } from '$lib/utils/categories';
  
  export let data;

  let payment = null;
  let loading = true;
  let error = null;

  onMount(async () => {
    await loadPayment();
  });

  async function loadPayment() {
    try {
      const response = await fetch(`/api/cospend/payments/${data.paymentId}`);
      if (!response.ok) {
        throw new Error('Failed to load payment');
      }
      const result = await response.json();
      payment = result.payment;
    } catch (err) {
      error = err.message;
    } finally {
      loading = false;
    }
  }

  function formatCurrency(amount) {
    return new Intl.NumberFormat('de-CH', {
      style: 'currency',
      currency: 'CHF'
    }).format(Math.abs(amount));
  }

  function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('de-CH');
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

  let deleting = false;

  async function deletePayment() {
    if (!confirm('Are you sure you want to delete this payment? This action cannot be undone.')) {
      return;
    }

    try {
      deleting = true;
      const response = await fetch(`/api/cospend/payments/${data.paymentId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete payment');
      }

      // Redirect to dashboard after successful deletion
      goto('/cospend');
      
    } catch (err) {
      error = err.message;
    } finally {
      deleting = false;
    }
  }
</script>

<svelte:head>
  <title>{payment ? payment.title : 'Payment'} - Cospend</title>
</svelte:head>

<main class="payment-view">
  <div class="header">
    <div class="header-content">
      <a href="/cospend" class="back-link">← Back to Dashboard</a>
      <div class="header-actions">
        {#if payment && payment.createdBy === data.session.user.nickname}
          <a href="/cospend/payments/edit/{data.paymentId}" class="btn btn-secondary">Edit</a>
          <button 
            class="btn btn-danger" 
            on:click={deletePayment}
            disabled={deleting}
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        {/if}
        <a href="/cospend/payments" class="btn btn-secondary">All Payments</a>
      </div>
    </div>
  </div>

  {#if loading}
    <div class="loading">Loading payment...</div>
  {:else if error}
    <div class="error">Error: {error}</div>
  {:else if payment}
    <div class="payment-card">
      <div class="payment-header">
        <div class="title-section">
          <div class="title-with-category">
            <span class="category-emoji">{getCategoryEmoji(payment.category || 'groceries')}</span>
            <h1>{payment.title}</h1>
          </div>
          <div class="payment-amount">
            {formatCurrency(payment.amount)}
          </div>
        </div>
        {#if payment.image}
          <div class="receipt-image">
            <img src={payment.image} alt="Receipt" />
          </div>
        {/if}
      </div>

      <div class="payment-info">
        <div class="info-grid">
          <div class="info-item">
            <span class="label">Date:</span>
            <span class="value">{formatDate(payment.date)}</span>
          </div>
          <div class="info-item">
            <span class="label">Paid by:</span>
            <span class="value">{payment.paidBy}</span>
          </div>
          <div class="info-item">
            <span class="label">Created by:</span>
            <span class="value">{payment.createdBy}</span>
          </div>
          <div class="info-item">
            <span class="label">Category:</span>
            <span class="value">{getCategoryName(payment.category || 'groceries')}</span>
          </div>
          <div class="info-item">
            <span class="label">Split method:</span>
            <span class="value">{getSplitDescription(payment)}</span>
          </div>
        </div>

        {#if payment.description}
          <div class="description">
            <h3>Description</h3>
            <p>{payment.description}</p>
          </div>
        {/if}
      </div>

      {#if payment.splits && payment.splits.length > 0}
        <div class="splits-section">
          <h3>Split Details</h3>
          <div class="splits-list">
            {#each payment.splits as split}
              <div class="split-item" class:current-user={split.username === data.session.user.nickname}>
                <div class="split-user">
                  <ProfilePicture username={split.username} size={24} />
                  <div class="user-info">
                    <span class="username">{split.username}</span>
                    {#if split.username === data.session.user.nickname}
                      <span class="you-badge">You</span>
                    {/if}
                  </div>
                </div>
                <div class="split-amount" class:positive={split.amount < 0} class:negative={split.amount > 0}>
                  {#if split.amount > 0}
                    owes {formatCurrency(split.amount)}
                  {:else if split.amount < 0}
                    owed {formatCurrency(split.amount)}
                  {:else}
                    even
                  {/if}
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/if}
    </div>
  {/if}
</main>

<style>
  .payment-view {
    max-width: 800px;
    margin: 0 auto;
    padding: 2rem;
  }

  .header {
    margin-bottom: 2rem;
  }

  .header-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 1rem;
  }

  .back-link {
    color: #1976d2;
    text-decoration: none;
    font-weight: 500;
  }

  .header-actions {
    display: flex;
    gap: 0.5rem;
  }

  .btn {
    padding: 0.5rem 1rem;
    border-radius: 0.25rem;
    text-decoration: none;
    font-size: 0.9rem;
    transition: all 0.2s;
    border: none;
    cursor: pointer;
  }

  .btn-secondary {
    background-color: #f5f5f5;
    color: #333;
    border: 1px solid #ddd;
  }

  .btn-secondary:hover {
    background-color: #e8e8e8;
  }

  .btn-danger {
    background-color: #d32f2f;
    color: white;
  }

  .btn-danger:hover:not(:disabled) {
    background-color: #c62828;
  }

  .btn-danger:disabled {
    opacity: 0.6;
    cursor: not-allowed;
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

  .payment-card {
    background: white;
    border-radius: 0.75rem;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    overflow: hidden;
  }

  .payment-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding: 2rem;
    background: linear-gradient(135deg, #f8f9fa, #e9ecef);
    border-bottom: 1px solid #dee2e6;
  }

  .title-with-category {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 0.5rem;
  }

  .title-with-category .category-emoji {
    font-size: 2rem;
    flex-shrink: 0;
  }

  .title-section h1 {
    margin: 0;
    color: #333;
    font-size: 1.75rem;
  }

  .payment-amount {
    font-size: 1.5rem;
    font-weight: bold;
    color: #1976d2;
  }

  .receipt-image {
    flex-shrink: 0;
    margin-left: 2rem;
  }

  .receipt-image img {
    max-width: 150px;
    max-height: 150px;
    object-fit: cover;
    border-radius: 0.5rem;
    border: 1px solid #ddd;
  }

  .payment-info {
    padding: 2rem;
  }

  .info-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    margin-bottom: 2rem;
  }

  .info-item {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .label {
    font-weight: 600;
    color: #666;
    font-size: 0.9rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .value {
    color: #333;
    font-size: 1rem;
  }

  .description {
    border-top: 1px solid #eee;
    padding-top: 1.5rem;
  }

  .description h3 {
    margin: 0 0 0.75rem 0;
    color: #333;
    font-size: 1.1rem;
  }

  .description p {
    margin: 0;
    color: #555;
    line-height: 1.5;
  }

  .splits-section {
    border-top: 1px solid #eee;
    padding: 2rem;
  }

  .splits-section h3 {
    margin: 0 0 1rem 0;
    color: #333;
    font-size: 1.1rem;
  }

  .splits-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .split-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    background: #f8f9fa;
    border-radius: 0.5rem;
    border: 1px solid transparent;
  }

  .split-item.current-user {
    background: #e3f2fd;
    border-color: #2196f3;
  }

  .split-user {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .split-user .user-info {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .username {
    font-weight: 500;
    color: #333;
  }

  .you-badge {
    background-color: #1976d2;
    color: white;
    padding: 0.125rem 0.5rem;
    border-radius: 1rem;
    font-size: 0.75rem;
    font-weight: 500;
  }

  .split-amount {
    font-weight: 500;
    font-size: 1rem;
  }

  .split-amount.positive {
    color: #2e7d32;
  }

  .split-amount.negative {
    color: #d32f2f;
  }

  @media (max-width: 600px) {
    .payment-view {
      padding: 1rem;
    }

    .payment-header {
      flex-direction: column;
      gap: 1rem;
      text-align: center;
    }

    .receipt-image {
      margin-left: 0;
    }

    .header-content {
      flex-direction: column;
      align-items: stretch;
    }

    .header-actions {
      justify-content: center;
    }

    .info-grid {
      grid-template-columns: 1fr;
    }

    .split-item {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.5rem;
    }
  }
</style>