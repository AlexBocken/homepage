<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { enhance } from '$app/forms';
  import { getCategoryOptions } from '$lib/utils/categories';
  import { PREDEFINED_USERS, isPredefinedUsersMode } from '$lib/config/users';
  import { validateCronExpression, getFrequencyDescription, calculateNextExecutionDate } from '$lib/utils/recurring';
  import ProfilePicture from '$lib/components/ProfilePicture.svelte';
  import SplitMethodSelector from '$lib/components/SplitMethodSelector.svelte';
  import UsersList from '$lib/components/UsersList.svelte';
  import ImageUpload from '$lib/components/ImageUpload.svelte';
  
  export let data;
  export let form;

  // Initialize form data with server values if available (for error handling)
  let formData = {
    title: form?.values?.title || '',
    description: form?.values?.description || '',
    amount: form?.values?.amount || '',
    currency: form?.values?.currency || 'CHF',
    paidBy: form?.values?.paidBy || data.currentUser || '',
    date: form?.values?.date || new Date().toISOString().split('T')[0],
    category: form?.values?.category || 'groceries',
    splitMethod: form?.values?.splitMethod || 'equal',
    splits: [],
    isRecurring: form?.values?.isRecurring === 'true' || false
  };

  // Recurring payment settings
  let recurringData = {
    frequency: form?.values?.recurringFrequency || 'monthly',
    cronExpression: form?.values?.recurringCronExpression || '',
    startDate: form?.values?.recurringStartDate || new Date().toISOString().split('T')[0],
    endDate: form?.values?.recurringEndDate || ''
  };

  let imageFile = null;
  let imagePreview = '';
  let uploading = false;
  let newUser = '';
  let splitAmounts = {};
  let personalAmounts = {};
  let loading = false;
  let error = form?.error || null;
  let predefinedMode = data.predefinedUsers.length > 0;
  let jsEnhanced = false;
  let cronError = false;
  let nextExecutionPreview = '';
  let supportedCurrencies = ['CHF'];
  let loadingCurrencies = false;
  let currentExchangeRate = null;
  let convertedAmount = null;
  let loadingExchangeRate = false;
  let exchangeRateError = null;
  let exchangeRateTimeout;
  
  // Initialize users from server data for no-JS support
  let users = predefinedMode ? [...data.predefinedUsers] : (data.currentUser ? [data.currentUser] : []);
  
  // Initialize split amounts for server-side users
  users.forEach(user => {
    splitAmounts[user] = 0;
    personalAmounts[user] = 0;
  });
  
  $: categoryOptions = getCategoryOptions();
  
  // Reactive text for "Paid in Full" option
  $: paidInFullText = (() => {
    // No-JS fallback text - always generic
    if (!jsEnhanced) {
      if (predefinedMode) {
        return users.length === 2 ? 'Paid in Full for other' : 'Paid in Full for others';
      } else {
        return 'Paid in Full for others';
      }
    }
    
    // JavaScript-enhanced reactive text
    if (!formData.paidBy) {
      return 'Paid in Full';
    }
    
    // Special handling for 2-user predefined setup
    if (predefinedMode && users.length === 2) {
      const otherUser = users.find(user => user !== formData.paidBy);
      // Always show "for" the other user (who benefits) regardless of who pays
      return otherUser ? `Paid in Full for ${otherUser}` : 'Paid in Full';
    }
    
    // General case with JS
    if (formData.paidBy === data.currentUser) {
      return 'Paid in Full by You';
    } else {
      return `Paid in Full by ${formData.paidBy}`;
    }
  })();

  onMount(async () => {
    jsEnhanced = true;
    document.body.classList.add('js-loaded');
    
    if (predefinedMode) {
      // Use predefined users and always split between them
      users = [...data.predefinedUsers];
      users.forEach(user => addSplitForUser(user));
      // Default to current user as payer if they're in the predefined list
      if (data.currentUser && data.predefinedUsers.includes(data.currentUser)) {
        formData.paidBy = data.currentUser;
      } else {
        formData.paidBy = data.predefinedUsers[0];
      }
    } else {
      // Original behavior for manual user management
      if (data.currentUser) {
        users = [data.currentUser];
        addSplitForUser(data.currentUser);
      }
    }

    // Load supported currencies
    await loadSupportedCurrencies();
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
      // Keep default CHF
    } finally {
      loadingCurrencies = false;
    }
  }

  async function fetchExchangeRate() {
    if (formData.currency === 'CHF' || !formData.currency || !formData.date) {
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

      const url = `/api/cospend/exchange-rates?from=${formData.currency}&date=${formData.date}`;
      
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

  function handleImageSelected(event) {
    imageFile = event.detail;
  }

  function handleImageError(event) {
    error = event.detail;
  }

  function handleImageRemoved() {
    imageFile = null;
    imagePreview = '';
  }

  function addSplitForUser(username) {
    if (!splitAmounts[username]) {
      splitAmounts[username] = 0;
      splitAmounts = { ...splitAmounts };
    }
  }

  async function uploadImage() {
    if (!imageFile) return null;
    
    uploading = true;
    const formData = new FormData();
    formData.append('image', imageFile);
    
    try {
      const response = await fetch('/api/cospend/upload', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error('Failed to upload image');
      }
      
      const result = await response.json();
      return result.path;
    } catch (err) {
      console.error('Image upload failed:', err);
      return null;
    } finally {
      uploading = false;
    }
  }

  async function handleSubmit() {
    if (!formData.title.trim() || !formData.amount || parseFloat(formData.amount) <= 0) {
      error = 'Please fill in all required fields with valid values';
      return;
    }


    if (users.length === 0) {
      error = 'Please add at least one user to split with';
      return;
    }

    loading = true;
    error = null;

    try {
      let imagePath = null;
      if (imageFile) {
        imagePath = await uploadImage();
      }

      const splits = users.map(user => ({
        username: user,
        amount: splitAmounts[user] || 0,
        proportion: formData.splitMethod === 'proportional' ? (splitAmounts[user] || 0) / parseFloat(formData.amount) : undefined,
        personalAmount: formData.splitMethod === 'personal_equal' ? (parseFloat(personalAmounts[user]) || 0) : undefined
      }));

      const payload = {
        ...formData,
        amount: parseFloat(formData.amount),
        currency: formData.currency,
        image: imagePath,
        splits
      };

      const response = await fetch('/api/cospend/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create payment');
      }

      const result = await response.json();
      await goto('/cospend');

    } catch (err) {
      error = err.message;
    } finally {
      loading = false;
    }
  }


  function validateCron() {
    if (recurringData.frequency !== 'custom') {
      cronError = false;
      return;
    }
    cronError = !validateCronExpression(recurringData.cronExpression);
  }

  function updateNextExecutionPreview() {
    try {
      if (recurringData.frequency && recurringData.startDate && formData.isRecurring) {
        const recurringPayment = {
          ...recurringData,
          startDate: new Date(recurringData.startDate)
        };
        const nextDate = calculateNextExecutionDate(recurringPayment, new Date(recurringData.startDate));
        nextExecutionPreview = nextDate.toLocaleString('de-CH', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      } else {
        nextExecutionPreview = '';
      }
    } catch (e) {
      nextExecutionPreview = 'Invalid configuration';
    }
  }

  $: if (recurringData.cronExpression) {
    validateCron();
  }

  $: if (recurringData.frequency || recurringData.cronExpression || recurringData.startDate || formData.isRecurring) {
    updateNextExecutionPreview();
  }

  // Fetch exchange rate when currency, amount, or date changes
  $: if (jsEnhanced && formData.currency && formData.currency !== 'CHF' && formData.date && formData.amount) {
    // Add a small delay to avoid excessive API calls while user is typing
    clearTimeout(exchangeRateTimeout);
    exchangeRateTimeout = setTimeout(fetchExchangeRate, 300);
  }
</script>

<svelte:head>
  <title>Add Payment - Cospend</title>
</svelte:head>

<main class="add-payment">
  <div class="header">
    <h1>Add New Payment</h1>
    <p>Create a new shared expense or recurring payment</p>
  </div>

  <form method="POST" use:enhance class="payment-form">
    <div class="form-section">
      <h2>Payment Details</h2>
      
      <div class="form-group">
        <label for="title">Title *</label>
        <input 
          type="text" 
          id="title" 
          name="title"
          value={formData.title}
          required 
          placeholder="e.g., Dinner at restaurant"
        />
      </div>

      <div class="form-group">
        <label for="description">Description</label>
        <textarea 
          id="description" 
          name="description"
          value={formData.description} 
          placeholder="Additional details..."
          rows="3"
        ></textarea>
      </div>

      <div class="form-group">
        <label for="category">Category *</label>
        <select id="category" name="category" value={formData.category} required>
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
              name="amount"
              bind:value={formData.amount} 
              required 
              min="0" 
              step="0.01"
              placeholder="0.00"
            />
            <select id="currency" name="currency" bind:value={formData.currency} disabled={loadingCurrencies}>
              {#each supportedCurrencies as currency}
                <option value={currency}>{currency}</option>
              {/each}
            </select>
          </div>
          {#if formData.currency !== 'CHF'}
            <div class="conversion-info">
              <small class="help-text">Amount will be converted to CHF using exchange rates for the payment date</small>
              
              {#if loadingExchangeRate}
                <div class="conversion-preview loading">
                  <small>🔄 Fetching exchange rate...</small>
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
                    (Rate: 1 {formData.currency} = {currentExchangeRate.toFixed(4)} CHF)
                  </small>
                </div>
              {/if}
            </div>
          {/if}
        </div>

        <div class="form-group">
          <label for="date">Payment Date</label>
          <input 
            type="date" 
            id="date" 
            name="date"
            bind:value={formData.date} 
            required
          />
          {#if formData.currency !== 'CHF'}
            <small class="help-text">Exchange rate will be fetched for this date</small>
          {/if}
        </div>
      </div>

      <div class="form-group">
        <label for="paidBy">Paid by</label>
        <select id="paidBy" name="paidBy" bind:value={formData.paidBy} required>
          {#each users as user}
            <option value={user}>{user}</option>
          {/each}
        </select>
      </div>

      <div class="form-group">
        <label class="checkbox-label">
          <input 
            type="checkbox" 
            name="isRecurring" 
            bind:checked={formData.isRecurring}
            value="true"
          />
          Make this a recurring payment
        </label>
      </div>
    </div>

    {#if formData.isRecurring}
      <div class="form-section">
        <h2>Recurring Payment</h2>
        
        <div class="recurring-options">
          <div class="form-row">
            <div class="form-group">
              <label for="frequency">Frequency *</label>
              <select id="frequency" name="recurringFrequency" bind:value={recurringData.frequency} required>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
                <option value="custom">Custom (Cron)</option>
              </select>
            </div>

            <div class="form-group">
              <label for="recurringStartDate">Start Date *</label>
              <input 
                type="date" 
                id="recurringStartDate" 
                name="recurringStartDate"
                bind:value={recurringData.startDate}
                required
              />
            </div>
          </div>

          {#if recurringData.frequency === 'custom'}
            <div class="form-group">
              <label for="recurringCronExpression">Cron Expression *</label>
              <input 
                type="text" 
                id="recurringCronExpression" 
                name="recurringCronExpression"
                bind:value={recurringData.cronExpression} 
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
            <label for="recurringEndDate">End Date (optional)</label>
            <input 
              type="date" 
              id="recurringEndDate" 
              name="recurringEndDate"
              bind:value={recurringData.endDate}
              min={recurringData.startDate}
            />
            <small class="help-text">Leave empty for indefinite recurring</small>
          </div>


          {#if nextExecutionPreview}
            <div class="execution-preview">
              <h3>Next Execution</h3>
              <p class="next-execution">{nextExecutionPreview}</p>
              <p class="frequency-description">{getFrequencyDescription(recurringData)}</p>
            </div>
          {/if}
        </div>
      </div>
    {/if}

    <ImageUpload
      bind:imagePreview={imagePreview}
      bind:imageFile={imageFile}
      bind:uploading={uploading}
      on:imageSelected={handleImageSelected}
      on:imageRemoved={handleImageRemoved}
      on:error={handleImageError}
    />

    <UsersList 
      bind:users={users}
      bind:newUser={newUser}
      currentUser={data.session?.user?.nickname || data.currentUser}
      predefinedMode={predefinedMode}
      canRemoveUsers={!predefinedMode}
    />

    <!-- Server-side fallback: simple text inputs for users -->
    <div class="manual-users no-js-only">
      <p>Enter users to split with (one per line):</p>
      <textarea 
        name="users_manual" 
        placeholder="{data.currentUser}&#10;Enter additional users..."
        rows="4"
      >{data.currentUser}</textarea>
    </div>

    <!-- Hidden inputs for JavaScript-managed users -->
    {#if predefinedMode}
      {#each data.predefinedUsers as user, i}
        <input type="hidden" name="user_{i}" value={user} />
      {/each}
    {:else}
      {#each users as user, i}
        <input type="hidden" name="user_{i}" value={user} />
      {/each}
    {/if}

    <SplitMethodSelector 
      bind:splitMethod={formData.splitMethod}
      bind:splitAmounts={splitAmounts}
      bind:personalAmounts={personalAmounts}
      {users}
      amount={formData.amount}
      currency={formData.currency}
      paidBy={formData.paidBy}
      currentUser={data.session?.user?.nickname || data.currentUser}
      {predefinedMode}
    />

    {#if error}
      <div class="error">{error}</div>
    {/if}

    <div class="form-actions">
      <a href="/cospend" class="btn-secondary">
        Cancel
      </a>
      <button type="submit" class="btn-primary" disabled={loading}>
        {loading ? 'Creating...' : (formData.isRecurring ? 'Create Recurring Payment' : 'Create Payment')}
      </button>
    </div>
  </form>
</main>

<style>
  .add-payment {
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

  @media (prefers-color-scheme: dark) {
    .form-section {
      background: var(--nord1);
      border-color: var(--nord2);
    }

    .form-section h2 {
      color: var(--font-default-dark);
    }
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

  @media (prefers-color-scheme: dark) {
    input, textarea, select {
      background-color: var(--nord2);
      color: var(--font-default-dark);
      border-color: var(--nord3);
    }
  }





  .error {
    background-color: var(--nord6);
    color: var(--red);
    padding: 1rem;
    border-radius: 0.5rem;
    margin-bottom: 1rem;
    border: 1px solid var(--red);
  }

  @media (prefers-color-scheme: dark) {
    .error {
      background-color: var(--accent-dark);
    }
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
    text-decoration: none;
    display: inline-block;
    text-align: center;
  }

  .btn-secondary:hover {
    background-color: var(--nord4);
    text-decoration: none;
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


  /* Progressive enhancement styles */
  .no-js-only {
    display: block;
  }

  .js-enhanced {
    display: none;
  }

  :global(body.js-loaded) .no-js-only {
    display: none;
  }

  :global(body.js-loaded) .js-enhanced {
    display: block;
  }

  .manual-users textarea {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #ddd;
    border-radius: 0.5rem;
    font-family: inherit;
    font-size: 0.9rem;
    resize: vertical;
  }

  .manual-users p {
    margin: 0 0 0.5rem 0;
    font-size: 0.9rem;
    color: var(--nord2);
  }

  @media (prefers-color-scheme: dark) {
    .manual-users p {
      color: var(--nord4);
    }
  }

  /* Recurring payment styles */
  .checkbox-label {
    display: flex !important;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
  }

  .checkbox-label input[type="checkbox"] {
    width: auto;
    margin: 0;
  }

  .recurring-options {
    margin-top: 1rem;
    padding: 1rem;
    background-color: var(--nord5);
    border-radius: 0.5rem;
    border: 1px solid var(--nord4);
  }

  @media (prefers-color-scheme: dark) {
    .recurring-options {
      background-color: var(--nord2);
      border-color: var(--nord3);
    }
  }

  .help-text {
    display: block;
    margin-top: 0.25rem;
    font-size: 0.8rem;
    color: var(--nord3);
    font-style: italic;
  }

  @media (prefers-color-scheme: dark) {
    .help-text {
      color: var(--nord4);
    }
  }

  .help-text p {
    margin: 0.5rem 0 0.25rem 0;
  }

  .help-text code {
    background-color: var(--nord5);
    padding: 0.125rem 0.25rem;
    border-radius: 0.25rem;
    font-family: monospace;
    font-size: 0.85em;
    border: 1px solid var(--nord4);
  }

  @media (prefers-color-scheme: dark) {
    .help-text code {
      background-color: var(--nord2);
      border-color: var(--nord3);
    }
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
    font-weight: 500;
  }

  input.error {
    border-color: var(--red);
    box-shadow: 0 0 0 2px rgba(191, 97, 106, 0.2);
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
    color: var(--nord2);
    font-size: 0.9rem;
    margin: 0;
    font-style: italic;
  }

  @media (prefers-color-scheme: dark) {
    .execution-preview {
      background-color: var(--nord2);
    }

    .frequency-description {
      color: var(--nord4);
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
  }

  @media (max-width: 600px) {
    .add-payment {
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