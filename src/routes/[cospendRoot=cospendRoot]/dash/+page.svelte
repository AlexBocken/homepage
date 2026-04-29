<script>
  import { resolve } from '$app/paths';
  import { onMount } from 'svelte';
  import { page } from '$app/state';
  import { invalidateAll } from '$app/navigation';
  import { pushState } from '$app/navigation';
  import ProfilePicture from '$lib/components/cospend/ProfilePicture.svelte';
  import EnhancedBalance from '$lib/components/cospend/EnhancedBalance.svelte';
  import DebtBreakdown from '$lib/components/cospend/DebtBreakdown.svelte';
  import BarChart from '$lib/components/cospend/BarChart.svelte';
  import { getCategoryEmoji } from '$lib/utils/categories';
  import { isSettlementPayment, getSettlementIcon, getSettlementClasses, getSettlementReceiver } from '$lib/utils/settlements';
  import AddButton from '$lib/components/AddButton.svelte';


  import { formatCurrency } from '$lib/utils/formatters';
  import { detectCospendLang, cospendRoot, t, locale, paymentCategoryName } from '$lib/js/cospendI18n';

  let { data } = $props(); // Contains session data and balance from server
  const lang = $derived(detectCospendLang(page.url.pathname));
  const root = $derived(cospendRoot(lang));
  const loc = $derived(locale(lang));

  // Use server-side data, with fallback for progressive enhancement
  let balance = $derived(data.balance || {
    netBalance: 0,
    recentSplits: []
  });
  let loading = $state(false);
  /** @type {string | null} */
  let error = $state(null);
  let monthlyExpensesData = $state(/** @type {any} */ ({ labels: [], datasets: [] }));
  let expensesLoading = $state(false);
  /** @type {string[] | null} */
  let categoryFilter = $state(null);

  let filteredSplits = $derived(
    categoryFilter
      ? (balance.recentSplits || []).filter((/** @type {any} */ split) => /** @type {string[]} */ (categoryFilter).includes(split.paymentId?.category))
      : balance.recentSplits || []
  );

  // Component references for refreshing
  /** @type {any} */
  let enhancedBalanceComponent;
  /** @type {any} */
  let debtBreakdownComponent;

  async function fetchMonthlyExpenses() {
    try {
      expensesLoading = true;
      const response = await fetch('/api/cospend/monthly-expenses');
      if (response.ok) monthlyExpensesData = await response.json();
    } catch (err) {
      console.error('Error fetching monthly expenses:', err);
    } finally {
      expensesLoading = false;
    }
  }

  // Progressive enhancement: refresh data if JavaScript is available
  onMount(() => {
    document.body.classList.add('js-loaded');
    fetchMonthlyExpenses();

    const handleDashboardRefresh = () => { refreshAllComponents(); };
    window.addEventListener('dashboardRefresh', handleDashboardRefresh);
    return () => { window.removeEventListener('dashboardRefresh', handleDashboardRefresh); };
  });

  // Function to refresh all dashboard components after payment deletion
  async function refreshAllComponents() {
    await Promise.all([invalidateAll(), fetchMonthlyExpenses()]);

    // Refresh the enhanced balance component if it exists and has a refresh method
    if (enhancedBalanceComponent && enhancedBalanceComponent.refresh) {
      await enhancedBalanceComponent.refresh();
    }

    // Refresh the debt breakdown component if it exists and has a refresh method
    if (debtBreakdownComponent && debtBreakdownComponent.refresh) {
      await debtBreakdownComponent.refresh();
    }
  }

  function formatDate(/** @type {string} */ dateString) {
    return new Date(dateString).toLocaleDateString(loc);
  }

  function truncateDescription(/** @type {string} */ description, maxLength = 100) {
    if (!description) return '';
    if (description.length <= maxLength) return description;
    return description.substring(0, maxLength).trim() + '...';
  }

  function handlePaymentClick(/** @type {string} */ paymentId, /** @type {Event} */ event) {
    // Progressive enhancement: if JavaScript is available, use pushState for modal behavior
    if (typeof pushState !== 'undefined') {
      event.preventDefault();
      pushState(`/${root}/payments/view/${paymentId}`, { paymentId });
    }
    // Otherwise, let the regular link navigation happen (no preventDefault)
  }

  function getSettlementReceiverFromSplit(/** @type {any} */ split) {
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
  <title>{t('cospend_title', lang)}</title>
</svelte:head>

<main class="cospend-main">
    <h1 class="sr-only">{t('cospend', lang)}</h1>

  <!-- Responsive layout for balance and chart -->
  <div class="dashboard-layout">
    <div class="balance-section">
      <EnhancedBalance bind:this={enhancedBalanceComponent} initialBalance={data.balance} initialDebtData={data.debtData} />

      <div class="actions">
        {#if balance.netBalance !== 0}
          <a href={resolve('/[cospendRoot=cospendRoot]/settle', { cospendRoot: root })} class="btn btn-settlement">{t('settle_debts', lang)}</a>
        {/if}
      </div>

      <DebtBreakdown bind:this={debtBreakdownComponent} />
    </div>

    <!-- Monthly Expenses Chart -->
    <div class="chart-section">
      {#if expensesLoading}
        <div class="loading">{t('loading_monthly', lang)}</div>
      {:else if monthlyExpensesData.datasets && monthlyExpensesData.datasets.length > 0}
        <BarChart
          data={monthlyExpensesData}
          title={t('monthly_expenses_chart', lang)}
          height="400px"
          {lang}
          onFilterChange={(/** @type {string[] | null} */ categories) => categoryFilter = categories}
        />
      {:else}
        <div class="loading">
          Debug: expensesLoading={expensesLoading},
          datasets={monthlyExpensesData.datasets?.length || 0},
          data={JSON.stringify(monthlyExpensesData)}
        </div>
      {/if}
    </div>
  </div>

  {#if loading}
    <div class="loading">{t('loading_recent', lang)}</div>
  {:else if error}
    <div class="error">Error: {error}</div>
  {:else if balance.recentSplits && balance.recentSplits.length > 0}
    <div class="recent-activity">
      <div class="recent-activity-header">
        <h2>{t('recent_activity', lang)}{#if categoryFilter} <span class="filter-label">— {categoryFilter.map((/** @type {any} */ c) => paymentCategoryName(c, lang)).join(', ')}</span>{/if}</h2>
        {#if categoryFilter}
          <button class="clear-filter" onclick={() => categoryFilter = null}>{t('clear_filter', lang)}</button>
        {/if}
      </div>
      {#if filteredSplits.length === 0}
        <p class="no-results">{t('no_recent_in', lang)} {categoryFilter ? categoryFilter.map((/** @type {any} */ c) => paymentCategoryName(c, lang)).join(', ') : ''}.</p>
      {/if}
      <div class="activity-dialog">
        {#each filteredSplits as split}
          {#if isSettlementPayment(split.paymentId)}
            <!-- Settlement Payment Display - User -> User Flow -->
            <a
              href={resolve('/[cospendRoot=cospendRoot]/payments/view/[id]', { cospendRoot: root, id: split.paymentId?._id })}
              class="settlement-flow-activity"
              onclick={(e) => handlePaymentClick(split.paymentId?._id, e)}
            >
              <div class="settlement-activity-content">
                <div class="settlement-user-flow">
                  <div class="settlement-payer">
                    <ProfilePicture username={split.paymentId?.paidBy || 'Unknown'} size={64} />
                    <span class="settlement-username">{split.paymentId?.paidBy || 'Unknown'}</span>
                  </div>
                  <div class="settlement-arrow-section">
                    <div class="settlement-amount-large">
                      {formatCurrency(Math.abs(split.amount), 'CHF', loc)}
                    </div>
                    <div class="settlement-flow-arrow">→</div>
                    <div class="settlement-date">{formatDate(split.paymentId?.date || split.paymentId?.createdAt)}</div>
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
                  href={resolve('/[cospendRoot=cospendRoot]/payments/view/[id]', { cospendRoot: root, id: split.paymentId?._id })}
                  class="activity-bubble"
                  onclick={(e) => handlePaymentClick(split.paymentId?._id, e)}
                >
                  <div class="activity-header">
                    <div class="user-info">
                      <div class="payment-title-row">
                        <span class="category-emoji">{getCategoryEmoji(split.paymentId?.category || 'groceries')}</span>
                        <strong class="payment-title">{split.paymentId?.title || t('payment', lang)}</strong>
                      </div>
                      <span class="username">{t('paid_by', lang)} {split.paymentId?.paidBy || 'Unknown'}</span>
                      <span class="category-name">{paymentCategoryName(split.paymentId?.category || 'groceries', lang)}</span>
                    </div>
                    <div class="activity-amount"
                         class:positive={split.amount < 0}
                         class:negative={split.amount > 0}>
                      {#if split.amount > 0}
                        -{formatCurrency(Math.abs(split.amount), 'CHF', loc)}
                      {:else if split.amount < 0}
                        +{formatCurrency(Math.abs(split.amount), 'CHF', loc)}
                      {:else}
                        {formatCurrency(split.amount, 'CHF', loc)}
                      {/if}
                    </div>
                  </div>
                  <div class="payment-details">
                    <div class="payment-meta">
                      <span class="payment-date">{formatDate(split.paymentId?.date || split.paymentId?.createdAt)}</span>
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

<AddButton href={resolve('/[cospendRoot=cospendRoot]/payments/add', { cospendRoot: root })} />

<style>
  .cospend-main {
    margin: 0 auto;
    padding: 2rem;
    max-width: 100%;
    overflow-x: hidden;
  }

  .loading, .error {
    text-align: center;
    padding: 2rem;
    font-size: 1.1rem;
  }

  .error {
    color: var(--red);
    background-color: var(--color-bg-secondary);
    border-radius: 0.5rem;
  }


  .positive {
    color: var(--green);
  }

  .negative {
    color: var(--red);
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
    padding: 1.5rem 0;
    max-width: 800px;
    margin-left: auto;
    margin-right: auto;
  }

  .recent-activity-header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .recent-activity h2 {
    margin: 0;
    color: var(--color-text-primary);
  }

  .filter-label {
    font-weight: 400;
    font-size: 1rem;
    color: var(--color-text-secondary);
  }

  .clear-filter {
    background: none;
    border: 1px solid var(--color-border);
    border-radius: 0.5rem;
    padding: 0.25rem 0.75rem;
    color: var(--color-text-secondary);
    cursor: pointer;
    font-size: 0.85rem;
    white-space: nowrap;
    transition: all 0.2s;
  }

  .clear-filter:hover {
    border-color: var(--color-primary);
    color: var(--color-primary);
  }

  .no-results {
    text-align: center;
    color: var(--color-text-secondary);
    font-style: italic;
    padding: 1rem 0;
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
    background: var(--color-bg-secondary);
    border-radius: 1rem;
    padding: 1rem;
    position: relative;
    border: none;
    text-decoration: none;
    color: inherit;
    display: block;
    transition: all 0.2s;
    flex: 1;
  }

  .activity-message.is-me .activity-bubble {
    background: var(--color-bg-tertiary);
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
    border-right-color: var(--color-bg-secondary);
  }

  .activity-message.is-me .activity-bubble::before {
    left: auto;
    right: -15px;
    border-left-color: var(--color-bg-tertiary);
    border-right-color: transparent;
  }


  /* Settlement Flow Activity Styles */
  .settlement-flow-activity {
    display: block;
    text-decoration: none;
    color: inherit;
    background: var(--color-bg-secondary);
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
    color: var(--color-text-secondary);
    text-align: center;
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
    color: var(--color-text-tertiary);
    font-size: 0.8rem;
    font-style: italic;
  }

  .payment-title {
    color: var(--color-text-primary);
    font-size: 1.1rem;
    font-weight: 600;
    margin: 0;
  }

  .username {
    color: var(--color-text-secondary);
    font-size: 0.9rem;
    font-weight: 500;
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

  .payment-date {
    color: var(--color-text-secondary);
    font-size: 0.9rem;
  }

  .payment-description {
    color: var(--color-text-tertiary);
    font-size: 0.9rem;
    font-style: italic;
    margin-top: 0.25rem;
    line-height: 1.3;
  }

  @media (max-width: 600px) {
    .cospend-main {
      padding: 0.75rem;
    }

    .dashboard-layout {
      gap: 0.75rem;
      margin-bottom: 1rem;
    }

    .recent-activity {
      padding: 0.75rem 0;
    }

    .actions {
      flex-direction: column;
      align-items: center;
      margin-bottom: 1rem;
    }

    .btn {
      width: 100%;
      max-width: 300px;
      text-align: center;
    }

    /* Mobile Settlement Flow - Keep Horizontal */
    .settlement-flow-activity {
      padding: 0.75rem;
      margin: 0 auto 0.75rem auto;
      max-width: none;
    }

    .settlement-user-flow {
      gap: 0.75rem;
      justify-content: space-between;
    }

    .settlement-payer, .settlement-receiver {
      gap: 0.5rem;
      flex: 0 0 auto;
      min-width: 0;
    }

    .settlement-payer :global(.profile-picture),
    .settlement-receiver :global(.profile-picture) {
      width: 40px !important;
      height: 40px !important;
    }

    .settlement-username {
      font-size: 0.8rem;
      line-height: 1.1;
      max-width: 60px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .settlement-arrow-section {
      gap: 0.25rem;
      flex: 1;
      min-width: 0;
    }

    .settlement-amount-large {
      font-size: 1.1rem;
    }

    .settlement-flow-arrow {
      font-size: 1.2rem;
    }

    .settlement-date {
      font-size: 0.75rem;
    }
  }

  .dashboard-layout {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin-bottom: 1.5rem;
    margin-left: auto;
    margin-right: auto;
  }

  @media (min-width: 768px) {
    .dashboard-layout {
      gap: 1.5rem;
      margin-bottom: 2rem;
    }
  }

  @media (min-width: 1200px) {
    .dashboard-layout {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 2rem;
      align-items: start;
      max-width: 1200px;
    }

    .balance-section {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }
  }

  .chart-section {
    min-height: 400px;
  }

  .chart-section .loading {
    background: var(--color-bg-secondary);
    border-radius: 0.75rem;
    padding: 2rem;
    text-align: center;
    color: var(--color-text-secondary);
  }
</style>
