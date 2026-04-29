<script>
  import { resolve } from '$app/paths';
  import { onMount } from 'svelte';
  import { goto, invalidateAll } from '$app/navigation';
  import { page } from '$app/state';
  import ProfilePicture from '$lib/components/cospend/ProfilePicture.svelte';
  import { getCategoryEmoji } from '$lib/utils/categories';
  import EditButton from '$lib/components/EditButton.svelte';
  import { detectCospendLang, cospendRoot, t, locale, splitDescription, paymentCategoryName } from '$lib/js/cospendI18n';


  import { formatCurrency } from '$lib/utils/formatters';

  let { data } = $props();

  const lang = $derived(detectCospendLang(page.url.pathname));
  const root = $derived(cospendRoot(lang));
  const loc = $derived(locale(lang));

  // Use server-side data with progressive enhancement
  /** @type {any | null} */
  let payment = $derived(data.payment || null);
  let loading = $state(false);
  /** @type {string | null} */
  let error = $state(null);

  // Progressive enhancement: refresh data if JavaScript is available
  onMount(async () => {
    // Mark that JavaScript is loaded
    document.body.classList.add('js-loaded');

    // Only refresh if we don't have server data
    if (!payment) {
      await invalidateAll();
    }
  });

  function formatAmountWithCurrency(/** @type {any} */ payment) {
    if (payment.currency === 'CHF' || !payment.originalAmount) {
      return formatCurrency(payment.amount, 'CHF', loc);
    }

    return `${formatCurrency(payment.originalAmount, payment.currency, loc)} ≈ ${formatCurrency(payment.amount, 'CHF', loc)}`;
  }

  function formatDate(/** @type {string} */ dateString) {
    return new Date(dateString).toLocaleDateString(loc);
  }

  function getSplitDescription(/** @type {any} */ payment) {
    return splitDescription(payment, lang);
  }

</script>

<svelte:head>
  <title>{payment ? payment.title : 'Payment'} - {t('cospend', lang)}</title>
</svelte:head>

<main class="payment-view">

  {#if loading}
    <div class="loading">{t('loading_payments', lang)}</div>
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
            {formatAmountWithCurrency(payment)}
            {#if payment.currency !== 'CHF' && payment.exchangeRate}
              <div class="exchange-rate-info">
                <small>{t('exchange_rate', lang)}: 1 {payment.currency} = {payment.exchangeRate.toFixed(4)} CHF</small>
              </div>
            {/if}
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
              <div class="split-item" class:current-user={split.username === data.session?.user?.nickname}>
                <div class="split-user">
                  <ProfilePicture username={split.username} size={24} />
                  <div class="user-info">
                    <span class="username">{split.username}</span>
                    {#if split.username === data.session?.user?.nickname}
                      <span class="you-badge">{t('you', lang)}</span>
                    {/if}
                  </div>
                </div>
                <div class="split-amount" class:positive={split.amount < 0} class:negative={split.amount > 0}>
                  {#if split.amount > 0}
                    {t('owes', lang)} {formatCurrency(split.amount, 'CHF', loc)}
                  {:else if split.amount < 0}
                    {t('owed', lang)} {formatCurrency(split.amount, 'CHF', loc)}
                  {:else}
                    {t('owes', lang)} {formatCurrency(split.amount, 'CHF', loc)}
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

{#if payment}
  <EditButton href={resolve('/[cospendRoot=cospendRoot]/payments/edit/[id]', { cospendRoot: root, id: data.paymentId ?? '' })} />
{/if}

<style>
  .payment-view {
    max-width: 800px;
    margin: 0 auto;
    padding: 2rem;
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

  .payment-card {
    background: var(--color-surface);
    border-radius: 0.75rem;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    overflow: hidden;
    border: 1px solid var(--color-border);
  }

  .payment-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding: 2rem;
    background: var(--color-bg-tertiary);
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
    color: var(--color-text-primary);
    font-size: 1.75rem;
  }

  .payment-amount {
    font-size: 1.5rem;
    font-weight: bold;
    color: var(--blue);
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
    border: 1px solid var(--color-border);
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
    color: var(--color-text-secondary);
    font-size: 0.9rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .value {
    color: var(--color-text-primary);
    font-size: 1rem;
  }

  .description {
    padding-top: 1.5rem;
  }

  .description h3 {
    margin: 0 0 0.75rem 0;
    color: var(--color-text-primary);
    font-size: 1.1rem;
  }

  .description p {
    margin: 0;
    color: var(--color-text-tertiary);
    line-height: 1.5;
  }

  .splits-section {
    padding: 2rem;
  }

  .splits-section h3 {
    margin: 0 0 1rem 0;
    color: var(--color-text-primary);
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
  }

  .you-badge {
    background-color: var(--blue);
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
    color: var(--green);
  }

  .split-amount.negative {
    color: var(--red);
  }

  .exchange-rate-info {
    margin-top: 0.5rem;
    color: var(--color-text-secondary);
    font-style: italic;
  }

  .exchange-rate-info small {
    font-size: 0.8rem;
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
