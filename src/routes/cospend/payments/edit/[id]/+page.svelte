<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { getCategoryOptions } from '$lib/utils/categories';
  import FormSection from '$lib/components/FormSection.svelte';
  import ImageUpload from '$lib/components/ImageUpload.svelte';
  
  let { data } = $props();

  let payment = $state(null);
  let loading = $state(true);
  let saving = $state(false);
  let uploading = $state(false);
  let error = $state(null);
  let imageFile = $state(null);
  let imagePreview = $state('');
  let supportedCurrencies = $state(['CHF']);
  let loadingCurrencies = $state(false);
  let currentExchangeRate = $state(null);
  let convertedAmount = $state(null);
  let loadingExchangeRate = $state(false);
  let exchangeRateError = $state(null);
  let exchangeRateTimeout;
  let jsEnhanced = $state(false);
  let originalAmount = $state(null);

  let categoryOptions = $derived(getCategoryOptions());

  // Recalculate splits when amount changes
  function recalculateSplits() {
    try {
      if (!payment || !payment.splits || payment.splits.length === 0) return;

      // For foreign currency, use converted amount if available, otherwise use CHF amount
      let amountNum;
      if (payment.currency !== 'CHF' && payment.originalAmount && convertedAmount) {
        amountNum = convertedAmount;
      } else {
        amountNum = parseFloat(payment.amount);
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
  let lastCalculatedAmount = $state(null);
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
      payment = result.payment;

      // Initialize personal amounts if undefined (for personal_equal split method)
      if (payment.splitMethod === 'personal_equal' && payment.splits) {
        payment.splits = payment.splits.map(split => ({
          ...split,
          personalAmount: split.personalAmount || 0
        }));
      }

      // Store original amount for comparison to prevent infinite recalculation
      originalAmount = payment.amount;
      // Set initial lastCalculatedAmount to prevent immediate recalculation on load
      lastCalculatedAmount = payment.amount;
      // Store initial personal amounts to prevent immediate recalculation
      if (payment.splitMethod === 'personal_equal') {
        lastPersonalAmounts = payment.splits.map(s => s.personalAmount || 0).join(',');
      }
    } catch (err) {
      console.error('Error loading payment:', err);
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

  let deleting = $state(false);

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
  $effect(() => {
    if (jsEnhanced && payment && payment.currency && payment.currency !== 'CHF' && payment.date && payment.originalAmount) {
      clearTimeout(exchangeRateTimeout);
      exchangeRateTimeout = setTimeout(fetchExchangeRate, 300);
    }
  });

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
    <form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }} class="payment-form">
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
              onchange={(e) => payment.date = new Date(e.target.value).toISOString()}
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
        <FormSection title="Split Configuration">
          <div class="split-method-info">
            <span class="label">Split Method:</span>
            <span class="value">
              {#if payment.splitMethod === 'equal'}
                Equal Split
              {:else if payment.splitMethod === 'full'}
                Paid in Full
              {:else if payment.splitMethod === 'personal_equal'}
                Personal + Equal Split
              {:else if payment.splitMethod === 'proportional'}
                Custom Proportions
              {:else}
                {payment.splitMethod}
              {/if}
            </span>
          </div>

          {#if payment.splitMethod === 'personal_equal'}
            <div class="personal-amounts-editor">
              <h3>Personal Amounts</h3>
              <p class="description">Enter personal amounts for each user. The remainder will be split equally.</p>
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
                      split.personalAmount = parseFloat(e.target.value) || 0;
                    }}
                    placeholder="0.00"
                  />
                </div>
              {/each}
              {#if payment.amount}
                {@const totalPersonal = payment.splits.reduce((sum, s) => sum + (s.personalAmount || 0), 0)}
                {@const remainder = Math.max(0, parseFloat(payment.amount) - totalPersonal)}
                {@const hasError = totalPersonal > parseFloat(payment.amount)}
                <div class="remainder-info" class:error={hasError}>
                  <span>Total Personal: CHF {totalPersonal.toFixed(2)}</span>
                  <span>Remainder to Split: CHF {remainder.toFixed(2)}</span>
                  {#if hasError}
                    <div class="error-message">⚠️ Personal amounts exceed total payment amount!</div>
                  {/if}
                </div>
              {/if}
            </div>
          {/if}

          <div class="splits-display">
            <h3>Split Preview</h3>
            {#each payment.splits as split}
              <div class="split-item">
                <span class="split-username">{split.username}</span>
                <span class="split-amount" class:positive={split.amount < 0} class:negative={split.amount > 0}>
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
          {deleting ? 'Deleting...' : 'Delete Payment'}
        </button>
        <div class="main-actions">
          <button type="button" class="btn-secondary" onclick={() => goto('/cospend/payments')}>
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

  .split-method-info {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 1rem;
    padding: 0.75rem;
    background-color: var(--nord14);
    border-radius: 0.5rem;
    border: 1px solid var(--green);
  }

  @media (prefers-color-scheme: dark) {
    .split-method-info {
      background-color: var(--nord2);
      border-color: var(--nord3);
    }
  }

  .split-method-info .label {
    font-weight: 600;
    color: var(--nord1);
  }

  .split-method-info .value {
    color: var(--green);
    font-weight: 500;
  }

  @media (prefers-color-scheme: dark) {
    .split-method-info .label {
      color: var(--nord5);
    }
  }

  .personal-amounts-editor {
    margin-bottom: 1.5rem;
    padding: 1rem;
    background-color: var(--nord5);
    border-radius: 0.5rem;
    border: 1px solid var(--nord4);
  }

  @media (prefers-color-scheme: dark) {
    .personal-amounts-editor {
      background-color: var(--nord2);
      border-color: var(--nord3);
    }
  }

  .personal-amounts-editor h3 {
    margin-top: 0;
    margin-bottom: 0.5rem;
    color: var(--nord0);
    font-size: 1rem;
  }

  @media (prefers-color-scheme: dark) {
    .personal-amounts-editor h3 {
      color: var(--font-default-dark);
    }
  }

  .personal-amounts-editor .description {
    color: var(--nord2);
    font-size: 0.9rem;
    margin-bottom: 1rem;
    font-style: italic;
  }

  @media (prefers-color-scheme: dark) {
    .personal-amounts-editor .description {
      color: var(--nord4);
    }
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
    border: 1px solid var(--nord4);
    border-radius: 0.5rem;
    font-size: 1rem;
    background-color: var(--nord6);
    color: var(--nord0);
  }

  .personal-input input:focus {
    outline: none;
    border-color: var(--blue);
    box-shadow: 0 0 0 2px rgba(94, 129, 172, 0.2);
  }

  @media (prefers-color-scheme: dark) {
    .personal-input input {
      background-color: var(--nord1);
      color: var(--font-default-dark);
      border-color: var(--nord3);
    }
  }

  .remainder-info {
    margin-top: 1rem;
    padding: 0.75rem;
    background-color: var(--nord14);
    border-radius: 0.5rem;
    border: 1px solid var(--green);
  }

  .remainder-info.error {
    background-color: var(--nord6);
    border-color: var(--red);
  }

  @media (prefers-color-scheme: dark) {
    .remainder-info {
      background-color: var(--nord1);
      border-color: var(--nord3);
    }

    .remainder-info.error {
      background-color: var(--accent-dark);
      border-color: var(--red);
    }
  }

  .remainder-info span {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
    color: var(--nord0);
  }

  @media (prefers-color-scheme: dark) {
    .remainder-info span {
      color: var(--font-default-dark);
    }
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
    color: var(--nord0);
    font-size: 1rem;
  }

  @media (prefers-color-scheme: dark) {
    .splits-display h3 {
      color: var(--font-default-dark);
    }
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

  .split-username {
    font-weight: 500;
    color: var(--nord0);
  }

  @media (prefers-color-scheme: dark) {
    .split-username {
      color: var(--font-default-dark);
    }
  }

  .split-details {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.25rem;
  }

  .personal-amount {
    font-size: 0.85rem;
    color: var(--nord3);
    font-style: italic;
  }

  @media (prefers-color-scheme: dark) {
    .personal-amount {
      color: var(--nord4);
    }
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