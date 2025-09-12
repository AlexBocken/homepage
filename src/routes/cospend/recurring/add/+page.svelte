<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { getCategoryOptions } from '$lib/utils/categories';
  import { PREDEFINED_USERS, isPredefinedUsersMode } from '$lib/config/users';
  import { validateCronExpression, getFrequencyDescription, calculateNextExecutionDate } from '$lib/utils/recurring';
  import ProfilePicture from '$lib/components/ProfilePicture.svelte';
  
  export let data;

  let formData = {
    title: '',
    description: '',
    amount: '',
    paidBy: data.session?.user?.nickname || '',
    category: 'groceries',
    splitMethod: 'equal',
    splits: [],
    frequency: 'monthly',
    cronExpression: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: ''
  };

  let users = [];
  let newUser = '';
  let splitAmounts = {};
  let personalAmounts = {};
  let loading = false;
  let error = null;
  let personalTotalError = false;
  let predefinedMode = isPredefinedUsersMode();
  let cronError = false;
  let nextExecutionPreview = '';
  
  $: categoryOptions = getCategoryOptions();

  onMount(() => {
    if (predefinedMode) {
      users = [...PREDEFINED_USERS];
      users.forEach(user => addSplitForUser(user));
      if (data.session?.user?.nickname && PREDEFINED_USERS.includes(data.session.user.nickname)) {
        formData.paidBy = data.session.user.nickname;
      } else {
        formData.paidBy = PREDEFINED_USERS[0];
      }
    } else {
      if (data.session?.user?.nickname) {
        users = [data.session.user.nickname];
        addSplitForUser(data.session.user.nickname);
      }
    }
    updateNextExecutionPreview();
  });

  function addUser() {
    if (predefinedMode) return;
    
    if (newUser.trim() && !users.includes(newUser.trim())) {
      users = [...users, newUser.trim()];
      addSplitForUser(newUser.trim());
      newUser = '';
    }
  }

  function removeUser(userToRemove) {
    if (predefinedMode) return;
    
    if (users.length > 1 && userToRemove !== data.session.user.nickname) {
      users = users.filter(u => u !== userToRemove);
      delete splitAmounts[userToRemove];
      splitAmounts = { ...splitAmounts };
    }
  }

  function addSplitForUser(username) {
    if (!splitAmounts[username]) {
      splitAmounts[username] = 0;
      splitAmounts = { ...splitAmounts };
    }
  }

  function calculateEqualSplits() {
    if (!formData.amount || users.length === 0) return;
    
    const amountNum = parseFloat(formData.amount);
    const splitAmount = amountNum / users.length;
    
    users.forEach(user => {
      if (user === formData.paidBy) {
        splitAmounts[user] = splitAmount - amountNum;
      } else {
        splitAmounts[user] = splitAmount;
      }
    });
    splitAmounts = { ...splitAmounts };
  }

  function calculateFullPayment() {
    if (!formData.amount) return;
    
    const amountNum = parseFloat(formData.amount);
    const otherUsers = users.filter(user => user !== formData.paidBy);
    const amountPerOtherUser = otherUsers.length > 0 ? amountNum / otherUsers.length : 0;
    
    users.forEach(user => {
      if (user === formData.paidBy) {
        splitAmounts[user] = -amountNum; // They paid it all, so they're owed the full amount
      } else {
        splitAmounts[user] = amountPerOtherUser; // Others owe their share of the full amount
      }
    });
    splitAmounts = { ...splitAmounts };
  }

  function calculatePersonalEqualSplit() {
    if (!formData.amount || users.length === 0) return;
    
    const totalAmount = parseFloat(formData.amount);
    
    const totalPersonal = users.reduce((sum, user) => {
      return sum + (parseFloat(personalAmounts[user]) || 0);
    }, 0);
    
    const remainder = Math.max(0, totalAmount - totalPersonal);
    const equalShare = remainder / users.length;
    
    users.forEach(user => {
      const personalAmount = parseFloat(personalAmounts[user]) || 0;
      const totalOwed = personalAmount + equalShare;
      
      if (user === formData.paidBy) {
        splitAmounts[user] = totalOwed - totalAmount;
      } else {
        splitAmounts[user] = totalOwed;
      }
    });
    splitAmounts = { ...splitAmounts };
  }

  function handleSplitMethodChange() {
    if (formData.splitMethod === 'equal') {
      calculateEqualSplits();
    } else if (formData.splitMethod === 'full') {
      calculateFullPayment();
    } else if (formData.splitMethod === 'personal_equal') {
      calculatePersonalEqualSplit();
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

    if (formData.splitMethod === 'personal_equal') {
      const totalPersonal = Object.values(personalAmounts).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
      const totalAmount = parseFloat(formData.amount);
      
      if (totalPersonal > totalAmount) {
        error = 'Personal amounts cannot exceed the total payment amount';
        return;
      }
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

      const response = await fetch('/api/cospend/recurring-payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create recurring payment');
      }

      const result = await response.json();
      await goto('/cospend/recurring');

    } catch (err) {
      error = err.message;
    } finally {
      loading = false;
    }
  }

  $: if (formData.amount && formData.splitMethod && formData.paidBy) {
    handleSplitMethodChange();
  }

  $: if (formData.splitMethod === 'personal_equal' && personalAmounts && formData.amount) {
    const totalPersonal = Object.values(personalAmounts).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
    const totalAmount = parseFloat(formData.amount);
    personalTotalError = totalPersonal > totalAmount;
    
    if (!personalTotalError) {
      calculatePersonalEqualSplit();
    }
  }

  $: if (formData.cronExpression) {
    validateCron();
  }

  $: if (formData.frequency || formData.cronExpression || formData.startDate) {
    updateNextExecutionPreview();
  }
</script>

<svelte:head>
  <title>Add Recurring Payment - Cospend</title>
</svelte:head>

<main class="add-recurring-payment">
  <div class="header">
    <h1>Add Recurring Payment</h1>
    <a href="/cospend" class="back-link">← Back to Cospend</a>
  </div>

  <form on:submit|preventDefault={handleSubmit} class="payment-form">
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
          <label for="amount">Amount (CHF) *</label>
          <input 
            type="number" 
            id="amount" 
            bind:value={formData.amount} 
            required 
            min="0" 
            step="0.01"
            placeholder="0.00"
          />
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

    <div class="form-section">
      <h2>Split Between Users</h2>
      
      {#if predefinedMode}
        <div class="predefined-users">
          <p class="predefined-note">Splitting between predefined users:</p>
          <div class="users-list">
            {#each users as user}
              <div class="user-item with-profile">
                <ProfilePicture username={user} size={32} />
                <span class="username">{user}</span>
                {#if user === data.session?.user?.nickname}
                  <span class="you-badge">You</span>
                {/if}
              </div>
            {/each}
          </div>
        </div>
      {:else}
        <div class="users-list">
          {#each users as user}
            <div class="user-item with-profile">
              <ProfilePicture username={user} size={32} />
              <span class="username">{user}</span>
              {#if user !== data.session.user.nickname}
                <button type="button" class="remove-user" on:click={() => removeUser(user)}>
                  Remove
                </button>
              {/if}
            </div>
          {/each}
        </div>

        <div class="add-user">
          <input 
            type="text" 
            bind:value={newUser} 
            placeholder="Add user..."
            on:keydown={(e) => e.key === 'Enter' && (e.preventDefault(), addUser())}
          />
          <button type="button" on:click={addUser}>Add User</button>
        </div>
      {/if}
    </div>

    <div class="form-section">
      <h2>Split Method</h2>
      
      <div class="split-method">
        <label>
          <input type="radio" bind:group={formData.splitMethod} value="equal" />
          {predefinedMode && users.length === 2 ? 'Split 50/50' : 'Equal Split'}
        </label>
        <label>
          <input type="radio" bind:group={formData.splitMethod} value="personal_equal" />
          Personal + Equal Split
        </label>
        <label>
          <input type="radio" bind:group={formData.splitMethod} value="full" />
          Paid in Full by {formData.paidBy}
        </label>
        <label>
          <input type="radio" bind:group={formData.splitMethod} value="proportional" />
          Custom Proportions
        </label>
      </div>

      {#if formData.splitMethod === 'proportional'}
        <div class="proportional-splits">
          <h3>Custom Split Amounts</h3>
          {#each users as user}
            <div class="split-input">
              <label>{user}</label>
              <input 
                type="number" 
                step="0.01" 
                bind:value={splitAmounts[user]}
                placeholder="0.00"
              />
            </div>
          {/each}
        </div>
      {/if}

      {#if formData.splitMethod === 'personal_equal'}
        <div class="personal-splits">
          <h3>Personal Amounts</h3>
          <p class="description">Enter personal amounts for each user. The remainder will be split equally.</p>
          {#each users as user}
            <div class="split-input">
              <label>{user}</label>
              <input 
                type="number" 
                step="0.01" 
                min="0"
                bind:value={personalAmounts[user]}
                placeholder="0.00"
              />
            </div>
          {/each}
          {#if formData.amount}
            <div class="remainder-info" class:error={personalTotalError}>
              <span>Total Personal: CHF {Object.values(personalAmounts).reduce((sum, val) => sum + (parseFloat(val) || 0), 0).toFixed(2)}</span>
              <span>Remainder to Split: CHF {Math.max(0, parseFloat(formData.amount) - Object.values(personalAmounts).reduce((sum, val) => sum + (parseFloat(val) || 0), 0)).toFixed(2)}</span>
              {#if personalTotalError}
                <div class="error-message">⚠️ Personal amounts exceed total payment amount!</div>
              {/if}
            </div>
          {/if}
        </div>
      {/if}

      {#if Object.keys(splitAmounts).length > 0}
        <div class="split-preview">
          <h3>Split Preview</h3>
          {#each users as user}
            <div class="split-item">
              <div class="split-user">
                <ProfilePicture username={user} size={24} />
                <span class="username">{user}</span>
              </div>
              <span class="amount" class:positive={splitAmounts[user] < 0} class:negative={splitAmounts[user] > 0}>
                {#if splitAmounts[user] > 0}
                  owes CHF {splitAmounts[user].toFixed(2)}
                {:else if splitAmounts[user] < 0}
                  is owed CHF {Math.abs(splitAmounts[user]).toFixed(2)}
                {:else}
                  owes CHF {splitAmounts[user].toFixed(2)}
                {/if}
              </span>
            </div>
          {/each}
        </div>
      {/if}
    </div>

    {#if error}
      <div class="error">{error}</div>
    {/if}

    <div class="form-actions">
      <button type="button" class="btn-secondary" on:click={() => goto('/cospend')}>
        Cancel
      </button>
      <button type="submit" class="btn-primary" disabled={loading || cronError}>
        {loading ? 'Creating...' : 'Create Recurring Payment'}
      </button>
    </div>
  </form>
</main>

<style>
  .add-recurring-payment {
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
    color: #333;
  }

  .back-link {
    color: #1976d2;
    text-decoration: none;
  }

  .payment-form {
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  .form-section {
    background: white;
    padding: 1.5rem;
    border-radius: 0.75rem;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .form-section h2 {
    margin-top: 0;
    margin-bottom: 1rem;
    color: #333;
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
    color: #555;
  }

  input, textarea, select {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #ddd;
    border-radius: 0.5rem;
    font-size: 1rem;
    box-sizing: border-box;
  }

  input:focus, textarea:focus, select:focus {
    outline: none;
    border-color: #1976d2;
    box-shadow: 0 0 0 2px rgba(25, 118, 210, 0.2);
  }

  input.error {
    border-color: #d32f2f;
  }

  .help-text {
    margin-top: 0.5rem;
    color: #666;
    font-size: 0.9rem;
  }

  .help-text code {
    background-color: #f5f5f5;
    padding: 0.125rem 0.25rem;
    border-radius: 0.25rem;
    font-family: monospace;
  }

  .help-text ul {
    margin: 0.5rem 0;
    padding-left: 1rem;
  }

  .help-text li {
    margin-bottom: 0.25rem;
  }

  .field-error {
    color: #d32f2f;
    font-size: 0.875rem;
    margin-top: 0.25rem;
  }

  .execution-preview {
    background-color: #e3f2fd;
    border: 1px solid #2196f3;
    border-radius: 0.5rem;
    padding: 1rem;
    margin-top: 1rem;
  }

  .execution-preview h3 {
    margin: 0 0 0.5rem 0;
    color: #1976d2;
    font-size: 1rem;
  }

  .next-execution {
    font-size: 1.1rem;
    font-weight: 600;
    color: #1976d2;
    margin: 0.5rem 0;
  }

  .frequency-description {
    color: #666;
    font-size: 0.9rem;
    margin: 0;
    font-style: italic;
  }

  .users-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }

  .user-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background-color: #f5f5f5;
    padding: 0.5rem 0.75rem;
    border-radius: 1rem;
  }

  .user-item.with-profile {
    gap: 0.75rem;
  }

  .user-item .username {
    font-weight: 500;
  }

  .you-badge {
    background-color: #1976d2;
    color: white;
    padding: 0.125rem 0.5rem;
    border-radius: 1rem;
    font-size: 0.75rem;
    font-weight: 500;
  }

  .predefined-users {
    background-color: #f8f9fa;
    padding: 1rem;
    border-radius: 0.5rem;
    border: 1px solid #e9ecef;
  }

  .predefined-note {
    margin: 0 0 1rem 0;
    color: #666;
    font-size: 0.9rem;
    font-style: italic;
  }

  .remove-user {
    background-color: #d32f2f;
    color: white;
    border: none;
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    font-size: 0.75rem;
    cursor: pointer;
  }

  .add-user {
    display: flex;
    gap: 0.5rem;
  }

  .add-user input {
    flex: 1;
  }

  .add-user button {
    background-color: #1976d2;
    color: white;
    border: none;
    padding: 0.75rem 1rem;
    border-radius: 0.5rem;
    cursor: pointer;
  }

  .split-method {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    margin-bottom: 1rem;
  }

  .split-method label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
  }

  .proportional-splits, .personal-splits {
    border: 1px solid #ddd;
    border-radius: 0.5rem;
    padding: 1rem;
    margin-bottom: 1rem;
  }

  .proportional-splits h3, .personal-splits h3 {
    margin-top: 0;
    margin-bottom: 1rem;
  }

  .personal-splits .description {
    color: #666;
    font-size: 0.9rem;
    margin-bottom: 1rem;
    font-style: italic;
  }

  .split-input {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 0.5rem;
  }

  .split-input label {
    min-width: 100px;
    margin-bottom: 0;
  }

  .split-input input {
    max-width: 120px;
  }

  .remainder-info {
    margin-top: 1rem;
    padding: 1rem;
    background-color: #f8f9fa;
    border-radius: 0.5rem;
    border: 1px solid #e9ecef;
  }

  .remainder-info.error {
    background-color: #fff5f5;
    border-color: #fed7d7;
  }

  .remainder-info span {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
  }

  .error-message {
    color: #d32f2f;
    font-weight: 600;
    margin-top: 0.5rem;
    font-size: 0.9rem;
  }

  .split-preview {
    background-color: #f8f9fa;
    padding: 1rem;
    border-radius: 0.5rem;
  }

  .split-preview h3 {
    margin-top: 0;
    margin-bottom: 1rem;
  }

  .split-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
  }

  .split-user {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .amount.positive {
    color: #2e7d32;
    font-weight: 500;
  }

  .amount.negative {
    color: #d32f2f;
    font-weight: 500;
  }

  .error {
    background-color: #ffebee;
    color: #d32f2f;
    padding: 1rem;
    border-radius: 0.5rem;
    margin-bottom: 1rem;
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
    background-color: #1976d2;
    color: white;
    border: none;
  }

  .btn-primary:hover:not(:disabled) {
    background-color: #1565c0;
  }

  .btn-primary:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .btn-secondary {
    background-color: #f5f5f5;
    color: #333;
    border: 1px solid #ddd;
  }

  .btn-secondary:hover {
    background-color: #e8e8e8;
  }

  @media (max-width: 600px) {
    .add-recurring-payment {
      padding: 1rem;
    }

    .form-row {
      grid-template-columns: 1fr;
    }

    .form-actions {
      flex-direction: column;
    }
  }
</style>