import { prisma } from './db.js';
import { embed, cosine } from './embeddings.js';
export async function remember(userId: string, kind: string, key: string, value: string) {
  let embedding: number[] | null = null;
  try { embedding = await embed(`${key}: ${value}`); } catch {}
  return prisma.memory.upsert({
    where: { userId_key: { userId, key } },
    create: { userId, kind, key, value, embedding: embedding as any },
    update: { kind, value, embedding: embedding as any },
  });
}
export async function semanticRecall(userId: string, query: string, limit = 8) {
  const rows = await prisma.memory.findMany({ where: { userId } });
  let qVec: number[] | null = null;
  try { qVec = await embed(query); } catch {}
  if (!qVec) return rows.slice(-limit);
  return rows.map((r) => {
    const vec = r.embedding as number[] | null;
    return { ...r, score: vec ? cosine(qVec!, vec) : 0 };
  }).sort((a, b) => b.score - a.score).slice(0, limit);
}
export async function forget(userId: string, key: string) {
  return prisma.memory.deleteMany({ where: { userId, key } });
}
export function memoriesToPrompt(mems: { key: string; value: string }[]): string {
  if (!mems.length) return '';
  return '\n\nUser memory (weave naturally):\n' + mems.map((m) => `• ${m.key}: ${m.value}`).join('\n');
}
