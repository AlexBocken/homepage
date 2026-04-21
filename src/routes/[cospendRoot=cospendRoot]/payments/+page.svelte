<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import ProfilePicture from '$lib/components/cospend/ProfilePicture.svelte';
  import { getCategoryEmoji } from '$lib/utils/categories';
  import { toast } from '$lib/js/toast.svelte';
  import { confirm } from '$lib/js/confirmDialog.svelte';
  import { isSettlementPayment, getSettlementIcon, getSettlementReceiver } from '$lib/utils/settlements';
  import AddButton from '$lib/components/AddButton.svelte';
  import { detectCospendLang, cospendRoot, t, locale, splitDescription, paymentCategoryName } from '$lib/js/cospendI18n';

  import { formatCurrency } from '$lib/utils/formatters';

  let { data } = $props();
  const lang = $derived(detectCospendLang($page.url.pathname));
  const root = $derived(cospendRoot(lang));
  const loc = $derived(locale(lang));

  // Use server-side data with progressive enhancement
  // svelte-ignore state_referenced_locally
  let payments = $state(data.payments || []);
  let loading = $state(false); // Start as false since we have server data
  /** @type {string | null} */
  let error = $state(null);
  // svelte-ignore state_referenced_locally
  let currentPage = $state(Math.floor(data.currentOffset / data.limit));
  // svelte-ignore state_referenced_locally
  let limit = $state(data.limit || 20);
  // svelte-ignore state_referenced_locally
  let hasMore = $state(data.hasMore || false);

  // Re-sync local state when server data changes (e.g. URL param navigation)
  $effect(() => {
    payments = data.payments || [];
    currentPage = Math.floor(data.currentOffset / data.limit);
    limit = data.limit || 20;
    hasMore = data.hasMore || false;
  });

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
      error = err instanceof Error ? err.message : String(err);
    } finally {
      loading = false;
    }
  }

  async function loadMore() {
    if (!loading && hasMore) {
      await loadPayments(currentPage + 1);
    }
  }

  async function deletePayment(/** @type {string} */ paymentId) {
    if (!await confirm(t('delete_payment_confirm', lang))) {
      return;
    }

    try {
      const response = await fetch(`/api/cospend/payments/${paymentId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete payment');
      }

      payments = payments.filter((/** @type {any} */ p) => p._id !== paymentId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  }


  function formatAmountWithCurrency(/** @type {any} */ payment) {
    if (payment.currency === 'CHF' || !payment.originalAmount) {
      return formatCurrency(payment.amount, 'CHF', loc);
    }

    return `${formatCurrency(payment.originalAmount, payment.currency, loc)} ≈ ${formatCurrency(payment.amount, 'CHF', loc)}`;
  }

  function formatDate(/** @type {string} */ dateString) {
    return new Date(dateString).toLocaleDateString(loc);
  }

  function getUserSplitAmount(/** @type {any} */ payment, /** @type {string} */ username) {
    const split = payment.splits?.find((/** @type {any} */ s) => s.username === username);
    return split ? split.amount : 0;
  }

  function getSplitDescription(/** @type {any} */ p) {
    return splitDescription(p, lang);
  }
</script>

<svelte:head>
  <title>{t('all_payments_title', lang)} - {t('cospend', lang)}</title>
</svelte:head>

<main class="payments-list">
  <div class="header">
    <div class="header-content">
      <h1 class="sr-only">{t('all_payments_title', lang)}</h1>
    </div>
  </div>

  {#if loading && payments.length === 0}
    <div class="loading">{t('loading_payments', lang)}</div>
  {:else if error}
    <div class="error">Error: {error}</div>
  {:else if payments.length === 0}
    <div class="empty-state">
      <div class="empty-content">
        <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>
        <h2>{t('no_payments_yet', lang)}</h2>
        <p>{t('start_first_expense', lang)}</p>
        <a href="/{root}/payments/add" class="btn btn-primary">{t('add_first_payment', lang)}</a>
      </div>
    </div>
  {:else}
    <div class="payments-grid">
      {#each payments as payment}
        {#if isSettlementPayment(payment)}
          <!-- Settlement Card - Distinct Layout -->
          <a href="/{root}/payments/view/{payment._id}" class="payment-card settlement-card">
            <div class="settlement-header">
              <div class="settlement-badge">
                <span class="settlement-icon">💸</span>
                <span class="settlement-label">{t('settlement', lang)}</span>
              </div>
              <span class="settlement-date">{formatDate(payment.date)}</span>
            </div>

            <div class="settlement-flow">
              <div class="settlement-user">
                <ProfilePicture username={payment.paidBy} size={48} />
                <span class="username">{payment.paidBy}</span>
              </div>

              <div class="settlement-arrow-container">
                <div class="settlement-amount-display">
                  {formatAmountWithCurrency(payment)}
                </div>
                <div class="settlement-arrow">→</div>
              </div>

              <div class="settlement-user">
                <ProfilePicture username={getSettlementReceiver(payment)} size={48} />
                <span class="username">{getSettlementReceiver(payment)}</span>
              </div>
            </div>

            {#if payment.description}
              <p class="settlement-description">{payment.description}</p>
            {/if}
          </a>
        {:else}
          <!-- Regular Payment Card -->
          <a href="/{root}/payments/view/{payment._id}" class="payment-card">
            <div class="payment-header">
              <div class="payment-title-section">
                <ProfilePicture username={payment.paidBy} size={40} />
                <div class="payment-title">
                  <div class="title-with-category">
                    <span class="category-emoji">{getCategoryEmoji(payment.category || 'groceries')}</span>
                    <h3>{payment.title}</h3>
                  </div>
                  <div class="payment-meta">
                    <span class="category-name">{paymentCategoryName(payment.category || 'groceries', lang)}</span>
                    <span class="date">{formatDate(payment.date)}</span>
                    <span class="amount">{formatAmountWithCurrency(payment)}</span>
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
                <span class="label">{t('paid_by_label', lang)}</span>
                <span class="value">{payment.paidBy}</span>
              </div>
              <div class="detail-row">
                <span class="label">{t('split_method_label', lang)}</span>
                <span class="value">{getSplitDescription(payment)}</span>
              </div>
            </div>

            {#if payment.splits && payment.splits.length > 0}
              <div class="splits-summary">
                <h4>{t('split_details', lang)}</h4>
                <div class="splits-list">
                  {#each payment.splits as split}
                    <div class="split-item">
                      <span class="split-user">{split.username}</span>
                      <span class="split-amount" class:positive={split.amount < 0} class:negative={split.amount > 0}>
                        {#if split.amount > 0}
                          {t('owes', lang)} {formatCurrency(split.amount, 'CHF', loc)}
                        {:else if split.amount < 0}
                          {t('owed', lang)} {formatCurrency(Math.abs(split.amount), 'CHF', loc)}
                        {:else}
                          {t('owes', lang)} {formatCurrency(split.amount, 'CHF', loc)}
                        {/if}
                      </span>
                    </div>
                  {/each}
                </div>
              </div>
            {/if}
          </a>
        {/if}
      {/each}
    </div>

    <!-- Pagination that works without JavaScript -->
    <div class="pagination">
      {#if data.currentOffset > 0}
        <a href="?offset={Math.max(0, data.currentOffset - data.limit)}&limit={data.limit}"
           class="btn btn-secondary">
          {t('previous', lang)}
        </a>
      {/if}

      {#if hasMore}
        <a href="?offset={data.currentOffset + data.limit}&limit={data.limit}"
           class="btn btn-secondary">
          {t('next', lang)}
        </a>
      {/if}

      <!-- Progressive enhancement: JavaScript load more button -->
      {#if hasMore}
        <button class="btn btn-secondary js-only" onclick={loadMore} disabled={loading}
                style="display: none;">
          {loading ? t('loading_ellipsis', lang) : t('load_more', lang)}
        </button>
      {/if}
    </div>
  {/if}
</main>

<AddButton href="/{root}/payments/add" />

<style>
  .payments-list {
    max-width: 1200px;
    margin: 0 auto;
    padding: 1rem;
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
    background-color: var(--color-bg-tertiary);
    color: var(--color-text-primary);
    border: 1px solid var(--color-border);
  }

  .btn-secondary:hover {
    background-color: var(--color-bg-elevated);
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
    border: 1px solid var(--red);
  }

  .empty-state {
    text-align: center;
    padding: 4rem 2rem;
  }

  .empty-content svg {
    color: var(--color-text-secondary);
    margin-bottom: 1rem;
  }

  .empty-content h2 {
    margin: 0 0 0.5rem 0;
    color: var(--color-text-primary);
  }

  .empty-content p {
    margin: 0 0 2rem 0;
    color: var(--color-text-secondary);
  }

  .payments-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 1rem;
    margin-bottom: 1.5rem;
  }

  .payment-card {
    display: block;
    background: var(--color-surface);
    border-radius: 0.75rem;
    padding: 1.5rem;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    transition: all 0.2s;
    text-decoration: none;
    color: inherit;
    border: 1px solid var(--color-border);
  }

  .payment-card:hover {
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
    text-decoration: none;
    color: inherit;
    transform: translateY(-1px);
  }

  /* Settlement Card Styles */
  .settlement-card {
    background: linear-gradient(135deg, #e8f5e9, #f1f8e9);
    border: 2px solid var(--green);
    position: relative;
    overflow: hidden;
  }

  .settlement-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(90deg, var(--green), var(--lightblue));
  }

  .settlement-card:hover {
    box-shadow: 0 6px 20px rgba(163, 190, 140, 0.4);
    border-color: var(--lightblue);
  }

  @media (prefers-color-scheme: dark) {
    :global(:root:not([data-theme="light"])) .settlement-card {
      background: linear-gradient(135deg, #1a2e1a, #1e2b1e);
    }
  }
  :global(:root[data-theme="dark"]) .settlement-card {
    background: linear-gradient(135deg, #1a2e1a, #1e2b1e);
  }

  .settlement-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
  }

  .settlement-badge {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: linear-gradient(135deg, var(--green), var(--lightblue));
    color: white;
    padding: 0.5rem 1rem;
    border-radius: 2rem;
    font-weight: 600;
    font-size: 0.9rem;
    box-shadow: 0 2px 8px rgba(163, 190, 140, 0.3);
  }

  .settlement-icon {
    font-size: 1.2rem;
  }

  .settlement-date {
    color: var(--color-text-secondary);
    font-size: 0.9rem;
    font-weight: 500;
  }

  .settlement-flow {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .settlement-user {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    flex: 1;
    min-width: 0;
  }

  .settlement-user .username {
    font-weight: 600;
    color: var(--green);
    font-size: 0.95rem;
    text-align: center;
    word-break: break-word;
  }

  .settlement-arrow-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    flex-shrink: 0;
  }

  .settlement-amount-display {
    font-size: 1.3rem;
    font-weight: 700;
    color: var(--green);
    white-space: nowrap;
    text-align: center;
  }

  .settlement-arrow {
    color: var(--green);
    font-size: 2rem;
    font-weight: bold;
    line-height: 1;
  }

  .settlement-description {
    color: var(--color-text-tertiary);
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid var(--color-border);
    font-style: italic;
    font-size: 0.9rem;
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
    color: var(--color-text-primary);
    font-size: 1.25rem;
  }

  .payment-meta {
    display: flex;
    gap: 1rem;
    font-size: 0.9rem;
    color: var(--color-text-secondary);
    flex-wrap: wrap;
  }

  .payment-meta .category-name {
    color: var(--color-text-secondary);
    font-style: italic;
    font-size: 0.8rem;
  }

  .payment-meta .amount {
    font-weight: 600;
    color: var(--blue);
  }

  .receipt-thumb {
    width: 60px;
    height: 60px;
    object-fit: cover;
    border-radius: 0.5rem;
    border: 1px solid var(--color-border);
  }

  .payment-description {
    color: var(--color-text-tertiary);
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
    color: var(--color-text-secondary);
    font-weight: 500;
  }

  .detail-row .value {
    color: var(--color-text-primary);
  }

  .splits-summary {
    border-top: 1px solid var(--color-border);
    padding-top: 1rem;
    margin-bottom: 1rem;
  }

  .splits-summary h4 {
    margin: 0 0 0.75rem 0;
    color: var(--color-text-primary);
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
    color: var(--color-text-tertiary);
  }

  .split-amount.positive {
    color: var(--green);
    font-weight: 500;
  }

  .split-amount.negative {
    color: var(--red);
    font-weight: 500;
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

  @media (max-width: 768px) {
    .payments-list {
      padding: 0.75rem;
      max-width: none;
    }

    .payments-grid {
      grid-template-columns: 1fr;
      gap: 0.75rem;
      margin-bottom: 1rem;
    }

    .payment-card {
      padding: 1rem;
    }

    .payment-header {
      margin-bottom: 0.75rem;
    }

    .payment-meta {
      gap: 0.5rem;
      font-size: 0.85rem;
    }

    .title-with-category .category-emoji {
      font-size: 1.1rem;
    }

    .payment-title h3 {
      font-size: 1.1rem;
    }
  }

  @media (max-width: 480px) {
    .payments-list {
      padding: 0.5rem;
    }

    .payments-grid {
      gap: 0.5rem;
    }

    .payment-card {
      padding: 0.75rem;
    }

    /* Make settlement more compact on small screens */
    .settlement-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.5rem;
      margin-bottom: 1rem;
    }

    .settlement-badge {
      padding: 0.4rem 0.75rem;
      font-size: 0.8rem;
    }

    .settlement-icon {
      font-size: 1rem;
    }

    .settlement-date {
      font-size: 0.8rem;
    }

    .settlement-flow {
      flex-direction: column;
      gap: 1rem;
    }

    .settlement-user {
      width: 100%;
    }

    .settlement-user .username {
      font-size: 0.85rem;
    }

    .settlement-arrow-container {
      transform: rotate(90deg);
      gap: 0.75rem;
    }

    .settlement-amount-display {
      font-size: 1.1rem;
      transform: rotate(-90deg);
    }

    .settlement-arrow {
      font-size: 1.5rem;
      transform: rotate(-90deg);
    }
  }

  /* Very small screens - simplify further */
  @media (max-width: 360px) {
    .settlement-amount-display {
      font-size: 1rem;
    }

    .settlement-user .username {
      font-size: 0.75rem;
    }
  }
</style>
