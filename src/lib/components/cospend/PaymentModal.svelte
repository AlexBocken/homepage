<script>
  import { resolve } from '$app/paths';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import PaymentDetails from './PaymentDetails.svelte';
  import EditButton from '$lib/components/EditButton.svelte';
  import { receiptUrl } from '$lib/utils/cospendImage';
  import { detectCospendLang, cospendRoot, m } from '$lib/js/cospendI18n';
  import { confirm } from '$lib/js/confirmDialog.svelte';

  let { paymentId, onclose, onpaymentDeleted } = $props();

  // Get session from page store
  let session = $derived(page.data?.session);

  const lang = $derived(detectCospendLang(page.url.pathname));
  const t = $derived(m[lang]);
  const root = $derived(cospendRoot(lang));

  /**
   * @typedef {{
   *   _id?: string,
   *   title: string,
   *   description?: string,
   *   amount: number,
   *   currency: string,
   *   originalAmount?: number,
   *   exchangeRate?: number,
   *   paidBy: string,
   *   date: string,
   *   image?: string,
   *   category: import('$lib/utils/categories').PaymentCategory,
   *   splitMethod: string,
   *   createdBy: string,
   *   receiptScan?: { totalBox?: unknown, items?: Array<{ box: unknown, user: string, amount: number }> },
   *   splits?: Array<{ username: string, amount: number, settled: boolean }>,
   *   createdAt?: string,
   *   updatedAt?: string
   * }} PaymentData
   */

  /** @type {PaymentData | null} */
  let payment = $state(null);
  let loading = $state(true);
  /** @type {string | null} */
  let error = $state(null);
  /** @type {HTMLDivElement | undefined} */
  let modal = $state(undefined);
  let lightboxOpen = $state(false);

  onMount(() => {
    loadPayment();

    // Handle escape key to close modal
    /** @param {KeyboardEvent} event */
    function handleKeydown(event) {
      if (event.key === 'Escape') {
        // Close the receipt lightbox first if it's open; otherwise close the modal.
        if (lightboxOpen) lightboxOpen = false;
        else closeModal();
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
      error = err instanceof Error ? err.message : String(err);
    } finally {
      loading = false;
    }
  }

  function closeModal() {
    // Use shallow routing to go back to dashboard without full navigation
    goto(`/${root}/dash`, { replaceState: true, noScroll: true, keepFocus: true });
    onclose?.();
  }

  /** @param {MouseEvent} event */
  function handleBackdropClick(event) {
    if (event.target === event.currentTarget) {
      closeModal();
    }
  }

  let deleting = $state(false);

  async function deletePayment() {
    if (!await confirm(t.delete_payment_confirm_plain, {
      confirmText: t.action_delete,
      cancelText: t.action_cancel,
    })) {
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
      onpaymentDeleted?.(paymentId);
      closeModal();

    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
    } finally {
      deleting = false;
    }
  }
</script>

<div class="panel-content" bind:this={modal}>
  <div class="panel-header">
      <h2>{t.payment_details}</h2>
      <button class="close-button" onclick={closeModal} aria-label="Close modal">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </div>

  <div class="panel-body">
      {#if loading}
        <div class="loading">{t.loading_payments}</div>
      {:else if error}
        <div class="error">{t.error_prefix}: {error}</div>
      {:else if payment}
        <PaymentDetails
          {payment}
          {lang}
          currentUser={session?.user?.nickname}
          compact
          absoluteAmounts
          zeroLabel={t.even}
          onviewreceipt={() => lightboxOpen = true}
        >
          <div class="panel-actions">
            <button class="btn-secondary" onclick={closeModal}>{t.close}</button>
          </div>
        </PaymentDetails>
      {/if}
  </div>
</div>

{#if lightboxOpen && payment?.image}
  <div class="lightbox" role="dialog" aria-modal="true" aria-label={t.receipt}>
    <button class="lightbox-backdrop" onclick={() => lightboxOpen = false} aria-label={t.close}></button>
    <img class="lightbox-img" src={receiptUrl(payment.image)} alt={t.receipt} />
    <button class="lightbox-close" onclick={() => lightboxOpen = false} aria-label={t.close}>✕</button>
  </div>
{/if}

{#if payment}
  <EditButton href={resolve('/[cospendRoot=cospendRoot]/payments/edit/[id]', { cospendRoot: root, id: paymentId })} />
{/if}

<style>
  .panel-content {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: var(--color-bg-secondary);
  }

  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem;
    background: var(--color-bg-tertiary);
    flex-shrink: 0;
  }

  .panel-header h2 {
    margin: 0;
    color: var(--color-text-primary);
    font-size: 1.25rem;
  }

  .close-button {
    background: none;
    border: none;
    cursor: pointer;
    padding: 0.5rem;
    border-radius: 0.25rem;
    color: var(--color-text-secondary);
    transition: all 0.2s;
  }

  .close-button:hover {
    background: var(--color-bg-elevated);
    color: var(--color-text-primary);
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
    background-color: var(--color-bg-secondary);
    border-radius: 0.5rem;
    border: 1px solid var(--red);
  }

  .lightbox {
    position: fixed;
    inset: 0;
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1.5rem;
  }

  .lightbox-backdrop {
    position: absolute;
    inset: 0;
    border: none;
    padding: 0;
    background: rgba(0, 0, 0, 0.8);
    cursor: zoom-out;
    animation: lightbox-fade 0.15s ease;
  }

  .lightbox-img {
    position: relative;
    max-width: min(92vw, 1000px);
    max-height: 90vh;
    object-fit: contain;
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-lg);
    animation: lightbox-fade 0.15s ease;
  }

  .lightbox-close {
    position: absolute;
    top: 1rem;
    right: 1rem;
    width: 2.5rem;
    height: 2.5rem;
    border-radius: var(--radius-pill);
    border: none;
    background: rgba(0, 0, 0, 0.55);
    color: #fff;
    font-size: 1.2rem;
    cursor: pointer;
  }

  @keyframes lightbox-fade {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .panel-actions {
    padding: 1.5rem;
    background: var(--color-bg-tertiary);
    display: flex;
    gap: 1rem;
    justify-content: flex-end;
    flex-shrink: 0;
  }

  .btn-secondary {
    padding: 0.75rem 1.5rem;
    border-radius: 0.5rem;
    font-size: 1rem;
    cursor: pointer;
    transition: all 0.2s;
    text-decoration: none;
    display: inline-block;
    text-align: center;
    background-color: var(--color-bg-primary);
    color: var(--color-text-primary);
    border: 1px solid var(--color-border);
  }

  .btn-secondary:hover {
    background-color: var(--color-bg-elevated);
    transform: translateY(-1px);
  }

  @media (max-width: 768px) {
    .panel-content {
      height: 100vh;
    }

    .panel-header {
      padding: 1rem;
      position: sticky;
      top: 0;
      z-index: 10;
    }

    .panel-header h2 {
      font-size: 1.2rem;
    }

    .close-button {
      padding: 0.75rem;
    }
  }

  @media (max-width: 600px) {
    .panel-header h2 {
      font-size: 1.1rem;
    }

    .panel-actions {
      padding: 1rem;
      flex-direction: column;
    }
  }
</style>