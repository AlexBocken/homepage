/**
 * SSE connection manager for the shared shopping list.
 * Unlike sseManager.ts (per-user), this broadcasts to ALL connected clients.
 */

type SSEController = ReadableStreamDefaultController<Uint8Array>;

const connections = new Set<SSEController>();
const encoder = new TextEncoder();

export function addConnection(controller: SSEController) {
  connections.add(controller);
}

export function removeConnection(controller: SSEController) {
  connections.delete(controller);
}

export function broadcast(event: string, data: unknown, excludeController?: SSEController) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  const bytes = encoder.encode(payload);

  for (const controller of connections) {
    if (controller === excludeController) continue;
    try {
      controller.enqueue(bytes);
    } catch {
      connections.delete(controller);
    }
  }
}

export function getConnectionCount(): number {
  return connections.size;
}
