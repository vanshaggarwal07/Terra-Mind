"use client";

import { motion } from "framer-motion";
import { Calculator, History, Newspaper, PhoneCall, ShieldCheck, TrendingUp } from "lucide-react";

import { cn } from "@/lib/utils";

const CARD_MOTION = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0 },
};

export function FeaturesBento() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-20 md:px-6 md:py-28">
      <div className="mx-auto max-w-xl text-center">
        <h2 className="font-display text-3xl leading-tight text-foreground md:text-4xl">
          Built for how corridor investors actually decide.
        </h2>
        <p className="mt-3 text-base text-dim">
          We removed every friction point between spotting a parcel and closing on
          it.
        </p>
      </div>

      <motion.div
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.15 }}
        variants={{ show: { transition: { staggerChildren: 0.08 } } }}
        className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:grid-rows-3"
      >
        <motion.article
          variants={CARD_MOTION}
          transition={{ duration: 0.5 }}
          className="relative overflow-hidden rounded-3xl border border-steel-line bg-gradient-to-br from-signal-tint to-panel p-6 lg:col-span-2 lg:row-span-2"
        >
          <TrendingUp className="size-6 text-signal" strokeWidth={2} />
          <h3 className="mt-4 font-display text-xl text-foreground">Live valuation</h3>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-dim">
            Spot rate and a confidence band on every parcel, recalculated from
            corridor comps and infra proximity as the market moves.
          </p>
          <p className="mt-6 font-display text-5xl text-foreground">78%</p>
          <p className="mt-1 text-[13px] text-dim">average valuation confidence</p>
        </motion.article>

        <motion.article
          variants={CARD_MOTION}
          transition={{ duration: 0.5 }}
          className="relative overflow-hidden rounded-3xl border border-steel-line bg-panel p-6 lg:col-span-2"
        >
          <History className="size-6 text-signal" strokeWidth={2} />
          <h3 className="mt-4 font-display text-xl text-foreground">Infra timeline</h3>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-dim">
            Chronological corridor signals with sources attached. Sequence is
            load-bearing here, not decoration.
          </p>
          <div className="mt-5 flex items-center gap-2" aria-hidden>
            {[2026, 2028, 2030, 2032].map((year, i) => (
              <div key={year} className="flex flex-1 items-center gap-2">
                <span
                  className={cn(
                    "size-2 shrink-0 rounded-full",
                    i === 0 ? "bg-signal" : "bg-steel",
                  )}
                />
                <span className="h-px flex-1 bg-steel-line" />
                <span className="font-data text-[11px] text-dim">{year}</span>
              </div>
            ))}
          </div>
        </motion.article>

        <motion.article
          variants={CARD_MOTION}
          transition={{ duration: 0.5 }}
          className="rounded-3xl border border-steel-line bg-panel p-6"
        >
          <ShieldCheck className="size-6 text-growth" strokeWidth={2} />
          <h3 className="mt-4 font-display text-lg text-foreground">
            Verified parcels
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-dim">
            Checked against YEIDA and NHAI filings before listing. No ghost
            plots.
          </p>
        </motion.article>

        <motion.article
          variants={CARD_MOTION}
          transition={{ duration: 0.5 }}
          className="rounded-3xl border border-steel-line bg-panel p-6"
        >
          <Calculator className="size-6 text-signal" strokeWidth={2} />
          <h3 className="mt-4 font-display text-lg text-foreground">
            Investment calculator
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-dim">
            Model growth by distance, phase and holding period before you
            commit capital.
          </p>
        </motion.article>

        <motion.article
          variants={CARD_MOTION}
          transition={{ duration: 0.5 }}
          className="rounded-3xl border border-steel-line bg-growth-tint p-6 lg:col-span-2"
        >
          <Newspaper className="size-6 text-growth" strokeWidth={2} />
          <h3 className="mt-4 font-display text-lg text-foreground">
            Corridor news intelligence
          </h3>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-dim">
            Government notices and press signals for the corridor, deduplicated
            and categorized automatically.
          </p>
        </motion.article>

        <motion.article
          variants={CARD_MOTION}
          transition={{ duration: 0.5 }}
          className="rounded-3xl border border-steel-line bg-panel p-6 lg:col-span-2"
        >
          <PhoneCall className="size-6 text-signal" strokeWidth={2} />
          <h3 className="mt-4 font-display text-lg text-foreground">
            Direct enquiry
          </h3>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-dim">
            Book a briefing call with a corridor specialist directly. No
            middlemen, no delays.
          </p>
        </motion.article>
      </motion.div>
    </section>
  );
}
