<script>
  import { resolve } from '$app/paths';
  import { page } from '$app/stores';
  import Header from '$lib/components/Header.svelte';
  import UserHeader from '$lib/components/UserHeader.svelte';
  import ClipboardList from '@lucide/svelte/icons/clipboard-list';
  import Trophy from '@lucide/svelte/icons/trophy';
  let { data, children } = $props();
  let user = $derived(data.session?.user);

  /** @param {string} path */
  function isActive(path) {
    const currentPath = $page.url.pathname;
    if (path === '/tasks') {
      return currentPath === '/tasks' || currentPath === '/tasks/';
    }
    return currentPath.startsWith(path);
  }
</script>

<Header>
  {#snippet links()}
    <ul class="site_header">
      <li style="--active-fill: var(--nord10)"><a href={resolve('/tasks')} class:active={isActive('/tasks')}><ClipboardList size={16} strokeWidth={1.5} class="nav-icon" /><span class="nav-label">Aufgaben</span></a></li>
      <li style="--active-fill: var(--nord13)"><a href={resolve('/tasks/rewards')} class:active={isActive('/tasks/rewards')}><Trophy size={16} strokeWidth={1.5} class="nav-icon" /><span class="nav-label">Sticker</span></a></li>
    </ul>
  {/snippet}

  {#snippet right_side()}
    <UserHeader {user}></UserHeader>
  {/snippet}

  {@render children()}
</Header>
