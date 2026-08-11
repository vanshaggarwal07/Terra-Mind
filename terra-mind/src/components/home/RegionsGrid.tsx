"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";

const ZONES = [
  {
    name: "Yamuna Expressway",
    count: "1,240 tracked parcels",
    image: "/marketing/region-expressway.jpg",
    href: "/explore?region=Yamuna%20Expressway",
  },
  {
    name: "Noida Extension",
    count: "3,800 tracked units",
    image: "/marketing/region-urban.jpg",
    href: "/explore?region=Noida%20Extension",
  },
  {
    name: "Jewar Airport Node",
    count: "620 tracked plots",
    image: "/marketing/region-airport.jpg",
    href: "/explore?region=Airport%20Node",
  },
  {
    name: "Industrial Belt",
    count: "340 tracked lots",
    image: "/marketing/region-industrial.jpg",
    href: "/explore?region=Industrial%20Belt",
  },
];

export function RegionsGrid() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-20 md:px-6 md:py-28">
      <div className="mx-auto max-w-xl text-center">
        <h2 className="font-display text-3xl leading-tight text-foreground md:text-4xl">
          Every corridor zone, mapped.
        </h2>
        <p className="mt-3 text-base text-dim">
          Four distinct investment zones along the corridor, each with its own
          pricing curve and infrastructure timeline.
        </p>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {ZONES.map((zone, i) => (
          <motion.div
            key={zone.name}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.5, delay: i * 0.07 }}
          >
            <Link
              href={zone.href}
              className="group block overflow-hidden rounded-3xl border border-steel-line bg-panel soft-shadow transition-transform duration-300 hover:-translate-y-1"
            >
              <div className="relative aspect-[4/3] overflow-hidden">
                <Image
                  src={zone.image}
                  alt={zone.name}
                  fill
                  sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              <div className="flex items-center justify-between gap-2 p-4">
                <div>
                  <p className="font-medium text-foreground">{zone.name}</p>
                  <p className="mt-0.5 text-[13px] text-dim">{zone.count}</p>
                </div>
                <ArrowUpRight className="size-4 shrink-0 text-dim transition-colors group-hover:text-signal" strokeWidth={2} />
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
