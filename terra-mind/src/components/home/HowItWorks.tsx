"use client";

import { motion } from "framer-motion";

const STEPS = [
  {
    title: "Set your parameters",
    body: "Corridor zone, budget, and distance to the airport node. The model builds your parcel profile instantly.",
  },
  {
    title: "Review live-valued parcels",
    body: "Browse matches with spot rate, confidence band, and infrastructure timeline attached to every parcel.",
  },
  {
    title: "Calculate, enquire, close",
    body: "Run the wealth calculator on your parcel, then book a briefing call with a corridor specialist to close.",
  },
];

export function HowItWorks() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-20 md:px-6 md:py-28">
      <div className="mx-auto max-w-xl text-center">
        <h2 className="font-display text-3xl leading-tight text-foreground md:text-4xl">
          From first search to closing, in three steps.
        </h2>
      </div>

      <div className="relative mt-14 grid grid-cols-1 gap-10 md:grid-cols-3 md:gap-8">
        <div
          className="absolute left-0 right-0 top-6 hidden h-px bg-steel-line md:block"
          aria-hidden
        />
        {STEPS.map((step, i) => (
          <motion.div
            key={step.title}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
            className="relative"
          >
            <div className="relative z-10 inline-flex size-12 items-center justify-center rounded-full border border-steel-line bg-panel font-data text-base text-foreground">
              {i + 1}
            </div>
            <h3 className="mt-5 font-display text-xl text-foreground">
              {step.title}
            </h3>
            <p className="mt-2 max-w-xs text-sm leading-relaxed text-dim">
              {step.body}
            </p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
