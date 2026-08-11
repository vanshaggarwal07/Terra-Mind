"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Lock, MapPinned, RadioTower, Smartphone } from "lucide-react";

const POINTS = [
  { icon: RadioTower, label: "Live sync across desktop, tablet, and mobile" },
  { icon: MapPinned, label: "Full corridor coverage — Jewar to Mirzapur" },
  { icon: Lock, label: "Encrypted enquiry and document handling" },
  { icon: Smartphone, label: "Same valuation model on every device" },
];

export function PlatformShowcase() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-20 md:px-6 md:py-28">
      <div className="grid items-center gap-12 md:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="font-display text-3xl leading-tight text-foreground md:text-4xl">
            The same corridor intelligence, wherever you check it.
          </h2>
          <p className="mt-4 max-w-md text-base leading-relaxed text-dim">
            Walk a site with the mobile view, then return to the desktop model to run
            the numbers. Every valuation, note, and shortlist follows you across
            devices.
          </p>

          <ul className="mt-8 space-y-4">
            {POINTS.map((point) => (
              <li key={point.label} className="flex items-center gap-3">
                <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-foreground">
                  <point.icon className="size-4" strokeWidth={2} />
                </span>
                <span className="text-sm text-foreground">{point.label}</span>
              </li>
            ))}
          </ul>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="relative mx-auto w-full max-w-md"
        >
          <div
            className="pointer-events-none absolute inset-0 -z-10 blur-3xl"
            aria-hidden
            style={{
              background:
                "radial-gradient(50% 50% at 50% 50%, color-mix(in srgb, var(--signal) 12%, transparent) 0%, transparent 70%)",
            }}
          />
          <Image
            src="/marketing/platform-devices.png"
            alt="Terra-Mind corridor dashboard shown across laptop and phone"
            width={900}
            height={700}
            className="w-full object-contain"
          />
        </motion.div>
      </div>
    </section>
  );
}
