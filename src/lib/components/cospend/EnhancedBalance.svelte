<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/state';
  import ProfilePicture from './ProfilePicture.svelte';
  import { formatCurrency as formatCurrencyUtil } from '$lib/utils/formatters';
  import { detectCospendLang, locale, m } from '$lib/js/cospendI18n';

  const lang = $derived(detectCospendLang(page.url.pathname));
  const t = $derived(m[lang]);
  const loc = $derived(locale(lang));

  let { initialBalance = null, initialDebtData = null } = $props<{ initialBalance?: any, initialDebtData?: any }>();

  // svelte-ignore state_referenced_locally
  let balance = $state(initialBalance || {
    netBalance: 0,
    recentSplits: []
  });
  // svelte-ignore state_referenced_locally
  let debtData = $state(initialDebtData || {
    whoOwesMe: [],
    whoIOwe: [],
    totalOwedToMe: 0,
    totalIOwe: 0
  });
  // svelte-ignore state_referenced_locally
  let loading = $state(!initialBalance || !initialDebtData);
  let error = $state<string | null>(null);

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
      error = err instanceof Error ? err.message : String(err);
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
      error = err instanceof Error ? err.message : String(err);
    } finally {
      loading = false;
    }
  }

  function formatCurrency(amount: number) {
    return formatCurrencyUtil(Math.abs(amount), 'CHF', loc);
  }

  // Export refresh method for parent components to call
  export async function refresh() {
    loading = true;
    await Promise.all([fetchBalance(), fetchDebtBreakdown()]);
  }

</script>

<div class="balance-cards">
  <div class="balance-card net-balance"
       class:positive={balance.netBalance < 0}
       class:negative={balance.netBalance > 0}
       aria-busy={loading}>

    <span class="eyebrow">{t.your_balance}</span>

    {#if loading}
      <div class="amount-skeleton" aria-hidden="true"></div>
    {:else if error}
      <div class="error">{t.error_prefix}: {error}</div>
    {:else}
      <div class="amount">
        {#if balance.netBalance < 0}
          <span class="figure positive">+{formatCurrency(balance.netBalance)}</span>
          <small>{t.you_are_owed}</small>
        {:else if balance.netBalance > 0}
          <span class="figure negative">−{formatCurrency(balance.netBalance)}</span>
          <small>{t.you_owe_balance}</small>
        {:else}
          <span class="figure even">CHF 0.00</span>
          <small>{t.all_even}</small>
        {/if}
      </div>

      {#if singleDebtUser?.user}
        <div class="debt-details">
          <div class="debt-user">
            <ProfilePicture username={singleDebtUser.user.username} size={40} />
            <div class="user-info">
              <span class="username">{singleDebtUser.user.username}</span>
              <span class="debt-description">
                {#if singleDebtUser.type === 'owesMe'}
                  {t.owes_you_balance} {formatCurrency(singleDebtUser.amount)}
                {:else}
                  {t.you_owe_user} {formatCurrency(singleDebtUser.amount)}
                {/if}
              </span>
            </div>
          </div>
          {#if singleDebtUser.user.transactions}
            <div class="transaction-count">
              {singleDebtUser.user.transactions.length} {singleDebtUser.user.transactions.length !== 1 ? t.transactions : t.transaction}
            </div>
          {/if}
        </div>
      {/if}
    {/if}
  </div>
</div>

<style>
  .balance-cards {
    display: flex;
    justify-content: center;
  }

  .balance-card {
    width: 100%;
    max-width: 440px;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    padding: 1.75rem 2rem;
    border-radius: var(--radius-card);
    box-shadow: var(--shadow-md);
    text-align: center;
  }

  /* Status tint: green when you're owed, red when you owe, neutral at zero */
  .balance-card.net-balance.positive {
    background: color-mix(in srgb, var(--green) 9%, var(--color-surface));
    border-color: color-mix(in srgb, var(--green) 32%, var(--color-border));
  }

  .balance-card.net-balance.negative {
    background: color-mix(in srgb, var(--red) 9%, var(--color-surface));
    border-color: color-mix(in srgb, var(--red) 32%, var(--color-border));
  }

  .eyebrow {
    display: block;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-size: 0.72rem;
    font-weight: 600;
    color: var(--color-text-secondary);
    margin-bottom: 0.6rem;
  }

  .error {
    color: var(--red);
    background: color-mix(in srgb, var(--red) 12%, var(--color-surface));
    border-radius: var(--radius-md);
    padding: 0.85rem;
  }

  .amount {
    font-size: 2.4rem;
    font-weight: 800;
    line-height: 1.05;
  }

  .amount .figure {
    font-variant-numeric: tabular-nums;
  }

  .amount small {
    display: block;
    font-size: 0.9rem;
    font-weight: 500;
    color: var(--color-text-secondary);
    margin-top: 0.4rem;
  }

  .figure.positive { color: var(--green); }
  .figure.negative { color: var(--red); }
  .figure.even { color: var(--color-text-secondary); }

  .debt-details {
    margin-top: 1.5rem;
    background: var(--color-bg-tertiary);
    border-radius: var(--radius-md);
    padding: 0.85rem 1rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.75rem;
    text-align: left;
  }

  .debt-user {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    min-width: 0;
  }

  .user-info {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    min-width: 0;
  }

  .username {
    font-weight: 600;
    color: var(--color-text-primary);
    font-size: 1rem;
    text-transform: capitalize;
  }

  .debt-description {
    color: var(--color-text-secondary);
    font-size: 0.85rem;
  }

  .transaction-count {
    color: var(--color-text-tertiary);
    font-size: 0.8rem;
    white-space: nowrap;
  }

  .amount-skeleton {
    height: 2.6rem;
    width: 60%;
    margin: 0.2rem auto 0;
    border-radius: var(--radius-md);
    background: linear-gradient(90deg, var(--color-bg-tertiary), var(--color-bg-elevated), var(--color-bg-tertiary));
    background-size: 200% 100%;
    animation: balance-shimmer 1.3s infinite;
  }

  @keyframes balance-shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }

  @media (prefers-reduced-motion: reduce) {
    .amount-skeleton { animation: none; }
  }

  @media (max-width: 600px) {
    .balance-card {
      padding: 1.25rem;
    }

    .amount {
      font-size: 2rem;
    }

    .debt-details {
      flex-direction: column;
      gap: 0.5rem;
      align-items: flex-start;
    }

    .transaction-count {
      text-align: left;
    }
  }
</style>