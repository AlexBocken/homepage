<script>
  /**
   * Read-only body of a payment: title and amount, the info grid, the
   * description, the per-user split list and the receipt. Shared by the full
   * payment page and the dashboard's side panel (PaymentModal), which differ in:
   *
   * - `compact`: the panel's smaller type and padding (and its wrapper class);
   * - `showOriginalCurrency`: "EUR 10.00 ≈ CHF 9.50" plus the stored rate,
   *   instead of CHF only;
   * - `absoluteAmounts`: amounts without a sign (the "owes"/"owed" word
   *   carries it);
   * - `zeroLabel`: what a zero split says (default: "owes CHF 0.00").
   *
   * Anything after the receipt (the panel's close button) goes in `children`.
   */
  import ProfilePicture from '$lib/components/cospend/ProfilePicture.svelte';
  import ReceiptOverlay from '$lib/components/cospend/ReceiptOverlay.svelte';
  import { receiptUrl } from '$lib/utils/cospendImage';
  import { getCategoryEmoji } from '$lib/utils/categories';
  import { formatCurrency } from '$lib/utils/formatters';
  import { locale, splitDescription, paymentCategoryName, m } from '$lib/js/cospendI18n';

  /**
   * @typedef {Object} Props
   * @property {any} payment
   * @property {import('$lib/js/cospendI18n').CospendLang} lang
   * @property {string | undefined} currentUser gets the "you" badge
   * @property {boolean} [compact]
   * @property {boolean} [showOriginalCurrency]
   * @property {boolean} [absoluteAmounts]
   * @property {string} [zeroLabel]
   * @property {() => void} onviewreceipt the plain receipt image was clicked
   * @property {import('svelte').Snippet} [children]
   */

  /** @type {Props} */
  let {
    payment,
    lang,
    currentUser,
    compact = false,
    showOriginalCurrency = false,
    absoluteAmounts = false,
    zeroLabel,
    onviewreceipt,
    children
  } = $props();

  const t = $derived(m[lang]);
  const loc = $derived(locale(lang));

  /** @param {number} amount */
  function chf(amount) {
    return formatCurrency(absoluteAmounts ? Math.abs(amount) : amount, 'CHF', loc);
  }

  const amountText = $derived(
    !showOriginalCurrency || payment.currency === 'CHF' || !payment.originalAmount
      ? chf(payment.amount)
      : `${formatCurrency(payment.originalAmount, payment.currency, loc)} ≈ ${chf(payment.amount)}`
  );

  /** @param {string} dateString */
  function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString(loc);
  }
</script>

<div class={compact ? 'payment-details' : 'payment-card'}>
  <div class="payment-header">
    <div class="title-section">
      <div class="title-with-category">
        <span class="category-emoji">{getCategoryEmoji(payment.category || 'groceries')}</span>
        <h1>{payment.title}</h1>
      </div>
      <div class="payment-amount">
        {amountText}
        {#if showOriginalCurrency && payment.currency !== 'CHF' && payment.exchangeRate}
          <div class="exchange-rate-info">
            <small>{t.exchange_rate}: 1 {payment.currency} = {payment.exchangeRate.toFixed(4)} CHF</small>
          </div>
        {/if}
      </div>
    </div>
  </div>

  <div class="payment-info">
    <div class="info-grid">
      <div class="info-item">
        <span class="label">{t.date}</span>
        <span class="value">{formatDate(payment.date)}</span>
      </div>
      <div class="info-item">
        <span class="label">{t.paid_by_label}</span>
        <span class="value">{payment.paidBy}</span>
      </div>
      <div class="info-item">
        <span class="label">{t.created_by}</span>
        <span class="value">{payment.createdBy}</span>
      </div>
      <div class="info-item">
        <span class="label">{t.category_label}</span>
        <span class="value">{paymentCategoryName(payment.category || 'groceries', lang)}</span>
      </div>
      <div class="info-item">
        <span class="label">{t.split_method_label}</span>
        <span class="value">{splitDescription(payment, lang)}</span>
      </div>
    </div>

    {#if payment.description}
      <div class="description">
        <h3>{t.description}</h3>
        <p>{payment.description}</p>
      </div>
    {/if}
  </div>

  {#if payment.splits && payment.splits.length > 0}
    <div class="splits-section">
      <h3>{t.split_details}</h3>
      <div class="splits-list">
        {#each payment.splits as split (split.username)}
          <div class="split-item" class:current-user={split.username === currentUser}>
            <div class="split-user">
              <ProfilePicture username={split.username} size={24} />
              <div class="user-info">
                <span class="username">{split.username}</span>
                {#if split.username === currentUser}
                  <span class="you-badge">{t.you}</span>
                {/if}
              </div>
            </div>
            <div class="split-amount" class:positive={split.amount < 0} class:negative={split.amount > 0}>
              {#if split.amount > 0}
                {t.owes} {chf(split.amount)}
              {:else if split.amount < 0}
                {t.owed} {chf(split.amount)}
              {:else if zeroLabel !== undefined}
                {zeroLabel}
              {:else}
                {t.owes} {chf(split.amount)}
              {/if}
            </div>
          </div>
        {/each}
      </div>
    </div>
  {/if}

  {#if payment.receiptScan && payment.image && (payment.receiptScan.totalBox || (payment.receiptScan.items && payment.receiptScan.items.length > 0))}
    <div class="splits-section receipt-breakdown">
      <h3>{t.receipt}</h3>
      <ReceiptOverlay src={receiptUrl(payment.image)} annotations={payment.receiptScan} alt={t.receipt} />
    </div>
  {:else if payment.image}
    <div class="splits-section receipt-breakdown">
      <h3>{t.receipt}</h3>
      <button type="button" class="receipt-image-full" onclick={onviewreceipt} aria-label={t.view_receipt}>
        <img src={receiptUrl(payment.image)} alt={t.receipt} />
      </button>
    </div>
  {/if}

  {@render children?.()}
</div>

<style>
  /* Full page (default) */
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

  .exchange-rate-info {
    margin-top: 0.5rem;
    color: var(--color-text-secondary);
    font-style: italic;
  }

  .exchange-rate-info small {
    font-size: 0.8rem;
  }

  .receipt-image-full {
    display: block;
    width: 100%;
    padding: 0;
    border: none;
    background: none;
    cursor: zoom-in;
    line-height: 0;
  }

  .receipt-image-full img {
    max-width: 100%;
    max-height: 70vh;
    border-radius: var(--radius-md);
    border: 1px solid var(--color-border);
    transition: filter var(--transition-normal);
  }

  .receipt-image-full:hover img,
  .receipt-image-full:focus-visible img {
    filter: brightness(0.95);
  }

  .receipt-image-full:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
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

  /* Side panel (compact) */
  .payment-details {
    display: flex;
    flex-direction: column;
  }

  .payment-details .payment-header { padding: 1.5rem; }
  .payment-details .title-with-category .category-emoji { font-size: 1.8rem; }
  .payment-details .title-section h1 { font-size: 1.5rem; }
  .payment-details .payment-amount { font-size: 1.25rem; }
  .payment-details .payment-info { padding: 1.5rem; }

  .payment-details .info-grid {
    grid-template-columns: 1fr 1fr;
    margin-bottom: 1.5rem;
  }

  .payment-details .label { font-size: 0.85rem; }
  .payment-details .value { font-size: 0.95rem; }
  .payment-details .description h3 { font-size: 1rem; }
  .payment-details .description p { font-size: 0.95rem; }
  .payment-details .splits-section { padding: 1.5rem; }
  .payment-details .splits-section h3 { font-size: 1rem; }
  .payment-details .splits-list { gap: 0.5rem; }
  .payment-details .split-item { padding: 0.75rem; }
  .payment-details .username { font-size: 0.95rem; }

  .payment-details .you-badge {
    padding: 0.125rem 0.375rem;
    font-size: 0.7rem;
  }

  .payment-details .split-amount { font-size: 0.9rem; }

  @media (max-width: 600px) {
    .payment-header {
      flex-direction: column;
      gap: 1rem;
      text-align: center;
    }

    .info-grid {
      grid-template-columns: 1fr;
    }

    .split-item {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.5rem;
    }

    .payment-details .payment-header { padding: 1rem; }
    .payment-details .payment-info { padding: 1rem; }
    .payment-details .splits-section { padding: 1rem; }

    .payment-details .info-grid {
      grid-template-columns: 1fr;
      gap: 0.75rem;
      margin-bottom: 1rem;
    }

    .payment-details .info-item { gap: 0.125rem; }
    .payment-details .label { font-size: 0.8rem; }
    .payment-details .value { font-size: 0.9rem; }

    .payment-details .description {
      padding-top: 1rem;
      margin-bottom: 0;
    }

    .payment-details .description h3 {
      font-size: 0.95rem;
      margin-bottom: 0.5rem;
    }

    .payment-details .description p {
      font-size: 0.9rem;
      line-height: 1.4;
    }

    .payment-details .splits-section h3 {
      font-size: 0.95rem;
      margin-bottom: 0.75rem;
    }

    .payment-details .split-item { padding: 0.75rem; }
    .payment-details .split-amount { font-size: 0.9rem; }
  }
</style>
