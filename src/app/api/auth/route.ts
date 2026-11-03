import { cookies } from 'next/headers';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { hashPassword, verifyPassword, signSession, SESSION_COOKIE } from '@/lib/auth';

const Body = z.object({
  action: z.enum(['register', 'login', 'logout']),
  email: z.string().email().optional(),
  password: z.string().min(8).optional(),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return Response.json({ error: 'Invalid body' }, { status: 400 });
  const { action, email, password } = parsed.data;
  if (action === 'logout') { cookies().delete(SESSION_COOKIE); return Response.json({ ok: true }); }
  if (!email || !password) return Response.json({ error: 'Missing fields' }, { status: 400 });
  if (action === 'register') {
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) return Response.json({ error: 'Email registered' }, { status: 409 });
    const u = await prisma.user.create({ data: { email, passwordHash: await hashPassword(password) } });
    cookies().set(SESSION_COOKIE, await signSession(u.id), { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 30 });
    return Response.json({ ok: true, userId: u.id });
  }
  const u = await prisma.user.findUnique({ where: { email } });
  if (!u || !(await verifyPassword(password, u.passwordHash))) return Response.json({ error: 'Invalid credentials' }, { status: 401 });
  cookies().set(SESSION_COOKIE, await signSession(u.id), { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 30 });
  return Response.json({ ok: true, userId: u.id });
}
