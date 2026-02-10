<script>
  import { onMount } from 'svelte';
  import ProfilePicture from './ProfilePicture.svelte';
  import { formatCurrency } from '$lib/utils/formatters';

  let debtData = {
    whoOwesMe: [],
    whoIOwe: [],
    totalOwedToMe: 0,
    totalIOwe: 0
  };
  let loading = true;
  let error = null;

  $: shouldHide = getShouldHide();

  function getShouldHide() {
    const totalUsers = debtData.whoOwesMe.length + debtData.whoIOwe.length;
    return totalUsers <= 1; // Hide if 0 or 1 user (1 user is handled by enhanced balance)
  }

  onMount(async () => {
    await fetchDebtBreakdown();
  });

  async function fetchDebtBreakdown() {
    try {
      loading = true;
      const response = await fetch('/api/cospend/debts');
      if (!response.ok) {
        throw new Error('Failed to fetch debt breakdown');
      }
      debtData = await response.json();
    } catch (err) {
      error = err.message;
    } finally {
      loading = false;
    }
  }

  // Export refresh method for parent components to call
  export async function refresh() {
    await fetchDebtBreakdown();
  }
</script>

{#if !shouldHide}
<div class="debt-breakdown">
  <h2>Debt Overview</h2>
  
  {#if loading}
    <div class="loading">Loading debt breakdown...</div>
  {:else if error}
    <div class="error">Error: {error}</div>
  {:else}
    <div class="debt-sections">
      {#if debtData.whoOwesMe.length > 0}
        <div class="debt-section owed-to-me">
          <h3>Who owes you</h3>
          <div class="total-amount positive">
            Total: {formatCurrency(debtData.totalOwedToMe, 'CHF', 'de-CH')}
          </div>
          
          <div class="debt-list">
            {#each debtData.whoOwesMe as debt}
              <div class="debt-item">
                <div class="debt-user">
                  <ProfilePicture username={debt.username} size={40} />
                  <div class="user-details">
                    <span class="username">{debt.username}</span>
                    <span class="amount positive">{formatCurrency(debt.netAmount, 'CHF', 'de-CH')}</span>
                  </div>
                </div>
                <div class="transaction-count">
                  {debt.transactions.length} transaction{debt.transactions.length !== 1 ? 's' : ''}
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/if}

      {#if debtData.whoIOwe.length > 0}
        <div class="debt-section owe-to-others">
          <h3>You owe</h3>
          <div class="total-amount negative">
            Total: {formatCurrency(debtData.totalIOwe, 'CHF', 'de-CH')}
          </div>
          
          <div class="debt-list">
            {#each debtData.whoIOwe as debt}
              <div class="debt-item">
                <div class="debt-user">
                  <ProfilePicture username={debt.username} size={40} />
                  <div class="user-details">
                    <span class="username">{debt.username}</span>
                    <span class="amount negative">{formatCurrency(debt.netAmount, 'CHF', 'de-CH')}</span>
                  </div>
                </div>
                <div class="transaction-count">
                  {debt.transactions.length} transaction{debt.transactions.length !== 1 ? 's' : ''}
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/if}
    </div>
  {/if}
</div>
{/if}

<style>
  .debt-breakdown {
    background: white;
    padding: 1.5rem;
    border-radius: 0.75rem;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    margin-bottom: 2rem;
  }

  .debt-breakdown h2 {
    margin-bottom: 1.5rem;
    color: #333;
    font-size: 1.4rem;
  }

  .loading, .error {
    text-align: center;
    padding: 2rem;
    color: #666;
  }

  .error {
    color: #d32f2f;
    background-color: #ffebee;
    border-radius: 0.5rem;
  }

  .debt-sections {
    display: grid;
    gap: 1.5rem;
  }

  @media (min-width: 768px) {
    .debt-sections {
      grid-template-columns: 1fr 1fr;
    }
  }

  .debt-section {
    border-radius: 0.5rem;
    padding: 1rem;
  }

  .debt-section.owed-to-me {
    background: linear-gradient(135deg, #e8f5e8, #f0f8f0);
    border: 1px solid #c8e6c9;
  }

  .debt-section.owe-to-others {
    background: linear-gradient(135deg, #ffeaea, #fff5f5);
    border: 1px solid #ffcdd2;
  }

  .debt-section h3 {
    margin-bottom: 0.5rem;
    font-size: 1.1rem;
    color: #333;
  }

  .total-amount {
    font-weight: bold;
    font-size: 1.2rem;
    margin-bottom: 1rem;
  }

  .total-amount.positive {
    color: #2e7d32;
  }

  .total-amount.negative {
    color: #d32f2f;
  }

  .debt-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .debt-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem;
    background: white;
    border-radius: 0.5rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .debt-user {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex: 1;
  }

  .user-details {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .username {
    font-weight: 500;
    color: #333;
  }

  .amount {
    font-weight: bold;
    font-size: 1rem;
  }

  .amount.positive {
    color: #2e7d32;
  }

  .amount.negative {
    color: #d32f2f;
  }

  .transaction-count {
    color: #666;
    font-size: 0.85rem;
    text-align: right;
  }

  @media (max-width: 600px) {
    .debt-breakdown {
      padding: 0.75rem;
    }

    .debt-section {
      padding: 0.75rem;
    }
  }
</style>