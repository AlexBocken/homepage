<script>
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { pushState } from '$app/navigation';
  import ProfilePicture from '$lib/components/ProfilePicture.svelte';
  import { getCategoryEmoji, getCategoryName } from '$lib/utils/categories';

  export let data; // Used by the layout for session data

  let balance = {
    netBalance: 0,
    recentSplits: []
  };
  let loading = true;
  let error = null;

  onMount(async () => {
    await fetchBalance();
  });

  async function fetchBalance() {
    try {
      loading = true;
      const response = await fetch('/api/cospend/balance');
      if (!response.ok) {
        throw new Error('Failed to fetch balance');
      }
      balance = await response.json();
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

  function truncateDescription(description, maxLength = 100) {
    if (!description) return '';
    if (description.length <= maxLength) return description;
    return description.substring(0, maxLength).trim() + '...';
  }

  function handlePaymentClick(paymentId, event) {
    event.preventDefault();
    // Use pushState for true shallow routing - only updates URL without navigation
    pushState(`/cospend/payments/view/${paymentId}`, { paymentId });
  }
</script>

<svelte:head>
  <title>Cospend - Expense Sharing</title>
</svelte:head>

<main class="cospend-main">
  <div class="header-section">
    <h1>Cospend</h1>
    <p>Track and split expenses with your friends and family</p>
  </div>

  {#if loading}
    <div class="loading">Loading your balance...</div>
  {:else if error}
    <div class="error">Error: {error}</div>
  {:else}
    <div class="balance-cards">
      <div class="balance-card net-balance" class:positive={balance.netBalance <= 0} class:negative={balance.netBalance > 0}>
        <h3>Your Balance</h3>
        <div class="amount">
          {#if balance.netBalance < 0}
            <span class="positive">+{formatCurrency(balance.netBalance)}</span>
            <small>You are owed</small>
          {:else if balance.netBalance > 0}
            <span class="negative">-{formatCurrency(balance.netBalance)}</span>
            <small>You owe</small>
          {:else}
            <span class="even">CHF 0.00</span>
            <small>You're all even</small>
          {/if}
        </div>
      </div>
    </div>

    <div class="actions">
      <a href="/cospend/payments/add" class="btn btn-primary">Add Payment</a>
      <a href="/cospend/payments" class="btn btn-secondary">View All Payments</a>
    </div>

    {#if balance.recentSplits && balance.recentSplits.length > 0}
      <div class="recent-activity">
        <h2>Recent Activity</h2>
        <div class="activity-dialog">
          {#each balance.recentSplits as split}
            <div class="activity-message" class:is-me={split.paymentId?.paidBy === data.session?.user?.nickname}>
              <div class="message-content">
                <ProfilePicture username={split.paymentId?.paidBy || 'Unknown'} size={36} />
                <a 
                  href="/cospend/payments/view/{split.paymentId?._id}" 
                  class="activity-bubble"
                  on:click={(e) => handlePaymentClick(split.paymentId?._id, e)}
                >
                  <div class="activity-header">
                    <div class="user-info">
                      <div class="payment-title-row">
                        <span class="category-emoji">{getCategoryEmoji(split.paymentId?.category || 'groceries')}</span>
                        <strong class="payment-title">{split.paymentId?.title || 'Payment'}</strong>
                      </div>
                      <span class="username">Paid by {split.paymentId?.paidBy || 'Unknown'}</span>
                      <span class="category-name">{getCategoryName(split.paymentId?.category || 'groceries')}</span>
                    </div>
                    <div class="activity-amount" class:positive={split.amount < 0} class:negative={split.amount > 0}>
                      {#if split.amount > 0}
                        -{formatCurrency(split.amount)}
                      {:else if split.amount < 0}
                        +{formatCurrency(split.amount)}
                      {:else}
                        even
                      {/if}
                    </div>
                  </div>
                  <div class="payment-details">
                    <div class="payment-meta">
                      <span class="payment-date">{formatDate(split.createdAt)}</span>
                    </div>
                    {#if split.paymentId?.description}
                      <div class="payment-description">
                        {truncateDescription(split.paymentId.description)}
                      </div>
                    {/if}
                  </div>
                </a>
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/if}
  {/if}
</main>

<style>
  .cospend-main {
    max-width: 800px;
    margin: 0 auto;
    padding: 2rem;
  }

  .header-section {
    text-align: center;
    margin-bottom: 2rem;
  }

  .header-section h1 {
    font-size: 2.5rem;
    margin-bottom: 0.5rem;
    color: #333;
  }

  .header-section p {
    color: #666;
    font-size: 1.1rem;
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

  .balance-cards {
    display: flex;
    justify-content: center;
    margin-bottom: 2rem;
  }

  .balance-card {
    background: white;
    padding: 2rem;
    border-radius: 0.75rem;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    text-align: center;
    min-width: 300px;
  }

  .balance-card.net-balance {
    background: linear-gradient(135deg, #f5f5f5, #e8e8e8);
  }

  .balance-card.net-balance.positive {
    background: linear-gradient(135deg, #e8f5e8, #d4edda);
  }

  .balance-card.net-balance.negative {
    background: linear-gradient(135deg, #ffeaea, #f8d7da);
  }

  .balance-card h3 {
    margin-bottom: 1rem;
    color: #555;
    font-size: 1.1rem;
  }

  .amount {
    font-size: 2rem;
    font-weight: bold;
    margin-bottom: 0.5rem;
  }

  .amount small {
    display: block;
    font-size: 0.9rem;
    font-weight: normal;
    color: #666;
    margin-top: 0.5rem;
  }

  .positive {
    color: #2e7d32;
  }

  .negative {
    color: #d32f2f;
  }

  .even {
    color: #666;
  }

  .actions {
    display: flex;
    gap: 1rem;
    justify-content: center;
    margin-bottom: 2rem;
    flex-wrap: wrap;
  }

  .btn {
    padding: 0.75rem 1.5rem;
    border-radius: 0.5rem;
    text-decoration: none;
    font-weight: 500;
    transition: all 0.2s;
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

  .recent-activity {
    background: white;
    padding: 1.5rem;
    border-radius: 0.75rem;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .recent-activity h2 {
    margin-bottom: 1rem;
    color: #333;
  }

  .activity-dialog {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding: 0.5rem 0;
  }

  .activity-message {
    display: flex;
    align-items: flex-start;
    width: 100%;
  }

  .activity-message.is-me {
    flex-direction: row-reverse;
  }

  .message-content {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    width: 100%;
  }

  .activity-message.is-me .message-content {
    flex-direction: row-reverse;
  }

  .activity-bubble {
    background: #f8f9fa;
    border-radius: 1rem;
    padding: 1rem;
    position: relative;
    border: 1px solid #e9ecef;
    text-decoration: none;
    color: inherit;
    display: block;
    transition: all 0.2s;
    flex: 1;
  }

  .activity-message.is-me .activity-bubble {
    background: #e3f2fd;
    border-color: #2196f3;
  }

  .activity-bubble:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
  }

  .activity-bubble::before {
    content: '';
    position: absolute;
    top: 1rem;
    width: 0;
    height: 0;
    border: 8px solid transparent;
  }

  .activity-bubble::before {
    left: -15px;
    border-right-color: #f8f9fa;
  }

  .activity-message.is-me .activity-bubble::before {
    left: auto;
    right: -15px;
    border-left-color: #e3f2fd;
    border-right-color: transparent;
  }

  .activity-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 0.75rem;
  }

  .user-info {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .payment-title-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .category-emoji {
    font-size: 1.2rem;
    flex-shrink: 0;
  }

  .category-name {
    color: #888;
    font-size: 0.8rem;
    font-style: italic;
  }

  .payment-title {
    color: #333;
    font-size: 1.1rem;
    font-weight: 600;
    margin: 0;
  }

  .username {
    color: #666;
    font-size: 0.9rem;
    font-weight: 500;
  }

  .you-badge {
    background-color: #1976d2;
    color: white;
    padding: 0.125rem 0.5rem;
    border-radius: 1rem;
    font-size: 0.75rem;
    font-weight: 500;
    display: inline-block;
  }

  .activity-amount {
    font-weight: bold;
    font-size: 1rem;
    flex-shrink: 0;
  }

  .payment-details {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .payment-meta {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .paid-by, .payment-date {
    color: #666;
    font-size: 0.9rem;
  }

  .payment-description {
    color: #555;
    font-size: 0.9rem;
    font-style: italic;
    margin-top: 0.25rem;
    line-height: 1.3;
  }

  @media (max-width: 600px) {
    .cospend-main {
      padding: 1rem;
    }

    .balance-card {
      min-width: unset;
      width: 100%;
    }

    .actions {
      flex-direction: column;
      align-items: center;
    }

    .btn {
      width: 100%;
      max-width: 300px;
      text-align: center;
    }
  }
</style>