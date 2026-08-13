"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Line, OrbitControls } from "@react-three/drei";
import {
  Component,
  type ErrorInfo,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  CatmullRomCurve3,
  type Group,
  type Mesh,
  TOUCH,
  Vector3,
} from "three";

interface ParcelCanvasProps {
  height: number;
  upliftPct: number;
  distanceKm: number;
}

/** Expressway spine in scene units — Noida (far) → Jewar (near airport). */
const CORRIDOR = [
  new Vector3(-3.4, 0.04, 3.9),
  new Vector3(-2.1, 0.04, 2.6),
  new Vector3(-0.55, 0.04, 1.05),
  new Vector3(1.1, 0.04, -1.1),
  new Vector3(2.85, 0.04, -3.4),
];

function plotPosition(distanceKm: number): [number, number, number] {
  const curve = new CatmullRomCurve3(CORRIDOR);
  // Slider: 3 km ≈ Jewar end, 40 km ≈ Noida end
  const t = 1 - Math.min(1, Math.max(0, (distanceKm - 3) / 37));
  const p = curve.getPoint(t);
  return [p.x, 0, p.z];
}

class CanvasErrorBoundary extends Component<
  { children: ReactNode; onError: () => void },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(_error: Error, _info: ErrorInfo) {
    this.props.onError();
  }

  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

function SurveyGrid() {
  const points = useMemo(() => {
    const pts: Vector3[] = [];
    for (let i = -6; i <= 6; i += 0.5) {
      pts.push(new Vector3(-6, 0.015, i), new Vector3(6, 0.015, i));
      pts.push(new Vector3(i, 0.015, -6), new Vector3(i, 0.015, 6));
    }
    return pts;
  }, []);

  const major = useMemo(() => {
    const pts: Vector3[] = [];
    for (let i = -6; i <= 6; i += 2) {
      pts.push(new Vector3(-6, 0.018, i), new Vector3(6, 0.018, i));
      pts.push(new Vector3(i, 0.018, -6), new Vector3(i, 0.018, 6));
    }
    return pts;
  }, []);

  return (
    <>
      <Line points={points} segments color="#1C2C36" lineWidth={1} transparent opacity={0.75} />
      <Line points={major} segments color="#2A4858" lineWidth={1.5} transparent opacity={0.85} />
    </>
  );
}

function CorridorGround() {
  const roadPoints = useMemo(() => {
    const curve = new CatmullRomCurve3(CORRIDOR);
    return curve.getPoints(48);
  }, []);

  const roadEdgeA = useMemo(
    () => roadPoints.map((p) => new Vector3(p.x - 0.18, p.y, p.z - 0.08)),
    [roadPoints],
  );
  const roadEdgeB = useMemo(
    () => roadPoints.map((p) => new Vector3(p.x + 0.18, p.y, p.z + 0.08)),
    [roadPoints],
  );

  return (
    <group>
      {/* Land plate */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[12.5, 12.5]} />
        <meshStandardMaterial color="#121C28" roughness={0.92} metalness={0.08} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
        <planeGeometry args={[12.9, 12.9]} />
        <meshBasicMaterial color="#1C2C36" />
      </mesh>

      {/* Yamuna hint */}
      <mesh rotation={[-Math.PI / 2, 0, 0.35]} position={[-4.2, 0.01, 0.4]}>
        <planeGeometry args={[1.1, 9.5]} />
        <meshBasicMaterial color="#1A3A48" transparent opacity={0.55} />
      </mesh>

      <SurveyGrid />

      {/* Expressway bed + centerline */}
      <Line points={roadEdgeA} color="#0A0E12" lineWidth={6} />
      <Line points={roadEdgeB} color="#0A0E12" lineWidth={6} />
      <Line points={roadPoints} color="#FF6B35" lineWidth={3} />
      <Line
        points={roadPoints}
        color="#E8E4DC"
        lineWidth={1}
        dashed
        dashSize={0.18}
        gapSize={0.22}
        transparent
        opacity={0.45}
      />

      {/* Noida node */}
      <mesh position={[-3.4, 0.05, 3.9]}>
        <cylinderGeometry args={[0.22, 0.22, 0.04, 24]} />
        <meshStandardMaterial color="#0A0E12" metalness={0.2} roughness={0.6} />
      </mesh>
      <mesh position={[-3.4, 0.08, 3.9]}>
        <sphereGeometry args={[0.07, 16, 16]} />
        <meshBasicMaterial color="#E8E4DC" />
      </mesh>

      {/* Greater Noida */}
      <mesh position={[-0.55, 0.05, 1.05]}>
        <cylinderGeometry args={[0.14, 0.14, 0.03, 20]} />
        <meshStandardMaterial color="#0A0E12" />
      </mesh>
      <mesh position={[-0.55, 0.08, 1.05]}>
        <sphereGeometry args={[0.05, 12, 12]} />
        <meshBasicMaterial color="#7C9885" />
      </mesh>

      {/* Jewar airport node */}
      <mesh position={[2.85, 0.03, -3.4]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.55, 0.68, 48]} />
        <meshBasicMaterial color="#FF6B35" transparent opacity={0.9} />
      </mesh>
      <mesh position={[2.85, 0.035, -3.4]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.32, 0.38, 48]} />
        <meshBasicMaterial color="#FF6B35" transparent opacity={0.55} />
      </mesh>
      <mesh position={[2.85, 0.08, -3.4]}>
        <sphereGeometry args={[0.09, 16, 16]} />
        <meshBasicMaterial color="#FF6B35" />
      </mesh>
      {/* Runway tick */}
      <mesh position={[2.85, 0.04, -3.4]} rotation={[0, Math.PI / 5, 0]}>
        <boxGeometry args={[1.1, 0.02, 0.08]} />
        <meshBasicMaterial color="#E8E4DC" transparent opacity={0.35} />
      </mesh>
    </group>
  );
}

function ParcelBlock({ height, upliftPct, distanceKm }: ParcelCanvasProps) {
  const groupRef = useRef<Group>(null);
  const meshRef = useRef<Mesh>(null);
  const targetHeight = Math.max(0.4, height);
  const color = upliftPct >= 15 ? "#7C9885" : "#FF6B35";
  const target = useMemo(() => plotPosition(distanceKm), [distanceKm]);

  useFrame((_, delta) => {
    const group = groupRef.current;
    const mesh = meshRef.current;
    if (group) {
      group.position.x += (target[0] - group.position.x) * Math.min(1, delta * 5);
      group.position.z += (target[2] - group.position.z) * Math.min(1, delta * 5);
    }
    if (!mesh) return;
    const current = mesh.scale.y || 0.01;
    const next = current + (targetHeight - current) * Math.min(1, delta * 6);
    mesh.scale.y = next;
    mesh.position.y = next / 2;
  });

  return (
    <group ref={groupRef} position={target}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
        <planeGeometry args={[2.15, 2.15]} />
        <meshBasicMaterial color="#FF6B35" transparent opacity={0.2} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, Math.PI / 4]} position={[0, 0.04, 0]}>
        <ringGeometry args={[1.05, 1.16, 4]} />
        <meshBasicMaterial color="#FF6B35" transparent opacity={0.65} />
      </mesh>
      <mesh ref={meshRef} castShadow>
        <boxGeometry args={[1.55, 1, 1.55]} />
        <meshStandardMaterial color={color} metalness={0.35} roughness={0.45} />
      </mesh>
    </group>
  );
}

function Scene({ height, upliftPct, distanceKm }: ParcelCanvasProps) {
  return (
    <>
      <color attach="background" args={["#070B10"]} />
      <fog attach="fog" args={["#070B10", 14, 28]} />
      <ambientLight intensity={0.72} />
      <directionalLight
        position={[5, 9, 3]}
        intensity={1.25}
        castShadow
        shadow-mapSize={[1024, 1024]}
        color="#E8E4DC"
      />
      <hemisphereLight args={["#2A4858", "#0A0E12", 0.4]} />
      <CorridorGround />
      <ParcelBlock
        height={height}
        upliftPct={upliftPct}
        distanceKm={distanceKm}
      />
      <OrbitControls
        enablePan={false}
        minDistance={5}
        maxDistance={16}
        minPolarAngle={0.4}
        maxPolarAngle={Math.PI / 2.2}
        target={[0, 0.2, 0]}
        // Single-finger touch is left to the browser (page scroll); only a
        // two-finger gesture orbits/zooms, so the widget never traps scroll
        // on mobile. Desktop mouse-drag rotation (mouseButtons) is untouched.
        touches={{ ONE: undefined, TWO: TOUCH.DOLLY_ROTATE }}
        makeDefault
      />
    </>
  );
}

function WebGLFallback({
  height,
  distanceKm,
}: {
  height: number;
  distanceKm: number;
}) {
  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden bg-[#0A0E12]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/maps/corridor-survey.svg"
        alt=""
        className="absolute inset-0 h-full w-full object-cover opacity-85"
      />
      <div
        className="relative z-10 w-20 rounded-sm border border-signal/60 bg-signal/80"
        style={{ height: `${Math.min(160, 36 + height * 22)}px` }}
        aria-hidden
      />
      <p className="relative z-10 mt-3 font-data text-[11px] uppercase tracking-[0.18em] text-dim">
        {distanceKm.toFixed(0)} km from Jewar · map fallback
      </p>
    </div>
  );
}

export function ParcelCanvas({
  height,
  upliftPct,
  distanceKm,
}: ParcelCanvasProps) {
  const [webglFailed, setWebglFailed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="steel-frame relative h-[360px] w-full overflow-hidden bg-[#070B10] md:h-[420px]">
      {!mounted ? (
        <div className="flex h-full items-center justify-center text-sm text-dim">
          Loading corridor survey…
        </div>
      ) : webglFailed ? (
        <WebGLFallback height={height} distanceKm={distanceKm} />
      ) : (
        <CanvasErrorBoundary onError={() => setWebglFailed(true)}>
          <Canvas
            className="h-full w-full touch-pan-y"
            camera={{ position: [6.2, 6.8, 7.4], fov: 36, near: 0.1, far: 80 }}
            dpr={[1, 1.5]}
            gl={{
              antialias: true,
              alpha: false,
              powerPreference: "default",
              failIfMajorPerformanceCaveat: false,
              stencil: false,
              depth: true,
            }}
            shadows="basic"
            onCreated={({ gl }) => {
              gl.setClearColor("#070B10", 1);
              const canvas = gl.domElement;
              const onLost = (event: Event) => {
                event.preventDefault();
                setWebglFailed(true);
              };
              canvas.addEventListener("webglcontextlost", onLost, false);
            }}
          >
            <Scene
              height={height}
              upliftPct={upliftPct}
              distanceKm={distanceKm}
            />
          </Canvas>
        </CanvasErrorBoundary>
      )}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 bg-gradient-to-t from-[#070B10]/95 via-[#070B10]/40 to-transparent px-3 pb-3 pt-12">
        <div>
          <p className="font-data text-[10px] uppercase tracking-[0.18em] text-dim">
            Corridor map · H {height.toFixed(2)}
          </p>
          <p className="mt-1 font-data text-[9px] uppercase tracking-[0.16em] text-dim/80">
            Noida → YE → Jewar
          </p>
        </div>
        <p className="font-data text-[10px] uppercase tracking-[0.18em] text-signal">
          {distanceKm.toFixed(0)} km → Jewar
        </p>
      </div>
      {!webglFailed ? (
        <p className="pointer-events-none absolute right-3 top-3 rounded-full bg-background/70 px-2.5 py-1 font-data text-[9px] uppercase tracking-[0.14em] text-dim backdrop-blur-sm md:hidden">
          Two fingers to rotate
        </p>
      ) : null}
    </div>
  );
}
