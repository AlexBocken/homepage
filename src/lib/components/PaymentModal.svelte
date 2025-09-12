<script>
  import { onMount, createEventDispatcher } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import ProfilePicture from './ProfilePicture.svelte';
  import EditButton from './EditButton.svelte';
  import { getCategoryEmoji, getCategoryName } from '$lib/utils/categories';
  
  export let paymentId;
  
  // Get session from page store
  $: session = $page.data?.session;
  
  const dispatch = createEventDispatcher();

  let payment = null;
  let loading = true;
  let error = null;
  let modal;

  onMount(async () => {
    await loadPayment();
    
    // Handle escape key to close modal
    function handleKeydown(event) {
      if (event.key === 'Escape') {
        closeModal();
      }
    }
    
    document.addEventListener('keydown', handleKeydown);
    
    return () => {
      document.removeEventListener('keydown', handleKeydown);
    };
  });

  async function loadPayment() {
    try {
      const response = await fetch(`/api/cospend/payments/${paymentId}`);
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

  function closeModal() {
    // Use shallow routing to go back to dashboard without full navigation
    goto('/cospend', { replaceState: true, noScroll: true, keepFocus: true });
    dispatch('close');
  }

  function handleBackdropClick(event) {
    if (event.target === event.currentTarget) {
      closeModal();
    }
  }

  function formatCurrency(amount) {
    return new Intl.NumberFormat('de-CH', {
      style: 'currency',
      currency: 'CHF'
    }).format(Math.abs(amount));
  }

  function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('de-CH');
  }

  function getSplitDescription(payment) {
    if (!payment.splits || payment.splits.length === 0) return 'No splits';
    
    if (payment.splitMethod === 'equal') {
      return `Split equally among ${payment.splits.length} people`;
    } else if (payment.splitMethod === 'full') {
      return `Paid in full by ${payment.paidBy}`;
    } else if (payment.splitMethod === 'personal_equal') {
      return `Personal amounts + equal split among ${payment.splits.length} people`;
    } else {
      return `Custom split among ${payment.splits.length} people`;
    }
  }

  let deleting = false;

  async function deletePayment() {
    if (!confirm('Are you sure you want to delete this payment? This action cannot be undone.')) {
      return;
    }

    try {
      deleting = true;
      const response = await fetch(`/api/cospend/payments/${paymentId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete payment');
      }

      // Close modal and dispatch event to refresh data
      dispatch('paymentDeleted', paymentId);
      closeModal();
      
    } catch (err) {
      error = err.message;
    } finally {
      deleting = false;
    }
  }
</script>

<div class="panel-content" bind:this={modal}>
  <div class="panel-header">
      <h2>Payment Details</h2>
      <button class="close-button" on:click={closeModal} aria-label="Close modal">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </div>

  <div class="panel-body">
      {#if loading}
        <div class="loading">Loading payment...</div>
      {:else if error}
        <div class="error">Error: {error}</div>
      {:else if payment}
        <div class="payment-details">
          <div class="payment-header">
            <div class="title-section">
              <div class="title-with-category">
                <span class="category-emoji">{getCategoryEmoji(payment.category || 'groceries')}</span>
                <h1>{payment.title}</h1>
              </div>
              <div class="payment-amount">
                {formatCurrency(payment.amount)}
              </div>
            </div>
            {#if payment.image}
              <div class="receipt-image">
                <img src={payment.image} alt="Receipt" />
              </div>
            {/if}
          </div>

          <div class="payment-info">
            <div class="info-grid">
              <div class="info-item">
                <span class="label">Date:</span>
                <span class="value">{formatDate(payment.date)}</span>
              </div>
              <div class="info-item">
                <span class="label">Paid by:</span>
                <span class="value">{payment.paidBy}</span>
              </div>
              <div class="info-item">
                <span class="label">Created by:</span>
                <span class="value">{payment.createdBy}</span>
              </div>
              <div class="info-item">
                <span class="label">Category:</span>
                <span class="value">{getCategoryName(payment.category || 'groceries')}</span>
              </div>
              <div class="info-item">
                <span class="label">Split method:</span>
                <span class="value">{getSplitDescription(payment)}</span>
              </div>
            </div>

            {#if payment.description}
              <div class="description">
                <h3>Description</h3>
                <p>{payment.description}</p>
              </div>
            {/if}
          </div>

          {#if payment.splits && payment.splits.length > 0}
            <div class="splits-section">
              <h3>Split Details</h3>
              <div class="splits-list">
                {#each payment.splits as split}
                  <div class="split-item" class:current-user={split.username === session?.user?.nickname}>
                    <div class="split-user">
                      <ProfilePicture username={split.username} size={24} />
                      <div class="user-info">
                        <span class="username">{split.username}</span>
                        {#if split.username === session?.user?.nickname}
                          <span class="you-badge">You</span>
                        {/if}
                      </div>
                    </div>
                    <div class="split-amount" class:positive={split.amount < 0} class:negative={split.amount > 0}>
                      {#if split.amount > 0}
                        owes {formatCurrency(split.amount)}
                      {:else if split.amount < 0}
                        owed {formatCurrency(split.amount)}
                      {:else}
                        even
                      {/if}
                    </div>
                  </div>
                {/each}
              </div>
            </div>
          {/if}

          <div class="panel-actions">
            {#if payment && payment.createdBy === session?.user?.nickname}
              <button 
                class="btn-danger" 
                on:click={deletePayment}
                disabled={deleting}
              >
                {deleting ? 'Deleting...' : 'Delete Payment'}
              </button>
            {/if}
            <button class="btn-secondary" on:click={closeModal}>Close</button>
          </div>
        </div>
      {/if}
  </div>
</div>

{#if payment && payment.createdBy === session?.user?.nickname}
  <EditButton href="/cospend/payments/edit/{paymentId}" />
{/if}

<style>
  .panel-content {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: var(--nord6);
  }

  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem;
    border-bottom: 1px solid var(--nord4);
    background: var(--nord5);
    flex-shrink: 0;
  }

  .panel-header h2 {
    margin: 0;
    color: var(--nord0);
    font-size: 1.25rem;
  }

  .close-button {
    background: none;
    border: none;
    cursor: pointer;
    padding: 0.5rem;
    border-radius: 0.25rem;
    color: var(--nord3);
    transition: all 0.2s;
  }

  .close-button:hover {
    background: var(--nord4);
    color: var(--nord0);
  }

  .panel-body {
    flex: 1;
    overflow-y: auto;
    padding: 0;
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

  .payment-details {
    display: flex;
    flex-direction: column;
  }

  .payment-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding: 1.5rem;
    background: linear-gradient(135deg, var(--nord5), var(--nord4));
    border-bottom: 1px solid var(--nord3);
  }

  .title-with-category {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 0.5rem;
  }

  .title-with-category .category-emoji {
    font-size: 1.8rem;
    flex-shrink: 0;
  }

  .title-section h1 {
    margin: 0;
    color: var(--nord0);
    font-size: 1.5rem;
  }

  .payment-amount {
    font-size: 1.25rem;
    font-weight: bold;
    color: var(--blue);
  }

  .receipt-image {
    flex-shrink: 0;
    margin-left: 1rem;
  }

  .receipt-image img {
    max-width: 100px;
    max-height: 100px;
    object-fit: cover;
    border-radius: 0.5rem;
    border: 1px solid var(--nord4);
  }

  .payment-info {
    padding: 1.5rem;
  }

  .info-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
    margin-bottom: 1.5rem;
  }

  .info-item {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .label {
    font-weight: 600;
    color: var(--nord3);
    font-size: 0.85rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .value {
    color: var(--nord0);
    font-size: 0.95rem;
  }

  .description {
    border-top: 1px solid var(--nord4);
    padding-top: 1.5rem;
  }

  .description h3 {
    margin: 0 0 0.75rem 0;
    color: var(--nord0);
    font-size: 1rem;
  }

  .description p {
    margin: 0;
    color: var(--nord2);
    line-height: 1.5;
    font-size: 0.95rem;
  }

  .splits-section {
    border-top: 1px solid var(--nord4);
    padding: 1.5rem;
  }

  .splits-section h3 {
    margin: 0 0 1rem 0;
    color: var(--nord0);
    font-size: 1rem;
  }

  .splits-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .split-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem;
    background: var(--nord5);
    border-radius: 0.5rem;
    border: 1px solid var(--nord4);
  }

  .split-item.current-user {
    background: var(--nord8);
    border-color: var(--blue);
  }

  .split-user {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .split-user .user-info {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .username {
    font-weight: 500;
    color: var(--nord0);
    font-size: 0.95rem;
  }

  .you-badge {
    background-color: var(--blue);
    color: white;
    padding: 0.125rem 0.375rem;
    border-radius: 1rem;
    font-size: 0.7rem;
    font-weight: 500;
  }

  .split-amount {
    font-weight: 500;
    font-size: 0.9rem;
  }

  .split-amount.positive {
    color: var(--green);
  }

  .split-amount.negative {
    color: var(--red);
  }

  .panel-actions {
    padding: 1.5rem;
    border-top: 1px solid var(--nord4);
    background: var(--nord5);
    display: flex;
    gap: 1rem;
    justify-content: flex-end;
    flex-shrink: 0;
  }

  .btn-primary, .btn-secondary, .btn-danger {
    padding: 0.75rem 1.5rem;
    border-radius: 0.5rem;
    font-size: 1rem;
    cursor: pointer;
    transition: all 0.2s;
    border: none;
  }

  .btn-primary {
    background-color: var(--blue);
    color: white;
  }

  .btn-primary:hover:not(:disabled) {
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
    transform: translateY(-1px);
  }

  .btn-danger {
    background-color: var(--red);
    color: white;
  }

  .btn-danger:hover:not(:disabled) {
    background-color: var(--nord11);
    transform: translateY(-1px);
  }

  .btn-danger:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  @media (prefers-color-scheme: dark) {
    .panel-content {
      background: var(--nord1);
    }

    .panel-header {
      background: var(--nord2);
      border-bottom-color: var(--nord3);
    }

    .panel-header h2 {
      color: var(--font-default-dark);
    }

    .close-button {
      color: var(--nord4);
    }

    .close-button:hover {
      background: var(--nord3);
      color: var(--font-default-dark);
    }

    .error {
      background-color: var(--accent-dark);
    }

    .payment-header {
      background: linear-gradient(135deg, var(--nord2), var(--nord3));
    }

    .title-section h1 {
      color: var(--font-default-dark);
    }

    .receipt-image img {
      border-color: var(--nord2);
    }

    .label {
      color: var(--nord4);
    }

    .value {
      color: var(--font-default-dark);
    }

    .description {
      border-top-color: var(--nord2);
    }

    .description h3 {
      color: var(--font-default-dark);
    }

    .description p {
      color: var(--nord5);
    }

    .splits-section {
      border-top-color: var(--nord2);
    }

    .splits-section h3 {
      color: var(--font-default-dark);
    }

    .split-item {
      background: var(--nord2);
      border-color: var(--nord3);
    }

    .split-item.current-user {
      background: var(--nord3);
      border-color: var(--blue);
    }

    .username {
      color: var(--font-default-dark);
    }

    .panel-actions {
      background: var(--nord2);
      border-top-color: var(--nord3);
    }

    .btn-secondary {
      background-color: var(--nord2);
      color: var(--font-default-dark);
      border-color: var(--nord3);
    }

    .btn-secondary:hover {
      background-color: var(--nord3);
    }
  }

  @media (max-width: 600px) {
    .payment-header {
      flex-direction: column;
      gap: 1rem;
      text-align: center;
    }

    .receipt-image {
      margin-left: 0;
    }

    .info-grid {
      grid-template-columns: 1fr;
    }

    .panel-actions {
      flex-direction: column;
    }

    .split-item {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.5rem;
    }
  }
</style>