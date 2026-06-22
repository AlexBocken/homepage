<script>
  import { resolve } from '$app/paths';
  import { page } from '$app/state';
  import { onMount, onDestroy } from 'svelte';
  import Header from '$lib/components/Header.svelte';
  import UserHeader from '$lib/components/UserHeader.svelte';
  import ClipboardList from '@lucide/svelte/icons/clipboard-list';
  import Trophy from '@lucide/svelte/icons/trophy';
  import { precacheShells } from '$lib/offline/precacheShells';
  let { data, children } = $props();
  let user = $derived(data.session?.user);

  // Tasks are gated on the `task_users` group (see hooks.server.ts).
  // Only precache the section's shells for offline use if the user has access.
  const TASK_SHELLS = ['/tasks', '/tasks/rewards'];
  function precacheTaskShells() {
    if (!data.session?.user?.groups?.includes('task_users')) return;
    precacheShells(TASK_SHELLS);
  }

  onMount(() => {
    precacheTaskShells();
    window.addEventListener('online', precacheTaskShells);
  });

  onDestroy(() => {
    if (typeof window !== 'undefined') window.removeEventListener('online', precacheTaskShells);
  });

  /** @param {string} path */
  function isActive(path) {
    const currentPath = page.url.pathname;
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
