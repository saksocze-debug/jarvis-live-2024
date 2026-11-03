import { cookies } from 'next/headers';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { streamChat } from '@/lib/gemini';
import { readSession, SESSION_COOKIE } from '@/lib/auth';
import { semanticRecall, memoriesToPrompt } from '@/lib/memory';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const Body = z.object({
  message: z.string().min(1).max(8000),
  conversationId: z.string().optional(),
});

export async function POST(req: Request) {
  const userId = await readSession(cookies().get(SESSION_COOKIE)?.value);
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return Response.json({ error: 'Invalid body' }, { status: 400 });
  const { message } = parsed.data;
  let conversationId = parsed.data.conversationId;
  if (!conversationId) {
    const conv = await prisma.conversation.create({ data: { userId, title: message.slice(0, 60) } });
    conversationId = conv.id;
  }
  const history = await prisma.message.findMany({ where: { conversationId }, orderBy: { createdAt: 'desc' }, take: 20 });
  const turns = history.reverse().map((m) => ({ role: m.role as 'user' | 'model', text: m.content }));
  const mems = await semanticRecall(userId, message, 8);
  const systemExtra = memoriesToPrompt(mems);
  await prisma.message.create({ data: { conversationId, role: 'user', content: message } });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: any) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };
      send('meta', { conversationId });
      try {
        const finalText = await streamChat({
          userId, message, history: turns, systemExtra,
          onToken: (chunk) => send('token', { text: chunk }),
        });
        await prisma.message.create({ data: { conversationId: conversationId!, role: 'model', content: finalText } });
        send('done', { text: finalText });
      } catch (e) {
        send('error', { message: (e as Error).message });
      } finally { controller.close(); }
    },
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive' },
  });
}
