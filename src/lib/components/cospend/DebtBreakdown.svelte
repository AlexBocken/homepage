<script>
  import { onMount } from 'svelte';
  import { page } from '$app/state';
  import ProfilePicture from './ProfilePicture.svelte';
  import { formatCurrency } from '$lib/utils/formatters';
  import { detectCospendLang, locale, m } from '$lib/js/cospendI18n';

  const lang = $derived(detectCospendLang(page.url.pathname));
  const t = $derived(m[lang]);
  const loc = $derived(locale(lang));

  /**
   * @typedef {{ username: string, netAmount: number, transactions: Array<any> }} DebtEntry
   */

  /**
   * @typedef {{
   *   whoOwesMe: DebtEntry[],
   *   whoIOwe: DebtEntry[],
   *   totalOwedToMe: number,
   *   totalIOwe: number
   * }} DebtData
   */

  /** @type {DebtData} */
  let debtData = $state({
    whoOwesMe: [],
    whoIOwe: [],
    totalOwedToMe: 0,
    totalIOwe: 0
  });
  let loading = $state(true);
  /** @type {string | null} */
  let error = $state(null);

  let shouldHide = $derived(getShouldHide());

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
      error = err instanceof Error ? err.message : String(err);
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
  <h2>{t.debt_overview}</h2>

  {#if loading}
    <div class="loading">{t.loading_debt_breakdown}</div>
  {:else if error}
    <div class="error">{t.error_prefix}: {error}</div>
  {:else}
    <div class="debt-sections">
      {#if debtData.whoOwesMe.length > 0}
        <div class="debt-section owed-to-me">
          <h3>{t.who_owes_you}</h3>
          <div class="total-amount positive">
            {t.total}: {formatCurrency(debtData.totalOwedToMe, 'CHF', loc)}
          </div>

          <div class="debt-list">
            {#each debtData.whoOwesMe as debt (debt.username)}
              <div class="debt-item">
                <div class="debt-user">
                  <ProfilePicture username={debt.username} size={40} />
                  <div class="user-details">
                    <span class="username">{debt.username}</span>
                    <span class="amount positive">{formatCurrency(debt.netAmount, 'CHF', loc)}</span>
                  </div>
                </div>
                <div class="transaction-count">
                  {debt.transactions.length} {debt.transactions.length !== 1 ? t.transactions : t.transaction}
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/if}

      {#if debtData.whoIOwe.length > 0}
        <div class="debt-section owe-to-others">
          <h3>{t.you_owe_section}</h3>
          <div class="total-amount negative">
            {t.total}: {formatCurrency(debtData.totalIOwe, 'CHF', loc)}
          </div>

          <div class="debt-list">
            {#each debtData.whoIOwe as debt (debt.username)}
              <div class="debt-item">
                <div class="debt-user">
                  <ProfilePicture username={debt.username} size={40} />
                  <div class="user-details">
                    <span class="username">{debt.username}</span>
                    <span class="amount negative">{formatCurrency(debt.netAmount, 'CHF', loc)}</span>
                  </div>
                </div>
                <div class="transaction-count">
                  {debt.transactions.length} {debt.transactions.length !== 1 ? t.transactions : t.transaction}
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
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    padding: 1.5rem;
    border-radius: var(--radius-card);
    box-shadow: var(--shadow-md);
    margin-bottom: 2rem;
  }

  .debt-breakdown h2 {
    margin-bottom: 1.5rem;
    color: var(--color-text-primary);
    font-size: 1.4rem;
  }

  .loading, .error {
    text-align: center;
    padding: 2rem;
    color: var(--color-text-secondary);
  }

  .error {
    color: var(--red);
    background: color-mix(in srgb, var(--red) 12%, var(--color-surface));
    border-radius: var(--radius-md);
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
    background: color-mix(in srgb, var(--green) 10%, var(--color-surface));
    border: 1px solid color-mix(in srgb, var(--green) 30%, var(--color-border));
  }

  .debt-section.owe-to-others {
    background: color-mix(in srgb, var(--red) 10%, var(--color-surface));
    border: 1px solid color-mix(in srgb, var(--red) 30%, var(--color-border));
  }

  .debt-section h3 {
    margin-bottom: 0.5rem;
    font-size: 1.1rem;
    color: var(--color-text-primary);
  }

  .total-amount {
    font-weight: bold;
    font-size: 1.2rem;
    margin-bottom: 1rem;
  }

  .total-amount.positive {
    color: var(--green);
  }

  .total-amount.negative {
    color: var(--red);
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
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-sm);
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
    color: var(--color-text-primary);
    text-transform: capitalize;
  }

  .amount {
    font-weight: bold;
    font-size: 1rem;
  }

  .amount.positive {
    color: var(--green);
  }

  .amount.negative {
    color: var(--red);
  }

  .transaction-count {
    color: var(--color-text-tertiary);
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