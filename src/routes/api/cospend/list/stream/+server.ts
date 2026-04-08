import type { RequestHandler } from './$types';
import { error } from '@sveltejs/kit';
import { addConnection, removeConnection } from '$lib/server/shoppingSSE';
import { getShoppingUser } from '$lib/server/shoppingAuth';

// GET /api/cospend/list/stream — SSE endpoint for live shopping list updates
export const GET: RequestHandler = async ({ locals, url }) => {
  const user = await getShoppingUser(locals, url);
  if (!user) throw error(401, 'Not logged in');

  const encoder = new TextEncoder();
  let controllerRef: ReadableStreamDefaultController<Uint8Array>;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controllerRef = controller;
      addConnection(controller);

      try {
        controller.enqueue(encoder.encode(': heartbeat\n\n'));
      } catch {
        // ignore
      }
    },
    cancel() {
      removeConnection(controllerRef);
    }
  });

  const heartbeatInterval = setInterval(() => {
    try {
      controllerRef.enqueue(encoder.encode(': heartbeat\n\n'));
    } catch {
      clearInterval(heartbeatInterval);
      removeConnection(controllerRef);
    }
  }, 30000);

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no'
    }
  });
};
