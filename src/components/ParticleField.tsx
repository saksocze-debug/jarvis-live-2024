'use client';
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useJarvis } from '@/store/jarvis';

export function ParticleField({ count = 500 }: { count?: number }) {
  const points = useRef<THREE.Points>(null);
  const { status, micLevel } = useJarvis();

  const { positions, sizes } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const sz = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const r = 1.4 + Math.random() * 1.6;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.cos(phi) * 0.9;
      pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
      sz[i] = Math.random() * 0.5 + 0.2;
    }
    return { positions: pos, sizes: sz };
  }, [count]);

  useFrame((state) => {
    if (!points.current) return;
    const t = state.clock.elapsedTime;
    points.current.rotation.y = t * 0.08;
    const boost = status === 'speaking' ? 1.6 : status === 'listening' ? 1.2 : 1.0;
    points.current.scale.setScalar(1 + micLevel * 0.4 * boost);
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-size" args={[sizes, 1]} />
      </bufferGeometry>
      <pointsMaterial color="#00e5ff" size={0.025} transparent opacity={0.7} sizeAttenuation depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  );
}
