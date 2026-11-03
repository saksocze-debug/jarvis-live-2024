import { GoogleGenAI } from '@google/genai';
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY ?? '' });
const EMBED_MODEL = process.env.GEMINI_EMBED_MODEL ?? 'text-embedding-004';
export async function embed(text: string): Promise<number[]> {
  const res = await ai.models.embedContent({ model: EMBED_MODEL, contents: [text] });
  const vec = res.embeddings?.[0]?.values;
  if (!vec || vec.length === 0) throw new Error('Empty embedding');
  return vec;
}
export function cosine(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-9);
}
