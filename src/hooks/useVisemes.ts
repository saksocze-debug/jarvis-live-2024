'use client';
import { useRef, useCallback } from 'react';
import { useJarvis } from '@/store/jarvis';

export function useVisemes() {
  const { setVisemes } = useJarvis();
  const rafRef = useRef<number | null>(null);

  const start = useCallback((analyser: AnalyserNode) => {
    const buf = new Uint8Array(analyser.frequencyBinCount);
    const binHz = analyser.context.sampleRate / analyser.fftSize;
    const band = (minHz: number, maxHz: number) => {
      const a = Math.floor(minHz / binHz);
      const b = Math.min(Math.ceil(maxHz / binHz), buf.length - 1);
      let sum = 0, n = 0;
      for (let i = a; i <= b; i++) { sum += buf[i]; n++; }
      return n ? sum / (n * 255) : 0;
    };
    const tick = () => {
      analyser.getByteFrequencyData(buf);
      const jaw = Math.min(1, Math.pow(band(150, 800) * 1.4, 0.7));
      const funnel = Math.min(1, Math.pow(band(800, 1800) * 1.2, 0.8));
      const pucker = Math.min(1, Math.pow(band(1800, 3500) * 1.3, 0.8));
      setVisemes({ jaw, funnel, pucker });
      rafRef.current = requestAnimationFrame(tick);
    };
    tick();
  }, [setVisemes]);

  const stop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    setVisemes({ jaw: 0, funnel: 0, pucker: 0 });
  }, [setVisemes]);

  return { start, stop };
}
