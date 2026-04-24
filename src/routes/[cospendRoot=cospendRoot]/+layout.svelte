<script>
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { fly } from 'svelte/transition';
  import { quintOut } from 'svelte/easing';
  import PaymentModal from '$lib/components/cospend/PaymentModal.svelte';
  import Header from '$lib/components/Header.svelte';
  import UserHeader from '$lib/components/UserHeader.svelte';
  import LanguageSelector from '$lib/components/LanguageSelector.svelte';
  import LayoutDashboard from '@lucide/svelte/icons/layout-dashboard';
  import Wallet from '@lucide/svelte/icons/wallet';
  import RefreshCw from '@lucide/svelte/icons/refresh-cw';
  import ShoppingCart from '@lucide/svelte/icons/shopping-cart';
  import { detectCospendLang, cospendRoot, cospendLabels } from '$lib/js/cospendI18n';

  let { data, children } = $props();

  const lang = $derived(detectCospendLang($page.url.pathname));
  const root = $derived(cospendRoot(lang));
  const labels = $derived(cospendLabels(lang));

  let showModal = $state(false);
  /** @type {string | null} */
  let paymentId = $state(null);
  let user = $derived(data.session?.user);
  let isGuest = $derived(!data.session?.user);

  $effect(() => {
    // Check if URL contains payment view route OR if we have paymentId in state
    const match = $page.url.pathname.match(/\/(cospend|expenses)\/payments\/view\/([^\/]+)/);
    const statePaymentId = $page.state?.paymentId;
    const isOnDashboard = $page.route.id === '/[cospendRoot=cospendRoot]/dash';

    // Only show modal if we're on the dashboard AND have a payment to show
    if (isOnDashboard && (match || statePaymentId)) {
      showModal = true;
      paymentId = match ? match[2] : statePaymentId ?? null;
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
    if ($page.route.id === '/[cospendRoot=cospendRoot]/dash') {
      window.dispatchEvent(new CustomEvent('dashboardRefresh'));
    }
  }

  /** @param {string} path */
  function isActive(path) {
    const currentPath = $page.url.pathname;
    // Exact match for dash
    if (path.endsWith('/dash')) {
      return currentPath === path || currentPath === path + '/';
    }
    // For other paths, check if current path starts with the link path
    return currentPath.startsWith(path);
  }
</script>

<Header>
  {#snippet links()}
    <ul class="site_header">
      {#if !isGuest}
        <li style="--active-fill: var(--nord9)"><a href="/{root}/dash" class:active={isActive(`/${root}/dash`)}><LayoutDashboard size={16} strokeWidth={1.5} class="nav-icon" /><span class="nav-label">{labels.dash}</span></a></li>
      {/if}
      <li style="--active-fill: var(--nord13)"><a href="/{root}/list" class:active={isActive(`/${root}/list`)}><ShoppingCart size={16} strokeWidth={1.5} class="nav-icon" /><span class="nav-label">{labels.list}</span></a></li>
      {#if !isGuest}
        <li style="--active-fill: var(--nord14)"><a href="/{root}/payments" class:active={isActive(`/${root}/payments`)}><span class="nav-icon-wrap nav-icon-wallet"><Wallet size={16} strokeWidth={1.5} class="nav-icon" /></span><span class="nav-label">{labels.payments}</span></a></li>
        <li style="--active-fill: var(--nord12); --active-shape: circle(50%)"><a href="/{root}/recurring" class:active={isActive(`/${root}/recurring`)}><span class="nav-icon-wrap"><RefreshCw size={16} strokeWidth={1.5} class="nav-icon" /></span><span class="nav-label">{labels.recurring}</span></a></li>
      {/if}
    </ul>
  {/snippet}

  {#snippet right_side()}
    <LanguageSelector lang={lang} />
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
            <div in:fly={{x: 50, duration: 300, easing: quintOut}
  } out:fly={{x: -50, duration: 300, easing: quintOut}
  }>
              <PaymentModal {paymentId} onclose={() => showModal = false} onpaymentDeleted={handlePaymentDeleted} />
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
    top: 0;
    right: 0;
    width: 400px;
    height: 100vh;
    padding-top: var(--header-h, 3rem);
    background: var(--color-bg-tertiary);
    border-left: 1px solid var(--color-border);
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

  @media (max-width: 768px) {
    .layout-container.has-modal .main-content {
      margin-right: 0;
    }

    .side-panel {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      width: 100%;
      height: 100vh;
      padding-top: var(--header-h, 3rem);
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
      padding-top: 0;
      border-left: none;
      border-top: 1px solid var(--color-border);
      box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
      top: auto;
      bottom: 0;
      transform: translateY(100%);
    }

    .layout-container.has-modal .side-panel {
      transform: translateY(0);
    }
  }
</style>
