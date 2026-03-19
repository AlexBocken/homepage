import type { RequestHandler } from './$types';
import { addConnection, removeConnection } from '$lib/server/sseManager';

// GET /api/fitness/workout/active/stream — SSE endpoint
export const GET: RequestHandler = async ({ locals }) => {
  const session = await locals.auth();
  if (!session?.user?.nickname) {
    return new Response('Unauthorized', { status: 401 });
  }

  const userId = session.user.nickname;
  const encoder = new TextEncoder();

  let controllerRef: ReadableStreamDefaultController<Uint8Array>;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controllerRef = controller;
      addConnection(userId, controller);

      // Send initial heartbeat
      try {
        controller.enqueue(encoder.encode(': heartbeat\n\n'));
      } catch {
        // ignore
      }
    },
    cancel() {
      removeConnection(userId, controllerRef);
    }
  });

  // Heartbeat interval to keep connection alive
  const heartbeatInterval = setInterval(() => {
    try {
      controllerRef.enqueue(encoder.encode(': heartbeat\n\n'));
    } catch {
      clearInterval(heartbeatInterval);
      removeConnection(userId, controllerRef);
    }
  }, 30000);

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no' // disable nginx buffering
    }
  });
};
