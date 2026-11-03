'use client';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { useRef, useMemo, Suspense, Component, type ReactNode } from 'react';
import * as THREE from 'three';
import { useJarvis } from '@/store/jarvis';

const JAW = ['JawOpen', 'jawOpen', 'A', 'viseme_aa'];
const FUN = ['MouthFunnel', 'mouthFunnel', 'E', 'viseme_E'];
const PUC = ['MouthPucker', 'mouthPucker', 'U', 'viseme_U'];
const BLK = ['EyeBlinkLeft', 'eyeBlinkLeft', 'Blink_L'];

const findIdx = (d: Record<string, number> | undefined, names: string[]) => {
  if (!d) return -1;
  for (const n of names) if (n in d) return d[n];
  return -1;
};

function GLBAvatar({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  const ref = useRef<THREE.Group>(null);
  const { visemes } = useJarvis();
  const md = useMemo(() => {
    let jaw = -1, funnel = -1, pucker = -1, blink = -1, target: THREE.Mesh | null = null;
    scene.traverse((o) => {
      if (o instanceof THREE.Mesh && o.morphTargetDictionary) {
        if (!target) target = o;
        jaw = findIdx(o.morphTargetDictionary, JAW);
        funnel = findIdx(o.morphTargetDictionary, FUN);
        pucker = findIdx(o.morphTargetDictionary, PUC);
        blink = findIdx(o.morphTargetDictionary, BLK);
      }
    });
    return { target, jaw, funnel, pucker, blink };
  }, [scene]);
  useFrame((s) => {
    if (!ref.current) return;
    const t = s.clock.elapsedTime;
    ref.current.rotation.y = Math.sin(t * 0.3) * 0.12;
    ref.current.position.y = Math.sin(t * 0.9) * 0.02;
    const target = md.target;
    if (!target || !target.morphTargetInfluences) return;
    const inf = target.morphTargetInfluences;
    if (md.jaw >= 0) inf[md.jaw] = visemes.jaw;
    if (md.funnel >= 0) inf[md.funnel] = visemes.funnel * 0.8;
    if (md.pucker >= 0) inf[md.pucker] = visemes.pucker * 0.8;
    if (md.blink >= 0) { const b = (t % 3.2) / 3.2; inf[md.blink] = b < 0.05 ? Math.sin(b * Math.PI / 0.05) : 0; }
  });
  return (<group ref={ref} scale={1.4} position={[0, -0.4, 0]}><primitive object={scene} /></group>);
}

const vert = `varying vec3 vN; varying vec3 vV; varying vec2 vUv;
void main() { vUv = uv; vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position,1.0); vV = -mv.xyz; gl_Position = projectionMatrix * mv; }`;

const frag = `varying vec3 vN; varying vec3 vV; varying vec2 vUv;
uniform float uTime; uniform float uJaw; uniform float uFunnel; uniform float uPucker; uniform float uSpeaking;
void main() {
  float fres = pow(1.0 - abs(dot(vN, normalize(vV))), 2.0);
  float scan = smoothstep(0.4, 0.6, 0.5 + 0.5*sin(vUv.y*260.0 + uTime*3.5));
  vec3 base = vec3(0.0,0.85,1.0); vec3 deep = vec3(0.015,0.12,0.35);
  vec3 col = mix(deep, base, fres + scan*0.3);
  vec2 mUv = vUv - vec2(0.5,0.32); mUv.x *= 2.6;
  float mouthDist = length(mUv); float mouth = smoothstep(0.16,0.10,mouthDist);
  float jawH = mix(0.015,0.09,uJaw); float funnelW = mix(0.05,0.09,uFunnel); float puckerW = mix(1.0,0.5,uPucker);
  vec2 ms = vUv - vec2(0.5, 0.32 + uJaw*0.01); ms.x /= (funnelW*puckerW); ms.y /= jawH;
  float mouthMask = smoothstep(1.0,0.6,length(ms));
  col = mix(col, vec3(0.0,0.02,0.06), mouthMask*uSpeaking*0.85);
  col += (mouth*0.3) * vec3(0.4,0.9,1.0) * (0.4+uJaw);
  vec2 eL = vUv - vec2(0.42,0.62); vec2 eR = vUv - vec2(0.58,0.62);
  float eyes = smoothstep(0.02,0.015,length(eL)) + smoothstep(0.02,0.015,length(eR));
  col += eyes * vec3(0.6,0.95,1.0) * 1.4;
  float alpha = 0.6 + fres*0.3;
  gl_FragColor = vec4(col, alpha);
}`;

function ProceduralHead() {
  const mesh = useRef<THREE.Mesh>(null);
  const mat = useRef<THREE.ShaderMaterial>(null);
  const { visemes, status } = useJarvis();
  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uJaw: { value: 0 }, uFunnel: { value: 0 }, uPucker: { value: 0 }, uSpeaking: { value: 0 } }), []);
  useFrame((s) => {
    const t = s.clock.elapsedTime;
    if (mat.current) {
      mat.current.uniforms.uTime.value = t;
      mat.current.uniforms.uJaw.value = visemes.jaw;
      mat.current.uniforms.uFunnel.value = visemes.funnel;
      mat.current.uniforms.uPucker.value = visemes.pucker;
      mat.current.uniforms.uSpeaking.value = status === 'speaking' ? 1 : status === 'listening' ? 0.3 : 0;
    }
    if (mesh.current) {
      mesh.current.rotation.y = Math.sin(t * 0.32) * 0.14;
      mesh.current.rotation.x = Math.sin(t * 0.5) * 0.03;
      mesh.current.position.y = Math.sin(t * 0.85) * 0.03;
    }
  });
  return (
    <mesh ref={mesh} scale={1.25}>
      <sphereGeometry args={[1, 96, 96]} />
      <shaderMaterial ref={mat} uniforms={uniforms} vertexShader={vert} fragmentShader={frag} transparent depthWrite={false} />
    </mesh>
  );
}

class ErrBound extends Component<{ children: ReactNode; fallback: ReactNode }, { hasErr: boolean }> {
  state = { hasErr: false };
  static getDerivedStateFromError() { return { hasErr: true }; }
  render() { return this.state.hasErr ? this.props.fallback : this.props.children; }
}

export function AvatarMesh() {
  return (
    <Suspense fallback={<ProceduralHead />}>
      <ErrBound fallback={<ProceduralHead />}>
        <GLBAvatar url="/avatar.glb" />
      </ErrBound>
    </Suspense>
  );
}
