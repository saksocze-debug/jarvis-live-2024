'use client';
import { useEffect, useRef, useState } from 'react';
import { useJarvis } from '@/store/jarvis';

export function ChatStream() {
  const { messages, addMessage, appendToMessage, finalizeMessage, setStatus, setConversation, conversationId } = useJarvis();
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const busy = useRef(false);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }); }, [messages]);

  async function send(text: string) {
    if (!text.trim() || busy.current) return;
    busy.current = true; setError(null); setInput('');
    addMessage({ role: 'user', text });
    const modelId = addMessage({ role: 'model', text: '', streaming: true });
    setStatus('thinking');
    try {
      const res = await fetch('/api/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, conversationId }),
      });
      if (res.status === 401) { setError('Please log in'); setStatus('idle'); return; }
      if (!res.ok || !res.body) { const j = await res.json().catch(() => ({})); setError(j.detail ?? j.error ?? 'Request failed'); finalizeMessage(modelId); setStatus('idle'); return; }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let idx: number;
        while ((idx = buf.indexOf('\n\n')) >= 0) {
          const raw = buf.slice(0, idx); buf = buf.slice(idx + 2);
          const lines = raw.split('\n');
          const event = lines.find((l) => l.startsWith('event:'))?.slice(6).trim();
          const data = lines.find((l) => l.startsWith('data:'))?.slice(5).trim();
          if (!event || !data) continue;
          try {
            const p = JSON.parse(data);
            if (event === 'meta' && p.conversationId) setConversation(p.conversationId);
            if (event === 'token') appendToMessage(modelId, p.text);
            if (event === 'done') finalizeMessage(modelId);
            if (event === 'error') { setError(p.message); finalizeMessage(modelId); }
          } catch {}
        }
      }
      finalizeMessage(modelId); setStatus('idle');
    } catch (e) { setError((e as Error).message); finalizeMessage(modelId); setStatus('idle'); }
    finally { busy.current = false; }
  }

  return (
    <div className="glass rounded-2xl flex flex-col h-full min-h-0">
      <div className="px-4 py-3 border-b border-jarvis-cyan/20 flex items-center justify-between">
        <span className="text-xs uppercase tracking-[0.3em] text-jarvis-cyan/80">Conversation</span>
        {conversationId && <span className="text-[10px] text-jarvis-cyan/50 font-mono">{conversationId.slice(0, 8)}</span>}
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
        {messages.length === 0 && (
          <div className="text-center text-jarvis-cyan/40 text-sm mt-8 leading-relaxed">
            Good evening, sir.<br /><span className="text-xs text-jarvis-cyan/30">JARVIS online · awaiting instruction</span>
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] px-3 py-2 rounded-lg whitespace-pre-wrap text-sm leading-relaxed ${m.role === 'user' ? 'bg-jarvis-blue/15 border border-jarvis-blue/30 text-cyan-100' : 'bg-jarvis-cyan/10 border border-jarvis-cyan/20 text-jarvis-cyan/95'}`}>
              {m.text || (m.streaming ? <span className="animate-pulse">▊</span> : null)}
              {m.streaming && m.text && <span className="animate-pulse ml-0.5">▊</span>}
            </div>
          </div>
        ))}
      </div>
      {error && <div className="px-4 py-2 text-[11px] text-red-300/80 border-t border-red-400/20 bg-red-500/5">{error}</div>}
      <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="p-3 border-t border-jarvis-cyan/20 flex gap-2">
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Speak or type…" className="flex-1 bg-black/40 border border-jarvis-cyan/25 rounded-lg px-3 py-2 text-sm outline-none focus:border-jarvis-cyan/60" />
        <button type="submit" disabled={!input.trim()} className="px-4 py-2 rounded-lg bg-jarvis-cyan/15 border border-jarvis-cyan/40 text-jarvis-cyan hover:bg-jarvis-cyan/25 disabled:opacity-40 text-sm">Send</button>
      </form>
    </div>
  );
}
