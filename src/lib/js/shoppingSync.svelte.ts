/**
 * Shopping list sync layer — real-time collaborative shopping list via SSE.
 *
 * Usage: call `getShoppingSync()` to get the shared singleton.
 * Manages SSE connection, debounced pushes, and reactive item state.
 */

type SyncStatus = 'idle' | 'synced' | 'syncing' | 'offline' | 'conflict';

export interface ShoppingItem {
  id: string;
  name: string;
  category: string;
  icon: string | null;
  checked: boolean;
  addedBy: string;
  checkedBy?: string;
  addedAt: string;
}

interface ServerList {
  version: number;
  items: ShoppingItem[];
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
}

export function createShoppingSync() {
  let items: ShoppingItem[] = $state([]);
  let status: SyncStatus = $state('idle');
  let version = $state(0);
  let shareToken: string | null = null;
  let eventSource: EventSource | null = null;
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let reconnectDelay = 1000;
  let _applying = false;

  function apiUrl(path: string): string {
    if (!shareToken) return path;
    const sep = path.includes('?') ? '&' : '?';
    return `${path}${sep}token=${encodeURIComponent(shareToken)}`;
  }

  async function pushToServer() {
    if (_applying) return;

    status = 'syncing';
    try {
      const res = await fetch(apiUrl('/api/cospend/list'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items,
          expectedVersion: version || undefined
        })
      });

      if (res.ok) {
        const doc = await res.json();
        version = doc.version;
        status = 'synced';
        reconnectDelay = 1000;
      } else if (res.status === 409) {
        const { list } = await res.json();
        applyServerState(list);
        await pushToServer();
      } else if (res.status === 401) {
        status = 'offline';
      } else {
        status = 'offline';
      }
    } catch {
      status = 'offline';
    }
  }

  function debouncedPush() {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => pushToServer(), 200);
  }

  function applyServerState(doc: ServerList) {
    if (!doc) return;
    _applying = true;
    try {
      version = doc.version;
      items = doc.items;
      status = 'synced';
    } finally {
      _applying = false;
    }
  }

  function connectSSE() {
    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }

    try {
      eventSource = new EventSource(apiUrl('/api/cospend/list/stream'));

      eventSource.addEventListener('update', (e) => {
        try {
          const doc = JSON.parse(e.data);
          if (doc.version > version) {
            applyServerState(doc);
          }
        } catch { /* ignore */ }
      });

      eventSource.onerror = () => {
        status = 'offline';
        eventSource?.close();
        eventSource = null;

        reconnectTimer = setTimeout(() => {
          reconnectDelay = Math.min(reconnectDelay * 2, 30000);
          connectSSE();
        }, reconnectDelay);
      };

      eventSource.onopen = () => {
        status = 'synced';
        reconnectDelay = 1000;
      };
    } catch {
      status = 'offline';
    }
  }

  function disconnect() {
    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    status = 'idle';
  }

  async function init(token?: string | null) {
    if (token) shareToken = token;
    try {
      const res = await fetch(apiUrl('/api/cospend/list'));
      if (!res.ok) {
        status = 'offline';
        return;
      }
      const doc = await res.json();
      version = doc.version;
      items = doc.items || [];
      status = 'synced';
      connectSSE();
    } catch {
      status = 'offline';
    }
  }

  /** Seed state from server-loaded data (safe to call during SSR). */
  function seed(initialList: { version: number; items: ShoppingItem[] }, token?: string | null) {
    if (token) shareToken = token;
    version = initialList.version;
    items = initialList.items || [];
    status = 'synced';
  }

  /** Connect SSE for real-time updates (client-only, call in onMount). */
  function connect(token?: string | null) {
    if (token) shareToken = token;
    connectSSE();
  }

  function addItem(name: string, user: string, category = 'Sonstiges') {
    items = [...items, {
      id: generateId(),
      name: name.trim(),
      category,
      icon: null,
      checked: false,
      addedBy: user,
      addedAt: new Date().toISOString()
    }];
    debouncedPush();
  }

  function toggleItem(id: string, user: string) {
    items = items.map(item =>
      item.id === id
        ? { ...item, checked: !item.checked, checkedBy: !item.checked ? user : undefined }
        : item
    );
    debouncedPush();
  }

  function removeItem(id: string) {
    items = items.filter(item => item.id !== id);
    debouncedPush();
  }

  function clearChecked() {
    items = items.filter(item => !item.checked);
    debouncedPush();
  }

  function updateItemCategory(id: string, category: string, icon?: string | null) {
    items = items.map(item =>
      item.id === id ? { ...item, category, ...(icon !== undefined ? { icon } : {}) } : item
    );
    debouncedPush();
  }

  function updateItem(id: string, patch: Partial<Omit<ShoppingItem, 'id'>>) {
    items = items.map(item => item.id === id ? { ...item, ...patch } : item);
    debouncedPush();
  }

  return {
    get items() { return items; },
    get status() { return status; },
    get version() { return version; },
    apiUrl,
    init,
    seed,
    connect,
    addItem,
    toggleItem,
    removeItem,
    clearChecked,
    updateItemCategory,
    updateItem,
    disconnect
  };
}

let _instance: ReturnType<typeof createShoppingSync> | null = null;

export function getShoppingSync() {
  if (!_instance) {
    _instance = createShoppingSync();
  }
  return _instance;
}
