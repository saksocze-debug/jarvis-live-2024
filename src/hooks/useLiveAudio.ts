'use client';
import { useCallback, useRef, useState } from 'react';
import { useJarvis } from '@/store/jarvis';
import { useVisemes } from './useVisemes';

const IN_RATE = 16000, OUT_RATE = 24000;

interface LiveMsg {
  serverContent?: {
    modelTurn?: { parts: { inlineData?: { data: string; mimeType: string } }[] };
    turnComplete?: boolean;
    interrupted?: boolean;
  };
  type?: string;
  message?: string;
}

export function useLiveAudio() {
  const { setStatus, setMicLevel } = useJarvis();
  const { start: startVisemes, stop: stopVisemes } = useVisemes();
  const wsRef = useRef<WebSocket | null>(null);
  const inCtxRef = useRef<AudioContext | null>(null);
  const outCtxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const nextStartRef = useRef(0);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const playPCM = useCallback((base64: string) => {
    const ctx = outCtxRef.current;
    if (!ctx) return;
    const bin = atob(base64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const pcm = new Int16Array(bytes.buffer);
    const float = new Float32Array(pcm.length);
    for (let i = 0; i < pcm.length; i++) float[i] = pcm[i] / 0x8000;
    const buf = ctx.createBuffer(1, float.length, OUT_RATE);
    buf.copyToChannel(float, 0);
    const src = ctx.createBufferSource();
    src.buffer = buf; src.connect(ctx.destination);
    if (analyserRef.current) try { src.connect(analyserRef.current); } catch {}
    const now = ctx.currentTime;
    const start = Math.max(now, nextStartRef.current);
    src.start(start); nextStartRef.current = start + buf.duration;
    setStatus('speaking');
    src.onended = () => { if (ctx.currentTime >= nextStartRef.current - 0.08) setStatus('idle'); };
  }, [setStatus]);

  const connect = useCallback(async () => {
    if (wsRef.current && wsRef.current.readyState <= 1) return;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, sampleRate: IN_RATE } });
    streamRef.current = stream;
    const inCtx = new AudioContext({ sampleRate: IN_RATE });
    inCtxRef.current = inCtx;
    const source = inCtx.createMediaStreamSource(stream);
    const micAnalyser = inCtx.createAnalyser();
    micAnalyser.fftSize = 512; source.connect(micAnalyser);
    if (!outCtxRef.current) outCtxRef.current = new AudioContext({ sampleRate: OUT_RATE });
    const outAnalyser = outCtxRef.current.createAnalyser();
    outAnalyser.fftSize = 1024; outAnalyser.smoothingTimeConstant = 0.55;
    analyserRef.current = outAnalyser; startVisemes(outAnalyser);
    const proc = inCtx.createScriptProcessor(2048, 1, 1);
    processorRef.current = proc;
    const micBuf = new Uint8Array(micAnalyser.frequencyBinCount);
    proc.onaudioprocess = (ev) => {
      const input = ev.inputBuffer.getChannelData(0);
      const pcm = new Int16Array(input.length);
      for (let i = 0; i < input.length; i++) { const s = Math.max(-1, Math.min(1, input[i])); pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff; }
      micAnalyser.getByteFrequencyData(micBuf);
      let sum = 0; for (let i = 0; i < micBuf.length; i++) sum += micBuf[i];
      setMicLevel(sum / (micBuf.length * 255));
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        const bytes = new Uint8Array(pcm.buffer);
        let s = ''; for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
        wsRef.current.send(JSON.stringify({ audio: btoa(s) }));
      }
    };
    source.connect(proc); proc.connect(inCtx.destination);
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${proto}//${location.host}/api/live`);
    wsRef.current = ws;
    ws.onopen = () => { setConnected(true); setError(null); setStatus('listening'); };
    ws.onclose = () => { setConnected(false); setStatus('idle'); };
    ws.onerror = () => { setError('Connection error'); setConnected(false); };
    ws.onmessage = (ev) => {
      try {
        const m: LiveMsg = JSON.parse(ev.data);
        if (m.type === 'error') { setError(m.message ?? 'Live error'); return; }
        for (const p of m.serverContent?.modelTurn?.parts ?? []) {
          if (p.inlineData?.mimeType?.startsWith('audio/pcm')) playPCM(p.inlineData.data);
        }
        if (m.serverContent?.turnComplete) setStatus('listening');
        if (m.serverContent?.interrupted) { setStatus('listening'); nextStartRef.current = 0; }
      } catch {}
    };
  }, [playPCM, setStatus, setMicLevel, startVisemes]);

  const disconnect = useCallback(() => {
    wsRef.current?.close(); wsRef.current = null;
    processorRef.current?.disconnect();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    inCtxRef.current?.close(); inCtxRef.current = null;
    outCtxRef.current?.close(); outCtxRef.current = null;
    stopVisemes(); setConnected(false); setStatus('idle'); setMicLevel(0);
  }, [setStatus, setMicLevel, stopVisemes]);

  return { connect, disconnect, connected, error };
}
