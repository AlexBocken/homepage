<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { getCategoryOptions } from '$lib/utils/categories';
  import FormSection from '$lib/components/FormSection.svelte';
  import ImageUpload from '$lib/components/ImageUpload.svelte';
  
  export let data;

  let payment = null;
  let loading = true;
  let saving = false;
  let uploading = false;
  let error = null;
  let imageFile = null;
  let imagePreview = '';
  let supportedCurrencies = ['CHF'];
  let loadingCurrencies = false;
  let currentExchangeRate = null;
  let convertedAmount = null;
  let loadingExchangeRate = false;
  let exchangeRateError = null;
  let exchangeRateTimeout;
  let jsEnhanced = false;
  
  $: categoryOptions = getCategoryOptions();

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
      payment = result.payment;
    } catch (err) {
      error = err.message;
    } finally {
      loading = false;
    }
  }

  function handleImageSelected(event) {
    imageFile = event.detail;
    handleImageUpload();
  }

  function handleImageError(event) {
    error = event.detail;
  }

  function handleImageRemoved() {
    imageFile = null;
    imagePreview = '';
  }

  function handleCurrentImageRemoved() {
    payment.image = null;
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
      payment.image = result.imageUrl;
      imageFile = null;
      imagePreview = '';
    } catch (err) {
      error = err.message;
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

      await goto('/cospend/payments');
    } catch (err) {
      error = err.message;
    } finally {
      saving = false;
    }
  }

  function formatDate(dateString) {
    return new Date(dateString).toISOString().split('T')[0];
  }

  let deleting = false;

  async function deletePayment() {
    if (!confirm('Are you sure you want to delete this payment? This action cannot be undone.')) {
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
      goto('/cospend/payments');
      
    } catch (err) {
      error = err.message;
    } finally {
      deleting = false;
    }
  }

  async function loadSupportedCurrencies() {
    try {
      loadingCurrencies = true;
      const response = await fetch('/api/cospend/exchange-rates?action=currencies');
      if (response.ok) {
        const data = await response.json();
        supportedCurrencies = ['CHF', ...data.currencies.filter(c => c !== 'CHF')];
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

      const data = await response.json();
      currentExchangeRate = data.rate;
      convertedAmount = payment.originalAmount * data.rate;
    } catch (e) {
      console.warn('Could not fetch exchange rate:', e);
      exchangeRateError = e.message;
      currentExchangeRate = null;
      convertedAmount = null;
    } finally {
      loadingExchangeRate = false;
    }
  }

  // Reactive statement for exchange rate fetching
  $: if (jsEnhanced && payment && payment.currency && payment.currency !== 'CHF' && payment.date && payment.originalAmount) {
    clearTimeout(exchangeRateTimeout);
    exchangeRateTimeout = setTimeout(fetchExchangeRate, 300);
  }

  function formatDateForInput(dateString) {
    if (!dateString) return '';
    return new Date(dateString).toISOString().split('T')[0];
  }
</script>

<svelte:head>
  <title>Edit Payment - Cospend</title>
</svelte:head>

<main class="edit-payment">
  <div class="header">
    <h1>Edit Payment</h1>
    <p>Modify payment details and receipt image</p>
  </div>

  {#if loading}
    <div class="loading">Loading payment...</div>
  {:else if error}
    <div class="error">Error: {error}</div>
  {:else if payment}
    <form on:submit|preventDefault={handleSubmit} class="payment-form">
      <FormSection title="Payment Details">
        <div class="form-group">
          <label for="title">Title *</label>
          <input 
            type="text" 
            id="title" 
            bind:value={payment.title} 
            required 
          />
        </div>

        <div class="form-group">
          <label for="description">Description</label>
          <textarea 
            id="description" 
            bind:value={payment.description} 
            rows="3"
          ></textarea>
        </div>

        <div class="form-group">
          <label for="category">Category</label>
          <select id="category" bind:value={payment.category} required>
            {#each categoryOptions as option}
              <option value={option.value}>{option.label}</option>
            {/each}
          </select>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="amount">Amount *</label>
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
            <label for="date">Date</label>
            <input 
              type="date" 
              id="date" 
              value={formatDateForInput(payment.date)}
              on:change={(e) => payment.date = new Date(e.target.value).toISOString()}
              required
            />
          </div>
        </div>

        <div class="form-group">
          <label for="paidBy">Paid by</label>
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
        on:imageSelected={handleImageSelected}
        on:imageRemoved={handleImageRemoved}
        on:currentImageRemoved={handleCurrentImageRemoved}
        on:error={handleImageError}
      />

      {#if payment.splits && payment.splits.length > 0}
        <FormSection title="Current Splits">
          <div class="splits-display">
            {#each payment.splits as split}
              <div class="split-item">
                <span>{split.username}</span>
                <span class:positive={split.amount < 0} class:negative={split.amount > 0}>
                  {#if split.amount > 0}
                    owes CHF {split.amount.toFixed(2)}
                  {:else if split.amount < 0}
                    owed CHF {Math.abs(split.amount).toFixed(2)}
                  {:else}
                    owes CHF {split.amount.toFixed(2)}
                  {/if}
                </span>
              </div>
            {/each}
          </div>
          <p class="note">Note: To modify splits, please delete and recreate the payment.</p>
        </FormSection>
      {/if}

      <div class="form-actions">
        <button 
          type="button" 
          class="btn-danger" 
          on:click={deletePayment}
          disabled={deleting || saving}
        >
          {deleting ? 'Deleting...' : 'Delete Payment'}
        </button>
        <div class="main-actions">
          <button type="button" class="btn-secondary" on:click={() => goto('/cospend/payments')}>
            Cancel
          </button>
          <button type="submit" class="btn-primary" disabled={saving || deleting}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
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

  .header h1 {
    margin: 0 0 0.5rem 0;
    color: var(--nord0);
    font-size: 2rem;
  }

  .header p {
    margin: 0;
    color: var(--nord3);
    font-size: 1.1rem;
  }

  @media (prefers-color-scheme: dark) {
    .header h1 {
      color: var(--font-default-dark);
    }

    .header p {
      color: var(--nord4);
    }
  }

  .loading, .error {
    text-align: center;
    padding: 2rem;
    font-size: 1.1rem;
  }

  .error {
    color: var(--red);
    background-color: var(--nord6);
    border-radius: 0.5rem;
    border: 1px solid var(--red);
  }

  @media (prefers-color-scheme: dark) {
    .error {
      background-color: var(--accent-dark);
    }
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
    color: var(--nord2);
  }

  @media (prefers-color-scheme: dark) {
    label {
      color: var(--nord5);
    }
  }

  input, textarea, select {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid var(--nord4);
    border-radius: 0.5rem;
    font-size: 1rem;
    box-sizing: border-box;
    background-color: var(--nord6);
    color: var(--nord0);
  }

  input:focus, textarea:focus, select:focus {
    outline: none;
    border-color: var(--blue);
    box-shadow: 0 0 0 2px rgba(94, 129, 172, 0.2);
  }

  select {
    cursor: pointer;
  }

  @media (prefers-color-scheme: dark) {
    input, textarea, select {
      background-color: var(--nord2);
      color: var(--font-default-dark);
      border-color: var(--nord3);
    }
  }

  .splits-display {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    margin-bottom: 1rem;
  }

  .split-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem;
    background-color: var(--nord5);
    border-radius: 0.5rem;
    border: 1px solid var(--nord4);
  }

  @media (prefers-color-scheme: dark) {
    .split-item {
      background-color: var(--nord2);
      border-color: var(--nord3);
    }
  }

  .positive {
    color: var(--green);
    font-weight: 500;
  }

  .negative {
    color: var(--red);
    font-weight: 500;
  }

  .note {
    color: var(--nord2);
    font-size: 0.9rem;
    font-style: italic;
    margin: 0;
  }

  @media (prefers-color-scheme: dark) {
    .note {
      color: var(--nord4);
    }
  }

  .form-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
  }

  .main-actions {
    display: flex;
    gap: 1rem;
  }

  .btn-primary, .btn-secondary, .btn-danger {
    padding: 0.75rem 1.5rem;
    border-radius: 0.5rem;
    font-size: 1rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-primary {
    background-color: var(--blue);
    color: white;
    border: none;
  }

  .btn-primary:hover:not(:disabled) {
    background-color: var(--nord10);
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
  }

  .btn-primary:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .btn-secondary {
    background-color: var(--nord5);
    color: var(--nord0);
    border: 1px solid var(--nord4);
  }

  .btn-secondary:hover {
    background-color: var(--nord4);
    transform: translateY(-1px);
  }

  @media (prefers-color-scheme: dark) {
    .btn-secondary {
      background-color: var(--nord2);
      color: var(--font-default-dark);
      border-color: var(--nord3);
    }

    .btn-secondary:hover {
      background-color: var(--nord3);
    }
  }

  .btn-danger {
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
    background-color: var(--nord8);
    border-color: var(--blue);
    color: var(--blue);
  }

  .conversion-preview.error {
    background-color: var(--nord6);
    border-color: var(--red);
    color: var(--red);
  }

  .conversion-preview.success {
    background-color: var(--nord14);
    border-color: var(--green);
    color: var(--nord0);
  }

  .conversion-preview small {
    font-size: 0.85rem;
    font-weight: 500;
  }

  .help-text {
    display: block;
    margin-top: 0.25rem;
    font-size: 0.8rem;
    color: var(--nord3);
    font-style: italic;
  }

  @media (prefers-color-scheme: dark) {
    .conversion-preview.loading {
      background-color: var(--nord2);
    }

    .conversion-preview.error {
      background-color: var(--accent-dark);
    }

    .conversion-preview.success {
      background-color: var(--nord2);
      color: var(--font-default-dark);
    }

    .help-text {
      color: var(--nord4);
    }
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

    .main-actions {
      flex-direction: column;
    }

    .amount-currency {
      flex-direction: column;
    }

    .amount-currency input,
    .amount-currency select {
      flex: none;
    }
  }
</style>