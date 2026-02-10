<script lang="ts">
  import { onMount } from 'svelte';
  import ProfilePicture from './ProfilePicture.svelte';
  import { formatCurrency as formatCurrencyUtil } from '$lib/utils/formatters';

  let { initialBalance = null, initialDebtData = null } = $props<{ initialBalance?: any, initialDebtData?: any }>();

  let balance = $state(initialBalance || {
    netBalance: 0,
    recentSplits: []
  });
  let debtData = $state(initialDebtData || {
    whoOwesMe: [],
    whoIOwe: [],
    totalOwedToMe: 0,
    totalIOwe: 0
  });
  let loading = $state(!initialBalance || !initialDebtData);
  let error = $state(null);

  // Use $derived instead of $effect for computed values
  let singleDebtUser = $derived.by(() => {
    const totalUsers = debtData.whoOwesMe.length + debtData.whoIOwe.length;

    if (totalUsers === 1) {
      if (debtData.whoOwesMe.length === 1) {
        return {
          type: 'owesMe',
          user: debtData.whoOwesMe[0],
          amount: debtData.whoOwesMe[0].netAmount
        };
      } else if (debtData.whoIOwe.length === 1) {
        return {
          type: 'iOwe',
          user: debtData.whoIOwe[0],
          amount: debtData.whoIOwe[0].netAmount
        };
      }
    }

    return null;
  });

  let shouldShowIntegratedView = $derived(singleDebtUser !== null);
  

  onMount(async () => {
    // Mark that JavaScript is loaded
    if (typeof document !== 'undefined') {
      document.body.classList.add('js-loaded');
    }
    
    // Only fetch data if we don't have initial data (progressive enhancement)
    if (!initialBalance || !initialDebtData) {
      await Promise.all([fetchBalance(), fetchDebtBreakdown()]);
    }
  });

  async function fetchBalance() {
    try {
      const response = await fetch('/api/cospend/balance');
      if (!response.ok) {
        throw new Error('Failed to fetch balance');
      }
      const newBalance = await response.json();
      // Force reactivity by creating new object with spread arrays
      balance = {
        netBalance: newBalance.netBalance || 0,
        recentSplits: [...(newBalance.recentSplits || [])]
      };
    } catch (err) {
      error = err.message;
    }
  }

  async function fetchDebtBreakdown() {
    try {
      const response = await fetch('/api/cospend/debts');
      if (!response.ok) {
        throw new Error('Failed to fetch debt breakdown');
      }
      const newDebtData = await response.json();
      // Force reactivity by creating new object with spread arrays
      debtData = {
        whoOwesMe: [...(newDebtData.whoOwesMe || [])],
        whoIOwe: [...(newDebtData.whoIOwe || [])],
        totalOwedToMe: newDebtData.totalOwedToMe || 0,
        totalIOwe: newDebtData.totalIOwe || 0
      };
    } catch (err) {
      error = err.message;
    } finally {
      loading = false;
    }
  }

  function formatCurrency(amount) {
    return formatCurrencyUtil(Math.abs(amount), 'CHF', 'de-CH');
  }

  // Export refresh method for parent components to call
  export async function refresh() {
    loading = true;
    await Promise.all([fetchBalance(), fetchDebtBreakdown()]);
  }

</script>

<div class="balance-cards">
  <div class="balance-card net-balance" 
       class:positive={balance.netBalance <= 0} 
       class:negative={balance.netBalance > 0}
       class:enhanced={shouldShowIntegratedView}>
    
    {#if loading}
      <div class="loading-content">
        <h3>Your Balance</h3>
        <div class="loading">Loading...</div>
      </div>
    {:else if error}
      <h3>Your Balance</h3>
      <div class="error">Error: {error}</div>
    {:else if shouldShowIntegratedView}
      <!-- Enhanced view with single user debt -->
      <h3>Your Balance</h3>
      <div class="enhanced-balance">
        <div class="main-amount">
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
        
        <div class="debt-details">
          <div class="debt-user">
            {#if singleDebtUser && singleDebtUser.user}
              <!-- Debug: ProfilePicture with username: {singleDebtUser.user.username} -->
              <ProfilePicture username={singleDebtUser.user.username} size={40} />
              <div class="user-info">
                <span class="username">{singleDebtUser.user.username}</span>
                <span class="debt-description">
                  {#if singleDebtUser.type === 'owesMe'}
                    owes you {formatCurrency(singleDebtUser.amount)}
                  {:else}
                    you owe {formatCurrency(singleDebtUser.amount)}
                  {/if}
                </span>
              </div>
            {:else}
              <div>Debug: No singleDebtUser data</div>
            {/if}
          </div>
          <div class="transaction-count">
            {#if singleDebtUser && singleDebtUser.user && singleDebtUser.user.transactions}
              {singleDebtUser.user.transactions.length} transaction{singleDebtUser.user.transactions.length !== 1 ? 's' : ''}
            {/if}
          </div>
        </div>
      </div>
    {:else}
      <!-- Standard balance view -->
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
    {/if}
  </div>
</div>

<style>
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

  .balance-card.enhanced {
    min-width: 400px;
    text-align: left;
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
    text-align: center;
  }

  .loading-content {
    text-align: center;
  }

  .loading {
    color: #666;
  }

  .error {
    color: #d32f2f;
    background-color: #ffebee;
    border-radius: 0.5rem;
    padding: 1rem;
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

  .enhanced-balance {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .main-amount {
    text-align: center;
    font-size: 1.8rem;
    font-weight: bold;
  }

  .main-amount small {
    display: block;
    font-size: 0.9rem;
    font-weight: normal;
    color: #666;
    margin-top: 0.5rem;
  }

  .debt-details {
    background: rgba(255, 255, 255, 0.5);
    padding: 1rem;
    border-radius: 0.5rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .debt-user {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex: 1;
  }

  .user-info {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .username {
    font-weight: 600;
    color: #333;
    font-size: 1rem;
  }

  .debt-description {
    color: #666;
    font-size: 0.9rem;
  }

  .transaction-count {
    color: #666;
    font-size: 0.85rem;
    text-align: right;
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

  @media (max-width: 600px) {
    .balance-card {
      min-width: unset;
      width: 100%;
      padding: 1rem;
    }

    .balance-card.enhanced {
      min-width: unset;
    }

    .debt-details {
      flex-direction: column;
      gap: 0.75rem;
      align-items: flex-start;
      padding: 0.75rem;
    }

    .transaction-count {
      text-align: left;
    }
  }
</style>