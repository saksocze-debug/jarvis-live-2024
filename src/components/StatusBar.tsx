'use client';
import { useEffect, useState } from 'react';
import { useJarvis } from '@/store/jarvis';

export function StatusBar() {
  const { status } = useJarvis();
  const [now, setNow] = useState('');
  useEffect(() => { const t = () => setNow(new Date().toLocaleTimeString('en-GB')); t(); const id = setInterval(t, 1000); return () => clearInterval(id); }, []);
  const c = status === 'speaking' ? 'text-emerald-300' : status === 'listening' ? 'text-amber-300' : status === 'thinking' ? 'text-cyan-300' : 'text-jarvis-cyan/70';
  return (
    <div className="glass rounded-2xl p-4 text-xs space-y-2.5 font-mono">
      <div className="uppercase tracking-[0.3em] text-jarvis-cyan/70 text-[10px]">Telemetry</div>
      <Row label="Model" value={<span className="text-jarvis-cyan">{process.env.NEXT_PUBLIC_GEMINI_MODEL ?? 'gemini-2.5-flash'}</span>} />
      <Row label="Status" value={<span className={c}>{status.toUpperCase()}</span>} />
      <Row label="Uplink" value={<span className="text-emerald-300">● ONLINE</span>} />
      <Row label="Time" value={<span className="text-jarvis-cyan">{now}</span>} />
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="flex justify-between items-center"><span className="text-white/40">{label}</span><span>{value}</span></div>;
}
