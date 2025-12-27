<script>
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { fly } from 'svelte/transition';
  import { quintOut } from 'svelte/easing';
  import PaymentModal from '$lib/components/PaymentModal.svelte';
  import Header from '$lib/components/Header.svelte';
  import UserHeader from '$lib/components/UserHeader.svelte';

  let { data, children } = $props();
  
  let showModal = false;
  let paymentId = null;
  let user;
  
  if (data.session) {
    user = data.session.user;
  }

  $effect(() => {
    // Check if URL contains payment view route OR if we have paymentId in state
    const match = $page.url.pathname.match(/\/cospend\/payments\/view\/([^\/]+)/);
    const statePaymentId = $page.state?.paymentId;
    const isOnDashboard = $page.route.id === '/cospend';

    // Only show modal if we're on the dashboard AND have a payment to show
    if (isOnDashboard && (match || statePaymentId)) {
      showModal = true;
      paymentId = match ? match[1] : statePaymentId;
    } else {
      showModal = false;
      paymentId = null;
    }
  });

  async function handlePaymentDeleted() {
    // Close the modal
    showModal = false;
    paymentId = null;

    // Dispatch a custom event to trigger dashboard refresh
    if ($page.route.id === '/cospend') {
      window.dispatchEvent(new CustomEvent('dashboardRefresh'));
    }
  }

  function isActive(path) {
    const currentPath = $page.url.pathname;
    // Exact match for cospend root
    if (path === '/cospend') {
      return currentPath === '/cospend' || currentPath === '/cospend/';
    }
    // For other paths, check if current path starts with the link path
    return currentPath.startsWith(path);
  }
</script>

<Header>
  {#snippet links()}
    <ul class="site_header">
      <li><a href="/cospend" class:active={isActive('/cospend')}>Dashboard</a></li>
      <li><a href="/cospend/payments" class:active={isActive('/cospend/payments')}>All Payments</a></li>
      <li><a href="/cospend/recurring" class:active={isActive('/cospend/recurring')}>Recurring Payments</a></li>
    </ul>
  {/snippet}

  {#snippet right_side()}
    <UserHeader {user}></UserHeader>
  {/snippet}

  <div class="layout-container" class:has-modal={showModal}>
    <div class="main-content">
      {@render children()}
    </div>

    <div class="side-panel">
      {#if showModal}
        <div class="modal-content">
          {#key paymentId}
            <div in:fly={{x: 50, duration: 300, easing: quintOut}} out:fly={{x: -50, duration: 300, easing: quintOut}}>
              <PaymentModal {paymentId} on:close={() => showModal = false} on:paymentDeleted={handlePaymentDeleted} />
            </div>
          {/key}
        </div>
      {/if}
    </div>
  </div>
</Header>

<style>
  .layout-container {
    display: flex;
    min-height: calc(100vh - 4rem);
  }

  .main-content {
    flex: 1;
    max-width: 100%;
    overflow-x: hidden;
    transition: margin-right 0.3s ease-out;
  }

  .layout-container.has-modal .main-content {
    margin-right: 400px;
  }

  .side-panel {
    position: fixed;
    top: 4rem;
    right: 0;
    width: 400px;
    height: calc(100vh - 4rem);
    background: #fbf9f3;
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
    position: relative;
    height: 100%;
  }

  .modal-content > div {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    overflow-y: auto;
  }

  @media (prefers-color-scheme: dark) {
    .side-panel {
      background: var(--background-dark);
      border-left-color: #434C5E;
    }
  }

  @media (max-width: 768px) {
    .layout-container.has-modal .main-content {
      margin-right: 0;
    }

    .side-panel {
      position: fixed;
      top: 4rem;
      left: 0;
      right: 0;
      width: 100%;
      height: calc(100vh - 4rem);
      transform: translateY(100%);
    }

    .layout-container.has-modal .side-panel {
      transform: translateY(0);
    }
  }

  @media (max-width: 480px) {
    .layout-container.has-modal {
      flex-direction: column;
    }

    .layout-container.has-modal .main-content {
      flex: none;
      height: 40vh;
      overflow-y: auto;
      margin-right: 0;
    }

    .side-panel {
      flex: none;
      height: 60vh;
      min-width: unset;
      max-width: unset;
      width: 100%;
      border-left: none;
      border-top: 1px solid #dee2e6;
      box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
      top: auto;
      bottom: 0;
      transform: translateY(100%);
    }

    .layout-container.has-modal .side-panel {
      transform: translateY(0);
    }
  }

  @media (max-width: 768px) and (prefers-color-scheme: dark) {
    .side-panel {
      border-top-color: #434C5E;
    }
  }
</style>
