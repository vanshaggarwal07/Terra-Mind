"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowRight, PlayCircle } from "lucide-react";

import { LinkButton } from "@/components/shared/LinkButton";

const FADE_UP = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0 },
};

export function LandingHero() {
  return (
    <section className="relative isolate overflow-hidden pt-8 pb-16 md:pt-16 md:pb-24">
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        aria-hidden
        style={{
          background:
            "radial-gradient(60% 50% at 50% 0%, color-mix(in srgb, var(--signal) 8%, transparent) 0%, transparent 70%)",
        }}
      />

      <div className="relative mx-auto max-w-6xl px-4 md:px-6">
        {/* Floating corridor photography — desktop/tablet: pinned to the four corners */}
        <motion.div
          initial={{ opacity: 0, y: 24, rotate: -6 }}
          animate={{ opacity: 1, y: 0, rotate: -6 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="pointer-events-none absolute -left-4 top-6 hidden w-40 overflow-hidden rounded-3xl border border-steel-line shadow-xl md:block lg:-left-8 lg:w-52"
        >
          <Image
            src="/marketing/hero-plots.jpg"
            alt="Plotted land parcels along the corridor"
            width={480}
            height={360}
            className="aspect-[4/3] w-full object-cover"
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24, rotate: 5 }}
          animate={{ opacity: 1, y: 0, rotate: 5 }}
          transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="pointer-events-none absolute -right-2 top-2 hidden w-36 overflow-hidden rounded-3xl border border-steel-line shadow-xl md:block lg:-right-6 lg:w-48"
        >
          <Image
            src="/marketing/hero-airport.jpg"
            alt="Jewar Airport aerotropolis development"
            width={480}
            height={360}
            className="aspect-[4/3] w-full object-cover"
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24, rotate: -3 }}
          animate={{ opacity: 1, y: 0, rotate: -3 }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="pointer-events-none absolute -right-6 bottom-0 hidden w-44 overflow-hidden rounded-3xl border border-steel-line shadow-xl md:block lg:right-0 lg:w-56"
        >
          <Image
            src="/marketing/hero-expressway.jpg"
            alt="Yamuna Expressway corridor at sunset"
            width={520}
            height={390}
            className="aspect-[4/3] w-full object-cover"
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24, rotate: 4 }}
          animate={{ opacity: 1, y: 0, rotate: 4 }}
          transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="pointer-events-none absolute -left-6 bottom-2 hidden w-36 overflow-hidden rounded-3xl border border-steel-line shadow-xl md:block lg:-left-2 lg:w-44"
        >
          <Image
            src="/marketing/hero-township.jpg"
            alt="Landscaped township development along the corridor"
            width={480}
            height={360}
            className="aspect-[4/3] w-full object-cover"
          />
        </motion.div>

        {/* Mobile: same four photos as a fanned deck above the headline, in flow */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="mb-7 flex items-center justify-center md:hidden"
        >
          {[
            { src: "/marketing/hero-plots.jpg", alt: "Plotted land parcels along the corridor", rotate: -8, z: 0 },
            { src: "/marketing/hero-airport.jpg", alt: "Jewar Airport aerotropolis development", rotate: -3, z: 1 },
            { src: "/marketing/hero-expressway.jpg", alt: "Yamuna Expressway corridor at sunset", rotate: 3, z: 2 },
            { src: "/marketing/hero-township.jpg", alt: "Landscaped township development along the corridor", rotate: 8, z: 3 },
          ].map((photo, index) => (
            <div
              key={photo.src}
              style={{ rotate: `${photo.rotate}deg`, zIndex: photo.z, marginLeft: index === 0 ? 0 : -20 }}
              className="relative w-16 shrink-0 overflow-hidden rounded-2xl border border-steel-line shadow-lg"
            >
              <Image
                src={photo.src}
                alt={photo.alt}
                width={200}
                height={150}
                className="aspect-[4/3] w-full object-cover"
              />
            </div>
          ))}
        </motion.div>

        {/* Hero copy */}
        <motion.div
          initial="hidden"
          animate="show"
          variants={{ show: { transition: { staggerChildren: 0.08 } } }}
          className="relative z-10 mx-auto max-w-2xl text-center"
        >
          <motion.div
            variants={FADE_UP}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 rounded-full border border-steel-line bg-panel px-4 py-1.5 text-sm text-dim shadow-sm"
          >
            <span className="size-1.5 rounded-full bg-growth" aria-hidden />
            Live across 42 km of the Yamuna Expressway corridor
          </motion.div>

          <motion.h1
            variants={FADE_UP}
            transition={{ duration: 0.6 }}
            className="mt-6 font-display text-4xl leading-[1.08] tracking-tight text-foreground md:text-6xl"
          >
            Read the land before the market does.
          </motion.h1>

          <motion.p
            variants={FADE_UP}
            transition={{ duration: 0.6 }}
            className="mx-auto mt-5 max-w-lg text-base leading-relaxed text-dim md:text-lg"
          >
            Live valuation, infrastructure timelines, and verified parcels along the
            corridor, updated as the market moves.
          </motion.p>

          <motion.div
            variants={FADE_UP}
            transition={{ duration: 0.6 }}
            className="mt-8 flex flex-wrap items-center justify-center gap-3"
          >
            <LinkButton
              href="/explore"
              className="h-12 gap-2 bg-foreground px-6 text-base text-background hover:bg-foreground/85"
            >
              Browse corridor parcels
              <ArrowRight className="size-4" strokeWidth={2.25} />
            </LinkButton>
            <LinkButton
              href="/calculator"
              variant="outline"
              className="h-12 gap-2 border-steel-line px-6 text-base text-foreground hover:bg-secondary"
            >
              <PlayCircle className="size-5" strokeWidth={2} />
              Run investment model
            </LinkButton>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
