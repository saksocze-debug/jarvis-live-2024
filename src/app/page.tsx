'use client';
import dynamic from 'next/dynamic';
import { ChatStream } from '../components/ChatStream';
import { StatusBar } from '../components/StatusBar';
import { VoiceDock } from '../components/VoiceDock';
import { UploadZone } from '../components/UploadZone';

const Hologram = dynamic(() => import('../components/Hologram').then((m) => m.Hologram), { ssr: false });

export default function Home() {
  return (
    <main className="relative min-h-screen grid-overlay">
      <header className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-jarvis-cyan/15">
        <h1 className="text-lg font-semibold tracking-[0.35em] text-jarvis-cyan glow-text">J.A.R.V.I.S. <span className="text-white/30 text-[10px] tracking-normal">ULTRA v2</span></h1>
        <a href="/login" className="text-xs text-jarvis-cyan/60 hover:text-jarvis-cyan transition">Account</a>
      </header>
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-4 p-4 lg:p-6">
        <div className="lg:col-span-3 order-2 lg:order-1 h-[60vh] lg:h-[calc(100vh-140px)] min-h-0"><ChatStream /></div>
        <div className="lg:col-span-6 order-1 lg:order-2 relative rounded-2xl overflow-hidden glass h-[48vh] lg:h-[calc(100vh-140px)]">
          <Hologram />
          <div className="absolute inset-0 pointer-events-none flex items-end justify-center pb-4">
            <div className="text-[9px] tracking-[0.5em] text-jarvis-cyan/40 font-mono">HOLOGRAPHIC INTERFACE · GEMINI UPLINK</div>
          </div>
        </div>
        <div className="lg:col-span-3 order-3 space-y-4"><StatusBar /><VoiceDock /><UploadZone /></div>
      </div>
    </main>
  );
}
