"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

import { LinkButton } from "@/components/shared/LinkButton";

export function FinalCta() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-20">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ duration: 0.6 }}
        className="relative overflow-hidden rounded-[2.5rem] border border-steel-line bg-foreground px-6 py-16 text-center md:px-16 md:py-20"
      >
        <div
          className="pointer-events-none absolute inset-0 -z-0"
          aria-hidden
          style={{
            background:
              "radial-gradient(60% 60% at 50% 0%, color-mix(in srgb, var(--signal) 25%, transparent) 0%, transparent 70%)",
          }}
        />
        <p className="relative text-sm font-medium text-signal">Free to browse</p>
        <h2 className="relative mx-auto mt-3 max-w-xl font-display text-3xl leading-tight text-background md:text-4xl">
          Start reading the corridor before your next move.
        </h2>
        <p className="relative mx-auto mt-4 max-w-md text-base text-background/70">
          Join over 2,400 buyers and investors already tracking parcels along the
          Yamuna Expressway. No credit card, no commitment.
        </p>
        <div className="relative mt-8 flex flex-wrap items-center justify-center gap-3">
          <LinkButton
            href="/explore"
            className="h-12 gap-2 bg-background px-6 text-base text-foreground hover:bg-background/90"
          >
            Browse corridor parcels
            <ArrowRight className="size-4" strokeWidth={2.25} />
          </LinkButton>
          <LinkButton
            href="/enquire"
            variant="outline"
            className="h-12 gap-2 border-background/30 bg-transparent px-6 text-base text-background hover:bg-background/10"
          >
            Talk to a specialist
          </LinkButton>
        </div>
      </motion.div>
    </section>
  );
}
