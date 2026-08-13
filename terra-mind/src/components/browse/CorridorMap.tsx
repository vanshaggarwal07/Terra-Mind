"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Grid, Html, Line } from "@react-three/drei";
import { useReducedMotion } from "framer-motion";
import { useTheme } from "next-themes";
import * as THREE from "three";

import type { PropertyListing } from "@/lib/types";

/**
 * Schematic 3D corridor view. Parcel blocks are placed by their real
 * lat/lng (equirectangular projection, not survey scale); block height
 * encodes the spot rate in ₹/sq.yd. Landmark positions are approximate.
 * Hovering a listing card raises its block and draws distance guides.
 */

const AIRPORT = { lat: 28.1103, lng: 77.6006 };
const FILM_CITY = { lat: 28.21, lng: 77.49 };
const EXTENT = 3.4;

interface Palette {
  grid: string;
  section: string;
  parcel: string;
  hover: string;
  airport: string;
  filmCity: string;
  corridor: string;
}

const LIGHT: Palette = {
  grid: "#dde1e7",
  section: "#c9cfd8",
  parcel: "#7d8797",
  hover: "#c2410c",
  airport: "#c2410c",
  filmCity: "#2f7d4f",
  corridor: "#b8bfca",
};

const DARK: Palette = {
  grid: "#22262c",
  section: "#2e333b",
  parcel: "#5d6572",
  hover: "#fb7a3c",
  airport: "#fb7a3c",
  filmCity: "#4ade80",
  corridor: "#3a4049",
};

interface ProjectedParcel {
  listing: PropertyListing;
  position: [number, number, number];
  height: number;
  footprint: number;
}

interface ProjectionResult {
  parcels: ProjectedParcel[];
  airport: THREE.Vector3;
  filmCity: THREE.Vector3;
}

function project(listings: PropertyListing[]): ProjectionResult {
  const points = [
    ...listings.map((l) => ({ lat: l.lat, lng: l.lng })),
    AIRPORT,
    FILM_CITY,
  ];
  const latMid = points.reduce((s, p) => s + p.lat, 0) / points.length;
  const lngMid = points.reduce((s, p) => s + p.lng, 0) / points.length;
  const cosLat = Math.cos((latMid * Math.PI) / 180);

  const raw = points.map((p) => ({
    x: (p.lng - lngMid) * cosLat,
    z: latMid - p.lat, // north is away from the camera (-z)
  }));
  const maxAbs = Math.max(...raw.flatMap((p) => [Math.abs(p.x), Math.abs(p.z)]), 1e-6);
  const k = EXTENT / maxAbs;

  const rates = listings.map((l) => l.pricePerSqYd);
  const rateMin = Math.min(...rates);
  const rateSpan = Math.max(Math.max(...rates) - rateMin, 1);
  const areas = listings.map((l) => l.areaSqYd);
  const areaMin = Math.min(...areas);
  const areaSpan = Math.max(Math.max(...areas) - areaMin, 1);

  const parcels = listings.map((listing, i) => ({
    listing,
    position: [raw[i].x * k, 0, raw[i].z * k] as [number, number, number],
    height: 0.35 + ((listing.pricePerSqYd - rateMin) / rateSpan) * 1.05,
    footprint: 0.2 + ((listing.areaSqYd - areaMin) / areaSpan) * 0.14,
  }));

  const a = raw[listings.length];
  const f = raw[listings.length + 1];
  return {
    parcels,
    airport: new THREE.Vector3(a.x * k, 0, a.z * k),
    filmCity: new THREE.Vector3(f.x * k, 0, f.z * k),
  };
}

interface ParcelMarkerProps {
  data: ProjectedParcel;
  active: boolean;
  dimmed: boolean;
  palette: Palette;
}

function ParcelMarker({ data, active, dimmed, palette }: ParcelMarkerProps) {
  const group = useRef<THREE.Group>(null);
  const material = useRef<THREE.MeshStandardMaterial>(null);
  const baseColor = useMemo(() => new THREE.Color(palette.parcel), [palette]);
  const hotColor = useMemo(() => new THREE.Color(palette.hover), [palette]);

  useFrame((_, delta) => {
    const g = group.current;
    const m = material.current;
    if (!g || !m) return;
    const k = Math.min(1, delta * 7);
    g.scale.y = THREE.MathUtils.lerp(g.scale.y, data.height * (active ? 1.3 : 1), k);
    m.color.lerp(active ? hotColor : baseColor, k);
    m.opacity = THREE.MathUtils.lerp(m.opacity, dimmed ? 0.14 : 1, k);
    m.emissiveIntensity = THREE.MathUtils.lerp(m.emissiveIntensity, active ? 0.5 : 0, k);
  });

  return (
    <group ref={group} position={data.position} scale={[1, data.height, 1]}>
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[data.footprint, 1, data.footprint]} />
        <meshStandardMaterial
          ref={material}
          color={palette.parcel}
          emissive={palette.hover}
          emissiveIntensity={0}
          transparent
        />
      </mesh>
      {active ? (
        <Html position={[0, 1.3, 0]} center zIndexRange={[10, 0]} className="pointer-events-none">
          <p
            className="whitespace-nowrap font-data text-[10px] uppercase tracking-[0.18em]"
            style={{ color: palette.hover }}
          >
            {data.listing.parcelId}
          </p>
        </Html>
      ) : null}
    </group>
  );
}

interface LandmarkProps {
  position: THREE.Vector3;
  color: string;
  label: string;
  ring?: number;
}

function Landmark({ position, color, label, ring = 0.3 }: LandmarkProps) {
  return (
    <group position={position}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[ring * 0.7, ring, 48]} />
        <meshBasicMaterial color={color} transparent opacity={0.9} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0.24, 0]}>
        <cylinderGeometry args={[0.012, 0.012, 0.46, 6]} />
        <meshBasicMaterial color={color} transparent opacity={0.55} />
      </mesh>
      <Html position={[0, 0.6, 0]} center zIndexRange={[10, 0]} className="pointer-events-none">
        <p
          className="whitespace-nowrap font-data text-[9px] uppercase tracking-[0.2em]"
          style={{ color }}
        >
          {label}
        </p>
      </Html>
    </group>
  );
}

interface CameraRigProps {
  focus: THREE.Vector3 | null;
  reduce: boolean;
}

const BASE_POSITION = new THREE.Vector3(5.2, 5.1, 6.6);
const BASE_TARGET = new THREE.Vector3(0, 0.35, 0);

function CameraRig({ focus, reduce }: CameraRigProps) {
  const target = useRef(BASE_TARGET.clone());
  const desiredPos = useRef(BASE_POSITION.clone());
  const desiredTarget = useRef(BASE_TARGET.clone());

  useFrame((state, delta) => {
    if (focus) {
      desiredTarget.current.set(focus.x * 0.7, 0.45, focus.z * 0.7);
    } else {
      desiredTarget.current.copy(BASE_TARGET);
    }

    const drift = reduce ? 0 : Math.sin(state.clock.elapsedTime * 0.16) * 0.45;
    desiredPos.current.set(BASE_POSITION.x + drift, BASE_POSITION.y, BASE_POSITION.z);

    const k = reduce ? 1 : Math.min(1, delta * 2.4);
    state.camera.position.lerp(desiredPos.current, k);
    target.current.lerp(desiredTarget.current, reduce ? 1 : Math.min(1, delta * 3.2));
    state.camera.lookAt(target.current);
  });

  return null;
}

export interface CorridorMapProps {
  listings: PropertyListing[];
  visibleIds: string[];
  hoveredId: string | null;
}

export function CorridorMap({ listings, visibleIds, hoveredId }: CorridorMapProps) {
  const reduce = useReducedMotion() ?? false;
  const { resolvedTheme } = useTheme();
  const palette = resolvedTheme === "dark" ? DARK : LIGHT;

  const projection = useMemo(() => project(listings), [listings]);
  const visibleSet = useMemo(() => new Set(visibleIds), [visibleIds]);

  const hovered = useMemo(
    () =>
      hoveredId
        ? projection.parcels.find((p) => p.listing.id === hoveredId) ?? null
        : null,
    [projection, hoveredId],
  );

  const corridorPoints = useMemo(() => {
    const north = [...projection.parcels].sort(
      (a, b) => a.position[2] - b.position[2],
    )[0];
    if (!north) return null;
    const start = new THREE.Vector3(north.position[0], 0.015, north.position[2] - 0.7);
    const end = projection.airport.clone().setY(0.015);
    return [start, end] as [THREE.Vector3, THREE.Vector3];
  }, [projection]);

  const hoverPoint = hovered
    ? new THREE.Vector3(hovered.position[0], 0.05, hovered.position[2])
    : null;

  return (
    <Canvas
      dpr={[1, 1.75]}
      camera={{ position: BASE_POSITION.toArray(), fov: 30 }}
      gl={{ alpha: true, antialias: true }}
      style={{ width: "100%", height: "100%" }}
      aria-hidden
    >
      <ambientLight intensity={0.9} />
      <directionalLight position={[4, 8, 3]} intensity={0.9} />

      <Grid
        position={[0, 0, 0]}
        cellSize={0.5}
        sectionSize={2.5}
        cellColor={palette.grid}
        sectionColor={palette.section}
        cellThickness={0.6}
        sectionThickness={1}
        fadeDistance={17}
        fadeStrength={2.2}
        infiniteGrid
      />

      {corridorPoints ? (
        <Line
          points={corridorPoints}
          color={palette.corridor}
          lineWidth={1.4}
          transparent
          opacity={0.7}
        />
      ) : null}

      <Landmark
        position={projection.airport}
        color={palette.airport}
        label="Jewar Airport"
        ring={0.32}
      />
      <Landmark
        position={projection.filmCity}
        color={palette.filmCity}
        label="Film City site"
        ring={0.24}
      />

      {projection.parcels.map((p) => (
        <ParcelMarker
          key={p.listing.id}
          data={p}
          active={p.listing.id === hoveredId}
          dimmed={!visibleSet.has(p.listing.id)}
          palette={palette}
        />
      ))}

      {hoverPoint ? (
        <>
          <Line
            points={[hoverPoint, projection.airport.clone().setY(0.05)]}
            color={palette.airport}
            dashed
            dashSize={0.14}
            gapSize={0.1}
            lineWidth={1.2}
            transparent
            opacity={0.85}
          />
          {hovered?.listing.distanceToFilmCityKm !== undefined ? (
            <Line
              points={[hoverPoint, projection.filmCity.clone().setY(0.05)]}
              color={palette.filmCity}
              dashed
              dashSize={0.14}
              gapSize={0.1}
              lineWidth={1.2}
              transparent
              opacity={0.7}
            />
          ) : null}
        </>
      ) : null}

      <CameraRig focus={hoverPoint} reduce={reduce} />
    </Canvas>
  );
}
