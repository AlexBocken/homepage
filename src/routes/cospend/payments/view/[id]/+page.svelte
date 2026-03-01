<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import ProfilePicture from '$lib/components/cospend/ProfilePicture.svelte';
  import { getCategoryEmoji, getCategoryName } from '$lib/utils/categories';
  import EditButton from '$lib/components/EditButton.svelte';
  

  import { formatCurrency } from '$lib/utils/formatters';

  let { data } = $props();

  // Use server-side data with progressive enhancement
  let payment = $state(data.payment || null);
  let loading = $state(false); // Start as false since we have server data
  let error = $state(null);

  // Progressive enhancement: refresh data if JavaScript is available
  onMount(async () => {
    // Mark that JavaScript is loaded
    document.body.classList.add('js-loaded');
    
    // Only refresh if we don't have server data
    if (!payment) {
      await loadPayment();
    }
  });

  async function loadPayment() {
    try {
      loading = true;
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

  function formatAmountWithCurrency(payment) {
    if (payment.currency === 'CHF' || !payment.originalAmount) {
      return formatCurrency(payment.amount, 'CHF', 'de-CH');
    }
    
    return `${formatCurrency(payment.originalAmount, payment.currency, 'CHF', 'de-CH')} ≈ ${formatCurrency(payment.amount, 'CHF', 'de-CH')}`;
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

</script>

<svelte:head>
  <title>{payment ? payment.title : 'Payment'} - Cospend</title>
</svelte:head>

<main class="payment-view">

  {#if loading}
    <div class="loading">Loading payment...</div>
  {:else if error}
    <div class="error">Error: {error}</div>
  {:else if payment}
    <div class="payment-card">
      <div class="payment-header">
        <div class="title-section">
          <div class="title-with-category">
            <span class="category-emoji">{getCategoryEmoji(payment.category || 'groceries')}</span>
            <h1>{payment.title}</h1>
          </div>
          <div class="payment-amount">
            {formatAmountWithCurrency(payment)}
            {#if payment.currency !== 'CHF' && payment.exchangeRate}
              <div class="exchange-rate-info">
                <small>Exchange rate: 1 {payment.currency} = {payment.exchangeRate.toFixed(4)} CHF</small>
              </div>
            {/if}
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
              <div class="split-item" class:current-user={split.username === data.session.user.nickname}>
                <div class="split-user">
                  <ProfilePicture username={split.username} size={24} />
                  <div class="user-info">
                    <span class="username">{split.username}</span>
                    {#if split.username === data.session.user.nickname}
                      <span class="you-badge">You</span>
                    {/if}
                  </div>
                </div>
                <div class="split-amount" class:positive={split.amount < 0} class:negative={split.amount > 0}>
                  {#if split.amount > 0}
                    owes {formatCurrency(split.amount, 'CHF', 'de-CH')}
                  {:else if split.amount < 0}
                    owed {formatCurrency(split.amount, 'CHF', 'de-CH')}
                  {:else}
                    owes {formatCurrency(split.amount, 'CHF', 'de-CH')}
                  {/if}
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/if}
    </div>
  {/if}
</main>

{#if payment}
  <EditButton href="/cospend/payments/edit/{data.paymentId}" />
{/if}

<style>
  .payment-view {
    max-width: 800px;
    margin: 0 auto;
    padding: 2rem;
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
    :global(:root:not([data-theme="light"])) .error {
      background-color: var(--accent-dark);
    }
  }
:global(:root[data-theme="dark"]) .error {
	background-color: var(--accent-dark);
}

  .payment-card {
    background: var(--nord6);
    border-radius: 0.75rem;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    overflow: hidden;
    border: 1px solid var(--nord4);
  }

  @media (prefers-color-scheme: dark) {
    :global(:root:not([data-theme="light"])) .payment-card {
      background: var(--nord1);
      border-color: var(--nord2);
    }
  }
:global(:root[data-theme="dark"]) .payment-card {
	background: var(--nord1);
      border-color: var(--nord2);
}

  .payment-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding: 2rem;
    background: linear-gradient(135deg, var(--nord5), var(--nord4));
    border-bottom: 1px solid var(--nord3);
  }

  @media (prefers-color-scheme: dark) {
    :global(:root:not([data-theme="light"])) .payment-header {
      background: linear-gradient(135deg, var(--nord2), var(--nord3));
    }
  }
:global(:root[data-theme="dark"]) .payment-header {
	background: linear-gradient(135deg, var(--nord2), var(--nord3));
}

  .title-with-category {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 0.5rem;
  }

  .title-with-category .category-emoji {
    font-size: 2rem;
    flex-shrink: 0;
  }

  .title-section h1 {
    margin: 0;
    color: var(--nord0);
    font-size: 1.75rem;
  }

  .payment-amount {
    font-size: 1.5rem;
    font-weight: bold;
    color: var(--blue);
  }

  @media (prefers-color-scheme: dark) {
    :global(:root:not([data-theme="light"])) .title-section h1 {
      color: var(--font-default-dark);
    }
  }
:global(:root[data-theme="dark"]) .title-section h1 {
	color: var(--font-default-dark);
}

  .receipt-image {
    flex-shrink: 0;
    margin-left: 2rem;
  }

  .receipt-image img {
    max-width: 150px;
    max-height: 150px;
    object-fit: cover;
    border-radius: 0.5rem;
    border: 1px solid var(--nord4);
  }

  @media (prefers-color-scheme: dark) {
    :global(:root:not([data-theme="light"])) .receipt-image img {
      border-color: var(--nord2);
    }
  }
:global(:root[data-theme="dark"]) .receipt-image img {
	border-color: var(--nord2);
}

  .payment-info {
    padding: 2rem;
  }

  .info-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    margin-bottom: 2rem;
  }

  .info-item {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .label {
    font-weight: 600;
    color: var(--nord3);
    font-size: 0.9rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .value {
    color: var(--nord0);
    font-size: 1rem;
  }

  @media (prefers-color-scheme: dark) {
    :global(:root:not([data-theme="light"])) .label {
      color: var(--nord4);
    }

    :global(:root:not([data-theme="light"])) .value {
      color: var(--font-default-dark);
    }
  }
:global(:root[data-theme="dark"]) .label {
	color: var(--nord4);
}
:global(:root[data-theme="dark"]) .value {
	color: var(--font-default-dark);
}

  .description {
    border-top: 1px solid var(--nord4);
    padding-top: 1.5rem;
  }

  .description h3 {
    margin: 0 0 0.75rem 0;
    color: var(--nord0);
    font-size: 1.1rem;
  }

  .description p {
    margin: 0;
    color: var(--nord2);
    line-height: 1.5;
  }

  @media (prefers-color-scheme: dark) {
    :global(:root:not([data-theme="light"])) .description {
      border-top-color: var(--nord2);
    }

    :global(:root:not([data-theme="light"])) .description h3 {
      color: var(--font-default-dark);
    }

    :global(:root:not([data-theme="light"])) .description p {
      color: var(--nord5);
    }
  }
:global(:root[data-theme="dark"]) .description {
	border-top-color: var(--nord2);
}
:global(:root[data-theme="dark"]) .description h3 {
	color: var(--font-default-dark);
}
:global(:root[data-theme="dark"]) .description p {
	color: var(--nord5);
}

  .splits-section {
    border-top: 1px solid var(--nord4);
    padding: 2rem;
  }

  .splits-section h3 {
    margin: 0 0 1rem 0;
    color: var(--nord0);
    font-size: 1.1rem;
  }

  @media (prefers-color-scheme: dark) {
    :global(:root:not([data-theme="light"])) .splits-section {
      border-top-color: var(--nord2);
    }

    :global(:root:not([data-theme="light"])) .splits-section h3 {
      color: var(--font-default-dark);
    }
  }
:global(:root[data-theme="dark"]) .splits-section {
	border-top-color: var(--nord2);
}
:global(:root[data-theme="dark"]) .splits-section h3 {
	color: var(--font-default-dark);
}

  .splits-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .split-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    background: var(--nord5);
    border-radius: 0.5rem;
    border: 1px solid var(--nord4);
  }

  .split-item.current-user {
    background: var(--nord8);
    border-color: var(--blue);
  }

  @media (prefers-color-scheme: dark) {
    :global(:root:not([data-theme="light"])) .split-item {
      background: var(--nord2);
      border-color: var(--nord3);
    }

    :global(:root:not([data-theme="light"])) .split-item.current-user {
      background: var(--nord3);
      border-color: var(--blue);
    }
  }
:global(:root[data-theme="dark"]) .split-item {
	background: var(--nord2);
      border-color: var(--nord3);
}
:global(:root[data-theme="dark"]) .split-item.current-user {
	background: var(--nord3);
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
  }

  .you-badge {
    background-color: var(--blue);
    color: white;
    padding: 0.125rem 0.5rem;
    border-radius: 1rem;
    font-size: 0.75rem;
    font-weight: 500;
  }

  @media (prefers-color-scheme: dark) {
    :global(:root:not([data-theme="light"])) .username {
      color: var(--font-default-dark);
    }
  }
:global(:root[data-theme="dark"]) .username {
	color: var(--font-default-dark);
}

  .split-amount {
    font-weight: 500;
    font-size: 1rem;
  }

  .split-amount.positive {
    color: var(--green);
  }

  .split-amount.negative {
    color: var(--red);
  }

  .exchange-rate-info {
    margin-top: 0.5rem;
    color: var(--nord3);
    font-style: italic;
  }

  .exchange-rate-info small {
    font-size: 0.8rem;
  }

  @media (prefers-color-scheme: dark) {
    :global(:root:not([data-theme="light"])) .exchange-rate-info {
      color: var(--nord4);
    }
  }
:global(:root[data-theme="dark"]) .exchange-rate-info {
	color: var(--nord4);
}

  @media (max-width: 600px) {
    .payment-view {
      padding: 1rem;
    }

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

    .split-item {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.5rem;
    }
  }
</style>