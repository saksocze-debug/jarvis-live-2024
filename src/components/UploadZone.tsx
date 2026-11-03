'use client';
import { useRef, useState } from 'react';
import { useJarvis } from '@/store/jarvis';

export function UploadZone() {
  const inputRef = useRef<HTMLInputElement>(null);
  const { addMessage } = useJarvis();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onFile(f: File) {
    setBusy(true); setErr(null);
    const form = new FormData();
    form.append('file', f);
    form.append('prompt', 'Analyze this file. If it contains text, transcribe it. Summarize key facts.');
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: form });
      const j = await res.json();
      if (!res.ok) { setErr(j.error ?? j.detail ?? 'Upload failed'); return; }
      addMessage({ role: 'model', text: `**${j.filename}**\n\n${j.summary}` });
    } catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  }

  return (
    <div onClick={() => inputRef.current?.click()}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) onFile(f); }}
      className="glass rounded-2xl p-4 cursor-pointer hover:border-jarvis-cyan/40 transition text-center">
      <input ref={inputRef} type="file" accept="image/*,application/pdf" hidden onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
      <div className="text-xs uppercase tracking-[0.3em] text-jarvis-cyan/70 mb-1">Upload</div>
      <div className="text-[11px] text-jarvis-cyan/50">{busy ? 'Analyzing with Gemini Vision…' : 'Image / PDF · click or drop'}</div>
      {err && <div className="text-[10px] text-red-300/80 mt-1">{err}</div>}
    </div>
  );
}
