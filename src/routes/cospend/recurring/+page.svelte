<script>
  import { onMount } from 'svelte';
  import { getCategoryEmoji, getCategoryName } from '$lib/utils/categories';
  import { getFrequencyDescription, formatNextExecution } from '$lib/utils/recurring';
  import ProfilePicture from '$lib/components/cospend/ProfilePicture.svelte';
  import AddButton from '$lib/components/AddButton.svelte';
  import { formatCurrency } from '$lib/utils/formatters';

  let { data } = $props();

  let recurringPayments = $state([]);
  let loading = $state(true);
  let error = $state(null);
  let showActiveOnly = $state(true);

  onMount(async () => {
    await fetchRecurringPayments();
  });

  async function fetchRecurringPayments() {
    try {
      loading = true;
      const activeParam = showActiveOnly ? '?active=true' : '';
      const response = await fetch(`/api/cospend/recurring-payments${activeParam}`);
      if (!response.ok) {
        throw new Error('Failed to fetch recurring payments');
      }
      const result = await response.json();
      recurringPayments = result.recurringPayments;
    } catch (err) {
      error = err.message;
    } finally {
      loading = false;
    }
  }

  async function toggleActiveStatus(paymentId, currentStatus) {
    try {
      const response = await fetch(`/api/cospend/recurring-payments/${paymentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isActive: !currentStatus })
      });

      if (!response.ok) {
        throw new Error('Failed to update payment status');
      }

      // Refresh the list
      await fetchRecurringPayments();
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  }

  async function deleteRecurringPayment(paymentId, title) {
    if (!confirm(`Are you sure you want to delete the recurring payment "${title}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/cospend/recurring-payments/${paymentId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete payment');
      }

      // Refresh the list
      await fetchRecurringPayments();
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  }

  function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('de-CH');
  }

  $effect(() => {
    if (showActiveOnly !== undefined) {
      fetchRecurringPayments();
    }
  });
</script>

<svelte:head>
  <title>Recurring Payments - Cospend</title>
</svelte:head>

<main class="recurring-payments">
  <div class="header">
    <h1>Recurring Payments</h1>
    <p>Automate your regular shared expenses</p>
  </div>

  <div class="filters">
    <label>
      <input type="checkbox" bind:checked={showActiveOnly} />
      Show active only
    </label>
  </div>

  {#if loading}
    <div class="loading">Loading recurring payments...</div>
  {:else if error}
    <div class="error">Error: {error}</div>
  {:else if recurringPayments.length === 0}
    <div class="empty-state">
      <h2>No recurring payments found</h2>
      <p>Create your first recurring payment to automate regular expenses like rent, utilities, or subscriptions.</p>
      <a href="/cospend/payments/add" class="btn btn-primary">Add Your First Payment</a>
    </div>
  {:else}
    <div class="payments-grid">
      {#each recurringPayments as payment}
        <div class="payment-card" class:inactive={!payment.isActive}>
          <div class="card-header">
            <div class="payment-title">
              <span class="category-emoji">{getCategoryEmoji(payment.category)}</span>
              <h3>{payment.title}</h3>
              <span class="status-badge" class:active={payment.isActive} class:inactive={!payment.isActive}>
                {payment.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div class="payment-amount">
              {formatCurrency(payment.amount, 'CHF', 'de-CH')}
            </div>
          </div>

          {#if payment.description}
            <p class="payment-description">{payment.description}</p>
          {/if}

          <div class="payment-details">
            <div class="detail-row">
              <span class="label">Category:</span>
              <span class="value">{getCategoryName(payment.category)}</span>
            </div>
            
            <div class="detail-row">
              <span class="label">Frequency:</span>
              <span class="value">{getFrequencyDescription(payment)}</span>
            </div>

            <div class="detail-row">
              <span class="label">Paid by:</span>
              <div class="payer-info">
                <ProfilePicture username={payment.paidBy} size={20} />
                <span class="value">{payment.paidBy}</span>
              </div>
            </div>

            <div class="detail-row">
              <span class="label">Next execution:</span>
              <span class="value next-execution">
                {formatNextExecution(new Date(payment.nextExecutionDate))}
              </span>
            </div>

            {#if payment.lastExecutionDate}
              <div class="detail-row">
                <span class="label">Last executed:</span>
                <span class="value">{formatDate(payment.lastExecutionDate)}</span>
              </div>
            {/if}

            {#if payment.endDate}
              <div class="detail-row">
                <span class="label">Ends:</span>
                <span class="value">{formatDate(payment.endDate)}</span>
              </div>
            {/if}
          </div>

          <div class="splits-preview">
            <h4>Split between:</h4>
            <div class="splits-list">
              {#each payment.splits as split}
                <div class="split-item">
                  <ProfilePicture username={split.username} size={24} />
                  <span class="username">{split.username}</span>
                  <span class="split-amount" class:positive={split.amount < 0} class:negative={split.amount > 0}>
                    {#if split.amount > 0}
                      owes {formatCurrency(split.amount, 'CHF', 'de-CH')}
                    {:else if split.amount < 0}
                      gets {formatCurrency(split.amount, 'CHF', 'de-CH')}
                    {:else}
                      owes {formatCurrency(split.amount, 'CHF', 'de-CH')}
                    {/if}
                  </span>
                </div>
              {/each}
            </div>
          </div>

          <div class="card-actions">
            <a href="/cospend/recurring/edit/{payment._id}" class="btn btn-secondary btn-small">
              Edit
            </a>
            <button
              class="btn btn-small"
              class:btn-warning={payment.isActive}
              class:btn-success={!payment.isActive}
              onclick={() => toggleActiveStatus(payment._id, payment.isActive)}
            >
              {payment.isActive ? 'Pause' : 'Activate'}
            </button>
            <button
              class="btn btn-danger btn-small"
              onclick={() => deleteRecurringPayment(payment._id, payment.title)}
            >
              Delete
            </button>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</main>

<AddButton href="/cospend/payments/add" />

<style>
  .recurring-payments {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
  }

  .header {
    margin-bottom: 2rem;
    text-align: center;
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

  .filters {
    margin-bottom: 1.5rem;
    padding: 1rem;
    background: var(--nord6);
    border-radius: 0.5rem;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    border: 1px solid var(--nord4);
  }

  .filters label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
    font-weight: 500;
    color: var(--nord0);
  }

  @media (prefers-color-scheme: dark) {
    .filters {
      background: var(--nord1);
      border-color: var(--nord2);
    }

    .filters label {
      color: var(--font-default-dark);
    }
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
    border: 1px solid var(--red);
  }

  @media (prefers-color-scheme: dark) {
    .error {
      background-color: var(--accent-dark);
    }
  }

  .empty-state {
    text-align: center;
    padding: 4rem 2rem;
    background: var(--nord6);
    border-radius: 0.75rem;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    border: 1px solid var(--nord4);
  }

  .empty-state h2 {
    margin-bottom: 1rem;
    color: var(--nord0);
  }

  .empty-state p {
    color: var(--nord2);
    margin-bottom: 2rem;
    max-width: 500px;
    margin-left: auto;
    margin-right: auto;
  }

  @media (prefers-color-scheme: dark) {
    .empty-state {
      background: var(--nord1);
      border-color: var(--nord2);
    }

    .empty-state h2 {
      color: var(--font-default-dark);
    }

    .empty-state p {
      color: var(--nord4);
    }
  }

  .payments-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
    gap: 1.5rem;
  }

  .payment-card {
    background: var(--nord6);
    border-radius: 0.75rem;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    padding: 1.5rem;
    transition: all 0.2s;
    border: 1px solid var(--nord4);
  }

  .payment-card:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
    border-color: var(--nord3);
  }

  .payment-card.inactive {
    opacity: 0.7;
    background: var(--nord5);
    border-color: var(--nord3);
  }

  @media (prefers-color-scheme: dark) {
    .payment-card {
      background: var(--nord1);
      border-color: var(--nord2);
    }

    .payment-card:hover {
      border-color: var(--nord3);
    }

    .payment-card.inactive {
      background: var(--nord2);
      border-color: var(--nord3);
    }
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 1rem;
  }

  .payment-title {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex: 1;
  }

  .category-emoji {
    font-size: 1.5rem;
  }

  .payment-title h3 {
    margin: 0;
    color: var(--nord0);
    font-size: 1.25rem;
  }

  @media (prefers-color-scheme: dark) {
    .payment-title h3 {
      color: var(--font-default-dark);
    }
  }

  .status-badge {
    padding: 0.25rem 0.75rem;
    border-radius: 1rem;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .status-badge.active {
    background-color: var(--green);
    color: white;
  }

  .status-badge.inactive {
    background-color: var(--orange);
    color: white;
  }

  .payment-amount {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--blue);
  }

  .payment-description {
    color: var(--nord2);
    margin-bottom: 1rem;
    font-style: italic;
  }

  @media (prefers-color-scheme: dark) {
    .payment-description {
      color: var(--nord5);
    }
  }

  .payment-details {
    margin-bottom: 1.5rem;
  }

  .detail-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
    padding: 0.25rem 0;
  }

  .label {
    font-weight: 500;
    color: var(--nord3);
    font-size: 0.9rem;
  }

  .value {
    color: var(--nord0);
    font-weight: 500;
  }

  .next-execution {
    color: var(--blue);
    font-weight: 600;
  }

  @media (prefers-color-scheme: dark) {
    .label {
      color: var(--nord4);
    }

    .value {
      color: var(--font-default-dark);
    }
  }

  .payer-info {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .splits-preview {
    margin-bottom: 1.5rem;
    padding: 1rem;
    background-color: var(--nord5);
    border-radius: 0.5rem;
    border: 1px solid var(--nord4);
  }

  .splits-preview h4 {
    margin: 0 0 0.75rem 0;
    font-size: 0.9rem;
    color: var(--nord2);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  @media (prefers-color-scheme: dark) {
    .splits-preview {
      background-color: var(--nord2);
      border-color: var(--nord3);
    }

    .splits-preview h4 {
      color: var(--nord4);
    }
  }

  .splits-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .split-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .split-item .username {
    flex: 1;
    font-weight: 500;
    color: var(--nord0);
  }

  .split-amount {
    font-size: 0.9rem;
    font-weight: 500;
  }

  .split-amount.positive {
    color: var(--green);
  }

  .split-amount.negative {
    color: var(--red);
  }

  @media (prefers-color-scheme: dark) {
    .split-item .username {
      color: var(--font-default-dark);
    }
  }

  .card-actions {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .btn {
    padding: 0.75rem 1.5rem;
    border-radius: 0.5rem;
    text-decoration: none;
    font-weight: 500;
    border: none;
    cursor: pointer;
    transition: all 0.2s;
    text-align: center;
  }

  .btn-small {
    padding: 0.5rem 1rem;
    font-size: 0.875rem;
  }

  .btn-primary {
    background-color: var(--blue);
    color: white;
  }

  .btn-primary:hover {
    background-color: var(--nord10);
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
  }

  .btn-secondary {
    background-color: var(--nord5);
    color: var(--nord0);
    border: 1px solid var(--nord4);
  }

  .btn-secondary:hover {
    background-color: var(--nord4);
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

  .btn-warning {
    background-color: var(--orange);
    color: white;
  }

  .btn-warning:hover {
    background-color: var(--nord12);
    transform: translateY(-1px);
  }

  .btn-success {
    background-color: var(--green);
    color: white;
  }

  .btn-success:hover {
    background-color: var(--nord14);
    transform: translateY(-1px);
  }

  .btn-danger {
    background-color: var(--red);
    color: white;
  }

  .btn-danger:hover {
    background-color: var(--nord11);
    transform: translateY(-1px);
  }

  @media (max-width: 768px) {
    .recurring-payments {
      padding: 1rem;
    }

    .header {
      flex-direction: column;
      gap: 1rem;
      align-items: stretch;
    }

    .payments-grid {
      grid-template-columns: 1fr;
    }

    .payment-card {
      padding: 1rem;
    }

    .card-header {
      flex-direction: column;
      gap: 1rem;
    }

    .payment-title {
      justify-content: space-between;
    }

    .detail-row {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.25rem;
    }

    .card-actions {
      justify-content: stretch;
    }

    .card-actions .btn {
      flex: 1;
    }
  }
</style>