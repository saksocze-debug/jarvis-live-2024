import { create } from 'zustand';
export type Msg = { id: string; role: 'user' | 'model'; text: string; streaming?: boolean };
export type Status = 'idle' | 'thinking' | 'speaking' | 'listening';

interface JarvisState {
  messages: Msg[]; conversationId?: string; status: Status;
  visemes: { jaw: number; funnel: number; pucker: number }; micLevel: number;
  addMessage: (m: Omit<Msg, 'id'>) => string;
  appendToMessage: (id: string, chunk: string) => void;
  finalizeMessage: (id: string) => void;
  setConversation: (id: string) => void;
  setStatus: (s: Status) => void;
  setVisemes: (v: { jaw: number; funnel: number; pucker: number }) => void;
  setMicLevel: (n: number) => void;
  reset: () => void;
}

export const useJarvis = create<JarvisState>((set) => ({
  messages: [], status: 'idle',
  visemes: { jaw: 0, funnel: 0, pucker: 0 }, micLevel: 0,
  addMessage: (m) => { const id = crypto.randomUUID(); set((s) => ({ messages: [...s.messages, { ...m, id }] })); return id; },
  appendToMessage: (id, chunk) => set((s) => ({ messages: s.messages.map((msg) => msg.id === id ? { ...msg, text: msg.text + chunk } : msg) })),
  finalizeMessage: (id) => set((s) => ({ messages: s.messages.map((msg) => msg.id === id ? { ...msg, streaming: false } : msg) })),
  setConversation: (id) => set({ conversationId: id }),
  setStatus: (status) => set({ status }),
  setVisemes: (visemes) => set({ visemes }),
  setMicLevel: (micLevel) => set({ micLevel }),
  reset: () => set({ messages: [], conversationId: undefined, status: 'idle' }),
}));
