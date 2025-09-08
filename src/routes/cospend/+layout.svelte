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
  
  <div class="side-panel">
    {#if showModal}
      <div class="modal-content">
        <PaymentModal {paymentId} on:close={() => showModal = false} />
      </div>
    {/if}
  </div>
</div>

<style>
  .layout-container {
    display: flex;
    min-height: 100vh;
  }

  .main-content {
    flex: 1;
    transition: margin-right 0.3s ease-out;
  }

  .layout-container.has-modal .main-content {
    margin-right: 400px;
  }

  .side-panel {
    position: fixed;
    top: 0;
    right: 0;
    width: 400px;
    height: 100vh;
    background: white;
    border-left: 1px solid #dee2e6;
    box-shadow: -2px 0 10px rgba(0, 0, 0, 0.1);
    z-index: 100;
    overflow-y: auto;
    transform: translateX(100%);
    transition: transform 0.3s ease-out;
  }

  .layout-container.has-modal .side-panel {
    transform: translateX(0);
  }

  .modal-content {
    opacity: 0;
    animation: fadeIn 0.3s ease-out 0.1s forwards;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateX(20px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
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