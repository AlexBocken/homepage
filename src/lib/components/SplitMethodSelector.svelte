<script lang="ts">
  import ProfilePicture from './ProfilePicture.svelte';

  let {
    splitMethod = $bindable('equal'),
    users = $bindable([]),
    amount = $bindable(0),
    paidBy = $bindable(''),
    splitAmounts = $bindable({}),
    personalAmounts = $bindable({}),
    currentUser = $bindable(''),
    predefinedMode = $bindable(false),
    currency = $bindable('CHF')
  } = $props<{
    splitMethod?: string,
    users?: string[],
    amount?: number,
    paidBy?: string,
    splitAmounts?: Record<string, number>,
    personalAmounts?: Record<string, number>,
    currentUser?: string,
    predefinedMode?: boolean,
    currency?: string
  }>();

  let personalTotalError = $state(false);

  // Reactive text for "Paid in Full" option
  let paidInFullText = $derived((() => {
    if (!paidBy) {
      return 'Paid in Full';
    }
    
    // Special handling for 2-user predefined setup
    if (predefinedMode && users.length === 2) {
      const otherUser = users.find(user => user !== paidBy);
      return otherUser ? `Paid in Full for ${otherUser}` : 'Paid in Full';
    }
    
    // General case
    if (paidBy === currentUser) {
      return 'Paid in Full by You';
    } else {
      return `Paid in Full by ${paidBy}`;
    }
  })());
  
  function calculateEqualSplits() {
    if (!amount || users.length === 0) return;
    
    const amountNum = parseFloat(amount);
    const splitAmount = amountNum / users.length;
    
    users.forEach(user => {
      if (user === paidBy) {
        splitAmounts[user] = splitAmount - amountNum;
      } else {
        splitAmounts[user] = splitAmount;
      }
    });
  }

  function calculateFullPayment() {
    if (!amount) return;
    
    const amountNum = parseFloat(amount);
    const otherUsers = users.filter(user => user !== paidBy);
    const amountPerOtherUser = otherUsers.length > 0 ? amountNum / otherUsers.length : 0;
    
    users.forEach(user => {
      if (user === paidBy) {
        splitAmounts[user] = -amountNum;
      } else {
        splitAmounts[user] = amountPerOtherUser;
      }
    });
  }

  function calculatePersonalEqualSplit() {
    if (!amount || users.length === 0) return;
    
    const totalAmount = parseFloat(amount);
    
    const totalPersonal = users.reduce((sum, user) => {
      return sum + (parseFloat(personalAmounts[user]) || 0);
    }, 0);
    
    const remainder = Math.max(0, totalAmount - totalPersonal);
    const equalShare = remainder / users.length;
    
    users.forEach(user => {
      const personalAmount = parseFloat(personalAmounts[user]) || 0;
      const totalOwed = personalAmount + equalShare;
      
      if (user === paidBy) {
        splitAmounts[user] = totalOwed - totalAmount;
      } else {
        splitAmounts[user] = totalOwed;
      }
    });
  }

  function handleSplitMethodChange() {
    if (splitMethod === 'equal') {
      calculateEqualSplits();
    } else if (splitMethod === 'full') {
      calculateFullPayment();
    } else if (splitMethod === 'personal_equal') {
      calculatePersonalEqualSplit();
    } else if (splitMethod === 'proportional') {
      users.forEach(user => {
        if (!(user in splitAmounts)) {
          splitAmounts[user] = 0;
        }
      });
    }
  }

  // Validate and recalculate when personal amounts change
  $effect(() => {
    if (splitMethod === 'personal_equal' && personalAmounts && amount) {
      const totalPersonal = Object.values(personalAmounts).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
      const totalAmount = parseFloat(amount);
      personalTotalError = totalPersonal > totalAmount;

      if (!personalTotalError) {
        calculatePersonalEqualSplit();
      }
    }
  });

  $effect(() => {
    if (amount && splitMethod && paidBy) {
      handleSplitMethodChange();
    }
  });
</script>

<div class="form-section">
  <h2>Split Method</h2>
  
  <div class="form-group">
    <label for="splitMethod">How should this payment be split?</label>
    <select id="splitMethod" name="splitMethod" bind:value={splitMethod} required>
      <option value="equal">{predefinedMode && users.length === 2 ? 'Split 50/50' : 'Equal Split'}</option>
      <option value="personal_equal">Personal + Equal Split</option>
      <option value="full">{paidInFullText}</option>
      <option value="proportional">Custom Proportions</option>
    </select>
  </div>

  {#if splitMethod === 'proportional'}
    <div class="proportional-splits">
      <h3>Custom Split Amounts</h3>
      {#each users as user}
        <div class="split-input">
          <label for="split_{user}">{user}</label>
          <input
            id="split_{user}"
            type="number"
            step="0.01"
            name="split_{user}"
            bind:value={splitAmounts[user]}
            placeholder="0.00"
          />
        </div>
      {/each}
    </div>
  {/if}

  {#if splitMethod === 'personal_equal'}
    <div class="personal-splits">
      <h3>Personal Amounts</h3>
      <p class="description">Enter personal amounts for each user. The remainder will be split equally.</p>
      {#each users as user}
        <div class="split-input">
          <label for="personal_{user}">{user}</label>
          <input
            id="personal_{user}"
            type="number"
            step="0.01"
            min="0"
            name="personal_{user}"
            bind:value={personalAmounts[user]}
            placeholder="0.00"
          />
        </div>
      {/each}
      {#if amount}
        <div class="remainder-info" class:error={personalTotalError}>
          <span>Total Personal: {currency} {Object.values(personalAmounts).reduce((sum, val) => sum + (parseFloat(val) || 0), 0).toFixed(2)}</span>
          <span>Remainder to Split: {currency} {Math.max(0, parseFloat(amount) - Object.values(personalAmounts).reduce((sum, val) => sum + (parseFloat(val) || 0), 0)).toFixed(2)}</span>
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
              owes {currency} {splitAmounts[user].toFixed(2)}
            {:else if splitAmounts[user] < 0}
              is owed {currency} {Math.abs(splitAmounts[user]).toFixed(2)}
            {:else}
              owes {currency} {splitAmounts[user].toFixed(2)}
            {/if}
          </span>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
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

  select {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid var(--nord4);
    border-radius: 0.5rem;
    font-size: 1rem;
    box-sizing: border-box;
    background-color: var(--nord6);
    color: var(--nord0);
  }

  select:focus {
    outline: none;
    border-color: var(--blue);
    box-shadow: 0 0 0 2px rgba(94, 129, 172, 0.2);
  }

  @media (prefers-color-scheme: dark) {
    select {
      background-color: var(--nord2);
      color: var(--font-default-dark);
      border-color: var(--nord3);
    }
  }

  .proportional-splits, .personal-splits {
    margin-top: 1rem;
  }

  .proportional-splits {
    border: 1px solid var(--nord4);
    border-radius: 0.5rem;
    padding: 1rem;
    margin-bottom: 1rem;
    background-color: var(--nord5);
  }

  @media (prefers-color-scheme: dark) {
    .proportional-splits {
      border-color: var(--nord3);
      background-color: var(--nord2);
    }
  }

  .proportional-splits h3, .personal-splits h3 {
    margin-top: 0;
    margin-bottom: 1rem;
    color: var(--nord0);
  }

  @media (prefers-color-scheme: dark) {
    .proportional-splits h3, .personal-splits h3 {
      color: var(--font-default-dark);
    }
  }

  .personal-splits .description {
    color: var(--nord2);
    font-size: 0.9rem;
    margin-bottom: 1rem;
    font-style: italic;
  }

  @media (prefers-color-scheme: dark) {
    .personal-splits .description {
      color: var(--nord4);
    }
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
    padding: 0.75rem;
    border: 1px solid var(--nord4);
    border-radius: 0.5rem;
    font-size: 1rem;
    background-color: var(--nord6);
    color: var(--nord0);
    box-sizing: border-box;
  }

  .split-input input:focus {
    outline: none;
    border-color: var(--blue);
    box-shadow: 0 0 0 2px rgba(94, 129, 172, 0.2);
  }

  @media (prefers-color-scheme: dark) {
    .split-input input {
      background-color: var(--nord2);
      color: var(--font-default-dark);
      border-color: var(--nord3);
    }
  }

  .remainder-info {
    margin-top: 1rem;
    padding: 1rem;
    background-color: var(--nord5);
    border-radius: 0.5rem;
    border: 1px solid var(--nord4);
  }

  .remainder-info.error {
    background-color: var(--nord6);
    border-color: var(--red);
  }

  @media (prefers-color-scheme: dark) {
    .remainder-info {
      background-color: var(--nord2);
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
  }

  .error-message {
    color: var(--red);
    font-weight: 600;
    margin-top: 0.5rem;
    font-size: 0.9rem;
  }

  .split-preview {
    background-color: var(--nord5);
    padding: 1rem;
    border-radius: 0.5rem;
    border: 1px solid var(--nord4);
  }

  @media (prefers-color-scheme: dark) {
    .split-preview {
      background-color: var(--nord2);
      border-color: var(--nord3);
    }
  }

  .split-preview h3 {
    margin-top: 0;
    margin-bottom: 1rem;
    color: var(--nord0);
  }

  @media (prefers-color-scheme: dark) {
    .split-preview h3 {
      color: var(--font-default-dark);
    }
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

  .username {
    color: var(--nord0);
  }

  @media (prefers-color-scheme: dark) {
    .username {
      color: var(--font-default-dark);
    }
  }

  .amount.positive {
    color: var(--green);
    font-weight: 500;
  }

  .amount.negative {
    color: var(--red);
    font-weight: 500;
  }
</style>