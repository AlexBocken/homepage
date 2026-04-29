<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { enhance } from '$app/forms';
  import { detectCospendLang, cospendRoot, locale, t, getCategoryOptionsI18n, frequencyDescription } from '$lib/js/cospendI18n';
  import { PREDEFINED_USERS, isPredefinedUsersMode } from '$lib/config/users';
  import { validateCronExpression, calculateNextExecutionDate } from '$lib/utils/recurring';
  import ProfilePicture from '$lib/components/cospend/ProfilePicture.svelte';
  import SplitMethodSelector from '$lib/components/cospend/SplitMethodSelector.svelte';
  import UsersList from '$lib/components/cospend/UsersList.svelte';
  import ImageUpload from '$lib/components/ImageUpload.svelte';
  import SaveFab from '$lib/components/SaveFab.svelte';
  import Toggle from '$lib/components/Toggle.svelte';
  import DatePicker from '$lib/components/DatePicker.svelte';

  let { data, form } = $props();

  const lang = $derived(detectCospendLang(page.url.pathname));
  const root = $derived(cospendRoot(lang));
  const loc = $derived(locale(lang));

  // Initialize form data with server values if available (for error handling)
  /** @type {Record<string, any>} */
  // svelte-ignore state_referenced_locally
  const formValues = form?.values || {};
  // svelte-ignore state_referenced_locally
  let formData = $state({
    title: /** @type {string} */ (formValues.title || ''),
    description: /** @type {string} */ (formValues.description || ''),
    amount: /** @type {string} */ (formValues.amount || ''),
    currency: /** @type {string} */ (formValues.currency || 'CHF'),
    paidBy: /** @type {string} */ (formValues.paidBy || data.currentUser || ''),
    date: /** @type {string} */ (formValues.date || new Date().toISOString().split('T')[0]),
    category: /** @type {string} */ (formValues.category || 'groceries'),
    splitMethod: /** @type {string} */ (formValues.splitMethod || 'equal'),
    splits: /** @type {any[]} */ ([]),
    isRecurring: formValues.isRecurring === 'true' || false
  });

  // Recurring payment settings
  // svelte-ignore state_referenced_locally
  let recurringData = $state({
    frequency: /** @type {string} */ (formValues.recurringFrequency || 'monthly'),
    cronExpression: /** @type {string} */ (formValues.recurringCronExpression || ''),
    startDate: /** @type {string} */ (formValues.recurringStartDate || new Date().toISOString().split('T')[0]),
    endDate: /** @type {string} */ (formValues.recurringEndDate || '')
  });

  /** @type {File | null} */
  let imageFile = $state(null);
  let imagePreview = $state('');
  let uploading = $state(false);
  let newUser = $state('');
  /** @type {Record<string, number>} */
  let splitAmounts = $state({});
  /** @type {Record<string, number>} */
  let personalAmounts = $state({});
  let loading = $state(false);
  /** @type {string | null} */
  // svelte-ignore state_referenced_locally
  let error = $state(form?.error || null);
  // svelte-ignore state_referenced_locally
  let predefinedMode = $state(data.predefinedUsers.length > 0);
  let jsEnhanced = $state(false);
  let cronError = $state(false);
  let nextExecutionPreview = $state('');
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
  let exchangeRateTimeout = $state();

  // Initialize users from server data for no-JS support (use data directly to avoid reactivity warning)
  // svelte-ignore state_referenced_locally
  const initialUsers = data.predefinedUsers.length > 0 ? [...data.predefinedUsers] : (data.currentUser ? [data.currentUser] : []);
  let users = $state(initialUsers);

  // Initialize split amounts for server-side users (use initialUsers to avoid reactivity warning)
  initialUsers.forEach(user => {
    splitAmounts[user] = 0;
    personalAmounts[user] = 0;
  });

  let categoryOptions = $derived(getCategoryOptionsI18n(lang));

  // Reactive text for "Paid in Full" option
  let paidInFullText = $derived.by(() => {
    // No-JS fallback text - always generic
    if (!jsEnhanced) {
      if (predefinedMode) {
        return t('paid_in_full', lang);
      } else {
        return t('paid_in_full', lang);
      }
    }

    // JavaScript-enhanced reactive text
    if (!formData.paidBy) {
      return t('paid_in_full', lang);
    }

    // Special handling for 2-user predefined setup
    if (predefinedMode && users.length === 2) {
      const otherUser = users.find(user => user !== formData.paidBy);
      // Always show "for" the other user (who benefits) regardless of who pays
      return otherUser ? `${t('paid_in_full_for', lang)} ${otherUser}` : t('paid_in_full', lang);
    }

    // General case with JS
    if (formData.paidBy === data.currentUser) {
      return t('paid_in_full_by_you', lang);
    } else {
      return `${t('paid_in_full_by', lang)} ${formData.paidBy}`;
    }
  });

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
        supportedCurrencies = ['CHF', ...data.currencies.filter((/** @type {string} */ c) => c !== 'CHF')];
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
      exchangeRateError = e instanceof Error ? e.message : String(e);
      currentExchangeRate = null;
      convertedAmount = null;
    } finally {
      loadingExchangeRate = false;
    }
  }

  function handleImageSelected(/** @type {CustomEvent} */ event) {
    imageFile = event.detail;
  }

  function handleImageError(/** @type {CustomEvent} */ event) {
    error = event.detail;
  }

  function handleImageRemoved() {
    imageFile = null;
    imagePreview = '';
  }

  function addSplitForUser(/** @type {string} */ username) {
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
        personalAmount: formData.splitMethod === 'personal_equal' ? (personalAmounts[user] || 0) : undefined
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
      await goto(`/${root}/dash`);

    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
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
        const recurringPayment = /** @type {any} */ ({
          ...recurringData,
          startDate: new Date(recurringData.startDate)
        });
        const nextDate = calculateNextExecutionDate(recurringPayment, new Date(recurringData.startDate));
        nextExecutionPreview = nextDate.toLocaleString(loc, {
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

  $effect(() => {
    if (recurringData.cronExpression) {
      validateCron();
    }
  });

  $effect(() => {
    if (recurringData.frequency || recurringData.cronExpression || recurringData.startDate || formData.isRecurring) {
      updateNextExecutionPreview();
    }
  });

  // Fetch exchange rate when currency, amount, or date changes
  $effect(() => {
    if (jsEnhanced && formData.currency && formData.currency !== 'CHF' && formData.date && formData.amount) {
      // Add a small delay to avoid excessive API calls while user is typing
      clearTimeout(exchangeRateTimeout);
      exchangeRateTimeout = setTimeout(fetchExchangeRate, 300);
    }
  });
</script>

<svelte:head>
  <title>{t('add_payment_title', lang)} - {t('cospend', lang)}</title>
</svelte:head>

<main class="add-payment">
  <div class="header">
    <h1 class="sr-only">{t('add_payment_title', lang)}</h1>
    <p>{t('add_payment_subtitle', lang)}</p>
  </div>

  <form method="POST" use:enhance class="payment-form">
    <div class="form-section">
      <h2>{t('payment_details_section', lang)}</h2>
      
      <div class="form-group">
        <label for="title">{t('title_label', lang)}</label>
        <input 
          type="text" 
          id="title" 
          name="title"
          value={formData.title}
          required 
          placeholder={t('title_placeholder', lang)}
        />
      </div>

      <div class="form-group">
        <label for="description">{t('description_label', lang)}</label>
        <textarea 
          id="description" 
          name="description"
          value={formData.description} 
          placeholder={t('description_placeholder', lang)}
          rows="3"
        ></textarea>
      </div>

      <div class="form-group">
        <label for="category">{t('category_star', lang)}</label>
        <select id="category" name="category" value={formData.category} required>
          {#each categoryOptions as option}
            <option value={option.value}>{option.label}</option>
          {/each}
        </select>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label for="amount">{t('amount_label', lang)}</label>
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
              <small class="help-text">{t('conversion_hint', lang)}</small>
              
              {#if loadingExchangeRate}
                <div class="conversion-preview loading">
                  <small>🔄 {t('fetching_rate', lang)}</small>
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
          <label for="date">{t('payment_date', lang)}</label>
          <DatePicker bind:value={formData.date} {lang} />
          <input type="hidden" name="date" value={formData.date} />
          {#if formData.currency !== 'CHF'}
            <small class="help-text">{t('exchange_rate_date', lang)}</small>
          {/if}
        </div>
      </div>

      <div class="form-group">
        <label for="paidBy">{t('paid_by_form', lang)}</label>
        <select id="paidBy" name="paidBy" bind:value={formData.paidBy} required>
          {#each users as user}
            <option value={user}>{user}</option>
          {/each}
        </select>
      </div>

      <div class="form-group">
        <label class="checkbox-label">
          <Toggle bind:checked={formData.isRecurring} />
          <span>{t('make_recurring', lang)}</span>
          <input type="hidden" name="isRecurring" value={formData.isRecurring ? 'true' : 'false'} />
        </label>
      </div>
    </div>

    {#if formData.isRecurring}
      <div class="form-section">
        <h2>{t('recurring_section', lang)}</h2>
        
        <div class="recurring-options">
          <div class="form-row">
            <div class="form-group">
              <label for="frequency">{t('frequency_label', lang)}</label>
              <select id="frequency" name="recurringFrequency" bind:value={recurringData.frequency} required>
                <option value="daily">{t('freq_daily', lang)}</option>
                <option value="weekly">{t('freq_weekly', lang)}</option>
                <option value="monthly">{t('freq_monthly', lang)}</option>
                <option value="quarterly">{t('freq_quarterly', lang)}</option>
                <option value="yearly">{t('freq_yearly', lang)}</option>
                <option value="custom">{t('freq_custom', lang)}</option>
              </select>
            </div>

            <div class="form-group">
              <label for="recurringStartDate">{t('start_date', lang)}</label>
              <DatePicker bind:value={recurringData.startDate} {lang} />
              <input type="hidden" name="recurringStartDate" value={recurringData.startDate} />
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
            <label for="recurringEndDate">{t('end_date_optional', lang)}</label>
            <DatePicker bind:value={recurringData.endDate} min={recurringData.startDate} {lang} />
            <input type="hidden" name="recurringEndDate" value={recurringData.endDate} />
            <small class="help-text">{t('end_date_hint', lang)}</small>
          </div>


          {#if nextExecutionPreview}
            <div class="execution-preview">
              <h3>{t('next_execution_preview', lang)}</h3>
              <p class="next-execution">{nextExecutionPreview}</p>
              <p class="frequency-description">{frequencyDescription(/** @type {any} */ (recurringData), lang)}</p>
            </div>
          {/if}
        </div>
      </div>
    {/if}

    <ImageUpload
      bind:imagePreview={imagePreview}
      bind:imageFile={imageFile}
      bind:uploading={uploading}
      {lang}
      onimageSelected={(file) => { imageFile = file; }}
      onimageRemoved={handleImageRemoved}
      onerror={(message) => { error = message; }}
    />

    <UsersList
      bind:users={users}
      bind:newUser={newUser}
      currentUser={data.session?.user?.nickname || data.currentUser}
      predefinedMode={predefinedMode}
      canRemoveUsers={!predefinedMode}
      {lang}
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

    <SaveFab disabled={loading} label={t('create_payment', lang)} />
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

  .header p {
    margin: 0;
    color: var(--color-text-secondary);
    font-size: 1.1rem;
  }

  .payment-form {
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  .form-section {
    background: var(--color-surface);
    padding: 1.5rem;
    border-radius: 0.75rem;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    border: 1px solid var(--color-border);
  }

  .form-section h2 {
    margin-top: 0;
    margin-bottom: 1rem;
    color: var(--color-text-primary);
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





  .error {
    background-color: var(--color-bg-secondary);
    color: var(--red);
    padding: 1rem;
    border-radius: 0.5rem;
    margin-bottom: 1rem;
    border: 1px solid var(--red);
  }

  /* Progressive enhancement styles */
  .no-js-only {
    display: block;
  }

  :global(body.js-loaded) .no-js-only {
    display: none;
  }

  .manual-users textarea {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid var(--color-border);
    border-radius: 0.5rem;
    font-family: inherit;
    font-size: 0.9rem;
    resize: vertical;
  }

  .manual-users p {
    margin: 0 0 0.5rem 0;
    font-size: 0.9rem;
    color: var(--color-text-secondary);
  }

  /* Recurring payment styles */
  .checkbox-label {
    display: flex !important;
    align-items: center;
    gap: 0.75rem;
    cursor: pointer;
  }

  .recurring-options {
    margin-top: 1rem;
    padding: 1rem;
    background-color: var(--color-bg-tertiary);
    border-radius: 0.5rem;
    border: 1px solid var(--color-border);
  }

  .help-text {
    display: block;
    margin-top: 0.25rem;
    font-size: 0.8rem;
    color: var(--color-text-secondary);
    font-style: italic;
  }

  .help-text p {
    margin: 0.5rem 0 0.25rem 0;
  }

  .help-text code {
    background-color: var(--color-bg-tertiary);
    padding: 0.125rem 0.25rem;
    border-radius: 0.25rem;
    font-family: monospace;
    font-size: 0.85em;
    border: 1px solid var(--color-border);
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
    background-color: var(--color-bg-tertiary);
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
    color: var(--color-text-secondary);
    font-size: 0.9rem;
    margin: 0;
    font-style: italic;
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

  @media (max-width: 600px) {
    .add-payment {
      padding: 1rem;
    }

    .form-row {
      grid-template-columns: 1fr;
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