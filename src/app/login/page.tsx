'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const r = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr(null);
    const res = await fetch('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: mode, email, password }) });
    const j = await res.json(); setBusy(false);
    if (!res.ok) { setErr(j.error ?? 'Failed'); return; }
    r.push('/');
  }

  return (
    <main className="min-h-screen grid place-items-center grid-overlay p-6">
      <form onSubmit={submit} className="glass rounded-2xl p-6 w-full max-w-sm space-y-4">
        <div className="text-center space-y-1">
          <h1 className="text-jarvis-cyan glow-text text-xl tracking-[0.4em]">J.A.R.V.I.S.</h1>
          <p className="text-[10px] uppercase tracking-widest text-jarvis-cyan/50">{mode === 'login' ? 'authentication required' : 'create account'}</p>
        </div>
        <input type="email" placeholder="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full bg-black/40 border border-jarvis-cyan/25 rounded-lg px-3 py-2 text-sm outline-none focus:border-jarvis-cyan/60" />
        <input type="password" placeholder="password (min 8)" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} className="w-full bg-black/40 border border-jarvis-cyan/25 rounded-lg px-3 py-2 text-sm outline-none focus:border-jarvis-cyan/60" />
        {err && <div className="text-xs text-red-300">{err}</div>}
        <button disabled={busy} className="w-full py-2 rounded-lg bg-jarvis-cyan/15 border border-jarvis-cyan/40 text-jarvis-cyan hover:bg-jarvis-cyan/25 text-sm disabled:opacity-40">{busy ? '…' : mode === 'login' ? 'Sign in' : 'Register'}</button>
        <button type="button" onClick={() => setMode(mode === 'login' ? 'register' : 'login')} className="w-full text-[11px] text-jarvis-cyan/60 hover:text-jarvis-cyan">{mode === 'login' ? 'No account? Register' : 'Have account? Sign in'}</button>
      </form>
    </main>
  );
}
