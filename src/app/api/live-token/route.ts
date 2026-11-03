import { cookies } from 'next/headers';
import { readSession, SESSION_COOKIE } from '@/lib/auth';
import { GoogleGenAI, Modality } from '@google/genai';

export const dynamic = 'force-dynamic';
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY ?? '' });
const LIVE_MODEL = process.env.GEMINI_LIVE_MODEL ?? 'gemini-2.0-flash-live-001';

export async function GET() {
  const userId = await readSession(cookies().get(SESSION_COOKIE)?.value);
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const now = Date.now();
    const token = await ai.authTokens.create({
      config: {
        uses: 1,
        expireTime: new Date(now + 30 * 60 * 1000).toISOString(),
        newSessionExpireTime: new Date(now + 60 * 1000).toISOString(),
        liveConnectConstraints: {
          model: LIVE_MODEL,
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Aoede' } } },
          },
        },
      },
    });
    return Response.json({ token: token.name, model: LIVE_MODEL, expiresAt: now + 30 * 60 * 1000 });
  } catch (e) {
    return Response.json({ error: 'Token failed', detail: (e as Error).message }, { status: 502 });
  }
}
