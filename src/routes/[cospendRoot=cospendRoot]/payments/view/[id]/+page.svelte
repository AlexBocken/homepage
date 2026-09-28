<script>
  import { resolve } from '$app/paths';
  import { onMount } from 'svelte';
  import { goto, invalidateAll } from '$app/navigation';
  import { page } from '$app/state';
  import PaymentDetails from '$lib/components/cospend/PaymentDetails.svelte';
  import { receiptUrl } from '$lib/utils/cospendImage';
  import EditButton from '$lib/components/EditButton.svelte';
  import { detectCospendLang, cospendRoot, m } from '$lib/js/cospendI18n';

  let { data } = $props();

  const lang = $derived(detectCospendLang(page.url.pathname));
  const t = $derived(m[lang]);
  const root = $derived(cospendRoot(lang));

  // Use server-side data with progressive enhancement
  /** @type {any | null} */
  let payment = $derived(data.payment || null);
  let loading = $state(false);
  /** @type {string | null} */
  let error = $state(null);
  let lightboxOpen = $state(false);

  // Progressive enhancement: refresh data if JavaScript is available
  onMount(async () => {
    // Mark that JavaScript is loaded
    document.body.classList.add('js-loaded');

    // Only refresh if we don't have server data
    if (!payment) {
      await invalidateAll();
    }
  });
</script>

<svelte:head>
  <title>{payment ? payment.title : 'Payment'} - {t.cospend}</title>
</svelte:head>

<main class="payment-view">

  {#if loading}
    <div class="loading">{t.loading_payments}</div>
  {:else if error}
    <div class="error">Error: {error}</div>
  {:else if payment}
    <PaymentDetails
      {payment}
      {lang}
      currentUser={data.session?.user?.nickname}
      showOriginalCurrency
      onviewreceipt={() => lightboxOpen = true}
    />
  {/if}
</main>

{#if payment}
  <EditButton href={resolve('/[cospendRoot=cospendRoot]/payments/edit/[id]', { cospendRoot: root, id: data.paymentId ?? '' })} />
{/if}

<svelte:window onkeydown={(e) => { if (e.key === 'Escape') lightboxOpen = false; }} />

{#if lightboxOpen && payment?.image}
  <div class="lightbox" role="dialog" aria-modal="true" aria-label={t.receipt}>
    <button class="lightbox-backdrop" onclick={() => lightboxOpen = false} aria-label={t.close}></button>
    <img class="lightbox-img" src={receiptUrl(payment.image)} alt={t.receipt} />
    <button class="lightbox-close" onclick={() => lightboxOpen = false} aria-label={t.close}>✕</button>
  </div>
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

  .lightbox-close:hover,
  .lightbox-close:focus-visible {
    background: rgba(0, 0, 0, 0.8);
    outline: none;
  }

  @keyframes lightbox-fade {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @media (prefers-reduced-motion: reduce) {
    .lightbox-backdrop,
    .lightbox-img {
      animation: none;
    }
  }

  @media (max-width: 600px) {
    .payment-view {
      padding: 1rem;
    }
  }
</style>
