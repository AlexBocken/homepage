/**
 * In-memory SSE connection manager.
 * Maps userId → Set of writable stream controllers for broadcasting workout state.
 */

type SSEController = ReadableStreamDefaultController<Uint8Array>;

const connections = new Map<string, Set<SSEController>>();

const encoder = new TextEncoder();

export function addConnection(userId: string, controller: SSEController) {
  if (!connections.has(userId)) {
    connections.set(userId, new Set());
  }
  connections.get(userId)!.add(controller);
}

export function removeConnection(userId: string, controller: SSEController) {
  const set = connections.get(userId);
  if (set) {
    set.delete(controller);
    if (set.size === 0) {
      connections.delete(userId);
    }
  }
}

export function broadcast(userId: string, event: string, data: unknown, excludeController?: SSEController) {
  const set = connections.get(userId);
  if (!set) return;

  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  const bytes = encoder.encode(payload);

  for (const controller of set) {
    if (controller === excludeController) continue;
    try {
      controller.enqueue(bytes);
    } catch {
      // Client disconnected — clean up
      set.delete(controller);
    }
  }

  if (set.size === 0) {
    connections.delete(userId);
  }
}

export function getConnectionCount(userId: string): number {
  return connections.get(userId)?.size ?? 0;
}
