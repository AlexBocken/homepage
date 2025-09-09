<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import ProfilePicture from '$lib/components/ProfilePicture.svelte';
  import { PREDEFINED_USERS, isPredefinedUsersMode } from '$lib/config/users';

  export let data;

  let debtData = {
    whoOwesMe: [],
    whoIOwe: [],
    totalOwedToMe: 0,
    totalIOwe: 0
  };
  let loading = true;
  let error = null;
  let selectedSettlement = null;
  let settlementAmount = '';
  let submitting = false;
  let predefinedMode = isPredefinedUsersMode();

  onMount(async () => {
    await fetchDebtData();
  });

  async function fetchDebtData() {
    try {
      loading = true;
      const response = await fetch('/api/cospend/debts');
      if (!response.ok) {
        throw new Error('Failed to fetch debt data');
      }
      debtData = await response.json();
      
      // For predefined mode with 2 users, auto-select the debt if there's only one
      if (predefinedMode && PREDEFINED_USERS.length === 2) {
        const totalDebts = debtData.whoOwesMe.length + debtData.whoIOwe.length;
        if (totalDebts === 1) {
          if (debtData.whoOwesMe.length === 1) {
            selectedSettlement = {
              type: 'receive',
              from: debtData.whoOwesMe[0].username,
              to: data.session?.user?.nickname,
              amount: debtData.whoOwesMe[0].netAmount,
              description: `Settlement: ${debtData.whoOwesMe[0].username} pays ${data.session?.user?.nickname}`
            };
            settlementAmount = debtData.whoOwesMe[0].netAmount.toString();
          } else if (debtData.whoIOwe.length === 1) {
            selectedSettlement = {
              type: 'pay',
              from: data.session?.user?.nickname,
              to: debtData.whoIOwe[0].username,
              amount: debtData.whoIOwe[0].netAmount,
              description: `Settlement: ${data.session?.user?.nickname} pays ${debtData.whoIOwe[0].username}`
            };
            settlementAmount = debtData.whoIOwe[0].netAmount.toString();
          }
        }
      }
    } catch (err) {
      error = err.message;
    } finally {
      loading = false;
    }
  }

  function selectSettlement(type, user, amount) {
    const currentUser = data.session?.user?.nickname;
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

    if (amount > selectedSettlement.amount) {
      error = 'Settlement amount cannot exceed the debt amount';
      return;
    }

    try {
      submitting = true;
      error = null;

      // Create a settlement payment
      const payload = {
        title: `Settlement Payment`,
        description: selectedSettlement.description,
        amount: amount,
        paidBy: selectedSettlement.from,
        date: new Date().toISOString().split('T')[0],
        category: 'settlement', // Using settlement category
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

      // Redirect back to dashboard
      goto('/cospend');
    } catch (err) {
      error = err.message;
    } finally {
      submitting = false;
    }
  }

  function formatCurrency(amount) {
    return new Intl.NumberFormat('de-CH', {
      style: 'currency',
      currency: 'CHF'
    }).format(amount);
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
                   class:selected={selectedSettlement?.type === 'receive' && selectedSettlement?.from === debt.username}
                   on:click={() => selectSettlement('receive', debt.username, debt.netAmount)}>
                <div class="settlement-user">
                  <ProfilePicture username={debt.username} size={40} />
                  <div class="user-details">
                    <span class="username">{debt.username}</span>
                    <span class="debt-amount">owes you {formatCurrency(debt.netAmount)}</span>
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
                   class:selected={selectedSettlement?.type === 'pay' && selectedSettlement?.to === debt.username}
                   on:click={() => selectSettlement('pay', debt.username, debt.netAmount)}>
                <div class="settlement-user">
                  <ProfilePicture username={debt.username} size={40} />
                  <div class="user-details">
                    <span class="username">{debt.username}</span>
                    <span class="debt-amount">you owe {formatCurrency(debt.netAmount)}</span>
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
                {#if selectedSettlement.from === data.session?.user?.nickname}
                  <span class="you-badge">You</span>
                {/if}
              </div>
              <div class="flow-arrow">→</div>
              <div class="user-to">
                <ProfilePicture username={selectedSettlement.to} size={48} />
                <span class="username">{selectedSettlement.to}</span>
                {#if selectedSettlement.to === data.session?.user?.nickname}
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
                  max={selectedSettlement.amount}
                  bind:value={settlementAmount}
                  placeholder="0.00"
                />
              </div>
              <small class="max-amount">
                Maximum: {formatCurrency(selectedSettlement.amount)}
              </small>
            </div>

            <div class="settlement-description">
              <strong>Description:</strong> {selectedSettlement.description}
            </div>
          </div>

          <div class="settlement-actions">
            <button 
              class="btn btn-settlement" 
              on:click={processSettlement}
              disabled={submitting || !settlementAmount}>
              {#if submitting}
                Recording Settlement...
              {:else}
                Record Settlement
              {/if}
            </button>
            <button class="btn btn-secondary" on:click={() => selectedSettlement = null}>
              Cancel
            </button>
          </div>
        </div>
      {/if}
    </div>

    <div class="back-actions">
      <a href="/cospend" class="btn btn-secondary">← Back to Dashboard</a>
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
    color: #333;
    margin-bottom: 0.5rem;
  }

  .header-section p {
    color: #666;
    font-size: 1.1rem;
  }

  .loading, .error {
    text-align: center;
    padding: 2rem;
    font-size: 1.1rem;
  }

  .error {
    color: #d32f2f;
    background-color: #ffebee;
    border-radius: 0.5rem;
    margin-bottom: 1rem;
  }

  .no-debts {
    text-align: center;
    padding: 3rem 2rem;
    background: white;
    border-radius: 1rem;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .no-debts h2 {
    color: #28a745;
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
    background: white;
    padding: 1.5rem;
    border-radius: 1rem;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .settlement-section {
    margin-bottom: 2rem;
  }

  .settlement-section h3 {
    color: #333;
    margin-bottom: 1rem;
    font-size: 1.1rem;
  }

  .settlement-option {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    border: 2px solid #e9ecef;
    border-radius: 0.75rem;
    margin-bottom: 0.75rem;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .settlement-option:hover {
    border-color: #28a745;
    box-shadow: 0 2px 8px rgba(40, 167, 69, 0.1);
  }

  .settlement-option.selected {
    border-color: #28a745;
    background-color: #f8fff9;
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
    color: #333;
  }

  .debt-amount {
    color: #666;
    font-size: 0.9rem;
  }

  .settlement-action {
    color: #28a745;
    font-weight: 500;
  }

  .settlement-details {
    background: white;
    padding: 1.5rem;
    border-radius: 1rem;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
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
    background-color: #f8f9fa;
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
    color: #28a745;
    font-weight: bold;
  }

  .you-badge {
    background-color: #1976d2;
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
    color: #333;
  }

  .amount-input {
    display: flex;
    align-items: center;
    background: #f8f9fa;
    border: 1px solid #ced4da;
    border-radius: 0.375rem;
    padding: 0.5rem;
  }

  .currency {
    color: #666;
    font-weight: 500;
    margin-right: 0.5rem;
  }

  .amount-input input {
    border: none;
    background: none;
    flex: 1;
    padding: 0.25rem;
    font-size: 1rem;
  }

  .amount-input input:focus {
    outline: none;
  }

  .max-amount {
    color: #666;
    font-size: 0.85rem;
    margin-top: 0.25rem;
    display: block;
  }

  .settlement-description {
    color: #333;
    font-size: 0.9rem;
    padding: 1rem;
    background-color: #f8f9fa;
    border-radius: 0.375rem;
  }

  .settlement-actions {
    display: flex;
    gap: 1rem;
    justify-content: center;
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
    background-color: #1976d2;
    color: white;
  }

  .btn-primary:hover {
    background-color: #1565c0;
  }

  .btn-secondary {
    background-color: #f5f5f5;
    color: #333;
    border: 1px solid #ddd;
  }

  .btn-secondary:hover {
    background-color: #e8e8e8;
  }

  .btn-settlement {
    background: linear-gradient(135deg, #28a745, #20c997);
    color: white;
  }

  .btn-settlement:hover:not(:disabled) {
    background: linear-gradient(135deg, #20c997, #1e7e34);
  }

  .btn-settlement:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .back-actions {
    text-align: center;
    margin-top: 2rem;
  }

  .actions {
    margin-top: 1.5rem;
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