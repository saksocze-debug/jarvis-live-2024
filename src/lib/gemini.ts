import { GoogleGenAI, type Content } from '@google/genai';
import { toolDeclarations, handleToolCall } from './functions.js';

const MODEL = process.env.GEMINI_MODEL ?? 'gemini-2.5-flash';
export const GEMINI_MODEL_NAME = MODEL;
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY ?? '' });

export const JARVIS_SYSTEM =
  'You are J.A.R.V.I.S., a highly intelligent personal AI assistant. ' +
  'Speak concisely, use dry British wit, never invent facts. ' +
  'Use tools when helpful (time, reminders, memory). Never claim an action succeeded unless a tool returned ok:true.';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function streamChat(opts: {
  userId: string;
  message: string;
  history: { role: 'user' | 'model'; text: string }[];
  systemExtra?: string;
  onToken: (chunk: string) => void;
  maxTurns?: number;
}): Promise<string> {
  const { userId, message, history, onToken } = opts;
  const maxTurns = opts.maxTurns ?? 4;
  const contents: Content[] = [
    ...history.map((h) => ({ role: h.role, parts: [{ text: h.text }] })),
    { role: 'user', parts: [{ text: message }] },
  ];
  const config: any = {
    temperature: 0.7,
    systemInstruction: JARVIS_SYSTEM + (opts.systemExtra ?? ''),
    tools: [{ functionDeclarations: toolDeclarations }],
  };

  let finalText = '';
  let turn = 0;
  while (turn < maxTurns) {
    turn++;
    let streamed = '';
    const functionCalls: { name: string; args: any }[] = [];
    let lastErr: unknown = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const stream = await ai.models.generateContentStream({ model: MODEL, contents, config });
        functionCalls.length = 0; streamed = '';
        for await (const chunk of stream) {
          const text = chunk.text;
          if (text) { streamed += text; onToken(text); }
          const calls = chunk.functionCalls;
          if (calls && calls.length) for (const c of calls) functionCalls.push({ name: c.name!, args: c.args });
        }
        lastErr = null; break;
      } catch (err) {
        lastErr = err;
        await sleep(Math.min(500 * 2 ** attempt, 6000));
      }
    }
    if (lastErr) throw new Error(`Gemini streaming failed: ${(lastErr as Error).message}`);
    finalText += streamed;
    if (functionCalls.length === 0) return finalText;
    contents.push({ role: 'model', parts: functionCalls.map((c) => ({ functionCall: { name: c.name, args: c.args } })) as any });
    const toolParts: any[] = [];
    for (const c of functionCalls) {
      const result = await handleToolCall(userId, c.name, c.args);
      toolParts.push({ functionResponse: { name: c.name, response: JSON.parse(result) } });
      onToken(`\n_[Used tool: ${c.name}]_\n`);
    }
    contents.push({ role: 'user', parts: toolParts });
  }
  return finalText || '(No final response.)';
}
