'use client';
import { Canvas } from '@react-three/fiber';
import { EffectComposer, Bloom, Vignette, ChromaticAberration } from '@react-three/postprocessing';
import { Suspense } from 'react';
import { AvatarMesh } from './AvatarMesh';
import { ParticleField } from './ParticleField';
import * as THREE from 'three';

export function Hologram() {
  return (
    <div className="absolute inset-0 pointer-events-none">
      <Canvas camera={{ position: [0, 0, 3.3], fov: 45 }} dpr={[1, 2]} gl={{ antialias: true, alpha: true }}>
        <color attach="background" args={[new THREE.Color(0, 0, 0)]} />
        <fog attach="fog" args={['#02060f', 3, 9]} />
        <ambientLight intensity={0.4} />
        <pointLight position={[4, 4, 4]} intensity={2.2} color="#00e5ff" />
        <pointLight position={[-4, -2, 2]} intensity={1.4} color="#0083ff" />
        <pointLight position={[0, -3, 3]} intensity={1.0} color="#8be9ff" />
        <Suspense fallback={null}>
          <AvatarMesh />
          <ParticleField count={600} />
          <EffectComposer>
            <Bloom intensity={1.1} luminanceThreshold={0.1} luminanceSmoothing={0.3} mipmapBlur />
            <ChromaticAberration offset={[0.0012, 0.0018]} />
            <Vignette eskil={false} offset={0.25} darkness={0.85} />
          </EffectComposer>
        </Suspense>
      </Canvas>
    </div>
  );
}
