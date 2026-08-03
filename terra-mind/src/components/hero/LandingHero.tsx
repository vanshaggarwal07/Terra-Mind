"use client";

import { motion } from "framer-motion";

import { LinkButton } from "@/components/shared/LinkButton";

export function LandingHero() {
  return (
    <section className="relative isolate min-h-[92svh] overflow-hidden border-b border-steel-line">
      {/* Aerial photography slot — drop files into /public/heroes/corridor.jpg */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage:
            "linear-gradient(120deg, rgba(10,14,18,0.82) 0%, rgba(10,14,18,0.45) 45%, rgba(10,14,18,0.78) 100%), url('/heroes/corridor.svg')",
        }}
      />
      <div className="absolute inset-0 survey-hatch opacity-30" aria-hidden />

      <div className="relative mx-auto flex min-h-[92svh] max-w-6xl flex-col justify-end px-4 pb-16 pt-28 md:px-6 md:pb-20">
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="font-data text-[11px] uppercase tracking-[0.28em] text-signal"
        >
          Corridor survey instrument · Noida → Jewar
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.08 }}
          className="mt-4 max-w-3xl font-display text-4xl leading-[1.05] text-foreground md:text-6xl"
        >
          Read the land
          <br />
          before the market does.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.16 }}
          className="mt-5 max-w-xl text-base text-dim md:text-lg"
        >
          Terra-Mind is a precision property intelligence layer for the Yamuna
          Expressway corridor — live valuation, infra timelines, and parcel dossiers
          that unfold under scroll.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.24 }}
          className="mt-8 flex flex-wrap items-center gap-3"
        >
          <LinkButton
            href="/explore"
            className="bg-signal px-5 text-background hover:bg-signal/90 signal-glow"
          >
            Open corridor browse
          </LinkButton>
          <LinkButton
            href="/calculator"
            variant="outline"
            className="border-steel text-foreground hover:bg-steel/30"
          >
            Run investment model
          </LinkButton>
        </motion.div>

        <div className="mt-12 grid max-w-2xl grid-cols-3 gap-4 border-t border-steel-line pt-6">
          {[
            { label: "Airport node", value: "4.2–32 km" },
            { label: "Live parcels", value: "06 tracked" },
            { label: "Signal accent", value: "Orange = live" },
          ].map((stat) => (
            <div key={stat.label}>
              <p className="text-[10px] uppercase tracking-[0.16em] text-dim">{stat.label}</p>
              <p className="mt-1 font-data text-sm text-foreground md:text-base">{stat.value}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
