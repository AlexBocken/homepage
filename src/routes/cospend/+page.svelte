<script>
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { pushState } from '$app/navigation';
  import ProfilePicture from '$lib/components/ProfilePicture.svelte';
  import EnhancedBalance from '$lib/components/EnhancedBalance.svelte';
  import DebtBreakdown from '$lib/components/DebtBreakdown.svelte';
  import { getCategoryEmoji, getCategoryName } from '$lib/utils/categories';
  import { isSettlementPayment, getSettlementIcon, getSettlementClasses, getSettlementReceiver } from '$lib/utils/settlements';
  import AddButton from '$lib/components/AddButton.svelte';

  export let data; // Contains session data and balance from server

  // Use server-side data, with fallback for progressive enhancement
  let balance = data.balance || {
    netBalance: 0,
    recentSplits: []
  };
  let loading = false; // Start as false since we have server data
  let error = null;

  // Component references for refreshing
  let enhancedBalanceComponent;
  let debtBreakdownComponent;

  // Progressive enhancement: refresh data if JavaScript is available
  onMount(async () => {
    // Mark that JavaScript is loaded for progressive enhancement
    document.body.classList.add('js-loaded');
    await fetchBalance();

    // Listen for dashboard refresh events from the layout
    const handleDashboardRefresh = () => {
      refreshAllComponents();
    };

    window.addEventListener('dashboardRefresh', handleDashboardRefresh);

    // Cleanup
    return () => {
      window.removeEventListener('dashboardRefresh', handleDashboardRefresh);
    };
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

  // Function to refresh all dashboard components after payment deletion
  async function refreshAllComponents() {
    // Refresh the main balance and recent activity
    await fetchBalance();

    // Refresh the enhanced balance component if it exists and has a refresh method
    if (enhancedBalanceComponent && enhancedBalanceComponent.refresh) {
      await enhancedBalanceComponent.refresh();
    }

    // Refresh the debt breakdown component if it exists and has a refresh method
    if (debtBreakdownComponent && debtBreakdownComponent.refresh) {
      await debtBreakdownComponent.refresh();
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
    // Progressive enhancement: if JavaScript is available, use pushState for modal behavior
    if (typeof pushState !== 'undefined') {
      event.preventDefault();
      pushState(`/cospend/payments/view/${paymentId}`, { paymentId });
    }
    // Otherwise, let the regular link navigation happen (no preventDefault)
  }

  function getSettlementReceiverFromSplit(split) {
    if (!isSettlementPayment(split.paymentId)) {
      return '';
    }

    // In a settlement, the receiver is the person who is NOT the payer
    // Since we're viewing the current user's activity, the receiver is the current user
    // when someone else paid, or the other user when current user paid

    const paidBy = split.paymentId?.paidBy;
    const currentUser = data.session?.user?.nickname;

    if (paidBy === currentUser) {
      // Current user paid, so receiver is the other user
      return split.otherUser || '';
    } else {
      // Someone else paid, so current user is the receiver
      return currentUser;
    }
  }
</script>

<svelte:head>
  <title>Cospend - Expense Sharing</title>
</svelte:head>

<main class="cospend-main">
    <h1>Cospend</h1>

  <EnhancedBalance bind:this={enhancedBalanceComponent} initialBalance={data.balance} initialDebtData={data.debtData} />

  <div class="actions">
    {#if balance.netBalance !== 0}
      <a href="/cospend/settle" class="btn btn-settlement">Settle Debts</a>
    {/if}
  </div>

  <DebtBreakdown bind:this={debtBreakdownComponent} />

  {#if loading}
    <div class="loading">Loading recent activity...</div>
  {:else if error}
    <div class="error">Error: {error}</div>
  {:else if balance.recentSplits && balance.recentSplits.length > 0}
    <div class="recent-activity">
      <h2>Recent Activity</h2>
      <div class="activity-dialog">
        {#each balance.recentSplits as split}
          {#if isSettlementPayment(split.paymentId)}
            <!-- Settlement Payment Display - User -> User Flow -->
            <a
              href="/cospend/payments/view/{split.paymentId?._id}"
              class="settlement-flow-activity"
              on:click={(e) => handlePaymentClick(split.paymentId?._id, e)}
            >
              <div class="settlement-activity-content">
                <div class="settlement-user-flow">
                  <div class="settlement-payer">
                    <ProfilePicture username={split.paymentId?.paidBy || 'Unknown'} size={64} />
                    <span class="settlement-username">{split.paymentId?.paidBy || 'Unknown'}</span>
                  </div>
                  <div class="settlement-arrow-section">
                    <div class="settlement-amount-large">
                      {formatCurrency(Math.abs(split.amount))}
                    </div>
                    <div class="settlement-flow-arrow">→</div>
                    <div class="settlement-date">{formatDate(split.createdAt)}</div>
                  </div>
                  <div class="settlement-receiver">
                    <ProfilePicture username={getSettlementReceiverFromSplit(split) || 'Unknown'} size={64} />
                    <span class="settlement-username">{getSettlementReceiverFromSplit(split) || 'Unknown'}</span>
                  </div>
                </div>
              </div>
            </a>
          {:else}
            <!-- Regular Payment Display - Speech Bubble Style -->
            <div class="activity-message"
                 class:is-me={split.paymentId?.paidBy === data.session?.user?.nickname}>
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
                    <div class="activity-amount"
                         class:positive={split.amount < 0}
                         class:negative={split.amount > 0}>
                      {#if split.amount > 0}
                        -{formatCurrency(split.amount)}
                      {:else if split.amount < 0}
                        +{formatCurrency(split.amount)}
                      {:else}
                        {formatCurrency(split.amount)}
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
          {/if}
        {/each}
      </div>
    </div>
  {/if}
</main>

<AddButton href="/cospend/payments/add" />

<style>
  .cospend-main {
    max-width: 800px;
    margin: 0 auto;
    padding: 2rem;
  }

  h1 {
    text-align: center;
    font-size: 2.5rem;
    margin-block: 0.5rem 1.5rem;
    color: var(--nord0);
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
  }

  @media (prefers-color-scheme: dark) {
    h1 {
      color: var(--font-default-dark);
    }

    .error {
      background-color: var(--accent-dark);
    }
  }


  .positive {
    color: var(--green);
  }

  .negative {
    color: var(--red);
  }

  .even {
    color: var(--nord3);
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

  .btn-settlement {
    background: linear-gradient(135deg, var(--green), var(--lightblue));
    color: white;
    border: none;
  }

  .btn-settlement:hover {
    background: linear-gradient(135deg, var(--lightblue), var(--green));
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
  }

  .recent-activity {
    background: var(--nord6);
    padding: 1.5rem;
    border-radius: 0.75rem;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    border: 1px solid var(--nord4);
  }

  .recent-activity h2 {
    margin-bottom: 1rem;
    color: var(--nord0);
  }

  @media (prefers-color-scheme: dark) {
    .recent-activity {
      background: var(--accent-dark);
      border-color: var(--nord2);
    }

    .recent-activity h2 {
      color: var(--font-default-dark);
    }
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
    background: var(--nord5);
    border-radius: 1rem;
    padding: 1rem;
    position: relative;
    border: 1px solid var(--nord4);
    text-decoration: none;
    color: inherit;
    display: block;
    transition: all 0.2s;
    flex: 1;
  }

  .activity-message.is-me .activity-bubble {
    background: var(--nord8);
    border-color: var(--blue);
  }

  @media (prefers-color-scheme: dark) {
    .activity-bubble {
      background: var(--nord1);
      border-color: var(--nord2);
    }

    .activity-message.is-me .activity-bubble {
      background: var(--nord2);
      border-color: var(--blue);
    }
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
    border-right-color: var(--nord5);
  }

  .activity-message.is-me .activity-bubble::before {
    left: auto;
    right: -15px;
    border-left-color: var(--nord8);
    border-right-color: transparent;
  }

  @media (prefers-color-scheme: dark) {
    .activity-bubble::before {
      border-right-color: var(--nord1);
    }

    .activity-message.is-me .activity-bubble::before {
      border-left-color: var(--nord2);
    }
  }


  /* New Settlement Flow Activity Styles */
  .settlement-flow-activity {
    display: block;
    text-decoration: none;
    color: inherit;
    background: linear-gradient(135deg, var(--nord6), var(--nord5));
    border: 2px solid var(--green);
    border-radius: 1rem;
    padding: 1.5rem;
    margin: 0 auto 1rem auto;
    max-width: 400px;
    transition: all 0.2s ease;
  }

  .settlement-flow-activity:hover {
    box-shadow: 0 6px 20px rgba(163, 190, 140, 0.3);
    transform: translateY(-2px);
  }

  @media (prefers-color-scheme: dark) {
    .settlement-flow-activity {
      background: linear-gradient(135deg, var(--nord2), var(--nord1));
      border-color: var(--green);
    }

    .settlement-flow-activity:hover {
      box-shadow: 0 6px 20px rgba(163, 190, 140, 0.2);
    }
  }

  .settlement-activity-content {
    width: 100%;
  }

  .settlement-user-flow {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1.5rem;
  }

  .settlement-payer, .settlement-receiver {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    flex: 0 0 auto;
  }

  .settlement-username {
    font-weight: 600;
    color: var(--green);
    font-size: 1rem;
    text-align: center;
  }

  .settlement-arrow-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    flex: 1;
  }

  .settlement-amount-large {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--green);
    text-align: center;
  }

  .settlement-flow-arrow {
    font-size: 1.8rem;
    color: var(--green);
    font-weight: bold;
  }

  .settlement-date {
    font-size: 0.9rem;
    color: var(--nord3);
    text-align: center;
  }

  @media (prefers-color-scheme: dark) {
    .settlement-date {
      color: var(--nord4);
    }
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
    color: var(--nord3);
    font-size: 0.8rem;
    font-style: italic;
  }

  .payment-title {
    color: var(--nord0);
    font-size: 1.1rem;
    font-weight: 600;
    margin: 0;
  }

  .username {
    color: var(--nord3);
    font-size: 0.9rem;
    font-weight: 500;
  }

  @media (prefers-color-scheme: dark) {
    .category-name {
      color: var(--nord4);
    }

    .payment-title {
      color: var(--font-default-dark);
    }

    .username {
      color: var(--nord4);
    }
  }

  .you-badge {
    background-color: var(--blue);
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
    color: var(--nord3);
    font-size: 0.9rem;
  }

  .payment-description {
    color: var(--nord2);
    font-size: 0.9rem;
    font-style: italic;
    margin-top: 0.25rem;
    line-height: 1.3;
  }

  @media (prefers-color-scheme: dark) {
    .paid-by, .payment-date {
      color: var(--nord4);
    }

    .payment-description {
      color: var(--nord5);
    }
  }

  @media (max-width: 600px) {
    .cospend-main {
      padding: 1rem;
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

    /* Mobile Settlement Flow */
    .settlement-user-flow {
      flex-direction: column;
      gap: 1rem;
    }

    .settlement-payer, .settlement-receiver {
      order: 1;
    }

    .settlement-arrow-section {
      order: 2;
    }

    .settlement-flow-arrow {
      transform: rotate(90deg);
      font-size: 1.5rem;
    }

    .settlement-amount-large {
      font-size: 1.3rem;
    }
  }
</style>
