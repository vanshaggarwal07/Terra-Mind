"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Airplane, MapPinLine } from "@phosphor-icons/react";

const WAYPOINTS = [
  { x: 54, y: 34, label: "NOIDA" },
  { x: 150, y: 186, label: "GREATER NOIDA" },
  { x: 246, y: 344, label: "YAMUNA EXPRESSWAY" },
];

const PATH_D =
  "M 54 34 C 118 66, 92 156, 150 186 C 226 224, 172 310, 246 344 C 314 372, 300 452, 378 480 C 408 491, 420 503, 432 520";

/** Signature scroll-drawn glide path — Noida through infra milestones to Jewar Airport. */
export function FlightPath({ className }: { className?: string }) {
  const reduce = useReducedMotion();

  return (
    <svg
      viewBox="0 0 460 560"
      className={className}
      role="img"
      aria-label="Route line from Noida through the Yamuna Expressway corridor to Jewar Airport"
    >
      <defs>
        <radialGradient id="jewar-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--signal)" stopOpacity="0.55" />
          <stop offset="100%" stopColor="var(--signal)" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Decorative topographic contour rings — ink only, not interactive */}
      <g opacity="0.5" stroke="var(--contour)" strokeWidth="1" fill="none">
        <ellipse cx="120" cy="120" rx="70" ry="46" />
        <ellipse cx="120" cy="120" rx="110" ry="74" />
        <ellipse cx="330" cy="440" rx="90" ry="60" />
        <ellipse cx="330" cy="440" rx="135" ry="92" />
      </g>

      <motion.path
        d={PATH_D}
        fill="none"
        stroke="var(--signal)"
        strokeWidth="2"
        strokeLinecap="round"
        initial={reduce ? undefined : { pathLength: 0, opacity: 0.4 }}
        whileInView={{ pathLength: 1, opacity: 1 }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ duration: 1.8, ease: [0.16, 1, 0.3, 1] }}
      />

      {WAYPOINTS.map((wp, i) => (
        <motion.g
          key={wp.label}
          initial={reduce ? undefined : { opacity: 0, scale: 0.6 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.4, delay: reduce ? 0 : 0.5 + i * 0.4 }}
        >
          <circle cx={wp.x} cy={wp.y} r="4.5" fill="var(--background)" stroke="var(--signal)" strokeWidth="2" />
          <text
            x={wp.x + 12}
            y={wp.y + 4}
            fontFamily="var(--font-mono)"
            fontSize="10"
            letterSpacing="0.05em"
            fill="var(--dim)"
          >
            {wp.label}
          </text>
        </motion.g>
      ))}

      <motion.g
        initial={reduce ? undefined : { opacity: 0, scale: 0.5 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ duration: 0.5, delay: reduce ? 0 : 1.75 }}
      >
        <circle cx="432" cy="520" r="34" fill="url(#jewar-glow)" />
        <circle cx="432" cy="520" r="9" fill="var(--signal)" />
      </motion.g>
    </svg>
  );
}

export function FlightPathLegend() {
  return (
    <div className="flex items-center gap-1.5 font-data text-[10px] uppercase tracking-[0.16em] text-dim">
      <MapPinLine className="size-3" />
      Jewar Airport
      <Airplane className="size-3 text-signal" weight="fill" />
    </div>
  );
}
