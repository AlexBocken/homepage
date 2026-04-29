<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { detectCospendLang, cospendRoot, locale, t, getCategoryOptionsI18n } from '$lib/js/cospendI18n';
  import { confirm } from '$lib/js/confirmDialog.svelte';
  import FormSection from '$lib/components/FormSection.svelte';
  import ImageUpload from '$lib/components/ImageUpload.svelte';
  import SaveFab from '$lib/components/SaveFab.svelte';
  import DatePicker from '$lib/components/DatePicker.svelte';

  /**
   * @typedef {import('$models/Payment').IPayment & {splits?: import('$models/PaymentSplit').IPaymentSplit[]}} PaymentWithSplits
   */

  let { data } = $props();

  const lang = $derived(detectCospendLang(page.url.pathname));
  const root = $derived(cospendRoot(lang));
  const loc = $derived(locale(lang));

  /** @type {PaymentWithSplits | null} */
  let payment = $state(null);
  let loading = $state(true);
  let saving = $state(false);
  let uploading = $state(false);
  /** @type {string | null} */
  let error = $state(null);
  /** @type {File | null} */
  let imageFile = $state(null);
  let imagePreview = $state('');
  let supportedCurrencies = $state(['CHF']);
  let loadingCurrencies = $state(false);
  /** @type {number | null} */
  let currentExchangeRate = $state(null);
  /** @type {number | null} */
  let convertedAmount = $state(null);
  let loadingExchangeRate = $state(false);
  /** @type {string | null} */
  let exchangeRateError = $state(null);
  /** @type {ReturnType<typeof setTimeout> | undefined} */
  let exchangeRateTimeout;
  let jsEnhanced = $state(false);
  /** @type {number | null} */
  let originalAmount = $state(null);
  let paymentDateStr = $state('');

  let categoryOptions = $derived(getCategoryOptionsI18n(lang));

  // Recalculate splits when amount changes
  function recalculateSplits() {
    try {
      if (!payment || !payment.splits || payment.splits.length === 0) return;

      // For foreign currency, use converted amount if available, otherwise use CHF amount
      /** @type {number} */
      let amountNum;
      if (payment.currency !== 'CHF' && payment.originalAmount && convertedAmount) {
        amountNum = convertedAmount;
      } else {
        amountNum = typeof payment.amount === 'string' ? parseFloat(payment.amount) : payment.amount;
      }

      if (isNaN(amountNum) || amountNum <= 0) return;

      const paidBy = payment.paidBy;
      const users = payment.splits.map(s => s.username);

      if (payment.splitMethod === 'equal') {
        // Equal split
        const splitAmount = amountNum / users.length;
        payment.splits = payment.splits.map(split => ({
          ...split,
          amount: split.username === paidBy ? splitAmount - amountNum : splitAmount
        }));
      } else if (payment.splitMethod === 'full') {
        // Paid in full
        const otherUsers = users.filter(u => u !== paidBy);
        const amountPerOtherUser = otherUsers.length > 0 ? amountNum / otherUsers.length : 0;
        payment.splits = payment.splits.map(split => ({
          ...split,
          amount: split.username === paidBy ? -amountNum : amountPerOtherUser
        }));
      } else if (payment.splitMethod === 'personal_equal') {
        // Personal + equal split
        const totalPersonal = payment.splits.reduce((sum, split) => {
          return sum + (split.personalAmount || 0);
        }, 0);
        const remainder = Math.max(0, amountNum - totalPersonal);
        const equalShare = remainder / users.length;

        payment.splits = payment.splits.map(split => {
          const personalAmount = split.personalAmount || 0;
          const totalOwed = personalAmount + equalShare;
          return {
            ...split,
            amount: split.username === paidBy ? totalOwed - amountNum : totalOwed
          };
        });
      } else if (payment.splitMethod === 'proportional') {
        // Proportional - recalculate based on stored proportions
        payment.splits = payment.splits.map(split => {
          const proportion = split.proportion || 0;
          const splitAmount = amountNum * proportion;
          return {
            ...split,
            amount: split.username === paidBy ? splitAmount - amountNum : splitAmount
          };
        });
      }
    } catch (err) {
      console.error('Error recalculating splits:', err);
    }
  }

  // Watch for amount changes and recalculate splits
  /** @type {number | string | null} */
  let lastCalculatedAmount = $state(null);
  /** @type {string | null} */
  let lastPersonalAmounts = $state(null);

  $effect(() => {
    if (!jsEnhanced || !payment || !payment.splits || payment.splits.length === 0) {
      return;
    }

    const currentAmount = payment.currency !== 'CHF' && payment.originalAmount && convertedAmount
      ? convertedAmount
      : payment.amount;

    // For personal_equal, also track personal amounts
    let personalAmountsChanged = false;
    if (payment.splitMethod === 'personal_equal') {
      const currentPersonalAmounts = payment.splits.map(s => s.personalAmount || 0).join(',');
      if (lastPersonalAmounts !== currentPersonalAmounts) {
        personalAmountsChanged = true;
        lastPersonalAmounts = currentPersonalAmounts;
      }
    }

    // Recalculate if amount changed or personal amounts changed
    if ((currentAmount !== lastCalculatedAmount && currentAmount > 0) || personalAmountsChanged) {
      lastCalculatedAmount = currentAmount;
      recalculateSplits();
    }
  });

  onMount(async () => {
    jsEnhanced = true;
    document.body.classList.add('js-loaded');
    await loadPayment();
    await loadSupportedCurrencies();
  });

  async function loadPayment() {
    try {
      const response = await fetch(`/api/cospend/payments/${data.paymentId}`);
      if (!response.ok) {
        throw new Error('Failed to load payment');
      }
      const result = await response.json();
      /** @type {PaymentWithSplits} */
      const loaded = result.payment;
      payment = loaded;

      // Initialize personal amounts if undefined (for personal_equal split method)
      if (loaded.splitMethod === 'personal_equal' && loaded.splits) {
        loaded.splits = loaded.splits.map(split => ({
          ...split,
          personalAmount: split.personalAmount || 0
        }));
      }

      paymentDateStr = formatDateForInput(loaded.date);
      // Store original amount for comparison to prevent infinite recalculation
      originalAmount = loaded.amount;
      // Set initial lastCalculatedAmount to prevent immediate recalculation on load
      lastCalculatedAmount = loaded.amount;
      // Store initial personal amounts to prevent immediate recalculation
      if (loaded.splitMethod === 'personal_equal' && loaded.splits) {
        lastPersonalAmounts = loaded.splits.map(s => s.personalAmount || 0).join(',');
      }
    } catch (err) {
      console.error('Error loading payment:', err);
      error = err instanceof Error ? err.message : String(err);
    } finally {
      loading = false;
    }
  }

  function handleImageSelected(/** @type {CustomEvent} */ event) {
    imageFile = event.detail;
    handleImageUpload();
  }

  function handleImageError(/** @type {CustomEvent} */ event) {
    error = event.detail;
  }

  function handleImageRemoved() {
    imageFile = null;
    imagePreview = '';
  }

  function handleCurrentImageRemoved() {
    if (payment) payment.image = undefined;
  }

  async function handleImageUpload() {
    if (!imageFile) return;

    uploading = true;
    try {
      const formData = new FormData();
      formData.append('image', imageFile);

      const response = await fetch('/api/cospend/upload', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to upload image');
      }

      const result = await response.json();
      if (payment) payment.image = result.imageUrl;
      imageFile = null;
      imagePreview = '';
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
    } finally {
      uploading = false;
    }
  }

  async function handleSubmit() {
    if (!payment) return;

    saving = true;
    error = null;

    try {
      const response = await fetch(`/api/cospend/payments/${data.paymentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payment)
      });

      if (!response.ok) {
        throw new Error('Failed to update payment');
      }

      await goto(`/${root}/payments`);
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
    } finally {
      saving = false;
    }
  }

  function formatDate(/** @type {string} */ dateString) {
    return new Date(dateString).toISOString().split('T')[0];
  }

  let deleting = $state(false);

  async function deletePayment() {
    if (!await confirm('Are you sure you want to delete this payment? This action cannot be undone.')) {
      return;
    }

    try {
      deleting = true;
      const response = await fetch(`/api/cospend/payments/${data.paymentId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete payment');
      }

      // Redirect to payments list after successful deletion
      goto(`/${root}/payments`);
      
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
    } finally {
      deleting = false;
    }
  }

  async function loadSupportedCurrencies() {
    try {
      loadingCurrencies = true;
      const response = await fetch('/api/cospend/exchange-rates?action=currencies');
      if (response.ok) {
        const result = await response.json();
        supportedCurrencies = ['CHF', ...result.currencies.filter(/** @type {(c: string) => boolean} */ (c) => c !== 'CHF')];
      }
    } catch (e) {
      console.warn('Could not load supported currencies:', e);
    } finally {
      loadingCurrencies = false;
    }
  }

  async function fetchExchangeRate() {
    if (!payment || payment.currency === 'CHF' || !payment.currency || !payment.date) {
      currentExchangeRate = null;
      convertedAmount = null;
      exchangeRateError = null;
      return;
    }

    if (!payment.originalAmount || payment.originalAmount <= 0) {
      convertedAmount = null;
      return;
    }

    try {
      loadingExchangeRate = true;
      exchangeRateError = null;

      const dateStr = new Date(payment.date).toISOString().split('T')[0];
      const url = `/api/cospend/exchange-rates?from=${payment.currency}&date=${dateStr}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Failed to fetch exchange rate');
      }

      const result = await response.json();
      currentExchangeRate = result.rate;
      convertedAmount = payment.originalAmount * result.rate;
    } catch (e) {
      console.warn('Could not fetch exchange rate:', e);
      exchangeRateError = e instanceof Error ? e.message : String(e);
      currentExchangeRate = null;
      convertedAmount = null;
    } finally {
      loadingExchangeRate = false;
    }
  }

  // Sync date picker string back to payment object
  $effect(() => {
    if (payment && paymentDateStr) {
      payment.date = /** @type {Date} */ (new Date(paymentDateStr + 'T12:00:00'));
    }
  });

  // Reactive statement for exchange rate fetching
  $effect(() => {
    if (jsEnhanced && payment && payment.currency && payment.currency !== 'CHF' && payment.date && payment.originalAmount) {
      clearTimeout(exchangeRateTimeout);
      exchangeRateTimeout = setTimeout(fetchExchangeRate, 300);
    }
  });

  function formatDateForInput(/** @type {string | Date} */ dateString) {
    if (!dateString) return '';
    return new Date(dateString).toISOString().split('T')[0];
  }
</script>

<svelte:head>
  <title>{t('edit_payment_title', lang)} - {t('cospend', lang)}</title>
</svelte:head>

<main class="edit-payment">
  <div class="header">
    <h1 class="sr-only">{t('edit_payment_title', lang)}</h1>
    <p>{t('edit_payment_subtitle', lang)}</p>
  </div>

  {#if loading}
    <div class="loading">{t('loading_payments', lang)}</div>
  {:else if error}
    <div class="error">Error: {error}</div>
  {:else if payment}
    <form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }
  } class="payment-form">
      <FormSection title={t('payment_details', lang)}>
        <div class="form-group">
          <label for="title">{t('title_label', lang)}</label>
          <input 
            type="text" 
            id="title" 
            bind:value={payment.title} 
            required 
          />
        </div>

        <div class="form-group">
          <label for="description">{t('description_label', lang)}</label>
          <textarea 
            id="description" 
            bind:value={payment.description} 
            rows="3"
          ></textarea>
        </div>

        <div class="form-group">
          <label for="category">{t('category_star', lang)}</label>
          <select id="category" bind:value={payment.category} required>
            {#each categoryOptions as option}
              <option value={option.value}>{option.label}</option>
            {/each}
          </select>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="amount">{t('amount_label', lang)}</label>
            <div class="amount-currency">
              {#if payment.originalAmount && payment.currency !== 'CHF'}
                <!-- Show original amount for foreign currency -->
                <input 
                  type="number" 
                  id="originalAmount" 
                  bind:value={payment.originalAmount} 
                  required 
                  min="0" 
                  step="0.01"
                />
                <select id="currency" bind:value={payment.currency} disabled={loadingCurrencies}>
                  {#each supportedCurrencies as currency}
                    <option value={currency}>{currency}</option>
                  {/each}
                </select>
              {:else}
                <!-- Show CHF amount for CHF payments -->
                <input 
                  type="number" 
                  id="amount" 
                  bind:value={payment.amount} 
                  required 
                  min="0" 
                  step="0.01"
                />
                <select id="currency" bind:value={payment.currency} disabled={loadingCurrencies}>
                  {#each supportedCurrencies as currency}
                    <option value={currency}>{currency}</option>
                  {/each}
                </select>
              {/if}
            </div>
            
            {#if payment.currency !== 'CHF' && payment.originalAmount}
              <div class="conversion-info">
                <small class="help-text">Original amount in {payment.currency}, converted to CHF at payment date</small>
                
                {#if loadingExchangeRate}
                  <div class="conversion-preview loading">
                    <small>🔄 Fetching current exchange rate...</small>
                  </div>
                {:else if exchangeRateError}
                  <div class="conversion-preview error">
                    <small>⚠️ {exchangeRateError}</small>
                  </div>
                {:else if convertedAmount !== null && currentExchangeRate !== null}
                  <div class="conversion-preview success">
                    <small>
                      {payment.currency} {payment.originalAmount.toFixed(2)} ≈ CHF {convertedAmount.toFixed(2)}
                      <br>
                      (Current rate: 1 {payment.currency} = {currentExchangeRate.toFixed(4)} CHF)
                      <br>
                      <strong>Stored: CHF {payment.amount.toFixed(2)} (Rate: {payment.exchangeRate ? payment.exchangeRate.toFixed(4) : 'N/A'})</strong>
                    </small>
                  </div>
                {/if}
              </div>
            {/if}
          </div>

          <div class="form-group">
            <label for="date">{t('date', lang)}</label>
            <DatePicker bind:value={paymentDateStr} {lang} />
          </div>
        </div>

        <div class="form-group">
          <label for="paidBy">{t('paid_by_form', lang)}</label>
          <input 
            type="text" 
            id="paidBy" 
            bind:value={payment.paidBy} 
            required
          />
        </div>
      </FormSection>

      <ImageUpload
        bind:imagePreview={imagePreview}
        bind:imageFile={imageFile}
        bind:uploading={uploading}
        currentImage={payment.image}
        {lang}
        onimageSelected={handleImageUpload}
        onimageRemoved={handleImageRemoved}
        oncurrentImageRemoved={handleCurrentImageRemoved}
        onerror={(msg) => { error = msg; }}
      />

      {#if payment.splits && payment.splits.length > 0}
        <FormSection title={t('split_config', lang)}>
          <div class="split-method-info">
            <span class="label">{t('split_method_form', lang)}</span>
            <span class="value">
              {#if payment.splitMethod === 'equal'}
                {t('equal_split', lang)}
              {:else if payment.splitMethod === 'full'}
                {t('paid_in_full', lang)}
              {:else if payment.splitMethod === 'personal_equal'}
                {t('personal_equal_split', lang)}
              {:else if payment.splitMethod === 'proportional'}
                {t('custom_proportions', lang)}
              {:else}
                {payment.splitMethod}
              {/if}
            </span>
          </div>

          {#if payment.splitMethod === 'personal_equal'}
            <div class="personal-amounts-editor">
              <h3>{t('personal_amounts', lang)}</h3>
              <p class="description">{t('personal_amounts_desc', lang)}</p>
              {#each payment.splits as split, index}
                <div class="personal-input">
                  <label for="personal_{split.username}">{split.username}</label>
                  <input
                    id="personal_{split.username}"
                    type="number"
                    step="0.01"
                    min="0"
                    value={split.personalAmount || 0}
                    oninput={(e) => {
                      split.personalAmount = parseFloat(/** @type {HTMLInputElement} */ (e.target).value) || 0;
                    }
  }
                    placeholder="0.00"
                  />
                </div>
              {/each}
              {#if payment.amount}
                {@const totalPersonal = payment.splits.reduce((sum, s) => sum + (s.personalAmount || 0), 0)}
                {@const remainder = Math.max(0, Number(payment.amount) - totalPersonal)}
                {@const hasError = totalPersonal > Number(payment.amount)}
                <div class="remainder-info" class:error={hasError}>
                  <span>{t('total_personal', lang)}: CHF {totalPersonal.toFixed(2)}</span>
                  <span>{t('remainder_to_split', lang)}: CHF {remainder.toFixed(2)}</span>
                  {#if hasError}
                    <div class="error-message">⚠️ {t('personal_exceeds', lang)}</div>
                  {/if}
                </div>
              {/if}
            </div>
          {/if}

          <div class="splits-display">
            <h3>{t('split_preview', lang)}</h3>
            {#each payment.splits as split}
              <div class="split-item">
                <span class="split-username">{split.username}</span>
                <span class="split-amount" class:positive={split.amount < 0} class:negative={split.amount > 0}>
                  {#if split.amount > 0}
                    {t('owes', lang)} CHF {split.amount.toFixed(2)}
                  {:else if split.amount < 0}
                    {t('owed', lang)} CHF {Math.abs(split.amount).toFixed(2)}
                  {:else}
                    {t('owes', lang)} CHF {split.amount.toFixed(2)}
                  {/if}
                </span>
              </div>
            {/each}
          </div>
          <p class="note">
            <span class="js-only">✓ Splits recalculate automatically when you change the amount{payment.splitMethod === 'personal_equal' ? ' or personal amounts' : ''}</span>
            <span class="no-js">Note: Split method and participants cannot be changed. To modify, please delete and recreate the payment.</span>
          </p>
        </FormSection>
      {/if}

      <div class="form-actions">
        <button
          type="button"
          class="btn-danger"
          onclick={deletePayment}
          disabled={deleting || saving}
        >
          {deleting ? t('deleting', lang) : t('delete_payment', lang)}
        </button>
      </div>

      <SaveFab disabled={saving || deleting} label={t('save_changes', lang)} />
    </form>
  {/if}
</main>

<style>
  .edit-payment {
    max-width: 800px;
    margin: 0 auto;
    padding: 2rem;
  }

  .header {
    text-align: center;
    margin-bottom: 2rem;
  }

  .header p {
    margin: 0;
    color: var(--color-text-secondary);
    font-size: 1.1rem;
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

  .payment-form {
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  .form-group {
    margin-bottom: 1rem;
  }

  .form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }

  label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
    color: var(--color-text-secondary);
  }

  input, textarea, select {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid var(--color-border);
    border-radius: 0.5rem;
    font-size: 1rem;
    box-sizing: border-box;
    background-color: var(--color-bg-tertiary);
    color: var(--color-text-primary);
  }

  input:focus, textarea:focus, select:focus {
    outline: none;
    border-color: var(--blue);
    box-shadow: 0 0 0 2px rgba(94, 129, 172, 0.2);
  }

  select {
    cursor: pointer;
  }

  .split-method-info {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 1rem;
    padding: 0.75rem;
    background-color: var(--color-bg-tertiary);
    border-radius: 0.5rem;
    border: 1px solid var(--green);
  }

  .split-method-info .label {
    font-weight: 600;
    color: var(--color-text-secondary);
  }

  .split-method-info .value {
    color: var(--green);
    font-weight: 500;
  }

  .personal-amounts-editor {
    margin-bottom: 1.5rem;
    padding: 1rem;
    background-color: var(--color-bg-tertiary);
    border-radius: 0.5rem;
    border: 1px solid var(--color-border);
  }

  .personal-amounts-editor h3 {
    margin-top: 0;
    margin-bottom: 0.5rem;
    color: var(--color-text-primary);
    font-size: 1rem;
  }

  .personal-amounts-editor .description {
    color: var(--color-text-secondary);
    font-size: 0.9rem;
    margin-bottom: 1rem;
    font-style: italic;
  }

  .personal-input {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 0.75rem;
  }

  .personal-input label {
    min-width: 120px;
    margin-bottom: 0;
    font-weight: 500;
  }

  .personal-input input {
    max-width: 150px;
    padding: 0.5rem;
    border: 1px solid var(--color-border);
    border-radius: 0.5rem;
    font-size: 1rem;
    background-color: var(--color-bg-tertiary);
    color: var(--color-text-primary);
  }

  .personal-input input:focus {
    outline: none;
    border-color: var(--blue);
    box-shadow: 0 0 0 2px rgba(94, 129, 172, 0.2);
  }

  .remainder-info {
    margin-top: 1rem;
    padding: 0.75rem;
    background-color: var(--color-bg-tertiary);
    border-radius: 0.5rem;
    border: 1px solid var(--green);
  }

  .remainder-info.error {
    background-color: var(--color-bg-secondary);
    border-color: var(--red);
  }

  .remainder-info span {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
    color: var(--color-text-primary);
  }

  .error-message {
    color: var(--red);
    font-weight: 600;
    margin-top: 0.5rem;
    font-size: 0.9rem;
  }

  .splits-display {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    margin-bottom: 1rem;
  }

  .splits-display h3 {
    margin-top: 0;
    margin-bottom: 1rem;
    color: var(--color-text-primary);
    font-size: 1rem;
  }

  .split-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem;
    background-color: var(--color-bg-tertiary);
    border-radius: 0.5rem;
    border: 1px solid var(--color-border);
  }

  .split-username {
    font-weight: 500;
    color: var(--color-text-primary);
  }

  .split-amount.positive {
    color: var(--green);
    font-weight: 500;
  }

  .split-amount.negative {
    color: var(--red);
    font-weight: 500;
  }

  .note {
    color: var(--color-text-secondary);
    font-size: 0.9rem;
    font-style: italic;
    margin: 0;
  }

  .js-only {
    display: none;
  }

  .no-js {
    display: inline;
  }

  :global(body.js-loaded) .js-only {
    display: inline;
  }

  :global(body.js-loaded) .no-js {
    display: none;
  }

  .form-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
  }

  .btn-danger {
    padding: 0.75rem 1.5rem;
    border-radius: 0.5rem;
    font-size: 1rem;
    cursor: pointer;
    transition: all 0.2s;
    background-color: var(--red);
    color: white;
    border: none;
  }

  .btn-danger:hover:not(:disabled) {
    background-color: var(--nord11);
    transform: translateY(-1px);
  }

  .btn-danger:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  /* Amount-currency styling */
  .amount-currency {
    display: flex;
    gap: 0.5rem;
  }

  .amount-currency input {
    flex: 2;
  }

  .amount-currency select {
    flex: 1;
    min-width: 80px;
  }

  /* Currency conversion preview */
  .conversion-info {
    margin-top: 0.5rem;
  }

  .conversion-preview {
    margin-top: 0.5rem;
    padding: 0.75rem;
    border-radius: 0.5rem;
    border: 1px solid transparent;
  }

  .conversion-preview.loading {
    background-color: var(--color-bg-tertiary);
    border-color: var(--blue);
    color: var(--blue);
  }

  .conversion-preview.error {
    background-color: var(--color-bg-secondary);
    border-color: var(--red);
    color: var(--red);
  }

  .conversion-preview.success {
    background-color: var(--color-bg-tertiary);
    border-color: var(--green);
    color: var(--color-text-primary);
  }

  .conversion-preview small {
    font-size: 0.85rem;
    font-weight: 500;
  }

  .help-text {
    display: block;
    margin-top: 0.25rem;
    font-size: 0.8rem;
    color: var(--color-text-secondary);
    font-style: italic;
  }

  @media (max-width: 600px) {
    .edit-payment {
      padding: 1rem;
    }

    .form-row {
      grid-template-columns: 1fr;
    }

    .form-actions {
      flex-direction: column;
      align-items: stretch;
    }


    .amount-currency {
      flex-direction: column;
    }

    .amount-currency input,
    .amount-currency select {
      flex: none;
    }

    .personal-input {
      flex-direction: column;
      align-items: flex-start;
    }

    .personal-input label {
      min-width: auto;
    }

    .personal-input input {
      width: 100%;
      max-width: none;
    }
  }

</style>