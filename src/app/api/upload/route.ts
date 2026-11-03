import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';
import { readSession, SESSION_COOKIE } from '@/lib/auth';
import { GoogleGenAI } from '@google/genai';

export const runtime = 'nodejs';
export const maxDuration = 60;
const MAX_SIZE = 8 * 1024 * 1024;
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY ?? '' });
const MODEL = process.env.GEMINI_MODEL ?? 'gemini-2.5-flash';

export async function POST(req: Request) {
  const userId = await readSession(cookies().get(SESSION_COOKIE)?.value);
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const form = await req.formData();
  const file = form.get('file');
  const prompt = String(form.get('prompt') ?? 'Describe this. If text, transcribe it.');
  if (!(file instanceof File)) return Response.json({ error: 'No file' }, { status: 400 });
  if (file.size > MAX_SIZE) return Response.json({ error: 'File >8MB' }, { status: 413 });
  if (!ALLOWED.includes(file.type)) return Response.json({ error: `Unsupported: ${file.type}` }, { status: 415 });
  const buf = Buffer.from(await file.arrayBuffer());
  const base64 = buf.toString('base64');
  try {
    const res = await ai.models.generateContent({
      model: MODEL,
      contents: [{ role: 'user', parts: [{ text: prompt }, { inlineData: { mimeType: file.type, data: base64 } }] }],
    });
    const summary = res.text ?? '(no response)';
    const saved = await prisma.uploadedFile.create({ data: { userId, filename: file.name, mimeType: file.type, size: file.size, data: base64, summary } });
    return Response.json({ ok: true, id: saved.id, filename: saved.filename, summary });
  } catch (e) {
    return Response.json({ error: 'Vision failed', detail: (e as Error).message }, { status: 502 });
  }
}
