import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
const secret = new TextEncoder().encode(process.env.APP_SECRET ?? 'dev-secret-change-me');
export const SESSION_COOKIE = 'jarvis_session';
export const hashPassword = (pw: string) => bcrypt.hash(pw, 10);
export const verifyPassword = (pw: string, h: string) => bcrypt.compare(pw, h);
export async function signSession(userId: string) {
  return new SignJWT({ sub: userId }).setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt().setExpirationTime('30d').sign(secret);
}
export async function readSession(token: string | undefined): Promise<string | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    return typeof payload.sub === 'string' ? payload.sub : null;
  } catch { return null; }
}
