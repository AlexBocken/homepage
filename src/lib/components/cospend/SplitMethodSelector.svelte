<script>
  import { untrack } from 'svelte';
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

  // The person who owes everything under "paid for the other" (2-user setups)
  let otherUser = $derived(users.find((/** @type {string} */ u) => u !== paidBy) || '');

  // Split-method cards: title + one-line description; the diagram is keyed off value
  let methods = $derived([
    { value: 'equal', title: (predefinedMode && users.length === 2) ? t.split_5050 : t.equal_split, desc: t.split_desc_equal },
    { value: 'personal_equal', title: t.personal_equal_split, desc: t.split_desc_personal },
    { value: 'full', title: t.split_full_title, desc: otherUser ? `${otherUser} ${t.owes_full}` : t.split_desc_full },
    { value: 'proportional', title: t.custom_proportions, desc: t.split_desc_custom }
  ]);

  // Live ledger rows for the preview; ledgerMax scales the proportional bars
  let ledger = $derived(users.map((/** @type {string} */ user) => ({
    user,
    value: Number(splitAmounts[user]) || 0
  })));
  let ledgerMax = $derived(Math.max(1, ...ledger.map((/** @type {{value:number}} */ r) => Math.abs(r.value))));

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

  // Validate and recalculate when personal amounts change.
  // Inputs are read outside untrack to register them as dependencies; the
  // mutations (which write the bindable splitAmounts/personalTotalError) run
  // inside untrack so writing them doesn't re-trigger this effect.
  $effect(() => {
    if (splitMethod === 'personal_equal' && personalAmounts && amount) {
      /** @type {number} */
      const totalPersonal = Object.values(personalAmounts).reduce((/** @type {number} */ sum, /** @type {number} */ val) => sum + (Number(val) || 0), 0);
      const totalAmount = Number(amount);
      // touch inputs so paidBy/users changes also recalculate
      void paidBy;
      void users.length;

      untrack(() => {
        personalTotalError = totalPersonal > totalAmount;
        if (!personalTotalError) {
          calculatePersonalEqualSplit();
        }
      });
    }
  });

  $effect(() => {
    if (amount && splitMethod && paidBy) {
      // touch users so member changes recalculate
      void users.length;
      untrack(() => handleSplitMethodChange());
    }
  });
</script>

<div class="form-section">
  <h2>{t.split_method}</h2>
  <p class="section-hint">{t.how_split}</p>

  <div class="method-cards" role="radiogroup" aria-label={t.split_method}>
    {#each methods as method (method.value)}
      <button
        type="button"
        role="radio"
        aria-checked={splitMethod === method.value}
        class="method-card"
        class:selected={splitMethod === method.value}
        onclick={() => splitMethod = method.value}
      >
        <span class="dgm dgm-{method.value}" aria-hidden="true">
          {#if method.value === 'equal'}
            <i></i><i></i>
          {:else if method.value === 'personal_equal'}
            <i class="accent"></i><i></i><i></i>
          {:else if method.value === 'full'}
            <i class="solo"></i>
          {:else}
            <i style="flex:0.5"></i><i style="flex:1.7"></i><i style="flex:1"></i>
          {/if}
        </span>
        <span class="method-text">
          <span class="method-title">{method.title}</span>
          <span class="method-desc">{method.desc}</span>
        </span>
      </button>
    {/each}
  </div>
  <input type="hidden" name="splitMethod" value={splitMethod} />

  {#if splitMethod === 'proportional'}
    <div class="proportional-splits">
      <h3>{t.custom_split_amounts}</h3>
      {#each users as user (user)}
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
      {#each users as user (user)}
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

  {#if amount && ledger.length > 0}
    <div class="ledger">
      <div class="ledger-head">
        <ProfilePicture username={paidBy} size={30} />
        <span class="ledger-payer">{paidBy}</span>
        <span class="ledger-paid-label">{t.paid_verb}</span>
        <span class="ledger-total">{currency} {Number(amount).toFixed(2)}</span>
      </div>
      <div class="ledger-rows">
        {#each ledger as row (row.user)}
          {@const owes = row.value > 0.005}
          {@const back = row.value < -0.005}
          <div class="ledger-row">
            <ProfilePicture username={row.user} size={26} />
            <span class="ledger-name">{row.user}</span>
            <span class="ledger-track">
              <i
                class:owe={owes}
                class:back={back}
                style="width:{Math.min(100, Math.abs(row.value) / ledgerMax * 100)}%"
              ></i>
            </span>
            <span class="ledger-chip" class:owe={owes} class:back={back}>
              {#if owes}
                {t.owes} {currency} {row.value.toFixed(2)}
              {:else if back}
                {t.is_owed} {currency} {Math.abs(row.value).toFixed(2)}
              {:else}
                {t.settled_up}
              {/if}
            </span>
          </div>
        {/each}
      </div>
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
    margin-bottom: 0.25rem;
    color: var(--color-text-primary);
    font-size: 1.25rem;
  }

  .section-hint {
    margin: 0 0 1rem;
    color: var(--color-text-secondary);
    font-size: 0.9rem;
  }

  label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
    color: var(--color-text-secondary);
  }

  /* ── Split-method cards ── */
  .method-cards {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.6rem;
  }

  .method-card {
    all: unset;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    gap: 0.7rem;
    padding: 0.7rem 0.8rem;
    border-radius: var(--radius-md);
    border: 1.5px solid var(--color-border);
    background: var(--color-bg-tertiary);
    cursor: pointer;
    transition: border-color 120ms, background 120ms, transform 120ms;
  }

  .method-card:hover {
    border-color: var(--color-primary);
    background: var(--color-bg-elevated);
  }

  .method-card:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }

  .method-card.selected {
    border-color: var(--color-primary);
    background: color-mix(in srgb, var(--color-primary) 12%, var(--color-surface));
  }

  /* Mini split diagrams: a track divided to mirror each method's shape */
  .dgm {
    display: flex;
    align-items: stretch;
    gap: 2px;
    width: 40px;
    height: 26px;
    flex-shrink: 0;
    padding: 3px;
    border-radius: var(--radius-sm);
    background: var(--color-bg-secondary);
  }

  .dgm i {
    flex: 1;
    border-radius: 2px;
    background: var(--color-text-tertiary);
    opacity: 0.45;
  }

  .dgm i.accent { background: var(--blue); opacity: 0.85; }
  .dgm i.solo { background: var(--color-primary); opacity: 0.9; }

  .method-card.selected .dgm i { opacity: 0.7; }
  .method-card.selected .dgm i.accent,
  .method-card.selected .dgm i.solo { opacity: 1; }

  .method-text {
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
    min-width: 0;
  }

  .method-title {
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--color-text-primary);
    line-height: 1.2;
  }

  .method-desc {
    font-size: 0.76rem;
    color: var(--color-text-secondary);
    line-height: 1.25;
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

  /* ── Live split ledger ── */
  .ledger {
    margin-top: 1.25rem;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background: var(--color-bg-tertiary);
    overflow: hidden;
  }

  .ledger-head {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.7rem 0.85rem;
    background: var(--color-bg-secondary);
    border-bottom: 1px solid var(--color-border);
  }

  .ledger-payer {
    font-weight: 600;
    color: var(--color-text-primary);
  }

  .ledger-paid-label {
    font-size: 0.78rem;
    color: var(--color-text-secondary);
  }

  .ledger-total {
    margin-left: auto;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    color: var(--color-text-primary);
  }

  .ledger-rows {
    display: flex;
    flex-direction: column;
  }

  .ledger-row {
    display: grid;
    grid-template-columns: auto auto 1fr auto;
    align-items: center;
    gap: 0.6rem;
    padding: 0.55rem 0.85rem;
  }

  .ledger-row + .ledger-row {
    border-top: 1px solid var(--color-border);
  }

  .ledger-name {
    font-size: 0.9rem;
    font-weight: 500;
    color: var(--color-text-primary);
  }

  .ledger-track {
    height: 7px;
    border-radius: var(--radius-pill);
    background: var(--color-bg-elevated);
    overflow: hidden;
  }

  .ledger-track i {
    display: block;
    height: 100%;
    border-radius: var(--radius-pill);
    background: var(--color-text-tertiary);
    transition: width 200ms ease;
  }

  .ledger-track i.owe { background: var(--orange); }
  .ledger-track i.back { background: var(--green); }

  .ledger-chip {
    justify-self: end;
    font-size: 0.78rem;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
    color: var(--color-text-secondary);
  }

  .ledger-chip.owe { color: var(--orange); }
  .ledger-chip.back { color: var(--green); }

  @media (max-width: 560px) {
    .method-cards { grid-template-columns: 1fr; }
    .ledger-row { grid-template-columns: auto 1fr auto; }
    .ledger-row .ledger-track { grid-column: 1 / -1; order: 3; }
  }
</style>
