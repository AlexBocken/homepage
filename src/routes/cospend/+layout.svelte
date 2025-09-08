<script>
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import PaymentModal from '$lib/components/PaymentModal.svelte';

  let showModal = false;
  let paymentId = null;

  $: {
    // Check if URL contains payment view route OR if we have paymentId in state
    const match = $page.url.pathname.match(/\/cospend\/payments\/view\/([^\/]+)/);
    const statePaymentId = $page.state?.paymentId;
    const isOnDashboard = $page.route.id === '/cospend';
    
    console.log('Layout debug:', {
      pathname: $page.url.pathname,
      routeId: $page.route.id,
      match: match,
      statePaymentId: statePaymentId,
      isOnDashboard: isOnDashboard,
      showModal: showModal
    });
    
    // Only show modal if we're on the dashboard AND have a payment to show
    if (isOnDashboard && (match || statePaymentId)) {
      showModal = true;
      paymentId = match ? match[1] : statePaymentId;
    } else {
      showModal = false;
      paymentId = null;
    }
  }
</script>

<div class="layout-container" class:has-modal={showModal}>
  <div class="main-content">
    <slot />
  </div>
  
  {#if showModal}
    <div class="side-panel">
      <PaymentModal {paymentId} on:close={() => showModal = false} />
    </div>
  {/if}
</div>

<style>
  .layout-container {
    display: flex;
    min-height: 100vh;
    transition: all 0.3s ease;
  }

  .main-content {
    flex: 1;
    transition: all 0.3s ease;
  }

  .layout-container.has-modal .main-content {
    flex: 0 0 60%;
  }

  .side-panel {
    flex: 0 0 40%;
    min-width: 400px;
    max-width: 500px;
    background: white;
    border-left: 1px solid #dee2e6;
    box-shadow: -2px 0 10px rgba(0, 0, 0, 0.1);
    z-index: 100;
    overflow-y: auto;
  }

  @media (max-width: 768px) {
    .layout-container.has-modal {
      flex-direction: column;
    }
    
    .layout-container.has-modal .main-content {
      flex: none;
      height: 50vh;
      overflow-y: auto;
    }
    
    .side-panel {
      flex: none;
      height: 50vh;
      min-width: unset;
      max-width: unset;
      border-left: none;
      border-top: 1px solid #dee2e6;
      box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
    }
  }
</style>