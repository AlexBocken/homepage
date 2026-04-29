<script>
  import { resolve } from '$app/paths';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import ProfilePicture from './ProfilePicture.svelte';
  import EditButton from '$lib/components/EditButton.svelte';
  import { getCategoryEmoji } from '$lib/utils/categories';
  import { formatCurrency as formatCurrencyUtil } from '$lib/utils/formatters';
  import { detectCospendLang, cospendRoot, t, locale, splitDescription, paymentCategoryName } from '$lib/js/cospendI18n';
  import { confirm } from '$lib/js/confirmDialog.svelte';

  let { paymentId, onclose, onpaymentDeleted } = $props();

  // Get session from page store
  let session = $derived($page.data?.session);

  const lang = $derived(detectCospendLang($page.url.pathname));
  const root = $derived(cospendRoot(lang));
  const loc = $derived(locale(lang));

  /**
   * @typedef {{
   *   _id?: string,
   *   title: string,
   *   description?: string,
   *   amount: number,
   *   currency: string,
   *   originalAmount?: number,
   *   exchangeRate?: number,
   *   paidBy: string,
   *   date: string,
   *   image?: string,
   *   category: import('$lib/utils/categories').PaymentCategory,
   *   splitMethod: string,
   *   createdBy: string,
   *   splits?: Array<{ username: string, amount: number, settled: boolean }>,
   *   createdAt?: string,
   *   updatedAt?: string
   * }} PaymentData
   */

  /** @type {PaymentData | null} */
  let payment = $state(null);
  let loading = $state(true);
  /** @type {string | null} */
  let error = $state(null);
  /** @type {HTMLDivElement | undefined} */
  let modal = $state(undefined);

  onMount(() => {
    loadPayment();

    // Handle escape key to close modal
    /** @param {KeyboardEvent} event */
    function handleKeydown(event) {
      if (event.key === 'Escape') {
        closeModal();
      }
    }

    document.addEventListener('keydown', handleKeydown);

    return () => {
      document.removeEventListener('keydown', handleKeydown);
    };
  });

  async function loadPayment() {
    try {
      const response = await fetch(`/api/cospend/payments/${paymentId}`);
      if (!response.ok) {
        throw new Error('Failed to load payment');
      }
      const result = await response.json();
      payment = result.payment;
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
    } finally {
      loading = false;
    }
  }

  function closeModal() {
    // Use shallow routing to go back to dashboard without full navigation
    goto(`/${root}/dash`, { replaceState: true, noScroll: true, keepFocus: true });
    onclose?.();
  }

  /** @param {MouseEvent} event */
  function handleBackdropClick(event) {
    if (event.target === event.currentTarget) {
      closeModal();
    }
  }

  /** @param {number} amount */
  function formatCurrency(amount) {
    return formatCurrencyUtil(Math.abs(amount), 'CHF', loc);
  }

  /** @param {string} dateString */
  function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString(loc);
  }

  /** @param {PaymentData} payment */
  function getSplitDescription(payment) {
    return splitDescription(payment, lang);
  }

  let deleting = $state(false);

  async function deletePayment() {
    if (!await confirm(t('delete_payment_confirm', lang))) {
      return;
    }

    try {
      deleting = true;
      const response = await fetch(`/api/cospend/payments/${paymentId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete payment');
      }

      // Close modal and dispatch event to refresh data
      onpaymentDeleted?.(paymentId);
      closeModal();

    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
    } finally {
      deleting = false;
    }
  }
</script>

<div class="panel-content" bind:this={modal}>
  <div class="panel-header">
      <h2>{t('payment_details', lang)}</h2>
      <button class="close-button" onclick={closeModal} aria-label="Close modal">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </div>

  <div class="panel-body">
      {#if loading}
        <div class="loading">{t('loading_payments', lang)}</div>
      {:else if error}
        <div class="error">{t('error_prefix', lang)}: {error}</div>
      {:else if payment}
        <div class="payment-details">
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
                <img src={payment.image} alt={t('receipt', lang)} />
              </div>
            {/if}
          </div>

          <div class="payment-info">
            <div class="info-grid">
              <div class="info-item">
                <span class="label">{t('date', lang)}</span>
                <span class="value">{formatDate(payment.date)}</span>
              </div>
              <div class="info-item">
                <span class="label">{t('paid_by_label', lang)}</span>
                <span class="value">{payment.paidBy}</span>
              </div>
              <div class="info-item">
                <span class="label">{t('created_by', lang)}</span>
                <span class="value">{payment.createdBy}</span>
              </div>
              <div class="info-item">
                <span class="label">{t('category_label', lang)}</span>
                <span class="value">{paymentCategoryName(payment.category || 'groceries', lang)}</span>
              </div>
              <div class="info-item">
                <span class="label">{t('split_method_label', lang)}</span>
                <span class="value">{getSplitDescription(payment)}</span>
              </div>
            </div>

            {#if payment.description}
              <div class="description">
                <h3>{t('description', lang)}</h3>
                <p>{payment.description}</p>
              </div>
            {/if}
          </div>

          {#if payment.splits && payment.splits.length > 0}
            <div class="splits-section">
              <h3>{t('split_details', lang)}</h3>
              <div class="splits-list">
                {#each payment.splits as split}
                  <div class="split-item" class:current-user={split.username === session?.user?.nickname}>
                    <div class="split-user">
                      <ProfilePicture username={split.username} size={24} />
                      <div class="user-info">
                        <span class="username">{split.username}</span>
                        {#if split.username === session?.user?.nickname}
                          <span class="you-badge">{t('you', lang)}</span>
                        {/if}
                      </div>
                    </div>
                    <div class="split-amount" class:positive={split.amount < 0} class:negative={split.amount > 0}>
                      {#if split.amount > 0}
                        {t('owes', lang)} {formatCurrency(split.amount)}
                      {:else if split.amount < 0}
                        {t('owed', lang)} {formatCurrency(split.amount)}
                      {:else}
                        {t('even', lang)}
                      {/if}
                    </div>
                  </div>
                {/each}
              </div>
            </div>
          {/if}

          <div class="panel-actions">
            <button class="btn-secondary" onclick={closeModal}>{t('close', lang)}</button>
          </div>
        </div>
      {/if}
  </div>
</div>

{#if payment}
  <EditButton href={resolve('/[cospendRoot=cospendRoot]/payments/edit/[id]', { cospendRoot: root, id: paymentId })} />
{/if}

<style>
  .panel-content {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: var(--color-bg-secondary);
  }

  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem;
    background: var(--color-bg-tertiary);
    flex-shrink: 0;
  }

  .panel-header h2 {
    margin: 0;
    color: var(--color-text-primary);
    font-size: 1.25rem;
  }

  .close-button {
    background: none;
    border: none;
    cursor: pointer;
    padding: 0.5rem;
    border-radius: 0.25rem;
    color: var(--color-text-secondary);
    transition: all 0.2s;
  }

  .close-button:hover {
    background: var(--color-bg-elevated);
    color: var(--color-text-primary);
  }

  .panel-body {
    flex: 1;
    overflow-y: auto;
    padding: 0;
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

  .payment-details {
    display: flex;
    flex-direction: column;
  }

  .payment-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding: 1.5rem;
    background: var(--color-bg-tertiary);
  }

  .title-with-category {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 0.5rem;
  }

  .title-with-category .category-emoji {
    font-size: 1.8rem;
    flex-shrink: 0;
  }

  .title-section h1 {
    margin: 0;
    color: var(--color-text-primary);
    font-size: 1.5rem;
  }

  .payment-amount {
    font-size: 1.25rem;
    font-weight: bold;
    color: var(--blue);
  }

  .receipt-image {
    flex-shrink: 0;
    margin-left: 1rem;
  }

  .receipt-image img {
    max-width: 100px;
    max-height: 100px;
    object-fit: cover;
    border-radius: 0.5rem;
    border: 1px solid var(--color-border);
  }

  .payment-info {
    padding: 1.5rem;
  }

  .info-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
    margin-bottom: 1.5rem;
  }

  .info-item {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .label {
    font-weight: 600;
    color: var(--color-text-secondary);
    font-size: 0.85rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .value {
    color: var(--color-text-primary);
    font-size: 0.95rem;
  }

  .description {
    padding-top: 1.5rem;
  }

  .description h3 {
    margin: 0 0 0.75rem 0;
    color: var(--color-text-primary);
    font-size: 1rem;
  }

  .description p {
    margin: 0;
    color: var(--color-text-tertiary);
    line-height: 1.5;
    font-size: 0.95rem;
  }

  .splits-section {
    padding: 1.5rem;
  }

  .splits-section h3 {
    margin: 0 0 1rem 0;
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
    padding: 0.75rem;
    background: var(--color-bg-primary);
    border-radius: 0.5rem;
  }

  .split-item.current-user {
    background: var(--color-bg-tertiary);
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
    color: var(--color-text-primary);
    font-size: 0.95rem;
  }

  .you-badge {
    background-color: var(--blue);
    color: white;
    padding: 0.125rem 0.375rem;
    border-radius: 1rem;
    font-size: 0.7rem;
    font-weight: 500;
  }

  .split-amount {
    font-weight: 500;
    font-size: 0.9rem;
  }

  .split-amount.positive {
    color: var(--green);
  }

  .split-amount.negative {
    color: var(--red);
  }

  .panel-actions {
    padding: 1.5rem;
    background: var(--color-bg-tertiary);
    display: flex;
    gap: 1rem;
    justify-content: flex-end;
    flex-shrink: 0;
  }

  .btn-secondary {
    padding: 0.75rem 1.5rem;
    border-radius: 0.5rem;
    font-size: 1rem;
    cursor: pointer;
    transition: all 0.2s;
    text-decoration: none;
    display: inline-block;
    text-align: center;
    background-color: var(--color-bg-primary);
    color: var(--color-text-primary);
    border: 1px solid var(--color-border);
  }

  .btn-secondary:hover {
    background-color: var(--color-bg-elevated);
    transform: translateY(-1px);
  }

  @media (max-width: 768px) {
    .panel-content {
      height: 100vh;
    }

    .panel-header {
      padding: 1rem;
      position: sticky;
      top: 0;
      z-index: 10;
    }

    .panel-header h2 {
      font-size: 1.2rem;
    }

    .close-button {
      padding: 0.75rem;
    }
  }

  @media (max-width: 600px) {
    .panel-header h2 {
      font-size: 1.1rem;
    }

    .payment-header {
      flex-direction: column;
      gap: 1rem;
      text-align: center;
      padding: 1rem;
    }

    .payment-info {
      padding: 1rem;
    }

    .splits-section {
      padding: 1rem;
    }

    .panel-actions {
      padding: 1rem;
      flex-direction: column;
    }

    .receipt-image {
      margin-left: 0;
    }

    .info-grid {
      grid-template-columns: 1fr;
      gap: 0.75rem;
      margin-bottom: 1rem;
    }

    .info-item {
      gap: 0.125rem;
    }

    .label {
      font-size: 0.8rem;
    }

    .value {
      font-size: 0.9rem;
    }

    .description {
      padding-top: 1rem;
      margin-bottom: 0;
    }

    .description h3 {
      font-size: 0.95rem;
      margin-bottom: 0.5rem;
    }

    .description p {
      font-size: 0.9rem;
      line-height: 1.4;
    }

    .splits-section h3 {
      font-size: 0.95rem;
      margin-bottom: 0.75rem;
    }

    .splits-list {
      gap: 0.5rem;
    }

    .split-item {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.5rem;
      padding: 0.75rem;
    }

    .split-amount {
      font-size: 0.9rem;
    }
  }
</style>