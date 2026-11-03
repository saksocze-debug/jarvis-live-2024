'use client';
import { useState } from 'react';
import { useLiveAudio } from '@/hooks/useLiveAudio';
import { useJarvis } from '@/store/jarvis';

export function VoiceDock() {
  const { connect, disconnect, connected, error } = useLiveAudio();
  const { micLevel, status } = useJarvis();
  const [active, setActive] = useState(false);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    try { if (!active) { await connect(); setActive(true); } else { disconnect(); setActive(false); } }
    catch (e) { console.error(e); }
    finally { setBusy(false); }
  }

  return (
    <div className="glass rounded-2xl p-4 space-y-3">
      <div className="text-xs uppercase tracking-[0.3em] text-jarvis-cyan/70">Voice Link</div>
      <div className="flex items-center gap-4">
        <button onClick={toggle} disabled={busy}
          className={`relative w-16 h-16 rounded-full flex items-center justify-center border-2 transition-all ${active ? 'bg-jarvis-cyan/25 border-jarvis-cyan text-jarvis-cyan shadow-glow' : 'bg-black/40 border-jarvis-cyan/25 text-jarvis-cyan/60 hover:border-jarvis-cyan/60'}`}>
          {active && <span className="absolute inset-0 rounded-full pulse-ring border border-jarvis-cyan/50" />}
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <rect x="9" y="2" width="6" height="12" rx="3" />
            <path d="M5 10a7 7 0 0 0 14 0" />
            <line x1="12" y1="17" x2="12" y2="22" />
          </svg>
        </button>
        <div className="flex-1 space-y-1.5">
          <div className="h-1.5 rounded-full bg-black/40 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-jarvis-blue via-jarvis-cyan to-jarvis-ice transition-[width] duration-75" style={{ width: `${Math.min(100, micLevel * 300)}%` }} />
          </div>
          <div className="text-[10px] text-jarvis-cyan/60 font-mono uppercase tracking-wider">{active ? (connected ? `live · ${status}` : 'connecting…') : 'microphone off'}</div>
        </div>
      </div>
      {error && <div className="text-[11px] text-red-300/80">{error}</div>}
    </div>
  );
}
