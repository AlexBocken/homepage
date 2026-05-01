<script>
  import ProfilePicture from './ProfilePicture.svelte';
  import { page } from '$app/state';
  import { detectCospendLang, m } from '$lib/js/cospendI18n';

  const lang = $derived(detectCospendLang(page.url.pathname));
  const t = $derived(m[lang]);

  let {
    splitMethod = $bindable('equal'),
    users = $bindable(/** @type {string[]} */ ([])),
    amount = $bindable(/** @type {number} */ (0)),
    paidBy = $bindable(''),
    splitAmounts = $bindable(/** @type {Record<string, number>} */ ({})),
    personalAmounts = $bindable(/** @type {Record<string, number>} */ ({})),
    currentUser = $bindable(''),
    predefinedMode = $bindable(false),
    currency = $bindable('CHF')
  } = $props();

  let personalTotalError = $state(false);

  // Reactive text for "Paid in Full" option
  let paidInFullText = $derived((() => {
    if (!paidBy) {
      return t.paid_in_full;
    }

    // Special handling for 2-user predefined setup
    if (predefinedMode && users.length === 2) {
      const otherUser = users.find((/** @type {string} */ user) => user !== paidBy);
      return otherUser ? `${t.paid_in_full_for} ${otherUser}` : t.paid_in_full;
    }

    // General case
    if (paidBy === currentUser) {
      return t.paid_in_full_by_you;
    } else {
      return `${t.paid_in_full_by} ${paidBy}`;
    }
  })());

  function calculateEqualSplits() {
    if (!amount || users.length === 0) return;

    const amountNum = Number(amount);
    const splitAmount = amountNum / users.length;

    users.forEach((/** @type {string} */ user) => {
      if (user === paidBy) {
        splitAmounts[user] = splitAmount - amountNum;
      } else {
        splitAmounts[user] = splitAmount;
      }
    });
  }

  function calculateFullPayment() {
    if (!amount) return;

    const amountNum = Number(amount);
    const otherUsers = users.filter((/** @type {string} */ user) => user !== paidBy);
    const amountPerOtherUser = otherUsers.length > 0 ? amountNum / otherUsers.length : 0;

    users.forEach((/** @type {string} */ user) => {
      if (user === paidBy) {
        splitAmounts[user] = -amountNum;
      } else {
        splitAmounts[user] = amountPerOtherUser;
      }
    });
  }

  function calculatePersonalEqualSplit() {
    if (!amount || users.length === 0) return;

    const totalAmount = Number(amount);

    const totalPersonal = users.reduce((/** @type {number} */ sum, /** @type {string} */ user) => {
      return sum + (Number(personalAmounts[user]) || 0);
    }, 0);

    const remainder = Math.max(0, totalAmount - totalPersonal);
    const equalShare = remainder / users.length;

    users.forEach((/** @type {string} */ user) => {
      const personalAmount = Number(personalAmounts[user]) || 0;
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
      users.forEach((/** @type {string} */ user) => {
        if (!(user in splitAmounts)) {
          splitAmounts[user] = 0;
        }
      });
    }
  }

  // Validate and recalculate when personal amounts change
  $effect(() => {
    if (splitMethod === 'personal_equal' && personalAmounts && amount) {
      /** @type {number} */
      const totalPersonal = Object.values(personalAmounts).reduce((/** @type {number} */ sum, /** @type {number} */ val) => sum + (Number(val) || 0), 0);
      const totalAmount = Number(amount);
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
  <h2>{t.split_method}</h2>

  <div class="form-group">
    <label for="splitMethod">{t.how_split}</label>
    <select id="splitMethod" name="splitMethod" bind:value={splitMethod} required>
      <option value="equal">{predefinedMode && users.length === 2 ? t.split_5050 : t.equal_split}</option>
      <option value="personal_equal">{t.personal_equal_split}</option>
      <option value="full">{paidInFullText}</option>
      <option value="proportional">{t.custom_proportions}</option>
    </select>
  </div>

  {#if splitMethod === 'proportional'}
    <div class="proportional-splits">
      <h3>{t.custom_split_amounts}</h3>
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
      <h3>{t.personal_amounts}</h3>
      <p class="description">{t.personal_amounts_desc}</p>
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
        {@const personalTotal = Object.values(personalAmounts).reduce((/** @type {number} */ sum, /** @type {number} */ val) => sum + (Number(val) || 0), 0)}
        <div class="remainder-info" class:error={personalTotalError}>
          <span>{t.total_personal}: {currency} {personalTotal.toFixed(2)}</span>
          <span>{t.remainder_to_split}: {currency} {Math.max(0, Number(amount) - personalTotal).toFixed(2)}</span>
          {#if personalTotalError}
            <div class="error-message">{t.personal_exceeds_total}</div>
          {/if}
        </div>
      {/if}
    </div>
  {/if}

  {#if Object.keys(splitAmounts).length > 0}
    <div class="split-preview">
      <h3>{t.split_preview}</h3>
      {#each users as user}
        <div class="split-item">
          <div class="split-user">
            <ProfilePicture username={user} size={24} />
            <span class="username">{user}</span>
          </div>
          <span class="amount" class:positive={splitAmounts[user] < 0} class:negative={splitAmounts[user] > 0}>
            {#if splitAmounts[user] > 0}
              {t.owes} {currency} {splitAmounts[user].toFixed(2)}
            {:else if splitAmounts[user] < 0}
              {t.is_owed} {currency} {Math.abs(splitAmounts[user]).toFixed(2)}
            {:else}
              {t.owes} {currency} {splitAmounts[user].toFixed(2)}
            {/if}
          </span>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
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

  label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
    color: var(--color-text-secondary);
  }

  select {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid var(--color-border);
    border-radius: 0.5rem;
    font-size: 1rem;
    box-sizing: border-box;
    background-color: var(--color-bg-tertiary);
    color: var(--color-text-primary);
  }

  select:focus {
    outline: none;
    border-color: var(--blue);
    box-shadow: 0 0 0 2px rgba(94, 129, 172, 0.2);
  }

  .proportional-splits, .personal-splits {
    margin-top: 1rem;
  }

  .proportional-splits {
    border: 1px solid var(--color-border);
    border-radius: 0.5rem;
    padding: 1rem;
    margin-bottom: 1rem;
    background-color: var(--color-bg-tertiary);
  }

  .proportional-splits h3, .personal-splits h3 {
    margin-top: 0;
    margin-bottom: 1rem;
    color: var(--color-text-primary);
  }

  .personal-splits .description {
    color: var(--color-text-secondary);
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
    padding: 0.75rem;
    border: 1px solid var(--color-border);
    border-radius: 0.5rem;
    font-size: 1rem;
    background-color: var(--color-bg-tertiary);
    color: var(--color-text-primary);
    box-sizing: border-box;
  }

  .split-input input:focus {
    outline: none;
    border-color: var(--blue);
    box-shadow: 0 0 0 2px rgba(94, 129, 172, 0.2);
  }

  .remainder-info {
    margin-top: 1rem;
    padding: 1rem;
    background-color: var(--color-bg-tertiary);
    border-radius: 0.5rem;
    border: 1px solid var(--color-border);
  }

  .remainder-info.error {
    background-color: var(--color-bg-secondary);
    border-color: var(--red);
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
    background-color: var(--color-bg-tertiary);
    padding: 1rem;
    border-radius: 0.5rem;
    border: 1px solid var(--color-border);
  }

  .split-preview h3 {
    margin-top: 0;
    margin-bottom: 1rem;
    color: var(--color-text-primary);
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
    color: var(--color-text-primary);
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
