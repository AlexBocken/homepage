<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  
  export let data;

  let payment = null;
  let loading = true;
  let saving = false;
  let error = null;

  onMount(async () => {
    await loadPayment();
  });

  async function loadPayment() {
    try {
      const response = await fetch(`/api/cospend/payments/${data.paymentId}`);
      if (!response.ok) {
        throw new Error('Failed to load payment');
      }
      const result = await response.json();
      payment = result.payment;
    } catch (err) {
      error = err.message;
    } finally {
      loading = false;
    }
  }

  async function handleSubmit() {
    if (!payment) return;

    saving = true;
    error = null;

    try {
      const response = await fetch(`/api/cospend/payments/${data.paymentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payment)
      });

      if (!response.ok) {
        throw new Error('Failed to update payment');
      }

      await goto('/cospend/payments');
    } catch (err) {
      error = err.message;
    } finally {
      saving = false;
    }
  }

  function formatDate(dateString) {
    return new Date(dateString).toISOString().split('T')[0];
  }
</script>

<svelte:head>
  <title>Edit Payment - Cospend</title>
</svelte:head>

<main class="edit-payment">
  <div class="header">
    <h1>Edit Payment</h1>
    <a href="/cospend/payments" class="back-link">← Back to Payments</a>
  </div>

  {#if loading}
    <div class="loading">Loading payment...</div>
  {:else if error}
    <div class="error">Error: {error}</div>
  {:else if payment}
    <form on:submit|preventDefault={handleSubmit} class="payment-form">
      <div class="form-section">
        <h2>Payment Details</h2>
        
        <div class="form-group">
          <label for="title">Title *</label>
          <input 
            type="text" 
            id="title" 
            bind:value={payment.title} 
            required 
          />
        </div>

        <div class="form-group">
          <label for="description">Description</label>
          <textarea 
            id="description" 
            bind:value={payment.description} 
            rows="3"
          ></textarea>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="amount">Amount (CHF) *</label>
            <input 
              type="number" 
              id="amount" 
              bind:value={payment.amount} 
              required 
              min="0" 
              step="0.01"
            />
          </div>

          <div class="form-group">
            <label for="date">Date</label>
            <input 
              type="date" 
              id="date" 
              value={formatDate(payment.date)}
              on:change={(e) => payment.date = new Date(e.target.value).toISOString()}
              required
            />
          </div>
        </div>

        <div class="form-group">
          <label for="paidBy">Paid by</label>
          <input 
            type="text" 
            id="paidBy" 
            bind:value={payment.paidBy} 
            required
          />
        </div>
      </div>

      {#if payment.splits && payment.splits.length > 0}
        <div class="form-section">
          <h2>Current Splits</h2>
          <div class="splits-display">
            {#each payment.splits as split}
              <div class="split-item">
                <span>{split.username}</span>
                <span class:positive={split.amount < 0} class:negative={split.amount > 0}>
                  {#if split.amount > 0}
                    owes CHF {split.amount.toFixed(2)}
                  {:else if split.amount < 0}
                    owed CHF {Math.abs(split.amount).toFixed(2)}
                  {:else}
                    even
                  {/if}
                </span>
              </div>
            {/each}
          </div>
          <p class="note">Note: To modify splits, please delete and recreate the payment.</p>
        </div>
      {/if}

      <div class="form-actions">
        <button type="button" class="btn-secondary" on:click={() => goto('/cospend/payments')}>
          Cancel
        </button>
        <button type="submit" class="btn-primary" disabled={saving}>
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </form>
  {/if}
</main>

<style>
  .edit-payment {
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

  .loading, .error {
    text-align: center;
    padding: 2rem;
    font-size: 1.1rem;
  }

  .error {
    color: #d32f2f;
    background-color: #ffebee;
    border-radius: 0.5rem;
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

  input, textarea {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #ddd;
    border-radius: 0.5rem;
    font-size: 1rem;
    box-sizing: border-box;
  }

  input:focus, textarea:focus {
    outline: none;
    border-color: #1976d2;
    box-shadow: 0 0 0 2px rgba(25, 118, 210, 0.2);
  }

  .splits-display {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    margin-bottom: 1rem;
  }

  .split-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem;
    background-color: #f8f9fa;
    border-radius: 0.5rem;
  }

  .positive {
    color: #2e7d32;
    font-weight: 500;
  }

  .negative {
    color: #d32f2f;
    font-weight: 500;
  }

  .note {
    color: #666;
    font-size: 0.9rem;
    font-style: italic;
    margin: 0;
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
    .edit-payment {
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