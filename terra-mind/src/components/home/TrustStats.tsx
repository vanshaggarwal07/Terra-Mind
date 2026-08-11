"use client";

import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";

import { Counter } from "@/components/home/Counter";

const TRUST_ITEMS = [
  "No sign-up required",
  "Corridor-wide coverage",
  "Verified parcels only",
  "Free to explore",
];

const STATS: { value: number; decimals?: number; suffix: string; label: string }[] = [
  { value: 3800, suffix: "+", label: "Parcels tracked" },
  { value: 78, suffix: "%", label: "Avg valuation confidence" },
  { value: 1240, suffix: "+", label: "Corridor investors served" },
  { value: 6, suffix: " min", label: "Avg time to first match" },
];

export function TrustStats() {
  return (
    <section className="border-y border-steel-line bg-panel">
      <div className="mx-auto max-w-6xl px-4 py-6 md:px-6">
        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
          {TRUST_ITEMS.map((item) => (
            <div key={item} className="flex items-center gap-2 text-sm text-dim">
              <CheckCircle2 className="size-4 text-growth" strokeWidth={2} />
              {item}
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-steel-line">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-4 py-12 md:grid-cols-4 md:px-6">
          {STATS.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ duration: 0.5, delay: i * 0.06 }}
              className="text-center"
            >
              <p className="font-display text-3xl text-foreground md:text-4xl">
                <Counter value={stat.value} suffix={stat.suffix} decimals={stat.decimals} />
              </p>
              <p className="mt-1.5 text-[13px] text-dim">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
