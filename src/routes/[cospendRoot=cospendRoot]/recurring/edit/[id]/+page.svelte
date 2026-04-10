<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { detectCospendLang, cospendRoot, locale, t, getCategoryOptionsI18n, frequencyDescription } from '$lib/js/cospendI18n';
  import { PREDEFINED_USERS, isPredefinedUsersMode } from '$lib/config/users';
  import { validateCronExpression, calculateNextExecutionDate } from '$lib/utils/recurring';
  import ProfilePicture from '$lib/components/cospend/ProfilePicture.svelte';
  import SplitMethodSelector from '$lib/components/cospend/SplitMethodSelector.svelte';
  import UsersList from '$lib/components/cospend/UsersList.svelte';
  import SaveFab from '$lib/components/SaveFab.svelte';
  import DatePicker from '$lib/components/DatePicker.svelte';

  let { data } = $props();

  const lang = $derived(detectCospendLang($page.url.pathname));
  const root = $derived(cospendRoot(lang));
  const loc = $derived(locale(lang));

  // svelte-ignore state_referenced_locally
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

  /** @type {string[]} */
  let users = $state([]);
  let newUser = $state('');
  /** @type {Record<string, number>} */
  let splitAmounts = $state({});
  /** @type {Record<string, number>} */
  let personalAmounts = $state({});
  let loading = $state(false);
  let loadingPayment = $state(true);
  /** @type {string | null} */
  let error = $state(null);
  let predefinedMode = $state(isPredefinedUsersMode());
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
  let jsEnhanced = $state(false);

  let categoryOptions = $derived(getCategoryOptionsI18n(lang));

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
        splits: [],
        frequency: payment.frequency,
        cronExpression: payment.cronExpression || '',
        startDate: new Date(payment.startDate).toISOString().split('T')[0],
        endDate: payment.endDate ? new Date(payment.endDate).toISOString().split('T')[0] : '',
        isActive: payment.isActive
      };

      // Set up users and splits
      users = payment.splits.map((/** @type {any} */ split) => split.username);
      users.forEach(user => {
        const split = payment.splits.find((/** @type {any} */ s) => s.username === user);
        splitAmounts[user] = split.amount;
        if (split.personalAmount !== undefined) {
          personalAmounts[user] = split.personalAmount;
        }
      });

      updateNextExecutionPreview();

    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
    } finally {
      loadingPayment = false;
    }
  }

  function addSplitForUser(/** @type {string} */ username) {
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
        const recurringPayment = /** @type {any} */ ({
          ...formData,
          startDate: new Date(formData.startDate)
        });
        const nextDate = calculateNextExecutionDate(recurringPayment, new Date(formData.startDate));
        nextExecutionPreview = nextDate.toLocaleString(loc, {
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
        personalAmount: formData.splitMethod === 'personal_equal' ? (personalAmounts[user] || 0) : undefined
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
      await goto(`/${root}/recurring`);

    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
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
        supportedCurrencies = ['CHF', ...data.currencies.filter((/** @type {string} */ c) => c !== 'CHF')];
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
      exchangeRateError = e instanceof Error ? e.message : String(e);
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
  <title>{t('edit_recurring_title', lang)} - {t('cospend', lang)}</title>
</svelte:head>

<main class="edit-recurring-payment">
  <div class="header">
    <h1>{t('edit_recurring_title', lang)}</h1>
  </div>

  {#if loadingPayment}
    <div class="loading">{t('loading_recurring', lang)}</div>
  {:else if error && !formData.title}
    <div class="error">Error: {error}</div>
  {:else}
    <form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }
  } class="payment-form">
      <div class="form-section">
        <h2>{t('payment_details_section', lang)}</h2>
        
        <div class="form-group">
          <label for="title">{t('title_label', lang)}</label>
          <input 
            type="text" 
            id="title" 
            bind:value={formData.title} 
            required 
            placeholder={t('title_placeholder', lang)}
          />
        </div>

        <div class="form-group">
          <label for="description">{t('description_label', lang)}</label>
          <textarea 
            id="description" 
            bind:value={formData.description} 
            placeholder={t('description_placeholder', lang)}
            rows="3"
          ></textarea>
        </div>

        <div class="form-group">
          <label for="category">{t('category_star', lang)}</label>
          <select id="category" bind:value={formData.category} required>
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
            <label for="paidBy">{t('paid_by_form', lang)}</label>
            <select id="paidBy" bind:value={formData.paidBy} required>
              {#each users as user}
                <option value={user}>{user}</option>
              {/each}
            </select>
          </div>
        </div>

        <div class="form-group">
          <label for="isActive">{t('status_label', lang)}</label>
          <select id="isActive" bind:value={formData.isActive}>
            <option value={true}>{t('active', lang)}</option>
            <option value={false}>{t('inactive', lang)}</option>
          </select>
        </div>
      </div>

      <div class="form-section">
        <h2>{t('recurring_schedule', lang)}</h2>
        
        <div class="form-row">
          <div class="form-group">
            <label for="frequency">{t('frequency_label', lang)}</label>
            <select id="frequency" bind:value={formData.frequency} required>
              <option value="daily">{t('freq_daily', lang)}</option>
              <option value="weekly">{t('freq_weekly', lang)}</option>
              <option value="monthly">{t('freq_monthly', lang)}</option>
              <option value="custom">{t('freq_custom', lang)}</option>
            </select>
          </div>

          <div class="form-group">
            <label for="startDate">{t('start_date', lang)}</label>
            <DatePicker bind:value={formData.startDate} {lang} />
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
          <label for="endDate">{t('end_date_optional', lang)}</label>
          <DatePicker bind:value={formData.endDate} {lang} />
          <div class="help-text">{t('end_date_hint', lang)}</div>
        </div>

        {#if nextExecutionPreview}
          <div class="execution-preview">
            <h3>{t('next_execution_preview', lang)}</h3>
            <p class="next-execution">{nextExecutionPreview}</p>
            <p class="frequency-description">{frequencyDescription(/** @type {any} */ (formData), lang)}</p>
          </div>
        {/if}
      </div>

      <UsersList
        bind:users={users}
        bind:newUser={newUser}
        currentUser={data.session?.user?.nickname}
        {predefinedMode}
        canRemoveUsers={!predefinedMode}
        {lang}
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

      <SaveFab disabled={loading || cronError} label={t('save_changes', lang)} />
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
    color: var(--color-text-primary);
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
    background: var(--color-bg-tertiary);
    color: var(--color-text-primary);
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
    color: var(--color-text-secondary);
    font-size: 0.9rem;
  }

  .help-text code {
    background-color: var(--color-bg-tertiary);
    padding: 0.125rem 0.25rem;
    border-radius: 0.25rem;
    font-family: monospace;
    color: var(--color-text-primary);
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

  .error {
    background-color: var(--color-bg-secondary);
    color: var(--red);
    padding: 1rem;
    border-radius: 0.5rem;
    margin-bottom: 1rem;
    border: 1px solid var(--red);
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
    .edit-recurring-payment {
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