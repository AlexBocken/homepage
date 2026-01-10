<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { getCategoryOptions } from '$lib/utils/categories';
  import { PREDEFINED_USERS, isPredefinedUsersMode } from '$lib/config/users';
  import { validateCronExpression, getFrequencyDescription, calculateNextExecutionDate } from '$lib/utils/recurring';
  import ProfilePicture from '$lib/components/ProfilePicture.svelte';
  import SplitMethodSelector from '$lib/components/SplitMethodSelector.svelte';
  import UsersList from '$lib/components/UsersList.svelte';

  let { data } = $props();

  let formData = $state({
    title: '',
    description: '',
    amount: '',
    currency: 'CHF',
    paidBy: data.session?.user?.nickname || '',
    category: 'groceries',
    splitMethod: 'equal',
    splits: [],
    frequency: 'monthly',
    cronExpression: '',
    startDate: '',
    endDate: '',
    isActive: true
  });

  let users = $state([]);
  let newUser = $state('');
  let splitAmounts = $state({});
  let personalAmounts = $state({});
  let loading = $state(false);
  let loadingPayment = $state(true);
  let error = $state(null);
  let predefinedMode = $state(isPredefinedUsersMode());
  let cronError = $state(false);
  let nextExecutionPreview = $state('');
  let supportedCurrencies = $state(['CHF']);
  let loadingCurrencies = $state(false);
  let currentExchangeRate = $state(null);
  let convertedAmount = $state(null);
  let loadingExchangeRate = $state(false);
  let exchangeRateError = $state(null);
  let exchangeRateTimeout = $state();
  let jsEnhanced = $state(false);

  let categoryOptions = $derived(getCategoryOptions());

  onMount(async () => {
    jsEnhanced = true;
    document.body.classList.add('js-loaded');
    await loadRecurringPayment();
    await loadSupportedCurrencies();
  });

  async function loadRecurringPayment() {
    try {
      loadingPayment = true;
      const response = await fetch(`/api/cospend/recurring-payments/${data.recurringPaymentId}`);
      if (!response.ok) {
        throw new Error('Failed to load recurring payment');
      }
      
      const result = await response.json();
      const payment = result.recurringPayment;
      
      // Populate form data
      formData = {
        title: payment.title,
        description: payment.description || '',
        amount: payment.amount.toString(),
        currency: payment.currency || 'CHF',
        paidBy: payment.paidBy,
        category: payment.category,
        splitMethod: payment.splitMethod,
        frequency: payment.frequency,
        cronExpression: payment.cronExpression || '',
        startDate: new Date(payment.startDate).toISOString().split('T')[0],
        endDate: payment.endDate ? new Date(payment.endDate).toISOString().split('T')[0] : '',
        isActive: payment.isActive
      };

      // Set up users and splits
      users = payment.splits.map(split => split.username);
      users.forEach(user => {
        const split = payment.splits.find(s => s.username === user);
        splitAmounts[user] = split.amount;
        if (split.personalAmount !== undefined) {
          personalAmounts[user] = split.personalAmount;
        }
      });

      updateNextExecutionPreview();

    } catch (err) {
      error = err.message;
    } finally {
      loadingPayment = false;
    }
  }

  function addSplitForUser(username) {
    if (!splitAmounts[username]) {
      splitAmounts[username] = 0;
      splitAmounts = { ...splitAmounts };
    }
  }

  function validateCron() {
    if (formData.frequency !== 'custom') {
      cronError = false;
      return;
    }
    cronError = !validateCronExpression(formData.cronExpression);
  }

  function updateNextExecutionPreview() {
    try {
      if (formData.frequency && formData.startDate) {
        const recurringPayment = {
          ...formData,
          startDate: new Date(formData.startDate)
        };
        const nextDate = calculateNextExecutionDate(recurringPayment, new Date(formData.startDate));
        nextExecutionPreview = nextDate.toLocaleString('de-CH', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      }
    } catch (e) {
      nextExecutionPreview = 'Invalid configuration';
    }
  }

  async function handleSubmit() {
    if (!formData.title.trim() || !formData.amount || parseFloat(formData.amount) <= 0) {
      error = 'Please fill in all required fields with valid values';
      return;
    }

    if (formData.frequency === 'custom' && cronError) {
      error = 'Please enter a valid cron expression';
      return;
    }


    if (users.length === 0) {
      error = 'Please add at least one user to split with';
      return;
    }

    loading = true;
    error = null;

    try {
      const splits = users.map(user => ({
        username: user,
        amount: splitAmounts[user] || 0,
        proportion: formData.splitMethod === 'proportional' ? (splitAmounts[user] || 0) / parseFloat(formData.amount) : undefined,
        personalAmount: formData.splitMethod === 'personal_equal' ? (parseFloat(personalAmounts[user]) || 0) : undefined
      }));

      const payload = {
        ...formData,
        amount: parseFloat(formData.amount),
        startDate: formData.startDate ? new Date(formData.startDate).toISOString() : new Date().toISOString(),
        endDate: formData.endDate ? new Date(formData.endDate).toISOString() : null,
        cronExpression: formData.frequency === 'custom' ? formData.cronExpression : undefined,
        splits
      };

      const response = await fetch(`/api/cospend/recurring-payments/${data.recurringPaymentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update recurring payment');
      }

      const result = await response.json();
      await goto('/cospend/recurring');

    } catch (err) {
      error = err.message;
    } finally {
      loading = false;
    }
  }


  $effect(() => {
    if (formData.cronExpression) {
      validateCron();
    }
  });

  $effect(() => {
    if (formData.frequency || formData.cronExpression || formData.startDate) {
      updateNextExecutionPreview();
    }
  });

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
    if (formData.currency === 'CHF' || !formData.currency || !formData.startDate) {
      currentExchangeRate = null;
      convertedAmount = null;
      exchangeRateError = null;
      return;
    }

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      convertedAmount = null;
      return;
    }

    try {
      loadingExchangeRate = true;
      exchangeRateError = null;

      const url = `/api/cospend/exchange-rates?from=${formData.currency}&date=${formData.startDate}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Failed to fetch exchange rate');
      }

      const data = await response.json();
      currentExchangeRate = data.rate;
      convertedAmount = parseFloat(formData.amount) * data.rate;
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
    if (jsEnhanced && formData.currency && formData.currency !== 'CHF' && formData.startDate && formData.amount) {
      clearTimeout(exchangeRateTimeout);
      exchangeRateTimeout = setTimeout(fetchExchangeRate, 300);
    }
  });
</script>

<svelte:head>
  <title>Edit Recurring Payment - Cospend</title>
</svelte:head>

<main class="edit-recurring-payment">
  <div class="header">
    <h1>Edit Recurring Payment</h1>
    <div class="header-actions">
      <a href="/cospend/recurring" class="back-link">← Back to Recurring Payments</a>
    </div>
  </div>

  {#if loadingPayment}
    <div class="loading">Loading recurring payment...</div>
  {:else if error && !formData.title}
    <div class="error">Error: {error}</div>
  {:else}
    <form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }} class="payment-form">
      <div class="form-section">
        <h2>Payment Details</h2>
        
        <div class="form-group">
          <label for="title">Title *</label>
          <input 
            type="text" 
            id="title" 
            bind:value={formData.title} 
            required 
            placeholder="e.g., Monthly rent, Weekly groceries"
          />
        </div>

        <div class="form-group">
          <label for="description">Description</label>
          <textarea 
            id="description" 
            bind:value={formData.description} 
            placeholder="Additional details about this recurring payment..."
            rows="3"
          ></textarea>
        </div>

        <div class="form-group">
          <label for="category">Category *</label>
          <select id="category" bind:value={formData.category} required>
            {#each categoryOptions as option}
              <option value={option.value}>{option.label}</option>
            {/each}
          </select>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="amount">Amount *</label>
            <div class="amount-currency">
              <input 
                type="number" 
                id="amount" 
                bind:value={formData.amount} 
                required 
                min="0" 
                step="0.01"
                placeholder="0.00"
              />
              <select id="currency" bind:value={formData.currency} disabled={loadingCurrencies}>
                {#each supportedCurrencies as currency}
                  <option value={currency}>{currency}</option>
                {/each}
              </select>
            </div>
            {#if formData.currency !== 'CHF'}
              <div class="conversion-info">
                <small class="help-text">Amount will be converted to CHF using exchange rates on each execution</small>
                
                {#if loadingExchangeRate}
                  <div class="conversion-preview loading">
                    <small>🔄 Fetching exchange rate for start date...</small>
                  </div>
                {:else if exchangeRateError}
                  <div class="conversion-preview error">
                    <small>⚠️ {exchangeRateError}</small>
                  </div>
                {:else if convertedAmount !== null && currentExchangeRate !== null && formData.amount}
                  <div class="conversion-preview success">
                    <small>
                      {formData.currency} {parseFloat(formData.amount).toFixed(2)} ≈ CHF {convertedAmount.toFixed(2)}
                      <br>
                      (Rate for start date: 1 {formData.currency} = {currentExchangeRate.toFixed(4)} CHF)
                    </small>
                  </div>
                {/if}
              </div>
            {/if}
          </div>

          <div class="form-group">
            <label for="paidBy">Paid by</label>
            <select id="paidBy" bind:value={formData.paidBy} required>
              {#each users as user}
                <option value={user}>{user}</option>
              {/each}
            </select>
          </div>
        </div>

        <div class="form-group">
          <label for="isActive">Status</label>
          <select id="isActive" bind:value={formData.isActive}>
            <option value={true}>Active</option>
            <option value={false}>Inactive</option>
          </select>
        </div>
      </div>

      <div class="form-section">
        <h2>Recurring Schedule</h2>
        
        <div class="form-row">
          <div class="form-group">
            <label for="frequency">Frequency *</label>
            <select id="frequency" bind:value={formData.frequency} required>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="custom">Custom (Cron)</option>
            </select>
          </div>

          <div class="form-group">
            <label for="startDate">Start Date *</label>
            <input 
              type="date" 
              id="startDate" 
              bind:value={formData.startDate} 
              required
            />
          </div>
        </div>

        {#if formData.frequency === 'custom'}
          <div class="form-group">
            <label for="cronExpression">Cron Expression *</label>
            <input 
              type="text" 
              id="cronExpression" 
              bind:value={formData.cronExpression} 
              required 
              placeholder="0 9 * * 1  (Every Monday at 9:00 AM)"
              class:error={cronError}
            />
            <div class="help-text">
              <p>Cron format: minute hour day-of-month month day-of-week</p>
              <p>Examples:</p>
              <ul>
                <li><code>0 9 * * *</code> - Every day at 9:00 AM</li>
                <li><code>0 9 1 * *</code> - Every 1st of the month at 9:00 AM</li>
                <li><code>0 9 * * 1</code> - Every Monday at 9:00 AM</li>
                <li><code>0 9 1,15 * *</code> - 1st and 15th of every month at 9:00 AM</li>
              </ul>
            </div>
            {#if cronError}
              <div class="field-error">Invalid cron expression</div>
            {/if}
          </div>
        {/if}

        <div class="form-group">
          <label for="endDate">End Date (optional)</label>
          <input 
            type="date" 
            id="endDate" 
            bind:value={formData.endDate}
          />
          <div class="help-text">Leave blank for indefinite recurring payments</div>
        </div>

        {#if nextExecutionPreview}
          <div class="execution-preview">
            <h3>Next Execution</h3>
            <p class="next-execution">{nextExecutionPreview}</p>
            <p class="frequency-description">{getFrequencyDescription(formData)}</p>
          </div>
        {/if}
      </div>

      <UsersList 
        bind:users={users}
        bind:newUser={newUser}
        currentUser={data.session?.user?.nickname}
        {predefinedMode}
        canRemoveUsers={!predefinedMode}
      />

      <SplitMethodSelector 
        bind:splitMethod={formData.splitMethod}
        bind:splitAmounts={splitAmounts}
        bind:personalAmounts={personalAmounts}
        {users}
        amount={formData.amount}
        currency={formData.currency}
        paidBy={formData.paidBy}
        currentUser={data.session?.user?.nickname}
        {predefinedMode}
      />

      {#if error}
        <div class="error">{error}</div>
      {/if}

      <div class="form-actions">
        <button type="button" class="btn-secondary" onclick={() => goto('/cospend/recurring')}>
          Cancel
        </button>
        <button type="submit" class="btn-primary" disabled={loading || cronError}>
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </form>
  {/if}
</main>

<style>
  .edit-recurring-payment {
    max-width: 800px;
    margin: 0 auto;
    padding: 2rem;
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
  }

  .header h1 {
    margin: 0;
    color: var(--nord0);
  }

  .back-link {
    color: var(--blue);
    text-decoration: none;
  }

  .loading {
    text-align: center;
    padding: 2rem;
    font-size: 1.1rem;
  }

  .payment-form {
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  .form-section {
    background: var(--nord6);
    padding: 1.5rem;
    border-radius: 0.75rem;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    border: 1px solid var(--nord4);
  }

  .form-section h2 {
    margin-top: 0;
    margin-bottom: 1rem;
    color: var(--nord0);
    font-size: 1.25rem;
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
    color: var(--nord3);
  }

  input, textarea, select {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid var(--nord4);
    border-radius: 0.5rem;
    font-size: 1rem;
    box-sizing: border-box;
    background: var(--nord5);
    color: var(--nord0);
  }

  input:focus, textarea:focus, select:focus {
    outline: none;
    border-color: var(--blue);
    box-shadow: 0 0 0 2px rgba(136, 192, 208, 0.2);
  }

  input.error {
    border-color: var(--red);
  }

  .help-text {
    margin-top: 0.5rem;
    color: var(--nord3);
    font-size: 0.9rem;
  }

  .help-text code {
    background-color: var(--nord5);
    padding: 0.125rem 0.25rem;
    border-radius: 0.25rem;
    font-family: monospace;
    color: var(--nord0);
  }

  .help-text ul {
    margin: 0.5rem 0;
    padding-left: 1rem;
  }

  .help-text li {
    margin-bottom: 0.25rem;
  }

  .field-error {
    color: var(--red);
    font-size: 0.875rem;
    margin-top: 0.25rem;
  }

  .execution-preview {
    background-color: var(--nord8);
    border: 1px solid var(--blue);
    border-radius: 0.5rem;
    padding: 1rem;
    margin-top: 1rem;
  }

  .execution-preview h3 {
    margin: 0 0 0.5rem 0;
    color: var(--blue);
    font-size: 1rem;
  }

  .next-execution {
    font-size: 1.1rem;
    font-weight: 600;
    color: var(--blue);
    margin: 0.5rem 0;
  }

  .frequency-description {
    color: var(--nord3);
    font-size: 0.9rem;
    margin: 0;
    font-style: italic;
  }




  .error {
    background-color: var(--nord6);
    color: var(--red);
    padding: 1rem;
    border-radius: 0.5rem;
    margin-bottom: 1rem;
    border: 1px solid var(--red);
  }

  .form-actions {
    display: flex;
    gap: 1rem;
    justify-content: flex-end;
  }

  .btn-primary, .btn-secondary {
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
    background-color: var(--lightblue);
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
  }

  @media (prefers-color-scheme: dark) {
    .header h1 {
      color: var(--font-default-dark);
    }

    .form-section {
      background: var(--accent-dark);
      border-color: var(--nord2);
    }

    .form-section h2 {
      color: var(--font-default-dark);
    }

    label {
      color: var(--nord4);
    }

    input, textarea, select {
      background: var(--nord1);
      color: var(--font-default-dark);
      border-color: var(--nord2);
    }

    input:focus, textarea:focus, select:focus {
      box-shadow: 0 0 0 2px rgba(136, 192, 208, 0.2);
    }

    .help-text {
      color: var(--nord4);
    }

    .help-text code {
      background-color: var(--nord1);
      color: var(--font-default-dark);
    }

    .execution-preview {
      background-color: var(--nord2);
      border-color: var(--blue);
    }


    .error {
      background-color: var(--accent-dark);
    }

    .btn-secondary {
      background-color: var(--nord1);
      color: var(--font-default-dark);
      border-color: var(--nord2);
    }

    .btn-secondary:hover {
      background-color: var(--nord2);
    }

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

  @media (max-width: 600px) {
    .edit-recurring-payment {
      padding: 1rem;
    }

    .form-row {
      grid-template-columns: 1fr;
    }

    .form-actions {
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