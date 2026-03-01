<script>
  import { onMount } from 'svelte';
  import { enhance } from '$app/forms';
  import ProfilePicture from '$lib/components/cospend/ProfilePicture.svelte';
  import { PREDEFINED_USERS, isPredefinedUsersMode } from '$lib/config/users';


  import { formatCurrency } from '$lib/utils/formatters';

  let { data, form } = $props();

  // Use server-side data with progressive enhancement
  let debtData = $state(data.debtData || {
    whoOwesMe: [],
    whoIOwe: [],
    totalOwedToMe: 0,
    totalIOwe: 0
  });
  let loading = $state(false); // Start as false since we have server data
  let error = $state(data.error || form?.error || null);
  let selectedSettlement = $state(null);
  let settlementAmount = $state(form?.values?.amount || '');
  let submitting = $state(false);
  let predefinedMode = isPredefinedUsersMode();

  onMount(() => {
    // For predefined mode with 2 users, auto-select the debt if there's only one
    if (predefinedMode && PREDEFINED_USERS.length === 2) {
      const totalDebts = debtData.whoOwesMe.length + debtData.whoIOwe.length;
      if (totalDebts === 1) {
        if (debtData.whoOwesMe.length === 1) {
          selectedSettlement = {
            type: 'receive',
            from: debtData.whoOwesMe[0].username,
            to: data.currentUser,
            amount: debtData.whoOwesMe[0].netAmount,
            description: `Settlement: ${debtData.whoOwesMe[0].username} pays ${data.currentUser}`
          };
          if (!settlementAmount) {
            settlementAmount = debtData.whoOwesMe[0].netAmount.toString();
          }
        } else if (debtData.whoIOwe.length === 1) {
          selectedSettlement = {
            type: 'pay',
            from: data.currentUser,
            to: debtData.whoIOwe[0].username,
            amount: debtData.whoIOwe[0].netAmount,
            description: `Settlement: ${data.currentUser} pays ${debtData.whoIOwe[0].username}`
          };
          if (!settlementAmount) {
            settlementAmount = debtData.whoIOwe[0].netAmount.toString();
          }
        }
      }
    }
  });

  function selectSettlement(type, user, amount) {
    const currentUser = data.currentUser;
    if (type === 'receive') {
      selectedSettlement = {
        type: 'receive',
        from: user,
        to: currentUser,
        amount: amount,
        description: `Settlement: ${user} pays ${currentUser}`
      };
    } else {
      selectedSettlement = {
        type: 'pay',
        from: currentUser,
        to: user,
        amount: amount,
        description: `Settlement: ${currentUser} pays ${user}`
      };
    }
    settlementAmount = amount.toString();
  }

  async function processSettlement() {
    if (!selectedSettlement || !settlementAmount) {
      error = 'Please select a settlement and enter an amount';
      return;
    }

    const amount = parseFloat(settlementAmount);
    if (isNaN(amount) || amount <= 0) {
      error = 'Please enter a valid positive amount';
      return;
    }

    submitting = true;
    error = null;

    try {
      // Create a settlement payment directly using the API
      const payload = {
        title: 'Settlement Payment',
        description: selectedSettlement.description,
        amount: amount,
        paidBy: selectedSettlement.from,
        date: new Date().toISOString().split('T')[0],
        category: 'settlement',
        splitMethod: 'full',
        splits: [
          {
            username: selectedSettlement.from,
            amount: -amount // Payer gets negative (receives money back)
          },
          {
            username: selectedSettlement.to,
            amount: amount // Receiver owes money
          }
        ]
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
        throw new Error(errorData.message || 'Failed to record settlement');
      }

      // Redirect back to dashboard on success
      window.location.href = '/cospend';
    } catch (err) {
      error = err.message;
      submitting = false;
    }
  }

</script>

<svelte:head>
  <title>Settle Debts - Cospend</title>
</svelte:head>

<main class="settle-main">
  <div class="header-section">
    <h1>Settle Debts</h1>
    <p>Record payments to settle outstanding debts between users</p>
  </div>

  {#if loading}
    <div class="loading">Loading debt information...</div>
  {:else if error}
    <div class="error">Error: {error}</div>
  {:else if debtData.whoOwesMe.length === 0 && debtData.whoIOwe.length === 0}
    <div class="no-debts">
      <h2>🎉 All Settled!</h2>
      <p>No outstanding debts to settle. Everyone is even!</p>
      <div class="actions">
        <a href="/cospend" class="btn btn-primary">Back to Dashboard</a>
      </div>
    </div>
  {:else}
    <div class="settlement-container">
      <!-- Available Settlements -->
      <div class="available-settlements">
        <h2>Available Settlements</h2>

        {#if debtData.whoOwesMe.length > 0}
          <div class="settlement-section">
            <h3>Money You're Owed</h3>
            {#each debtData.whoOwesMe as debt}
              <div class="settlement-option"
                   role="button"
                   tabindex="0"
                   class:selected={selectedSettlement?.type === 'receive' && selectedSettlement?.from === debt.username}
                   onclick={() => selectSettlement('receive', debt.username, debt.netAmount)}
                   onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectSettlement('receive', debt.username, debt.netAmount); } }
  }>
                <div class="settlement-user">
                  <ProfilePicture username={debt.username} size={40} />
                  <div class="user-details">
                    <span class="username">{debt.username}</span>
                    <span class="debt-amount">owes you {formatCurrency(debt.netAmount, 'CHF', 'de-CH')}</span>
                  </div>
                </div>
                <div class="settlement-action">
                  <span class="action-text">Receive Payment</span>
                </div>
              </div>
            {/each}
          </div>
        {/if}

        {#if debtData.whoIOwe.length > 0}
          <div class="settlement-section">
            <h3>Money You Owe</h3>
            {#each debtData.whoIOwe as debt}
              <div class="settlement-option"
                   role="button"
                   tabindex="0"
                   class:selected={selectedSettlement?.type === 'pay' && selectedSettlement?.to === debt.username}
                   onclick={() => selectSettlement('pay', debt.username, debt.netAmount)}
                   onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectSettlement('pay', debt.username, debt.netAmount); } }
  }>
                <div class="settlement-user">
                  <ProfilePicture username={debt.username} size={40} />
                  <div class="user-details">
                    <span class="username">{debt.username}</span>
                    <span class="debt-amount">you owe {formatCurrency(debt.netAmount, 'CHF', 'de-CH')}</span>
                  </div>
                </div>
                <div class="settlement-action">
                  <span class="action-text">Make Payment</span>
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>

      <!-- Settlement Details -->
      {#if selectedSettlement}
        <div class="settlement-details">
          <h2>Settlement Details</h2>

          <div class="settlement-summary">
            <div class="settlement-flow">
              <div class="user-from">
                <ProfilePicture username={selectedSettlement.from} size={48} />
                <span class="username">{selectedSettlement.from}</span>
                {#if selectedSettlement.from === data.currentUser}
                  <span class="you-badge">You</span>
                {/if}
              </div>
              <div class="flow-arrow">→</div>
              <div class="user-to">
                <ProfilePicture username={selectedSettlement.to} size={48} />
                <span class="username">{selectedSettlement.to}</span>
                {#if selectedSettlement.to === data.currentUser}
                  <span class="you-badge">You</span>
                {/if}
              </div>
            </div>

            <div class="settlement-amount-section">
              <label for="amount">Settlement Amount</label>
              <div class="amount-input">
                <span class="currency">CHF</span>
                <input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  bind:value={settlementAmount}
                  placeholder="0.00"
                />
              </div>
              <small class="max-amount">
              </small>
            </div>

            <div class="settlement-description">
              <strong>Description:</strong> {selectedSettlement.description}
            </div>
          </div>

          <div class="settlement-actions">
            <button
              class="btn btn-settlement"
              onclick={processSettlement}
              disabled={submitting || !settlementAmount}>
              {#if submitting}
                Recording Settlement...
              {:else}
                Record Settlement
              {/if}
            </button>
            <button class="btn btn-secondary" onclick={() => selectedSettlement = null}>
              Cancel
            </button>
          </div>
        </div>
      {:else}
        <!-- No-JS Fallback Form -->
        <div class="settlement-details no-js-fallback">
          <h2>Record Settlement</h2>
          <form method="POST" action="?/settle" class="settlement-form">
            <div class="form-group">
              <label for="settlementType">Settlement Type</label>
              <select id="settlementType" name="settlementType" required>
                <option value="">Select settlement type</option>
                {#each debtData.whoOwesMe as debt}
                  <option value="receive" data-from="{debt.username}" data-to="{data.currentUser}">
                    Receive {formatCurrency(debt.netAmount, 'CHF', 'de-CH')} from {debt.username}
                  </option>
                {/each}
                {#each debtData.whoIOwe as debt}
                  <option value="pay" data-from="{data.currentUser}" data-to="{debt.username}">
                    Pay {formatCurrency(debt.netAmount, 'CHF', 'de-CH')} to {debt.username}
                  </option>
                {/each}
              </select>
            </div>

            <div class="form-group">
              <label for="fromUser">From User</label>
              <select id="fromUser" name="fromUser" required>
                <option value="">Select payer</option>
                {#each [...debtData.whoOwesMe.map(d => d.username), data.currentUser].filter(Boolean) as user}
                  <option value="{user}">{user}{user === data.currentUser ? ' (You)' : ''}</option>
                {/each}
              </select>
            </div>

            <div class="form-group">
              <label for="toUser">To User</label>
              <select id="toUser" name="toUser" required>
                <option value="">Select recipient</option>
                {#each [...debtData.whoIOwe.map(d => d.username), data.currentUser].filter(Boolean) as user}
                  <option value="{user}">{user}{user === data.currentUser ? ' (You)' : ''}</option>
                {/each}
              </select>
            </div>

            <div class="form-group">
              <label for="fallback-amount">Settlement Amount (CHF)</label>
              <input
                id="fallback-amount"
                name="amount"
                type="number"
                step="0.01"
                min="0.01"
                value={form?.values?.amount || ''}
                placeholder="0.00"
                required
              />
            </div>

            <div class="settlement-actions">
              <button type="submit" class="btn btn-settlement">
                Record Settlement
              </button>
              <a href="/cospend" class="btn btn-secondary">
                Cancel
              </a>
            </div>
          </form>
        </div>
      {/if}
    </div>

  {/if}
</main>

<style>
  .settle-main {
    max-width: 1000px;
    margin: 0 auto;
    padding: 2rem;
  }

  .header-section {
    text-align: center;
    margin-bottom: 2rem;
  }

  .header-section h1 {
    color: var(--nord0);
    margin-bottom: 0.5rem;
  }

  .header-section p {
    color: var(--nord3);
    font-size: 1.1rem;
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
    margin-bottom: 1rem;
  }

  .no-debts {
    text-align: center;
    padding: 3rem 2rem;
    background: var(--nord6);
    border-radius: 1rem;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    border: 1px solid var(--nord4);
  }

  .no-debts h2 {
    color: var(--green);
    margin-bottom: 1rem;
  }

  .settlement-container {
    display: grid;
    gap: 2rem;
    grid-template-columns: 1fr 1fr;
    margin-bottom: 2rem;
  }

  @media (max-width: 768px) {
    .settlement-container {
      grid-template-columns: 1fr;
    }
  }

  .available-settlements {
    background: var(--nord6);
    padding: 1.5rem;
    border-radius: 1rem;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    border: 1px solid var(--nord4);
  }

  .settlement-section {
    margin-bottom: 2rem;
  }

  .settlement-section h3 {
    color: var(--nord0);
    margin-bottom: 1rem;
    font-size: 1.1rem;
  }

  .settlement-option {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    border: 2px solid var(--nord4);
    border-radius: 0.75rem;
    margin-bottom: 0.75rem;
    cursor: pointer;
    transition: all 0.2s ease;
    background: var(--nord5);
  }

  .settlement-option:hover {
    border-color: var(--green);
    box-shadow: 0 2px 8px rgba(163, 190, 140, 0.1);
  }

  .settlement-option.selected {
    border-color: var(--green);
    background-color: var(--nord5);
  }

  .settlement-user {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex: 1;
  }

  .user-details {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .username {
    font-weight: 600;
    color: var(--nord0);
  }

  .debt-amount {
    color: var(--nord3);
    font-size: 0.9rem;
  }

  .settlement-action {
    color: var(--green);
    font-weight: 500;
  }

  .settlement-details {
    background: var(--nord6);
    padding: 1.5rem;
    border-radius: 1rem;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    border: 1px solid var(--nord4);
    height: fit-content;
  }

  .settlement-summary {
    margin-bottom: 1.5rem;
  }

  .settlement-flow {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    margin-bottom: 1.5rem;
    padding: 1rem;
    background-color: var(--nord5);
    border-radius: 0.5rem;
  }

  .user-from, .user-to {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
  }

  .flow-arrow {
    font-size: 1.5rem;
    color: var(--green);
    font-weight: bold;
  }

  .you-badge {
    background-color: var(--blue);
    color: white;
    padding: 0.125rem 0.5rem;
    border-radius: 1rem;
    font-size: 0.75rem;
    font-weight: 500;
  }

  .settlement-amount-section {
    margin-bottom: 1rem;
  }

  .settlement-amount-section label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 600;
    color: var(--nord0);
  }

  .amount-input {
    display: flex;
    align-items: center;
    background: var(--nord5);
    border: 1px solid var(--nord4);
    border-radius: 0.375rem;
    padding: 0.5rem;
  }

  .currency {
    color: var(--nord3);
    font-weight: 500;
    margin-right: 0.5rem;
  }

  .amount-input input {
    border: none;
    background: none;
    flex: 1;
    padding: 0.25rem;
    font-size: 1rem;
    color: var(--nord0);
  }

  .amount-input input:focus {
    outline: none;
  }

  .max-amount {
    color: var(--nord3);
    font-size: 0.85rem;
    margin-top: 0.25rem;
    display: block;
  }

  .settlement-description {
    color: var(--nord0);
    font-size: 0.9rem;
    padding: 1rem;
    background-color: var(--nord5);
    border-radius: 0.375rem;
  }

  .settlement-actions {
    display: flex;
    gap: 1rem;
    justify-content: center;
  }

  .settlement-form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .form-group label {
    font-weight: 600;
    color: var(--nord0);
  }

  .form-group select,
  .form-group input {
    padding: 0.75rem;
    border: 1px solid var(--nord4);
    border-radius: 0.375rem;
    font-size: 1rem;
    background-color: var(--nord5);
    color: var(--nord0);
  }

  .form-group select:focus,
  .form-group input:focus {
    outline: none;
    border-color: var(--blue);
    box-shadow: 0 0 0 2px rgba(94, 129, 172, 0.2);
  }

  .no-js-fallback {
    display: block;
  }

  :global(body:has(script)) .no-js-fallback {
    display: none;
  }

  .btn {
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: 0.375rem;
    font-weight: 600;
    cursor: pointer;
    text-decoration: none;
    display: inline-block;
    text-align: center;
    transition: all 0.2s ease;
  }

  .btn-primary {
    background-color: var(--blue);
    color: white;
  }

  .btn-primary:hover {
    background-color: var(--lightblue);
  }

  .btn-secondary {
    background-color: var(--nord5);
    color: var(--nord0);
    border: 1px solid var(--nord4);
  }

  .btn-secondary:hover {
    background-color: var(--nord4);
  }

  .btn-settlement {
    background: linear-gradient(135deg, var(--green), var(--lightblue));
    color: white;
  }

  .btn-settlement:hover:not(:disabled) {
    background: linear-gradient(135deg, var(--lightblue), var(--green));
  }

  .btn-settlement:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .actions {
    margin-top: 1.5rem;
  }

  @media (prefers-color-scheme: dark) {
    :global(:root:not([data-theme="light"])) .header-section h1 {
      color: var(--font-default-dark);
    }

    :global(:root:not([data-theme="light"])) .header-section p {
      color: var(--nord4);
    }

    :global(:root:not([data-theme="light"])) .error {
      background-color: var(--accent-dark);
    }

    :global(:root:not([data-theme="light"])) .no-debts {
      background: var(--accent-dark);
      border-color: var(--nord2);
    }

    :global(:root:not([data-theme="light"])) .available-settlements {
      background: var(--accent-dark);
      border-color: var(--nord2);
    }

    :global(:root:not([data-theme="light"])) .settlement-section h3 {
      color: var(--font-default-dark);
    }

    :global(:root:not([data-theme="light"])) .settlement-option {
      border-color: var(--nord2);
      background: var(--nord1);
    }

    :global(:root:not([data-theme="light"])) .settlement-option:hover {
      box-shadow: 0 2px 8px rgba(163, 190, 140, 0.2);
    }

    :global(:root:not([data-theme="light"])) .settlement-option.selected {
      background-color: var(--nord1);
    }

    :global(:root:not([data-theme="light"])) .username {
      color: var(--font-default-dark);
    }

    :global(:root:not([data-theme="light"])) .debt-amount {
      color: var(--nord4);
    }

    :global(:root:not([data-theme="light"])) .settlement-details {
      background: var(--accent-dark);
      border-color: var(--nord2);
    }

    :global(:root:not([data-theme="light"])) .settlement-flow {
      background-color: var(--nord1);
    }

    :global(:root:not([data-theme="light"])) .settlement-amount-section label {
      color: var(--font-default-dark);
    }

    :global(:root:not([data-theme="light"])) .amount-input {
      background: var(--nord1);
      border-color: var(--nord2);
    }

    :global(:root:not([data-theme="light"])) .currency {
      color: var(--nord4);
    }

    :global(:root:not([data-theme="light"])) .max-amount {
      color: var(--nord4);
    }

    :global(:root:not([data-theme="light"])) .settlement-description {
      color: var(--font-default-dark);
      background-color: var(--nord1);
    }

    :global(:root:not([data-theme="light"])) .amount-input input {
      color: var(--font-default-dark);
    }

    :global(:root:not([data-theme="light"])) .btn-secondary {
      background-color: var(--nord1);
      color: var(--font-default-dark);
      border-color: var(--nord2);
    }

    :global(:root:not([data-theme="light"])) .btn-secondary:hover {
      background-color: var(--nord2);
    }

    :global(:root:not([data-theme="light"])) .form-group label {
      color: var(--font-default-dark);
    }

    :global(:root:not([data-theme="light"])) .form-group select,
:global(:root:not([data-theme="light"])) .form-group input {
      background-color: var(--nord1);
      color: var(--font-default-dark);
      border-color: var(--nord2);
    }
  }
:global(:root[data-theme="dark"]) .header-section h1 {
	color: var(--font-default-dark);
}
:global(:root[data-theme="dark"]) .header-section p {
	color: var(--nord4);
}
:global(:root[data-theme="dark"]) .error {
	background-color: var(--accent-dark);
}
:global(:root[data-theme="dark"]) .no-debts {
	background: var(--accent-dark);
      border-color: var(--nord2);
}
:global(:root[data-theme="dark"]) .available-settlements {
	background: var(--accent-dark);
      border-color: var(--nord2);
}
:global(:root[data-theme="dark"]) .settlement-section h3 {
	color: var(--font-default-dark);
}
:global(:root[data-theme="dark"]) .settlement-option {
	border-color: var(--nord2);
      background: var(--nord1);
}
:global(:root[data-theme="dark"]) .settlement-option:hover {
	box-shadow: 0 2px 8px rgba(163, 190, 140, 0.2);
}
:global(:root[data-theme="dark"]) .settlement-option.selected {
	background-color: var(--nord1);
}
:global(:root[data-theme="dark"]) .username {
	color: var(--font-default-dark);
}
:global(:root[data-theme="dark"]) .debt-amount {
	color: var(--nord4);
}
:global(:root[data-theme="dark"]) .settlement-details {
	background: var(--accent-dark);
      border-color: var(--nord2);
}
:global(:root[data-theme="dark"]) .settlement-flow {
	background-color: var(--nord1);
}
:global(:root[data-theme="dark"]) .settlement-amount-section label {
	color: var(--font-default-dark);
}
:global(:root[data-theme="dark"]) .amount-input {
	background: var(--nord1);
      border-color: var(--nord2);
}
:global(:root[data-theme="dark"]) .currency {
	color: var(--nord4);
}
:global(:root[data-theme="dark"]) .max-amount {
	color: var(--nord4);
}
:global(:root[data-theme="dark"]) .settlement-description {
	color: var(--font-default-dark);
      background-color: var(--nord1);
}
:global(:root[data-theme="dark"]) .amount-input input {
	color: var(--font-default-dark);
}
:global(:root[data-theme="dark"]) .btn-secondary {
	background-color: var(--nord1);
      color: var(--font-default-dark);
      border-color: var(--nord2);
}
:global(:root[data-theme="dark"]) .btn-secondary:hover {
	background-color: var(--nord2);
}
:global(:root[data-theme="dark"]) .form-group label {
	color: var(--font-default-dark);
}
:global(:root[data-theme="dark"]) .form-group select,
:global(:root[data-theme="dark"]) .form-group input {
	background-color: var(--nord1);
      color: var(--font-default-dark);
      border-color: var(--nord2);
}

  @media (max-width: 600px) {
    .settle-main {
      padding: 1rem;
    }

    .settlement-flow {
      flex-direction: column;
      gap: 1rem;
    }

    .flow-arrow {
      transform: rotate(90deg);
    }

    .settlement-actions {
      flex-direction: column;
    }

    .btn {
      width: 100%;
    }
  }
</style>
