import Fastify from 'fastify';
import websocket from '@fastify/websocket';
import cookie from '@fastify/cookie';
import rateLimit from '@fastify/rate-limit';
import next from 'next';
import { GoogleGenAI, Modality } from '@google/genai';
import { prisma } from './src/lib/db.js';

const dev = process.env.NODE_ENV !== 'production';
const port = Number(process.env.PORT ?? 3000);
const host = '0.0.0.0';

const app = Fastify({ logger: { level: 'info' } });
await app.register(cookie, { secret: process.env.APP_SECRET ?? 'dev-secret' });
await app.register(rateLimit, { max: 120, timeWindow: '1 minute' });
await app.register(websocket);

const nextApp = next({ dev, hostname: host, port });
const handle = nextApp.getRequestHandler();
await nextApp.prepare();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
const LIVE_MODEL = process.env.GEMINI_LIVE_MODEL ?? 'gemini-2.0-flash-live-001';

app.get('/api/live', { websocket: true }, (socket) => {
  app.log.info('ws: client connected');
  let session: any = null;
  let closed = false;

  (async () => {
    try {
      session = await ai.live.connect({
        model: LIVE_MODEL,
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Aoede' } } },
          systemInstruction: 'You are JARVIS — calm, brilliant, subtly witty personal AI. Speak concisely with dry British humour.',
        },
        callbacks: {
          onmessage: (msg: any) => { if (!closed) try { socket.send(JSON.stringify(msg)); } catch {} },
          onerror: (err: any) => {
            app.log.error({ err }, 'live error');
            if (!closed) try { socket.send(JSON.stringify({ type: 'error', message: String(err?.message ?? err) })); } catch {}
          },
          onclose: () => { if (!closed) { closed = true; try { socket.close(); } catch {} } },
        },
      });
    } catch (err: any) {
      app.log.error({ err }, 'live connect failed');
      try { socket.send(JSON.stringify({ type: 'error', message: err.message })); } catch {}
      socket.close();
    }
  })();

  socket.on('message', (raw: Buffer) => {
    if (!session || closed) return;
    try {
      const m = JSON.parse(raw.toString());
      if (m.audio) session.sendRealtimeInput({ media: { data: m.audio, mimeType: 'audio/pcm;rate=16000' } });
      else if (m.text) session.sendClientContent({ turns: [{ role: 'user', parts: [{ text: m.text }] }], turnComplete: true });
    } catch (e) { app.log.error({ e }, 'ws msg parse'); }
  });

  socket.on('close', () => { closed = true; try { session?.close?.(); } catch {} });
});

app.all('*', (req, reply) => { reply.hijack(); handle(req.raw, reply.raw); });

await app.listen({ port, host });
app.log.info(`JARVIS on http://${host}:${port}`);

for (const sig of ['SIGTERM', 'SIGINT'] as const) {
  process.on(sig, async () => {
    app.log.info(`shutdown ${sig}`);
    await app.close();
    await prisma.$disconnect();
    process.exit(0);
  });
}
