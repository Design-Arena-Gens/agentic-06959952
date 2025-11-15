import { getCurrentSnapshot, secondsUntil } from '../../../lib/inventory';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      function send(data: unknown) {
        const payload = `data: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(payload));
      }
      function ping() {
        controller.enqueue(encoder.encode(': keep-alive\n\n'));
      }

      // Initial snapshot
      const snap = getCurrentSnapshot();
      send({ type: 'snapshot', snapshot: snap, secondsUntilNext: secondsUntil(snap.nextUpdateIso) });

      const interval = setInterval(() => {
        const s = getCurrentSnapshot();
        send({ type: 'tick', snapshot: s, secondsUntilNext: secondsUntil(s.nextUpdateIso) });
      }, 5000);

      const heartbeat = setInterval(() => ping(), 15000);

      const close = () => {
        clearInterval(interval);
        clearInterval(heartbeat);
        controller.close();
      };

      // Vercel/Node will call cancel on client disconnect
      // @ts-ignore
      controller.signal?.addEventListener?.('abort', close);
    },
    cancel() {
      // no-op; handled in start via abort
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
