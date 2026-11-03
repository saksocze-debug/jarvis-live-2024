import { cookies } from 'next/headers';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { readSession, SESSION_COOKIE } from '@/lib/auth';

export async function GET() {
  const userId = await readSession(cookies().get(SESSION_COOKIE)?.value);
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const rows = await prisma.memory.findMany({
    where: { userId }, orderBy: { createdAt: 'desc' }, take: 100,
    select: { id: true, kind: true, key: true, value: true, createdAt: true },
  });
  return Response.json({ memories: rows });
}

const Del = z.object({ key: z.string().min(1) });
export async function DELETE(req: Request) {
  const userId = await readSession(cookies().get(SESSION_COOKIE)?.value);
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const parsed = Del.safeParse(await req.json());
  if (!parsed.success) return Response.json({ error: 'Invalid' }, { status: 400 });
  await prisma.memory.deleteMany({ where: { userId, key: parsed.data.key } });
  return Response.json({ ok: true });
}
